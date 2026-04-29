import React, { useCallback, useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const ProductChat = ({ productId, sellerId, sellerName }) => {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const scrollRef = useRef(null)
  const imageInputRef = useRef(null)
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
  const token = localStorage.getItem('token') || localStorage.getItem('userToken')

  const getGuestId = () => {
    let gid = localStorage.getItem('guestChatId')
    if (!gid) {
      gid = `g_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem('guestChatId', gid)
    }
    return gid
  }

  const resolveUploadUrl = (url) => {
    if (!url) return ''
    if (String(url).startsWith('http')) return url
    return `${apiUrl}${url}`
  }

  // guest id management
  useEffect(() => {
    getGuestId()
  }, [token])

  const fetchMessages = useCallback(async () => {
    if (!sellerId) return
    try {
      const guestId = getGuestId()
      const params = []
      params.push(`guestId=${encodeURIComponent(guestId)}`)
      if (productId) params.push(`productId=${encodeURIComponent(productId)}`)
      const qs = params.length ? `?${params.join('&')}` : ''
      let res
      try {
        res = await axios.get(`${apiUrl}/api/chat/user/conversation/${sellerId}${qs}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      } catch (err) {
        if (err?.response?.status === 401 && token) {
          // Fallback as guest if stored token is stale/invalid.
          res = await axios.get(`${apiUrl}/api/chat/user/conversation/${sellerId}${qs}`)
        } else {
          throw err
        }
      }
      setMessages(res.data || [])
      setTimeout(() => scrollToBottom(), 50)
    } catch (err) {
      console.error('ProductChat fetchMessages', err)
    }
  }, [apiUrl, productId, sellerId, token])

  useEffect(() => {
    if (!sellerId) return
    fetchMessages()
    const id = setInterval(fetchMessages, 5000)
    return () => clearInterval(id)
  }, [sellerId, fetchMessages])

  const sendMessage = async () => {
    if (!sellerId) {
      toast.info('This product is missing seller info. Please refresh and try again.')
      return
    }
    if (!text.trim() && !selectedImage) {
      toast.info('Type a message or attach an image first.')
      return
    }
    try {
      const guestId = getGuestId()
      const formData = new FormData()
      if (text.trim()) formData.append('text', text.trim())
      if (selectedImage) formData.append('image', selectedImage)
      // Always include guestId so stale tokens can gracefully fall back to guest mode.
      formData.append('guestId', guestId)
      if (productId) formData.append('productId', productId)
      let res
      try {
        res = await axios.post(`${apiUrl}/api/chat/user/${sellerId}/message`, formData, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      } catch (err) {
        if (err?.response?.status === 401 && token) {
          // Retry without auth header when frontend token is expired.
          res = await axios.post(`${apiUrl}/api/chat/user/${sellerId}/message`, formData)
        } else {
          throw err
        }
      }
      setText('')
      setSelectedImage(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      setMessages(prev => [...prev, res.data])
      setTimeout(() => scrollToBottom(), 50)
    } catch (err) {
      console.error('ProductChat sendMessage', err)
      toast.error(err?.response?.data?.message || 'Failed to send message')
    }
  }

  const scrollToBottom = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }

  return (
    <div className='bg-white border rounded p-3 overflow-hidden'>
      <div className='flex items-center justify-between mb-3'>
        <div>
          <div className='font-medium'>{sellerName || 'Seller'}</div>
          <div className='text-xs text-gray-500'>Conversation</div>
        </div>
      </div>

      <div ref={scrollRef} className='max-h-64 overflow-y-auto space-y-3 mb-3'>
        {messages.length === 0 ? (
          <div className='text-sm text-gray-500'>No messages yet. Ask the seller a question.</div>
        ) : (
          messages.map(m => (
            <div key={m.id || Math.random()} className={`p-2 rounded-lg ${m.sender === 'user' ? 'bg-blue-50 self-end ml-auto text-right' : 'bg-gray-100 self-start text-left'}`}>
              {m.meta?.imageUrl && (
                <img src={resolveUploadUrl(m.meta.imageUrl)} alt='Chat attachment' className='mb-1 rounded max-h-40 w-auto border border-gray-200 inline-block' />
              )}
              {m.message && m.message !== '[image]' && <div className='text-sm text-gray-800'>{m.message}</div>}
              <div className='text-xs text-gray-400 mt-1'>{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
      <div className='flex gap-2 items-center'>
        <input
          ref={imageInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
        />
        <button onClick={() => imageInputRef.current?.click()} className='px-3 py-2 border rounded text-sm whitespace-nowrap shrink-0 bg-gray-50 hover:bg-gray-100'>Image</button>
        <input value={text} onChange={(e) => setText(e.target.value)} className='flex-1 min-w-0 px-3 py-2 border rounded text-sm' placeholder='Write a message...' />
        <button onClick={sendMessage} className='bg-black text-white px-4 py-2 rounded-md text-sm whitespace-nowrap shrink-0'>Send</button>
      </div>
      {selectedImage && <div className='mt-2 text-xs text-gray-600 truncate'>Attached: {selectedImage.name}</div>}
    </div>
  )
}

export default ProductChat
