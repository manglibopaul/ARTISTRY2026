import React, { useEffect, useRef, useState } from 'react'

const AdminSupportChat = () => {
  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const normalizedApiBase = rawApiUrl.replace(/\/+$/, '')
  const apiRoot = normalizedApiBase.endsWith('/api') ? normalizedApiBase : `${normalizedApiBase}/api`
  const token = localStorage.getItem('adminToken')

  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const imageRef = useRef(null)

  const resolveUploadUrl = (url) => {
    if (!url) return ''
    if (String(url).startsWith('http')) return url
    return `${normalizedApiBase}${url}`
  }

  const getMeta = (m) => {
    if (!m?.meta) return {}
    if (typeof m.meta === 'string') {
      try { return JSON.parse(m.meta) } catch { return {} }
    }
    return m.meta
  }

  const fetchConversations = async () => {
    if (!token) return
    try {
      const res = await fetch(`${apiRoot}/chat/support/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setConversations(Array.isArray(data) ? data : [])
    } catch (e) {
      // ignore
    }
  }

  const fetchMessages = async (threadKey = selected?.threadKey) => {
    if (!token || !threadKey) return
    try {
      setLoading(true)
      const res = await fetch(`${apiRoot}/chat/support/admin/conversation/${encodeURIComponent(threadKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }, 30)
      fetchConversations()
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const sendReply = async () => {
    if (!selected?.threadKey) return
    if (!text.trim() && !selectedImage) return
    try {
      const fd = new FormData()
      if (text.trim()) fd.append('text', text.trim())
      if (selectedImage) fd.append('image', selectedImage)
      const res = await fetch(`${apiRoot}/chat/support/admin/${encodeURIComponent(selected.threadKey)}/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) return
      setText('')
      setSelectedImage(null)
      if (imageRef.current) imageRef.current.value = ''
      fetchMessages(selected.threadKey)
    } catch (e) {
      // ignore
    }
  }

  const deleteConversation = async () => {
    if (!selected?.threadKey) return
    const ok = window.confirm(`Delete conversation with ${selected.name}? This cannot be undone.`)
    if (!ok) return

    try {
      const res = await fetch(`${apiRoot}/chat/support/admin/${encodeURIComponent(selected.threadKey)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setSelected(null)
      setMessages([])
      fetchConversations()
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchConversations()
    const id = setInterval(fetchConversations, 8000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!selected?.threadKey) return
    fetchMessages(selected.threadKey)
    const id = setInterval(() => fetchMessages(selected.threadKey), 5000)
    return () => clearInterval(id)
  }, [selected?.threadKey])

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
      <div className='bg-white border rounded p-3 max-h-[560px] overflow-y-auto'>
        <h3 className='font-semibold mb-3'>Support Conversations</h3>
        {conversations.length === 0 ? (
          <div className='text-sm text-gray-500'>No support messages yet.</div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.threadKey}
              onClick={() => setSelected(c)}
              className={`w-full text-left p-3 rounded mb-2 border ${selected?.threadKey === c.threadKey ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
            >
              <div className='font-medium text-sm'>{c.name}</div>
              <div className='text-xs text-gray-500'>{c.actorType}</div>
              <div className='text-xs text-gray-600 truncate mt-1'>{c.lastMessage}</div>
              {c.unreadCount > 0 && <span className='inline-block mt-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full'>{c.unreadCount}</span>}
            </button>
          ))
        )}
      </div>

      <div className='md:col-span-2 bg-white border rounded p-3 flex flex-col'>
        {!selected ? (
          <div className='flex-1 flex items-center justify-center text-sm text-gray-500'>Select a support conversation.</div>
        ) : (
          <>
            <div className='border-b pb-3 mb-3'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='font-semibold'>{selected.name}</div>
                  <div className='text-xs text-gray-500'>{selected.actorType} support thread</div>
                </div>
                <button
                  onClick={deleteConversation}
                  className='text-xs px-3 py-1.5 rounded border border-red-600 text-red-600 hover:bg-red-50'
                >
                  Delete Thread
                </button>
              </div>
            </div>

            <div ref={scrollRef} className='flex-1 max-h-[420px] overflow-y-auto space-y-3 mb-3'>
              {loading && messages.length === 0 ? (
                <div className='text-sm text-gray-500'>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className='text-sm text-gray-500'>No messages yet.</div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender === 'seller'
                  const meta = getMeta(m)
                  return (
                    <div key={m.id} className={`max-w-[80%] ${isAdmin ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                      <div className={`inline-block rounded px-3 py-2 ${isAdmin ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {meta.imageUrl && (
                          <img src={resolveUploadUrl(meta.imageUrl)} alt='Attachment' className='mb-2 rounded border border-gray-200 max-h-48 w-auto' />
                        )}
                        {m.message && m.message !== '[image]' && <div className='text-sm'>{m.message}</div>}
                      </div>
                      <div className='text-xs text-gray-400 mt-1'>{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                  )
                })
              )}
            </div>

            <div className='border-t pt-3'>
              <input ref={imageRef} type='file' accept='image/*' onChange={(e) => setSelectedImage(e.target.files?.[0] || null)} className='text-sm mb-2' />
              {selectedImage && <div className='text-xs text-gray-600 mb-2'>Attached: {selectedImage.name}</div>}
              <div className='flex gap-2'>
                <input value={text} onChange={(e) => setText(e.target.value)} className='flex-1 border px-3 py-2 rounded' placeholder='Reply to this support thread...' />
                <button onClick={sendReply} className='bg-black text-white px-4 py-2 rounded'>Send</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminSupportChat
