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
    <nav className='fixed inset-x-0 bottom-4 z-60 md:hidden flex justify-center pointer-events-auto'>
      <div className='bg-white rounded-2xl px-6 py-3 shadow-lg border border-gray-100 flex items-center justify-between w-[92vw] max-w-[420px] mx-auto' style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <Link to='/' className='flex items-center justify-center text-gray-700'>
          <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M3 9l9-6 9 6v8a2 2 0 01-2 2h-4a2 2 0 01-2-2V13H9v4a2 2 0 01-2 2H3a2 2 0 01-2-2V9z' /></svg>
        </Link>

        <Link to='/search' className='flex items-center justify-center text-gray-700'>
          <img src={assets.search_icon} alt='Search' className='w-5 h-5' />
        </Link>

        <Link to='/profile' className='flex items-center justify-center text-gray-700'>
          <img src={assets.profile_icon} alt='Profile' className='w-6 h-6' />
        </Link>
      </div>
      <div className='flex justify-center pointer-events-none'>
        <div className='mt-2 w-36 h-2 bg-black rounded-full' />
      </div>
    </nav>
  )
}

export default MobileBottomNav
