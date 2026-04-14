import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'

const DebugMoreButton = () => {
  const { setRightSidebarOpen } = useContext(ShopContext)
  const open = () => {
    console.log('DEBUG_MORE_BUTTON clicked')
    setRightSidebarOpen(true)
    // also set a short-lived visual confirmation
    const el = document.createElement('div')
    el.textContent = 'DEBUG: fired'
    el.style.position = 'fixed'
    el.style.left = '50%'
    el.style.top = '40%'
    el.style.transform = 'translate(-50%, -50%)'
    el.style.background = 'rgba(0,0,0,0.8)'
    el.style.color = 'white'
    el.style.padding = '10px 16px'
    el.style.zIndex = 999999999
    el.style.borderRadius = '8px'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1200)
  }

  return (
    <button
      onClick={open}
      aria-label='Debug More'
      style={{
        position: 'fixed',
        right: 16,
        bottom: 100,
        width: 64,
        height: 64,
        background: 'red',
        borderRadius: 12,
        zIndex: 2147483647,
        color: 'white',
        fontWeight: '700',
      }}
    >
      DEBUG
    </button>
  )
}

export default DebugMoreButton
