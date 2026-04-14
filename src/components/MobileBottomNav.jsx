import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'

const MobileBottomNav = () => {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('userToken')
        if (!token) { setUnread(0); return }
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
        const res = await fetch(`${apiUrl}/api/notifications/my`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const data = await res.json()
        const u = Array.isArray(data) ? data.filter(n => !n.read).length : 0
        setUnread(u)
      } catch {
        // ignore
      }
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <nav className='fixed inset-x-0 bottom-0 z-70 md:hidden'>
      <div className='w-full bg-white border-t border-gray-200 shadow-lg' style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className='max-w-[900px] mx-auto flex justify-between items-center h-16 px-4'>
          <Link to='/' aria-label='Home' className='flex flex-col items-center text-gray-700 text-xs'>
            <svg className='w-6 h-6 mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M3 9l9-6 9 6v8a2 2 0 01-2 2h-4a2 2 0 01-2-2V13H9v4a2 2 0 01-2 2H3a2 2 0 01-2-2V9z' /></svg>
            <span>Home</span>
          </Link>

          <Link to='/collection' aria-label='Categories' className='flex flex-col items-center text-gray-700 text-xs'>
            <svg className='w-6 h-6 mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6h16M4 12h16M4 18h16' /></svg>
            <span>Categories</span>
          </Link>

          <Link to='/artisans' aria-label='Live' className='flex flex-col items-center text-gray-700 text-xs'>
            <svg className='w-6 h-6 mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4zM4 6h8v12H4z' /></svg>
            <span>Live</span>
          </Link>

          <Link to='/notifications' aria-label='Notifications' className='flex flex-col items-center text-gray-700 text-xs'>
            <svg className='w-6 h-6 mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' /></svg>
            <span>Alerts</span>
          </Link>

          <Link to='/profile' aria-label='Profile' className='flex flex-col items-center text-gray-700 text-xs'>
            <svg className='w-6 h-6 mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 14s-1 0-1 1 1 3 5 3 5-2 5-3-1-1-1-1H8z' /></svg>
            <span>Me</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default MobileBottomNav
