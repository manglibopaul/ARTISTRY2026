import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const UserChat = ({ defaultSellerId = null, defaultSellerName = null }) => {
  const [conversations, setConversations] = useState([])
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [pollInterval, setPollInterval] = useState(null)
  const token = localStorage.getItem('token') || localStorage.getItem('userToken')
  // guest fields
  const [guestId, setGuestId] = useState(localStorage.getItem('guestChatId') || '')
  const [guestName, setGuestName] = useState(localStorage.getItem('guestName') || '')
  const [guestEmail, setGuestEmail] = useState(localStorage.getItem('guestEmail') || '')
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const scrollRef = useRef(null)
  const imageInputRef = useRef(null)
  const filterRef = useRef(null)

  const resolveUploadUrl = (url) => {
    if (!url) return ''
    if (String(url).startsWith('http')) return url
    return `${apiUrl}${url}`
  }

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // ensure guestId exists for anonymous users
    if (!token && !guestId) {
      const id = `g_${Date.now()}_${Math.random().toString(36).slice(2,9)}`
      localStorage.setItem('guestChatId', id)
      setGuestId(id)
    }
    // Only auto-select a seller if explicitly passed via props (e.g. from product/artisan page)
    if (defaultSellerId) {
      setSelectedSeller({ sellerId: defaultSellerId, sellerName: defaultSellerName || 'Artisan', lastAt: Date.now() })
      fetchMessages(defaultSellerId)
    }
    fetchConversations()
  }, [])

  useEffect(() => {
    if (!selectedSeller) return
    fetchMessages(selectedSeller.sellerId)

    // start polling for new messages every 5s
    if (pollInterval) clearInterval(pollInterval)
    const id = setInterval(() => fetchMessages(selectedSeller.sellerId, false), 5000)
    setPollInterval(id)
    return () => clearInterval(id)
  }, [selectedSeller])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const qs = token ? '' : `?guestId=${encodeURIComponent(guestId)}`
      const res = await axios.get(`${apiUrl}/api/chat/user/conversations${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setConversations(res.data || [])
    } catch (err) {
      console.error('fetchConversations', err)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (sellerId, scroll = true) => {
    try {
      const qs = token ? '' : `?guestId=${encodeURIComponent(guestId)}`
      const res = await axios.get(`${apiUrl}/api/chat/user/conversation/${sellerId}${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setMessages(res.data || [])
      if (scroll) setTimeout(() => scrollToBottom(), 50)
      fetchConversations()
    } catch (err) {
      console.error('fetchMessages', err)
    }
  }

  const selectConversation = (conv) => {
    setSelectedSeller(conv)
  }

  const sendMessage = async () => {
    if (!text.trim() && !selectedImage) {
      toast.info('Type a message or attach an image first.')
      return
    }
    const sellerId = selectedSeller?.sellerId
    if (!sellerId) {
      toast.info('Select a conversation first.')
      return
    }
    try {
      const formData = new FormData()
      if (text.trim()) formData.append('text', text.trim())
      if (selectedImage) formData.append('image', selectedImage)
      if (!token) {
        formData.append('guestId', guestId)
        if (guestName) formData.append('guestName', guestName)
        if (guestEmail) formData.append('guestEmail', guestEmail)
      }
      const res = await axios.post(`${apiUrl}/api/chat/user/${sellerId}/message`, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setText('')
      setSelectedImage(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      setMessages(prev => [...prev, res.data])
      setTimeout(() => scrollToBottom(), 50)
      fetchConversations()
      fetchMessages(sellerId)
    } catch (err) {
      console.error('sendMessage', err)
      toast.error('Failed to send message')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const scrollToBottom = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' })
    } else {
      return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
    }
  }

  const getInitials = (name) => {
    if (!name) return 'A'
    return name.charAt(0).toUpperCase()
  }

  const isGuest = !token

  // Filter conversations by search query
  const filteredConversations = conversations.filter((c) => {
    const name = (c.sellerName || '').toLowerCase()
    const msg = (c.lastMessage || '').toLowerCase()
    const q = searchQuery.toLowerCase()
    if (q && !name.includes(q) && !msg.includes(q)) return false
    if (filterType === 'Unread' && (!c.unreadCount || c.unreadCount === 0)) return false
    return true
  })

  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden' style={{ height: 'calc(100vh - 140px)', minHeight: '500px' }}>
      <div className='grid grid-cols-1 md:grid-cols-[320px_1fr] h-full'>
        {/* ===== LEFT SIDEBAR ===== */}
        <div className='border-r border-gray-200 flex flex-col h-full'>
          {/* Header */}
          <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-[#c8102e]'>Chat</h2>
            <div className='flex items-center gap-2'>
              {/* Compose icon */}
              <button className='p-1.5 hover:bg-gray-100 rounded transition-colors' title='New conversation'>
                <svg className='w-5 h-5 text-gray-500' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' />
                </svg>
              </button>
            </div>
          </div>

          {/* Search + Filter */}
          <div className='px-4 py-2.5 border-b border-gray-100'>
            <div className='flex items-center gap-2'>
              <div className='flex-1 relative'>
                <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                  <circle cx='11' cy='11' r='8' /><path d='m21 21-4.35-4.35' />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors'
                  placeholder='Search name'
                />
              </div>
              <div className='relative' ref={filterRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className='flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200 transition-colors'
                >
                  {filterType}
                  <svg className='w-3.5 h-3.5 text-gray-400' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' />
                  </svg>
                </button>
                {showFilterDropdown && (
                  <div className='absolute right-0 mt-1 w-28 bg-white border border-gray-200 rounded-md shadow-lg z-10'>
                    {['All', 'Unread'].map((f) => (
                      <button
                        key={f}
                        onClick={() => { setFilterType(f); setShowFilterDropdown(false) }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${filterType === f ? 'text-[#c8102e] font-medium' : 'text-gray-700'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conversation List */}
          <div className='flex-1 overflow-y-auto'>
            {loading ? (
              <div className='flex items-center justify-center py-12'>
                <div className='animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#c8102e] rounded-full' />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-gray-400'>
                <svg className='w-12 h-12 mb-3' fill='none' stroke='currentColor' strokeWidth='1' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155' />
                </svg>
                <p className='text-sm'>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((c) => (
                <div
                  key={c.sellerId}
                  onClick={() => selectConversation(c)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${
                    selectedSeller?.sellerId === c.sellerId
                      ? 'bg-gray-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className='relative flex-shrink-0'>
                    <div className='w-11 h-11 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 font-semibold text-sm'>
                      {getInitials(c.sellerName)}
                    </div>
                  </div>
                  {/* Info */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <span className='font-medium text-sm text-gray-900 truncate'>
                        {c.sellerName || 'Artisan'}
                      </span>
                      <span className='text-xs text-gray-400 flex-shrink-0 ml-2'>
                        {formatDate(c.lastAt)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between mt-0.5'>
                      <p className='text-xs text-gray-500 truncate pr-2'>
                        {c.lastMessage || 'No messages yet'}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className='flex-shrink-0 bg-[#c8102e] text-white text-[10px] font-medium min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1'>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div className='flex flex-col h-full bg-white'>
          {!selectedSeller ? (
            /* Empty / Welcome state */
            <div className='flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50'>
              {/* Chat illustration */}
              <div className='mb-6'>
                <svg width='180' height='140' viewBox='0 0 180 140' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  {/* Laptop body */}
                  <rect x='30' y='20' width='120' height='80' rx='6' fill='#f3f4f6' stroke='#d1d5db' strokeWidth='1.5' />
                  <rect x='38' y='28' width='104' height='64' rx='3' fill='#fff' />
                  {/* Screen content - chat bubbles */}
                  <rect x='46' y='38' width='50' height='12' rx='6' fill='#e5e7eb' />
                  <rect x='84' y='54' width='50' height='12' rx='6' fill='#fef2f2' />
                  <rect x='46' y='70' width='40' height='12' rx='6' fill='#e5e7eb' />
                  {/* Laptop base */}
                  <path d='M20 100 L30 100 L30 98 Q90 106 150 98 L150 100 L160 100 Q160 110 140 112 L40 112 Q20 110 20 100Z' fill='#e5e7eb' stroke='#d1d5db' strokeWidth='1' />
                  {/* Chat bubble floating */}
                  <rect x='120' y='8' width='44' height='32' rx='8' fill='#c8102e' />
                  <path d='M132 40 L128 48 L138 40Z' fill='#c8102e' />
                  <circle cx='133' cy='24' r='2.5' fill='white' />
                  <circle cx='142' cy='24' r='2.5' fill='white' />
                  <circle cx='151' cy='24' r='2.5' fill='white' />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-gray-800 mb-2'>Welcome to Artistry Chat</h3>
              <p className='text-sm text-gray-400'>Start chatting with our artisans now!</p>
            </div>
          ) : (
            /* Active conversation */
            <>
              {/* Conversation header */}
              <div className='px-5 py-3 border-b border-gray-200 flex items-center gap-3 bg-white'>
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedSeller(null)}
                  className='md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors mr-1'
                >
                  <svg className='w-5 h-5 text-gray-500' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 19.5L8.25 12l7.5-7.5' />
                  </svg>
                </button>
                <div className='w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 font-semibold text-sm flex-shrink-0'>
                  {getInitials(selectedSeller?.sellerName)}
                </div>
                <div className='flex-1 min-w-0'>
                  <h4 className='font-semibold text-sm text-gray-900'>
                    {(selectedSeller?.sellerName === 'Seller') ? 'ARTISTRY' : selectedSeller?.sellerName}
                  </h4>
                  <p className='text-xs text-gray-400'>Artisan</p>
                </div>
                <div className='flex items-center gap-1'>
                  <button className='p-2 hover:bg-gray-100 rounded-lg transition-colors' title='More options'>
                    <svg className='w-5 h-5 text-gray-400' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages area */}
              <div ref={scrollRef} className='flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50'>
                {messages.length === 0 ? (
                  <div className='flex items-center justify-center h-full'>
                    <p className='text-sm text-gray-400'>No messages yet. Say hi!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id || Math.random()} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl ${
                        m.sender === 'user'
                          ? 'bg-[#c8102e] text-white rounded-br-md'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                      }`}>
                        {m.meta?.imageUrl && (
                          <img
                            src={resolveUploadUrl(m.meta.imageUrl)}
                            alt='Chat attachment'
                            className='mb-2 rounded-lg max-h-56 w-auto border border-gray-200'
                          />
                        )}
                        {m.message && m.message !== '[image]' && <p className='text-sm leading-relaxed'>{m.message}</p>}
                        <p className={`text-[10px] mt-1 ${m.sender === 'user' ? 'text-red-200' : 'text-gray-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Guest info bar */}
              {isGuest && (
                <div className='px-4 py-2 bg-amber-50 border-t border-amber-100'>
                  <div className='flex items-center gap-2'>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className='flex-1 px-2.5 py-1.5 border border-amber-200 rounded text-xs bg-white focus:outline-none focus:border-amber-300'
                      placeholder='Your name'
                    />
                    <input
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className='flex-1 px-2.5 py-1.5 border border-amber-200 rounded text-xs bg-white focus:outline-none focus:border-amber-300'
                      placeholder='Email'
                    />
                    <button
                      onClick={() => { localStorage.setItem('guestName', guestName); localStorage.setItem('guestEmail', guestEmail); toast.success('Info saved') }}
                      className='px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors'
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Message input */}
              <div className='px-4 py-3 border-t border-gray-200 bg-white'>
                <input
                  ref={imageInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                />
                {selectedImage && (
                  <div className='mb-2 text-xs text-gray-600 flex items-center justify-between'>
                    <span className='truncate mr-2'>Attached: {selectedImage.name}</span>
                    <button
                      onClick={() => {
                        setSelectedImage(null)
                        if (imageInputRef.current) imageInputRef.current.value = ''
                      }}
                      className='text-red-600 hover:underline'
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className='p-2.5 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors flex-shrink-0'
                    title='Attach image'
                  >
                    <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M12 16l-4-4m0 0l4-4m-4 4h13a3 3 0 110 6h-1' transform='rotate(45 12 12)' />
                    </svg>
                  </button>
                  <div className='flex-1 relative'>
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className='w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-colors pr-10'
                      placeholder='Type a message...'
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    className='p-2.5 bg-[#c8102e] text-white rounded-full hover:bg-[#a00d24] transition-colors flex-shrink-0'
                    title='Send'
                  >
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5' />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserChat
