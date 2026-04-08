import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const SellerChat = () => {
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pollId, setPollId] = useState(null)
  const [devMessages, setDevMessages] = useState([])

  const token = localStorage.getItem('sellerToken')
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
  const scrollRef = useRef(null)
  const imageInputRef = useRef(null)

  const resolveUploadUrl = (url) => {
    if (!url) return ''
    if (String(url).startsWith('http')) return url
    const base = apiUrl.replace(/\/api\/?$/, '')
    return `${base}${url}`
  }

  const getMessageMeta = (m) => {
    const raw = m?.meta
    if (!raw) return {}
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch {
        return {}
      }
    }
    if (typeof raw === 'object') return raw
    return {}
  }

  const getMessageImageUrl = (m) => {
    const meta = getMessageMeta(m)
    return meta.imageUrl || m?.imageUrl || null
  }

  useEffect(() => {
    fetchConversations()
    return () => {
      if (pollId) clearInterval(pollId)
    }
  }, [])

  useEffect(() => {
    if (!selectedConv) return
    fetchMessages()
    if (pollId) clearInterval(pollId)
    const id = setInterval(fetchMessages, 5000)
    setPollId(id)
    return () => clearInterval(id)
  }, [selectedConv])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${apiUrl}/api/chat/seller/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConversations(res.data || [])
    } catch (err) {
      console.error('fetchConversations', err)
      // Dev fallback: try loading recent messages and synthesize conversations (useful when sellerToken is missing)
      if (import.meta.env.DEV) {
        try {
          const devRes = await fetch(`${apiUrl}/api/chat/dev/messages`)
          const all = await devRes.json()
          // In dev, don't strictly filter by sellerId so messages from customer popup are visible
          const items = (all || [])
          const map = new Map()
          for (const m of items) {
            const key = m.userId ? `u:${m.userId}` : `g:${m.guestId || 'guest'}`
            if (!map.has(key) || new Date(m.createdAt) > new Date(map.get(key).createdAt)) {
              map.set(key, m)
            }
          }
          const convs = []
          for (const [key, lastMsg] of map.entries()) {
            if (key.startsWith('u:')) {
              // avoid assigning a bare numeric 'name' — prefer real name or provide email fields
              const uname = lastMsg.userName && !/^\d+$/.test(String(lastMsg.userName)) ? lastMsg.userName : null
              convs.push({ userId: Number(key.split(':')[1]), guestId: null, name: uname, userEmail: lastMsg.userEmail || null, lastMessage: lastMsg.message, lastAt: lastMsg.createdAt, unreadCount: 0 })
            } else {
              const gname = lastMsg.guestName && !/^\d+$/.test(String(lastMsg.guestName)) ? lastMsg.guestName : null
              convs.push({ userId: null, guestId: key.split(':')[1], name: gname, guestEmail: lastMsg.guestEmail || null, lastMessage: lastMsg.message, lastAt: lastMsg.createdAt, unreadCount: 0 })
            }
          }
          convs.sort((a,b)=> new Date(b.lastAt) - new Date(a.lastAt))
          setConversations(convs)
          setLoading(false)
          return
        } catch (devErr) {
          console.error('dev fallback fetchConversations', devErr)
        }
      }
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    if (!selectedConv) return
    try {
      const key = selectedConv.userId ? selectedConv.userId : selectedConv.guestId
      const res = await axios.get(`${apiUrl}/api/chat/seller/conversation/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMessages(res.data || [])
      setTimeout(() => scrollToBottom(), 50)
      fetchConversations()
    } catch (err) {
      console.error('fetchMessages', err)
    }
  }

  const selectConversation = (conv) => {
    setSelectedConv(conv)
  }

  const sendMessage = async () => {
    if (!selectedConv) {
      toast.info('Select a conversation first.')
      return
    }
    if (!text.trim() && !selectedImage) {
      toast.info('Type a message or attach an image first.')
      return
    }
    try {
      const key = selectedConv.userId ? selectedConv.userId : selectedConv.guestId
      const formData = new FormData()
      if (text.trim()) formData.append('text', text.trim())
      if (selectedImage) formData.append('image', selectedImage)
      if (!selectedConv.userId) {
        formData.append('guestId', selectedConv.guestId)
        if (selectedConv.name) formData.append('guestName', selectedConv.name)
      }
      const res = await axios.post(`${apiUrl}/api/chat/seller/${encodeURIComponent(key)}/message`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setText('')
      setSelectedImage(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      setMessages(prev => [...prev, res.data])
      setTimeout(() => scrollToBottom(), 50)
      fetchConversations()
    } catch (err) {
      console.error('sendMessage', err)
      toast.error('Failed to send message')
    }
  }

  const scrollToBottom = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }

  const formatName = (n) => {
    if (!n) return null
    return n === 'Seller' ? 'ARTISTRY' : n
  }

  const isNumeric = (v) => {
    if (v === null || v === undefined) return false
    return /^\d+$/.test(String(v))
  }

  const getDisplayName = (conv) => {
    if (!conv) return 'Customer'
    // prefer explicit name fields from the backend if they're present and not just numeric ids
    const possible = [conv.name, conv.userName, conv.guestName, conv.sellerName, conv.displayName]
    for (const p of possible) {
      if (p && !isNumeric(p)) return formatName(p)
    }
    // hide numeric ids completely — if no name/email available, show generic label
    if (conv.guestEmail) return conv.guestEmail
    if (conv.userEmail) return conv.userEmail
    return 'Customer'
  }

  const getMsgSender = (m) => {
    if (!m) return 'Customer'
    if (m.userName && !isNumeric(m.userName)) return m.userName
    if (m.guestName && !isNumeric(m.guestName)) return m.guestName
    if (m.guestEmail) return m.guestEmail
    if (m.userEmail) return m.userEmail
    return 'Customer'
  }

  return (
    <div className='min-h-[540px] bg-white rounded-xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-4'>
      {/* Left navigation */}
      <div className='col-span-1 bg-gradient-to-b from-white to-gray-50 p-4 border-r'>
        <div className='mb-4'>
          <div className='text-lg font-semibold'>Conversations</div>
          <div className='mt-2 text-sm text-gray-500'>Manage customer messages and replies</div>
        </div>

        <div className='flex gap-2 items-center mb-3'>
          <button className={`px-3 py-2 rounded-md text-sm ${'bg-white shadow-sm'}`}>Conversations</button>
          <button className='px-3 py-2 rounded-md text-sm text-gray-500'>Handoffs</button>
          <button className='px-3 py-2 rounded-md text-sm text-gray-500'>Closed</button>
        </div>

        <div className='mt-3 mb-3'>
          <input onChange={(e) => { const q = e.target.value; setConversations(prev => prev); }} placeholder='Search' className='w-full px-3 py-2 border rounded-md text-sm' />
        </div>

        <div className='space-y-3 overflow-y-auto max-h-[520px] pr-2'>
          {loading ? (
            <div className='text-gray-500'>Loading...</div>
          ) : conversations.length === 0 ? (
            <div className='text-gray-500'>No conversations yet.</div>
          ) : (
            conversations.map((c, idx) => {
              const raw = String(getDisplayName(c) || '')
              const displayLabel = /^(?:\d+)$/.test(raw.trim()) ? 'Customer' : raw || 'Customer'
              return (
                <div key={idx} onClick={() => selectConversation(c)} className={`p-3 rounded-lg cursor-pointer transition-shadow ${selectedConv?.sellerId === c.sellerId && selectedConv?.userId === c.userId ? 'shadow-md ring-1 ring-yellow-300 bg-white' : 'bg-white hover:shadow'} flex items-start gap-3`}>
                  <div className='w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium'>{(displayLabel||'U').charAt(0)}</div>
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <div className='font-medium text-sm'>{displayLabel}</div>
                      <div className='text-xs text-gray-400'>{c.lastAt ? new Date(c.lastAt).toLocaleDateString() : ''}</div>
                    </div>
                    <div className='text-xs text-gray-500 truncate mt-1'>{c.lastMessage}</div>
                    {c.unreadCount > 0 && <div className='mt-2 inline-block bg-red-600 text-white text-xs px-2 py-0.5 rounded-full'>{c.unreadCount}</div>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Conversation area */}
      <div className='col-span-3 flex flex-col'>
        {!selectedConv ? (
          <div className='flex-1 flex items-center justify-center p-12 bg-gradient-to-br from-indigo-50 to-white'>
            <div className='text-center'>
              <div className='text-2xl font-semibold'>Select a conversation</div>
              <div className='text-sm text-gray-500 mt-2'>Click a customer on the left to view messages and reply.</div>
            </div>
          </div>
        ) : (
          <div className='flex-1 flex flex-col'>
            <div className='px-6 py-4 border-b flex items-center justify-between bg-white'>
              <div>
                <div className='text-lg font-semibold'>{/^(?:\d+)$/.test(String(getDisplayName(selectedConv) || '').trim()) ? 'Customer' : getDisplayName(selectedConv)}</div>
                <div className='text-xs text-gray-400'>Conversation — {selectedConv.unreadCount ? `${selectedConv.unreadCount} unread` : 'No unread'}</div>
              </div>
              <div className='text-xs text-gray-400'>{new Date(selectedConv.lastAt).toLocaleString()}</div>
            </div>

            <div className='flex-1 p-8 overflow-y-auto bg-gradient-to-b from-white to-indigo-50 space-y-4' ref={scrollRef}>
              {messages.map((m) => (
                <div key={m.id || Math.random()} className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${m.sender === 'seller' ? 'ml-auto bg-white border-l-4 border-blue-400' : 'mr-auto bg-white border-l-4 border-yellow-300'}`}>
                  {getMessageImageUrl(m) && (
                    <img
                      src={resolveUploadUrl(getMessageImageUrl(m))}
                      alt='Chat attachment'
                      className='mb-2 rounded-lg max-h-56 w-auto border border-gray-200'
                    />
                  )}
                  {m.message && m.message !== '[image]' && <div className='text-sm text-gray-800'>{m.message}</div>}
                  <div className='text-xs text-gray-400 mt-2'>{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className='px-6 py-4 bg-white border-t'>
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
              <div className='flex items-center gap-3'>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className='px-3 py-3 border rounded-full text-sm'
                  title='Attach image'
                >
                  +
                </button>
                <input value={text} onChange={(e) => setText(e.target.value)} className='flex-1 px-4 py-3 border rounded-full' placeholder='Reply...' />
                <button onClick={sendMessage} className='bg-indigo-600 text-white px-5 py-3 rounded-full'>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dev debug drawer - only visible in development */}
      {import.meta.env.DEV && (
        <div className='col-span-1 md:col-span-3 mt-4'>
          <div className='bg-white rounded-lg shadow p-4'>
            <div className='flex items-center justify-between mb-2'>
              <div className='font-medium'>Dev: Recent Messages</div>
              <div>
                <button onClick={async () => {
                  try {
                    const res = await fetch(`${apiUrl}/api/chat/dev/messages`)
                    const json = await res.json()
                    setDevMessages(json || [])
                  } catch (err) { console.error(err) }
                }} className='text-sm text-gray-600 hover:underline'>Load</button>
              </div>
            </div>
            <div className='max-h-40 overflow-y-auto text-sm text-gray-700'>
              {devMessages.length === 0 ? <div className='text-gray-500'>No recent messages loaded.</div> : (
                <ul className='space-y-1'>
                  {devMessages.slice(0,50).map(m => (
                    <li key={m.id} className='border-b py-1'>
                      <div className='flex items-center justify-between'>
                        <div className='truncate'><strong className='mr-2'>{getMsgSender(m)}</strong>{m.message}</div>
                        <div className='text-xs text-gray-500 ml-2'>{new Date(m.createdAt).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SellerChat
