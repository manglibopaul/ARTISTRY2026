import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const SupportChat = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const userToken = localStorage.getItem('token') || localStorage.getItem('userToken')
  const sellerToken = localStorage.getItem('sellerToken')

  // Prefer explicit intent from navigation state, then fall back to available tokens.
  const requestedRole = location.state?.role === 'seller' ? 'seller' : null
  const role = requestedRole
    ? requestedRole
    : (userToken ? 'user' : (sellerToken ? 'seller' : null))
  const token = role === 'seller' ? sellerToken : userToken

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const resolveUploadUrl = (url) => {
    if (!url) return ''
    if (String(url).startsWith('http')) return url
    return `${apiUrl}${url}`
  }

  const getMeta = (m) => {
    if (!m?.meta) return {}
    if (typeof m.meta === 'string') {
      try { return JSON.parse(m.meta) } catch { return {} }
    }
    return m.meta
  }

  const fetchMessages = async () => {
    if (!role || !token) return
    try {
      setLoading(true)
      const res = await fetch(`${apiUrl}/api/chat/support/${role}/conversation`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to load support messages')
      }
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }, 30)
    } catch (e) {
      setError(e.message || 'Failed to load support messages')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!role || !token) return
    if (sending) return
    if (!text.trim() && !selectedImage) return
    try {
      setSending(true)
      setError('')
      const formData = new FormData()
      if (text.trim()) formData.append('text', text.trim())
      if (selectedImage) formData.append('image', selectedImage)

      const res = await fetch(`${apiUrl}/api/chat/support/${role}/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to send message')
      }
      setText('')
      setSelectedImage(null)
      if (inputRef.current) inputRef.current.value = ''
      await fetchMessages()
    } catch (e) {
      setError(e.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!role || !token) {
      navigate('/login')
      return
    }
    fetchMessages()
    const id = setInterval(fetchMessages, 5000)
    return () => clearInterval(id)
  }, [role, token])

  return (
    <div className='border-t pt-6 sm:pt-10'>
      <div className='max-w-5xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='px-5 py-4 sm:px-6 sm:py-5 border-b bg-gradient-to-r from-gray-50 to-white'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h1 className='text-xl font-semibold text-gray-900'>Contact Admin Support</h1>
              <p className='text-sm text-gray-500 mt-1'>Ask questions about orders, account, or platform concerns.</p>
            </div>
            <span className='text-xs px-3 py-1 rounded-full border bg-white text-gray-600'>
              {role === 'seller' ? 'Seller Support' : 'Customer Support'}
            </span>
          </div>
        </div>

        {error && (
          <div className='mx-5 sm:mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div ref={scrollRef} className='h-[420px] sm:h-[470px] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 bg-gray-50'>
          {loading && messages.length === 0 ? (
            <div className='text-sm text-gray-500'>Loading support conversation...</div>
          ) : messages.length === 0 ? (
            <div className='rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500'>
              No messages yet. Start by sending a message to admin.
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender === role
              const meta = getMeta(m)
              return (
                <div key={m.id} className={`max-w-[85%] ${isMine ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                  <div className={`inline-block px-3.5 py-2.5 rounded-2xl shadow-sm ${isMine ? 'bg-black text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'}`}>
                    {meta.imageUrl && (
                      <img src={resolveUploadUrl(meta.imageUrl)} alt='Support attachment' className='rounded-lg mb-2 max-h-56 w-auto border border-gray-200' />
                    )}
                    {m.message && m.message !== '[image]' && <div className='text-sm'>{m.message}</div>}
                  </div>
                  <div className='text-xs text-gray-400 mt-1 px-1'>{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              )
            })
          )}
        </div>

        <div className='px-4 py-4 sm:px-6 sm:py-5 border-t bg-white'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-2 mb-3'>
            <label className='inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer w-fit'>
              <span>Attach Image</span>
              <input
                ref={inputRef}
                type='file'
                accept='image/*'
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                className='hidden'
              />
            </label>
            {selectedImage && (
              <div className='inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-xs text-gray-700'>
                <span className='truncate max-w-[220px]'>{selectedImage.name}</span>
                <button
                  type='button'
                  onClick={() => {
                    setSelectedImage(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                  className='text-gray-500 hover:text-black'
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className='flex gap-2'>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder='Type your message to admin...'
              className='flex-1 border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200'
            />
            <button
              onClick={sendMessage}
              disabled={sending || (!text.trim() && !selectedImage)}
              className='bg-black text-white px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportChat
