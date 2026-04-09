import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Notifications = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token') || localStorage.getItem('userToken')
      if (!token) {
        navigate('/login')
        return
      }

      const res = await fetch(`${apiUrl}/api/notifications/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Failed to load notifications')
      }

      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, navigate])

  const markOneRead = async (id) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken')
      if (!token) return
      await fetch(`${apiUrl}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {
      // ignore non-critical read-state errors
    }
  }

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken')
      if (!token) return
      const res = await fetch(`${apiUrl}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to mark all as read')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (e) {
      setError(e.message || 'Failed to mark all as read')
    }
  }

  const deleteOne = async (id) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken')
      if (!token) return
      const res = await fetch(`${apiUrl}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete notification')
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (e) {
      setError(e.message || 'Failed to delete notification')
    }
  }

  const deleteAll = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken')
      if (!token) return
      const res = await fetch(`${apiUrl}/api/notifications/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete all notifications')
      setNotifications([])
    } catch (e) {
      setError(e.message || 'Failed to delete all notifications')
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  return (
    <div className='border-t pt-8 sm:pt-16 px-2 sm:px-0'>
      <div className='max-w-3xl mx-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h1 className='text-2xl font-semibold'>Notifications</h1>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-500'>{unreadCount} unread</span>
            <button
              type='button'
              onClick={markAllRead}
              className='px-3 py-2 text-sm rounded bg-black text-white hover:bg-gray-800'
            >
              Mark all read
            </button>
            <button
              type='button'
              onClick={deleteAll}
              className='px-3 py-2 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50'
            >
              Delete all
            </button>
          </div>
        </div>

        {loading && <p className='text-sm text-gray-500'>Loading notifications...</p>}
        {error && <p className='text-sm text-red-600'>{error}</p>}

        {!loading && !error && notifications.length === 0 && (
          <div className='rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500'>
            No notifications yet.
          </div>
        )}

        <div className='space-y-3'>
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 ${n.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <p className='font-medium text-gray-900'>{n.title}</p>
                  <p className='text-sm text-gray-700 mt-1'>{n.message}</p>
                  <p className='text-xs text-gray-500 mt-2'>{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className='flex items-center gap-2'>
                  {!n.read && (
                    <button
                      type='button'
                      onClick={() => markOneRead(n.id)}
                      className='px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-white'
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={() => deleteOne(n.id)}
                    className='px-3 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50'
                  >
                    Delete
                  </button>
                  {n.orderId && (
                    <button
                      type='button'
                      onClick={() => navigate(`/orders/${n.orderId}`)}
                      className='px-3 py-1.5 text-xs rounded bg-black text-white hover:bg-gray-800'
                    >
                      View order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Notifications
