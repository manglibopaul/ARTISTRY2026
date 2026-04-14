import React, { useContext, useEffect, useState } from 'react' 
import {assets} from '../assets/assets'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext';
import CartSlideout from './CartSlideout';

const Navbar = () => {

    const [visible,setVisible] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [customerSessionReady, setCustomerSessionReady] = useState(false);
    const [customerSessionValid, setCustomerSessionValid] = useState(false);
    const [sellerSessionReady, setSellerSessionReady] = useState(false);
    const [sellerSessionValid, setSellerSessionValid] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const sellerToken = localStorage.getItem('sellerToken');
    const sellerRaw = localStorage.getItem('seller')
    // Auto-clean orphaned seller data (no token but object lingers)
    if (!sellerToken && sellerRaw) localStorage.removeItem('seller')

    const userToken = localStorage.getItem('token') || localStorage.getItem('userToken');
    const adminToken = localStorage.getItem('adminToken');
    const userRaw = localStorage.getItem('user')
    let userObj = null
    try { userObj = userRaw && userToken ? JSON.parse(userRaw) : null } catch { userObj = null }
    // Auto-clean orphaned user data
    if (!userToken && userRaw) localStorage.removeItem('user')

    const {setShowSearch , getCartCount, setRightSidebarOpen} = useContext(ShopContext);
    const isSellerRoute = location.pathname.startsWith('/seller/');

    const navigateWithHardFallback = (path) => {
      setVisible(false)
      if (window.location.pathname === path) return
      window.location.assign(path)
    }

    const handleSupportClick = () => {
      if (userToken) {
        navigate('/support');
      } else if (sellerToken) {
        navigate('/support', { state: { role: 'seller' } });
      } else if (adminToken) {
        navigate('/admin/dashboard?tab=support');
      } else {
        navigate('/support');
      }
    }

  const handleCustomerProfileClick = () => {
    if (customerSessionValid) {
      navigate('/profile')
      return
    }
    navigate('/login')
  }

  useEffect(() => {
    const verifySellerSession = async () => {
      const token = localStorage.getItem('sellerToken')
      if (!token) {
        setSellerSessionValid(false)
        setSellerSessionReady(true)
        return
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
        const res = await fetch(`${apiUrl}/api/sellers/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          localStorage.removeItem('sellerToken')
          localStorage.removeItem('seller')
          setSellerSessionValid(false)
          setSellerSessionReady(true)
          return
        }

        const data = await res.json()
        if (data) {
          localStorage.setItem('seller', JSON.stringify(data))
          setSellerSessionValid(true)
        } else {
          setSellerSessionValid(false)
        }
      } catch {
        setSellerSessionValid(false)
      } finally {
        setSellerSessionReady(true)
      }
    }

    verifySellerSession()

    const verifyCustomerSession = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken')
      if (!token) {
        setCustomerSessionValid(false)
        setCustomerSessionReady(true)
        return
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
        const res = await fetch(`${apiUrl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          localStorage.removeItem('token')
          localStorage.removeItem('userToken')
          localStorage.removeItem('user')
          setCustomerSessionValid(false)
          setCustomerSessionReady(true)
          return
        }

        const data = await res.json()
        if (data) {
          localStorage.setItem('user', JSON.stringify(data))
          setCustomerSessionValid(true)
        } else {
          setCustomerSessionValid(false)
        }
      } catch {
        setCustomerSessionValid(false)
      } finally {
        setCustomerSessionReady(true)
      }
    }

    verifyCustomerSession()
  }, [userToken])

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('userToken')
        if (!token) {
          setUnreadNotifications(0)
          return
        }
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
        const res = await fetch(`${apiUrl}/api/notifications/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        const unread = Array.isArray(data) ? data.filter(n => !n.read).length : 0
        setUnreadNotifications(unread)
      } catch {
        // ignore notification polling errors
      }
    }

    fetchUnreadNotifications()
    const id = setInterval(fetchUnreadNotifications, 10000)
    return () => clearInterval(id)
  }, [userToken])

  return (
    <>
    <div className='relative z-50 flex items-center justify-between py-4 sm:py-5 px-2 sm:px-0 font-medium'>

        <Link to='/' className='text-2xl sm:text-3xl font-bold text-gray-900'>ARTISTRY</Link>
      
      <ul className='hidden sm:flex gap-5 text-sm text-gray-700'>

        <button type='button' onClick={() => navigateWithHardFallback('/')} className='flex flex-col items-center gap-1'>
            <p>HOME</p>
            <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden'/>
        </button>
        <button type='button' onClick={() => navigateWithHardFallback('/collection')} className='flex flex-col items-center gap-1'>
          <p>PRODUCTS</p>
            <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden'/>
        </button>
        <button type='button' onClick={() => navigateWithHardFallback('/artisans')} className='flex flex-col items-center gap-1'>
            <p>ARTISTS</p>
            <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden'/>
        </button>
        <button type='button' onClick={() => navigateWithHardFallback('/about')} className='flex flex-col items-center gap-1'>
          <p>ABOUT US</p>
          <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden'/>
        </button>
        <button onClick={handleSupportClick} className='flex flex-col items-center gap-1 cursor-pointer hover:text-gray-900 text-gray-700'>
          <p>SUPPORT</p>
          <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden'/>
        </button>
      </ul>
      <div className='flex items-center gap-2 sm:gap-3'>
        <button onClick={() => setShowSearch(true)} aria-label='Search' className='w-8 h-8 flex items-center justify-center p-1.5 rounded-md hover:bg-gray-100'>
          <img src={assets.search_icon} className='w-4 h-4' alt='Search' loading='lazy' />
        </button>

        <button onClick={() => setCartOpen(true)} aria-label='Cart' className='relative w-8 h-8 flex items-center justify-center p-1.5 rounded-md hover:bg-gray-100'>
          <img src={assets.cart_icon} className='w-4 h-4' alt='Cart' loading='lazy' />
          <p className='absolute right-[-6px] bottom-[-6px] w-5 h-5 sm:w-4 sm:h-4 text-center flex items-center justify-center bg-black text-white rounded-full text-[10px] sm:text-[8px]'>{getCartCount()}</p>
        </button>

        <Link to='/chat' className='hidden sm:flex relative w-8 h-8 items-center justify-center p-1.5 rounded-md hover:bg-gray-100' aria-label='Chat'>
          <svg className='w-4 h-4 text-gray-700' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' />
          </svg>
        </Link>

        {userObj && (
          <Link to='/notifications' className='hidden sm:flex relative w-8 h-8 items-center justify-center p-1.5 rounded-md hover:bg-gray-100' aria-label='Notifications'>
            <svg className='w-4 h-4 text-gray-700' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' />
            </svg>
            {unreadNotifications > 0 && (
              <p className='absolute right-[-6px] bottom-[-6px] w-5 h-5 sm:w-4 sm:h-4 text-center flex items-center justify-center bg-red-600 text-white rounded-full text-[10px] sm:text-[8px]'>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </p>
            )}
          </Link>
        )}

        {customerSessionReady && customerSessionValid ? (
          <>
            <button type='button' onClick={handleCustomerProfileClick} className='hidden sm:flex relative w-10 h-10 items-center justify-center p-2 rounded-md hover:bg-gray-100' aria-label='Profile'>
              <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z' />
              </svg>
            </button>
            {/* Logout moved to Profile page */}
          </>
        ) : isSellerRoute && sellerSessionReady && sellerSessionValid ? (
          <>
            <Link to='/seller/profile' className='hidden sm:flex relative w-10 h-10 items-center justify-center p-2 rounded-md hover:bg-gray-100' aria-label='Seller Profile'>
              <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z' />
              </svg>
            </Link>
          </>
        ) : (
          <Link to='/login' className='hidden sm:flex relative w-10 h-10 items-center justify-center p-2 rounded-md hover:bg-gray-100 text-sm text-gray-700 hover:text-black' aria-label='Login'>
            <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z' />
            </svg>
            <span className='hidden sm:inline ml-1'>Login</span>
          </Link>
        )}

        <button onClick={() => setRightSidebarOpen(true)} aria-label='Open quick menu' className='w-6 h-6 flex items-center justify-center sm:hidden p-1 mr-2'>
          <svg className='w-5 h-5 text-gray-700' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 6h.01M12 12h.01M12 18h.01' />
          </svg>
        </button>
        <img onClick={()=>setVisible(true)} src={assets.menu_icon} className='w-6 cursor-pointer sm:hidden p-1' alt="" loading="lazy" />
      </div>

      {/* Floating More button moved to a top-level portal in App.jsx to avoid stacking-context issues */}

        {/* sidebar menu for a much smaller devices */}

        {/* Mobile menu backdrop */}
        {visible && (
          <div className='fixed inset-0 bg-black bg-opacity-50 z-40' onClick={()=>setVisible(false)} />
        )}

        {/* Mobile sidebar */}
        <div className={`fixed top-0 right-0 bottom-0 w-[80%] max-w-[320px] bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className='flex flex-col text-gray-600 h-full'>
                <div onClick={()=>setVisible(false)} className='flex items-center gap-4 p-4 border-b'>
                     <img className='h-4 rotate-180' src={assets.dropdown_icon} alt="" />
                     <p className='font-medium'>Back</p>
                </div>
                <button type='button' onClick={() => navigateWithHardFallback('/')} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>HOME</button>
                <button type='button' onClick={() => navigateWithHardFallback('/collection')} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>PRODUCTS</button>
                <button type='button' onClick={() => navigateWithHardFallback('/artisans')} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>ARTISTS</button>
                <button type='button' onClick={() => navigateWithHardFallback('/about')} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>ABOUT US</button>
                <button onClick={() => { setVisible(false); handleSupportClick(); }} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100 cursor-pointer hover:bg-gray-50'>SUPPORT</button>
                <button type='button' onClick={() => { setVisible(false); navigateWithHardFallback('/profile') }} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>PROFILE</button>
                <button type='button' onClick={() => { setVisible(false); navigateWithHardFallback('/chat') }} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>CHAT</button>
                <button type='button' onClick={() => { setVisible(false); navigateWithHardFallback('/notifications') }} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>NOTIFICATIONS</button>
                <button type='button' onClick={() => { setVisible(false); navigateWithHardFallback('/orders') }} className='w-full text-left py-4 pl-6 border-b text-base active:bg-gray-100'>ORDERS</button>
            </div>
        </div>

    </div>
    
    {/* Cart Slideout */}
    <CartSlideout isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}

export default Navbar
