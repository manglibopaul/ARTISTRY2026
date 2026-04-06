import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const SellerAdminChat = () => {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  const token = localStorage.getItem('sellerToken')
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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

  useEffect(() => { fetchConversations() }, [])

  useEffect(() => {
    if (!selected) return
    fetchMessages()
    const id = setInterval(fetchMessages, 5000)
    return () => clearInterval(id)
  }, [selected])

  const sanitizeLabel = (c) => {
    const possible = [c.name, c.userName, c.guestName, c.userEmail, c.guestEmail]
    for (const p of possible) if (p && String(p).trim() && !/^\d+$/.test(String(p).trim())) return String(p)
    return 'Customer'
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${apiUrl}/api/chat/seller/conversations`, { headers: { Authorization: `Bearer ${token}` } })
      setConversations(res.data || [])
    } catch (err) {
      console.error('fetchConversations', err)
      toast.error('Failed to load conversations')
    } finally { setLoading(false) }
  }

  const fetchMessages = async () => {
    if (!selected) return
    try {
      const key = selected.userId ? selected.userId : selected.guestId
      const res = await axios.get(`${apiUrl}/api/chat/seller/conversation/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } })
      setMessages(res.data || [])
      setTimeout(() => scrollToBottom(), 50)
      fetchConversations()
    } catch (err) { console.error('fetchMessages', err) }
  }

  const sendReply = async () => {
    if (!text.trim() || !selected) return
    try {
      const key = selected.userId ? selected.userId : selected.guestId
      const body = { text: text.trim() }
      if (!selected.userId) {
        body.guestId = selected.guestId
        if (selected.name) body.guestName = selected.name
      }
      const res = await axios.post(`${apiUrl}/api/chat/seller/${encodeURIComponent(key)}/message`, body, { headers: { Authorization: `Bearer ${token}` } })
      setMessages(prev => [...prev, res.data])
      setText('')
      setTimeout(() => scrollToBottom(), 50)
      fetchConversations()
    } catch (err) {
      console.error('sendReply', err)
      toast.error('Failed to send reply')
    }
  }

  const scrollToBottom = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
      <div className='col-span-1 bg-white rounded shadow p-3 max-h-[520px] overflow-y-auto'>
        <div className='font-semibold mb-2'>Conversations</div>
        {loading ? <div className='text-sm text-gray-500'>Loading...</div> : (
          conversations.length === 0 ? <div className='text-sm text-gray-500'>No conversations</div> : (
            conversations.map((c, i) => (
              <div key={i} onClick={() => setSelected(c)} className={`p-3 rounded cursor-pointer mb-2 ${selected === c ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                <div className='font-medium'>{sanitizeLabel(c)}</div>
                <div className='text-xs text-gray-500 truncate'>{c.lastMessage}</div>
              </div>
            ))
          )
        )}
      </div>

      <div className='col-span-2 bg-white rounded shadow flex flex-col p-3'>
        {!selected ? (
          <div className='flex-1 flex items-center justify-center text-gray-500'>Select a conversation to reply</div>
        ) : (
          <>
            <div className='border-b pb-3 mb-3 flex items-center justify-between'>
              <div>
                <div className='font-semibold'>{sanitizeLabel(selected)}</div>
                <div className='text-xs text-gray-400'>Conversation</div>
              </div>
              <div className='flex items-center gap-3'>
                <div className='text-xs text-gray-400'>{selected.lastAt ? new Date(selected.lastAt).toLocaleString() : ''}</div>
                <button onClick={async () => {
                  if (!confirm('Delete this conversation? This will permanently remove all messages for this user/guest.')) return
                  try {
                    const key = selected.userId ? selected.userId : selected.guestId
                    const res = await fetch(`${apiUrl}/api/chat/seller/conversation/${encodeURIComponent(key)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
                    if (!res.ok) { const txt = await res.text(); throw new Error(txt || 'Failed to delete') }
                    const j = await res.json()
                    // remove from local list
                    setConversations(prev => prev.filter(x => x !== selected))
                    setSelected(null)
                    setMessages([])
                    toast.success('Conversation deleted')
                  } catch (err) {
                    console.error('delete conversation', err)
                    toast.error('Failed to delete conversation')
                  }
                }} className='text-sm text-red-600 bg-red-50 px-3 py-1 rounded'>Delete</button>
              </div>
            </div>

            <div ref={scrollRef} className='flex-1 overflow-y-auto space-y-3 p-2'>
              {messages.length === 0 ? <div className='text-sm text-gray-500'>No messages</div> : messages.map(m => (
                <div key={m.id || Math.random()} className={`max-w-[70%] p-3 rounded ${m.sender === 'seller' ? 'ml-auto bg-white border-l-4 border-blue-400' : 'mr-auto bg-gray-50 border-l-4 border-yellow-300'}`}>
                  {getMessageImageUrl(m) && (
                    <img
                      src={resolveUploadUrl(getMessageImageUrl(m))}
                      alt='Chat attachment'
                      className='mb-2 rounded max-h-56 w-auto border border-gray-200'
                    />
                  )}
                  {m.message && m.message !== '[image]' && <div className='text-sm text-gray-800'>{m.message}</div>}
                  <div className='text-xs text-gray-400 mt-2'>{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className='mt-3 border-t pt-3'>
              <div className='flex gap-2'>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder='Write a reply...' className='flex-1 px-3 py-2 border rounded' />
                <button onClick={sendReply} className='bg-indigo-600 text-white px-4 py-2 rounded'>Send</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SellerAdminChat
