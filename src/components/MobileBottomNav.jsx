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
    <nav className='fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 md:hidden'>
      <div className='bg-white rounded-[28px] px-4 py-3 shadow-2xl flex items-center gap-6 w-[92vw] max-w-[760px] mx-auto'>
        <Link to='/' className='flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 text-gray-700'>
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M3 9l9-6 9 6v8a2 2 0 01-2 2h-4a2 2 0 01-2-2V13H9v4a2 2 0 01-2 2H3a2 2 0 01-2-2V9z' /></svg>
        </Link>

        <Link to='/search' className='flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 text-gray-700'>
          <img src={assets.search_icon} alt='Search' className='w-5 h-5' />
        </Link>

        <Link to='/orders' className='flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 text-gray-700'>
          <img src={assets.order_icon} alt='Orders' className='w-6 h-6' />
        </Link>

        <Link to='/chat' className='flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 text-gray-700'>
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' /></svg>
        </Link>

        <Link to='/notifications' className='relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 text-gray-700'>
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' /></svg>
          {unread > 0 && (
            <span className='absolute -right-2 -top-1 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center'>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        <Link to='/profile' className='ml-2 flex items-center gap-3 bg-blue-50 text-blue-700 rounded-full px-3 py-2 relative'>
          <img src={assets.profile_icon} alt='Profile' className='w-5 h-5' />
          <span className='text-sm font-medium'>Profile</span>
          <span className='absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm' />
        </Link>
      </div>
    </nav>
  )
}

export default MobileBottomNav
