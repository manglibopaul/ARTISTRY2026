import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'

const FloatingMoreButton = () => {
  const { setRightSidebarOpen } = useContext(ShopContext)
  return (
    <button
      type='button'
      onClick={() => setRightSidebarOpen(true)}
      aria-label='More'
      className='fixed right-4 bottom-6 sm:hidden bg-white p-3 rounded-full shadow-lg border border-gray-200'
      style={{ zIndex: 2147483647 }}
    >
      <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M12 6h.01M12 12h.01M12 18h.01' />
      </svg>
    </button>
  )
}

export default FloatingMoreButton
