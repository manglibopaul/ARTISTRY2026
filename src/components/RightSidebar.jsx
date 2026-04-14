import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets'

const RightSidebar = () => {
  const { rightSidebarOpen, setRightSidebarOpen, getCartCount } = useContext(ShopContext)

  return (
    <>
      {/* Desktop: slim vertical bar on right */}
      <aside className='hidden md:flex flex-col items-center gap-3 fixed right-4 top-1/3 z-40'>
        <Link to='/chat' className='w-12 h-12 bg-white border rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50' aria-label='Chat'>
          <img src={assets.chat_icon || assets.chat_fallback} alt='chat' className='w-6 h-6' />
        </Link>
        <Link to='/notifications' className='relative w-12 h-12 bg-white border rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50' aria-label='Notifications'>
          <img src={assets.bell_icon || assets.notifications_fallback} alt='notifications' className='w-6 h-6' />
        </Link>
        <Link to='/profile' className='w-12 h-12 bg-white border rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50' aria-label='Profile'>
          <img src={assets.profile_icon || assets.user_fallback} alt='profile' className='w-6 h-6' />
        </Link>
      </aside>

      {/* Mobile / small screens: slide-over */}
      <div className={`fixed inset-y-0 right-0 z-50 transform transition-transform ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden`}>
        <div className='w-64 h-full bg-white border-l shadow-lg'>
          <div className='p-4 border-b flex items-center justify-between'>
            <h3 className='font-medium'>Quick Menu</h3>
            <button onClick={() => setRightSidebarOpen(false)} aria-label='Close' className='p-2 rounded hover:bg-gray-100'>✕</button>
          </div>
          <nav className='p-4 space-y-2'>
            <Link to='/profile' onClick={() => setRightSidebarOpen(false)} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
              <img src={assets.profile_icon || assets.user_fallback} alt='profile' className='w-5 h-5' />
              <span>Profile</span>
            </Link>
            <Link to='/chat' onClick={() => setRightSidebarOpen(false)} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
              <img src={assets.chat_icon || assets.chat_fallback} alt='chat' className='w-5 h-5' />
              <span>Chat</span>
            </Link>
            <Link to='/notifications' onClick={() => setRightSidebarOpen(false)} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
              <img src={assets.bell_icon || assets.notifications_fallback} alt='notifications' className='w-5 h-5' />
              <span>Notifications</span>
            </Link>
            <Link to='/orders' onClick={() => setRightSidebarOpen(false)} className='flex items-center gap-3 p-2 rounded hover:bg-gray-50'>
              <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M3 3h18v4H3zM3 11h18v10H3z' /></svg>
              <span>Orders</span>
            </Link>
          </nav>
        </div>
      </div>
    </>
  )
}

export default RightSidebar
