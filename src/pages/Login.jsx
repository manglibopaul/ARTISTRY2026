import React, { useEffect, useState } from 'react'
// Simple eye icon SVGs for show/hide password
const EyeIcon = ({ open }) => open ? (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.223-3.592m3.31-2.687A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.973 9.973 0 01-4.293 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 6L6 6" /></svg>
);
import { Link, useNavigate } from 'react-router-dom'
import MapPin from '../components/MapPin'
import { geocodeAddress } from '../utils/geocoding'
import AddressPickerMap from '../components/AddressPickerMap'

const Login = () => {
  const [mode, setMode] = useState('Sign In'); // 'Sign In' or 'Sign Up'
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupOtp, setSignupOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [signupMapLat, setSignupMapLat] = useState(null);
  const [signupMapLon, setSignupMapLon] = useState(null);
  const [signupMapLoading, setSignupMapLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

  useEffect(() => {
    let canceled = false;

    const geocodeSignupAddress = async () => {
      if (mode !== 'Sign Up') {
        setSignupMapLat(null);
        setSignupMapLon(null);
        setSignupMapLoading(false);
        return;
      }

      const cleanStreet = String(street || '').trim();
      const cleanCity = String(city || '').trim();
      const cleanState = String(state || '').trim();
      const cleanCountry = String(country || '').trim() || 'Philippines';

      if (!cleanStreet || !cleanCity || !cleanState) {
        setSignupMapLat(null);
        setSignupMapLon(null);
        setSignupMapLoading(false);
        return;
      }

      setSignupMapLoading(true);

      try {
        const coords = await geocodeAddress(cleanStreet, cleanCity, `${cleanState}, ${cleanCountry}`);
        if (!canceled && coords) {
          setSignupMapLat(coords.lat);
          setSignupMapLon(coords.lon);
        }
        if (!canceled && !coords) {
          setSignupMapLat(null);
          setSignupMapLon(null);
        }
      } catch {
        if (!canceled) {
          setSignupMapLat(null);
          setSignupMapLon(null);
        }
      } finally {
        if (!canceled) setSignupMapLoading(false);
      }
    };

    const timer = setTimeout(geocodeSignupAddress, 450);
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [mode, street, city, state, country]);

  const readErrorMessage = async (res) => {
    const text = await res.text();
    if (!text) return 'Authentication failed';
    try {
      const parsed = JSON.parse(text);
      return parsed?.message || 'Authentication failed';
    } catch {
      return text;
    }
  };

  const sendSignupOtp = async () => {
    setError(null)
    setOtpNotice('')

    const normalizedEmail = String(email || '').trim()
    if (!normalizedEmail) {
      setError('Enter your email first to receive an OTP.')
      return
    }

    const normalizedLower = normalizedEmail.toLowerCase()
    const isGmail = normalizedLower.endsWith('@gmail.com') || normalizedLower.endsWith('@googlemail.com')
    if (!isGmail) {
      setError('OTP can only be sent to Gmail addresses. Please provide a Gmail account.')
      return
    }

    setSendingOtp(true)
    try {
      const res = await fetch(`${apiUrl}/api/users/register/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })

      if (!res.ok) {
        const message = await readErrorMessage(res)
        throw new Error(message || 'Failed to send OTP')
      }

      setOtpNotice('OTP sent to your email. Check inbox/spam.')
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mode === 'Sign Up' && !acceptedTerms) {
      setError('You must accept the Terms and Conditions to sign up.');
      return;
    }
    if (mode === 'Sign Up' && !String(signupOtp || '').trim()) {
      setError('OTP is required to complete sign up.');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'Sign In' ? `${apiUrl}/api/users/login` : `${apiUrl}/api/users/register`;
      const body = mode === 'Sign In' ? { email, password } : { name, email, password, street, city, state, zipcode, country, phone, otp: signupOtp };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const message = await readErrorMessage(res);
        // If backend says user not found, switch to sign up mode
        if (message && message.toLowerCase().includes('user not found')) {
          setMode('Sign Up');
          setError('User not found. Please sign up.');
          setLoading(false);
          return;
        }
        throw new Error(message || 'Authentication failed');
      }

      const data = await res.json();
      // Save token and user info
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect after login/register — go to home page
      navigate('/');
    } catch (err) {
      // Show a user-friendly message for invalid credentials
      if (err.message && err.message.toLowerCase().includes('invalid credentials')) {
        setError('Wrong email or password');
      } else {
        setError(err.message || 'Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinnedAddress = ({ lat, lon, address }) => {
    setSignupMapLat(lat)
    setSignupMapLon(lon)

    if (!address) return

    const streetParts = [address.house_number, address.road].filter(Boolean)
    const nextStreet = streetParts.join(' ').trim() || address.suburb || address.neighbourhood || ''
    const nextCity = address.city || address.town || address.village || address.county || ''
    const nextState = address.state || address.region || ''
    const nextZip = address.postcode || ''
    const nextCountry = address.country || 'Philippines'

    if (nextStreet) setStreet(nextStreet)
    if (nextCity) setCity(nextCity)
    if (nextState) setState(nextState)
    if (nextZip) setZipcode(nextZip)
    if (nextCountry) setCountry(nextCountry)
  }

  return (
    <div className='min-h-[70vh] flex items-center justify-center py-12'>
      <div className='w-full max-w-md bg-white rounded-lg shadow-lg p-8'>
        <h2 className='text-center text-2xl font-semibold mb-6'>{mode === 'Sign In' ? 'Sign In' : 'Sign Up'}</h2>

        <form onSubmit={submit} className='space-y-4'>
          {mode === 'Sign Up' && (
            <>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder='Name'
                className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
              />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder='Phone'
                className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
              />
              <input
                value={street}
                onChange={e => setStreet(e.target.value)}
                required
                placeholder='Street'
                className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
              />
              <div className='flex gap-2'>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                  placeholder='City'
                  className='w-1/2 border rounded-md px-4 py-3 placeholder-gray-400'
                />
                <input
                  value={state}
                  onChange={e => setState(e.target.value)}
                  required
                  placeholder='Province'
                  className='w-1/2 border rounded-md px-4 py-3 placeholder-gray-400'
                />
              </div>
              <div className='flex gap-2'>
                <input
                  value={zipcode}
                  onChange={e => setZipcode(e.target.value)}
                  required
                  placeholder='Zipcode'
                  className='w-1/2 border rounded-md px-4 py-3 placeholder-gray-400'
                />
                <input
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  required
                  placeholder='Country'
                  className='w-1/2 border rounded-md px-4 py-3 placeholder-gray-400'
                />
              </div>

              <div>
                <button
                  type='button'
                  onClick={() => setShowAddressPicker(v => !v)}
                  className='w-full border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50'
                >
                  {showAddressPicker ? 'Hide map picker' : 'Pin address on map'}
                </button>
                {showAddressPicker && (
                  <AddressPickerMap onLocationPick={handlePinnedAddress} />
                )}
              </div>

              <div className='mt-1'>
                {signupMapLoading && (
                  <p className='text-xs text-gray-500 mb-2'>Locating address on map...</p>
                )}
                {signupMapLat && signupMapLon && (
                  <MapPin
                    lat={signupMapLat}
                    lon={signupMapLon}
                    label='Sign-up Address Preview'
                    address={`${street}, ${city}, ${state} ${zipcode}, ${country || 'Philippines'}`}
                    isPickup={false}
                  />
                )}
              </div>
            </>
          )}

          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            type='email'
            placeholder='Email'
            className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
          />

          {mode === 'Sign Up' && (
            <>
              <div className='flex gap-2'>
                <input
                  value={signupOtp}
                  onChange={e => setSignupOtp(e.target.value)}
                  required
                  placeholder='Enter OTP'
                  className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
                />
                <button
                  type='button'
                  onClick={sendSignupOtp}
                  disabled={sendingOtp}
                  className='whitespace-nowrap border rounded-md px-4 py-3 text-sm hover:bg-gray-50 disabled:opacity-60'
                >
                  {sendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
              {otpNotice && <p className='text-xs text-green-700'>{otpNotice}</p>}
            </>
          )}

          <div className="relative">
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              type={showPassword ? 'text' : 'password'}
              placeholder='Password'
              className='w-full border rounded-md px-4 py-3 pr-10 placeholder-gray-400'
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          {mode === 'Sign Up' && (
            <label className='flex items-start gap-2 text-sm text-gray-700'>
              <input
                type='checkbox'
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className='mt-1'
                required={mode === 'Sign Up'}
              />
              <span>
                I agree to the{' '}
                <Link to='/terms-and-conditions' className='underline hover:text-black'>Terms and Conditions</Link>
                {' '}and{' '}
                <Link to='/privacy-policy' className='underline hover:text-black'>Privacy Policy</Link>.
              </span>
            </label>
          )}

          {error && <p className='text-sm text-red-500'>{error}</p>}

          {mode === 'Sign In' && (
            <div className='text-right'>
              <button type='button' onClick={() => navigate('/forgot-password')} className='text-sm text-gray-500 hover:text-black underline'>
                Forgot password?
              </button>
            </div>
          )}

          <button
            type='submit'
            disabled={loading || (mode === 'Sign Up' && !acceptedTerms)}
            className='w-full bg-black text-white py-3 rounded-md text-center font-medium hover:opacity-95'
          >
            {loading ? (mode === 'Sign In' ? 'Signing in…' : 'Creating account…') : (mode === 'Sign In' ? 'Sign In' : 'Sign Up')}
          </button>

          <div className='text-center text-sm text-gray-600'>
            {mode === 'Sign In' ? (
              <>
                Don't have an account? <button type='button' onClick={() => setMode('Sign Up')} className='text-black underline ml-1'>Sign Up</button>
              </>
            ) : (
              <>
                Already have an account? <button type='button' onClick={() => { setMode('Sign In'); setAcceptedTerms(false); setSignupOtp(''); setOtpNotice(''); }} className='text-black underline ml-1'>Sign In</button>
              </>
            )}
          </div>
        </form>

        <div className='mt-4 text-center text-sm text-gray-600'>
          {mode === 'Sign In' ? (
            <>
              Are you an artist?{' '}
              <button
                type='button'
                onClick={() => navigate('/seller/login')}
                className='text-black underline'
              >
                Artist Sign In
              </button>
            </>
          ) : (
            <>
              Want to sell on Artistry?{' '}
              <button
                type='button'
                onClick={() => navigate('/seller/login?mode=signup')}
                className='text-black underline'
              >
                Artist Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
