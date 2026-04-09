import React from 'react'
import { Routes,Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Collection from './pages/Collection'
import About from './pages/About'
import Product from './pages/Product'
import Cart from './pages/Cart'
import ArView from './pages/ArView'
import Login from './pages/Login'
import Orders from './pages/Orders'
import OrderDetails from './pages/OrderDetails'
import Profile from './pages/Profile'
import PlaceOrder from './pages/PlaceOrder'
import Chat from './pages/Chat'
import SupportChat from './pages/SupportChat'
import Notifications from './pages/Notifications'
import ArtisanDirectory from './pages/ArtisanDirectory'
import ArtisanProfile from './pages/ArtisanProfile'
import SellerLogin from './pages/SellerLogin'
import SellerDashboard from './pages/SellerDashboard'
import SellerProfile from './pages/SellerProfile'
import SellerOrders from './pages/SellerOrders'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SellerForgotPassword from './pages/SellerForgotPassword'
import SellerResetPassword from './pages/SellerResetPassword'
import TermsAndConditions from './pages/TermsAndConditions'
import PrivacyPolicy from './pages/PrivacyPolicy'
import NotFound from './pages/NotFound'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SearchBar from './components/SearchBar'



const App = () => {
  const location = useLocation();
  
  // Hide navbar and footer on seller pages; hide navbar and footer on admin pages
  const isSellerPage = location.pathname.startsWith('/seller/');
  const isAdminPage = location.pathname.startsWith('/admin');
  
  return (
    <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
      {!isSellerPage && !isAdminPage && <Navbar />}
      {!isSellerPage && !isAdminPage && <SearchBar/>}
      <Routes location={location} key={location.pathname}>
        <Route path='/' element={<Home/>} />
        <Route path='/collection' element={<Collection/>} />
        <Route path='/about' element={<About/>} />
        <Route path='/product/:productRef' element={<Product/>} />
        <Route path='/cart' element={<Cart/>} />
        <Route path='/ar-view' element={<ArView/>} />
        <Route path='/login' element={<Login/>} />
        <Route path='/forgot-password' element={<ForgotPassword/>} />
        <Route path='/reset-password' element={<ResetPassword/>} />
        <Route path='/terms-and-conditions' element={<TermsAndConditions/>} />
        <Route path='/privacy-policy' element={<PrivacyPolicy/>} />
        <Route path='/orders' element={<Orders/>} />
        <Route path='/orders/:id' element={<OrderDetails/>} />
        <Route path='/profile' element={<Profile/>} />
        <Route path='/chat' element={<Chat/>} />
        <Route path='/notifications' element={<Notifications/>} />
        <Route path='/support' element={<SupportChat/>} />
        <Route path='/place-order' element={<PlaceOrder/>} />
        <Route path='/artisans' element={<ArtisanDirectory/>} />
        <Route path='/artisan/:sellerRef' element={<ArtisanProfile/>} />
        {/* Full page Chat removed; use floating ChatWidget instead */}
        <Route path='/seller/login' element={<SellerLogin/>} />
        <Route path='/seller/forgot-password' element={<SellerForgotPassword/>} />
        <Route path='/seller/reset-password' element={<SellerResetPassword/>} />
        <Route path='/seller/dashboard' element={<SellerDashboard/>} />
        <Route path='/seller/orders' element={<SellerOrders/>} />
        <Route path='/seller/profile' element={<SellerProfile/>} />
        <Route path='/admin' element={<AdminDashboard/>} />
        <Route path='/admin/dashboard' element={<AdminDashboard/>} />
        <Route path='/admin/login' element={<AdminLogin/>} />
        <Route path='*' element={<NotFound/>} />

      </Routes>
      {/* Floating chat widget removed — chat is embedded per-product now */}
    </div>
  )
}

export default App
