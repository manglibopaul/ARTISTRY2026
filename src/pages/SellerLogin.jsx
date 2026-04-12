import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import AddressPickerMap from '../components/AddressPickerMap'

const formatAddressFromParts = (address) => {
  if (!address) return ''
  const street = [address.house_number, address.road].filter(Boolean).join(' ').trim()
  const locality = [address.suburb, address.neighbourhood, address.village, address.town, address.city].filter(Boolean).join(', ')
  const region = [address.state, address.postcode, address.country].filter(Boolean).join(', ')
  return [street || locality, locality && street ? locality : '', region].filter(Boolean).join('\n')
}

const normalizeLocationText = (value) => String(value || '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/[.,]/g, '')
  .trim()

const SellerLogin = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(() => !new URLSearchParams(location.search).get('mode')?.toLowerCase().includes('signup'))
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showSellerAddressPicker, setShowSellerAddressPicker] = useState(false)
  const [showPickupPicker, setShowPickupPicker] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    storeName: '',
    artisanType: '',
    phone: '',
    address: '',
    pickupLocations: [],
    proofOfArtisan: null,
  })
  const [pickupInput, setPickupInput] = useState('')

  const handleSellerAddressPick = (loc) => {
    let formatted = '';
    if (loc && typeof loc === 'object' && 'address' in loc) {
      formatted = formatAddressFromParts(loc.address);
    } else if (typeof loc === 'string') {
      formatted = loc;
    }
    if (formatted) {
      setFormData(prev => ({ ...prev, address: formatted }));
    }
  }

  const handlePickupLocationPick = (loc) => {
    if (loc && typeof loc === 'object' && 'address' in loc && 'lat' in loc && 'lon' in loc) {
      setPickupInput({ address: formatAddressFromParts(loc.address), lat: loc.lat, lon: loc.lon });
    } else if (loc && typeof loc === 'object' && 'address' in loc) {
      setPickupInput(formatAddressFromParts(loc.address));
    } else if (typeof loc === 'string') {
      setPickupInput(loc);
    } else {
      setPickupInput('');
    }
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target
    if (name === 'proofOfArtisan') {
      setFormData(prev => ({ ...prev, proofOfArtisan: files[0] }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    setError('')
  }

  const handleAddPickup = () => {
    let loc = pickupInput;
    if (typeof loc === 'object' && loc.address && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
      if (!formData.pickupLocations.some(l => typeof l === 'object' && l.address === loc.address)) {
        setFormData(prev => ({ ...prev, pickupLocations: [...prev.pickupLocations, loc] }))
        setPickupInput('')
      }
    } else {
      loc = String(loc).trim();
      if (loc && !formData.pickupLocations.includes(loc)) {
        setFormData(prev => ({ ...prev, pickupLocations: [...prev.pickupLocations, loc] }))
        setPickupInput('')
      }
    }
  }
  const handleRemovePickup = (idx) => {
    setFormData(prev => ({ ...prev, pickupLocations: prev.pickupLocations.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isLogin && !acceptedTerms) {
      setError('You must accept the Terms and Conditions to sign up.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const endpoint = isLogin
        ? `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')}/api/sellers/login`
        : `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')}/api/sellers/register`

      let dataToSend = formData
      let config = { timeout: 30000 }
      if (!isLogin) {
        const sellerAddressText = normalizeLocationText(formData.address)
        const filteredPickupLocations = formData.pickupLocations.filter((location) => (
          normalizeLocationText(location) && normalizeLocationText(location) !== sellerAddressText
        ))

        dataToSend = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
          if (key === 'pickupLocations') {
            dataToSend.append('pickupLocations', JSON.stringify(filteredPickupLocations))
          } else if (key === 'proofOfArtisan' && value) {
            dataToSend.append('proofOfArtisan', value)
          } else {
            dataToSend.append(key, value)
          }
        })
        config.headers = { 'Content-Type': 'multipart/form-data' }
      }

      const response = await axios.post(endpoint, dataToSend, config)
      // Store token
      localStorage.setItem('sellerToken', response.data.token)
      localStorage.setItem('seller', JSON.stringify(response.data.seller))
      navigate('/seller/dashboard')
    } catch (error) {
      let errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error occurred';
      if (errorMsg.toLowerCase().includes('invalid credentials')) {
        errorMsg = 'Wrong email or password';
      }
      setError(errorMsg);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center px-4'>
      <div className='bg-white rounded-lg shadow-lg p-8 w-full max-w-md'>
        <h2 className='text-2xl font-bold mb-6 text-center'>
          {isLogin ? 'Seller Sign In' : 'Seller Sign Up'}
        </h2>

        {error && (
          <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          {!isLogin && (
            <>
              <input
                type='text'
                name='name'
                placeholder='Full Name'
                value={formData.name}
                onChange={handleChange}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                required
              />
              <input
                type='text'
                name='storeName'
                placeholder='Store Name'
                value={formData.storeName}
                onChange={handleChange}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                required
              />
              <input
                type='text'
                name='artisanType'
                placeholder='Type of Artisan (e.g., Crochet, Woodwork)'
                value={formData.artisanType}
                onChange={handleChange}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                required
              />
              <input
                type='tel'
                name='phone'
                placeholder='Phone Number'
                value={formData.phone}
                onChange={handleChange}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
              />
              <textarea
                name='address'
                placeholder='Address'
                value={formData.address}
                onChange={handleChange}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                rows='3'
              />
              <button
                type='button'
                onClick={() => setShowSellerAddressPicker(v => !v)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50'
              >
                {showSellerAddressPicker ? 'Hide seller address map' : 'Pin seller address on map'}
              </button>
              {showSellerAddressPicker && (
                <AddressPickerMap onLocationPick={handleSellerAddressPick} />
              )}
              <div>
                <label className='block text-sm mb-1'>Pickup Locations</label>
                <button
                  type='button'
                  onClick={() => setShowPickupPicker(v => !v)}
                  className='w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50'
                >
                  {showPickupPicker ? 'Hide pickup location map' : 'Pin pickup location on map'}
                </button>
                {showPickupPicker && (
                  <AddressPickerMap onLocationPick={handlePickupLocationPick} />
                )}
                <div className='flex gap-2 mb-2'>
                  <input
                    type='text'
                    value={pickupInput}
                    onChange={e => setPickupInput(e.target.value)}
                    className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                    placeholder='Add pickup location...'
                  />
                  <button type='button' onClick={handleAddPickup} className='bg-black text-white px-3 py-2 rounded'>Add</button>
                </div>
                <ul className='list-disc pl-5'>
                  {formData.pickupLocations.map((loc, idx) => (
                    <li key={idx} className='flex items-center gap-2'>
                      <span>{typeof loc === 'object' && loc.address ? loc.address : String(loc)}</span>
                      <button type='button' onClick={() => handleRemovePickup(idx)} className='text-red-500 text-xs'>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label className='block text-sm mb-1'>Proof of Artisan (photo of shop, etc.)</label>
                <input
                  type='file'
                  name='proofOfArtisan'
                  accept='image/*'
                  onChange={handleChange}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                  required
                />
              </div>
            </>
          )}

          <input
            type='email'
            name='email'
            placeholder='Email'
            value={formData.email}
            onChange={handleChange}
            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
            required
          />

          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              name='password'
              placeholder='Password'
              value={formData.password}
              onChange={handleChange}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black pr-10'
              required
            />
            <button
              type='button'
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className='absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black focus:outline-none'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575m2.122-2.122A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.403 3.22-1.125 4.575m-2.122 2.122A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575m2.122-2.122A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.403 3.22-1.125 4.575m-2.122 2.122A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.222 4.222l15.556 15.556" /></svg>
              )}
            </button>
          </div>

          {!isLogin && (
            <label className='flex items-start gap-2 text-sm text-gray-700'>
              <input
                type='checkbox'
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className='mt-1'
                required={!isLogin}
              />
              <span>
                I agree to the{' '}
                <Link to='/terms-and-conditions' className='underline hover:text-black'>Terms and Conditions</Link>
                {' '}and{' '}
                <Link to='/privacy-policy' className='underline hover:text-black'>Privacy Policy</Link>.
              </span>
            </label>
          )}

          <button
            type='submit'
            disabled={loading || (!isLogin && !acceptedTerms)}
            className='w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50'
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>

          {isLogin && (
            <div className='text-right'>
              <button type='button' onClick={() => navigate('/seller/forgot-password')} className='text-sm text-gray-500 hover:text-black underline'>
                Forgot password?
              </button>
            </div>
          )}
        </form>

        <p className='text-center mt-6 text-gray-600'>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setAcceptedTerms(false)
              setFormData({
                email: '',
                password: '',
                name: '',
                storeName: '',
                artisanType: '',
                phone: '',
                address: '',
                pickupLocations: [],
                proofOfArtisan: null,
              })
            }}
            className='text-black font-medium hover:underline'
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default SellerLogin
