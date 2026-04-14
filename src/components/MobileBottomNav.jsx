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
    <nav className='fixed inset-x-0 bottom-12 z-60 md:hidden flex justify-center pointer-events-auto'>
      <div className='bg-gray-900 text-white rounded-2xl px-6 py-4 shadow-2xl border border-gray-800 flex items-center justify-between w-[94vw] max-w-[420px] mx-auto' style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <Link to='/' aria-label='Home' className='flex items-center justify-center text-white px-3'>
          <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M3 9l9-6 9 6v8a2 2 0 01-2 2h-4a2 2 0 01-2-2V13H9v4a2 2 0 01-2 2H3a2 2 0 01-2-2V9z' /></svg>
        </Link>

        <Link to='/search' aria-label='Search' className='flex items-center justify-center text-white px-3'>
          <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z' /></svg>
        </Link>

        <Link to='/profile' aria-label='Profile' className='flex items-center justify-center text-white px-3'>
          <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 14s-1 0-1 1 1 3 5 3 5-2 5-3-1-1-1-1H8z' /></svg>
        </Link>
      </div>
      <div className='flex justify-center pointer-events-none'>
        <div className='mt-2 w-36 h-2 bg-black rounded-full' />
      </div>
    </nav>
  )
}

export default MobileBottomNav
