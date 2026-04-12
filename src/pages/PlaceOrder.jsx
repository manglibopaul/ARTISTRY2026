// Simple Modal for QR code
function QRModal({ open, onClose, qrUrl, storeName }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 shadow-lg relative max-w-full w-80 flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl font-bold"
          onClick={onClose}
        >
          ×
        </button>
        <img src={qrUrl} alt={`${storeName} GCash QR`} className="w-64 h-64 object-contain border-2 border-blue-400 rounded bg-white p-2 mb-2" />
        <p className="text-xs text-gray-700 text-center">Scan this QR code to pay <span className="font-semibold">{storeName}</span> via GCash.</p>
      </div>
    </div>
  );
}
// Modal to preview pickup-location photos
function PhotoModal({ open, onClose, photoUrl, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div className="bg-white rounded-lg p-4 shadow-lg max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{title || 'Photo preview'}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-black">✕</button>
        </div>
        <img src={photoUrl} alt={title || 'pickup photo'} className="max-w-[80vw] max-h-[75vh] object-contain" />
      </div>
    </div>
  )
}
import React, { useContext, useState } from 'react'
import Title from '../components/Title'
import MapPin from '../components/MapPin'
import CartTotal from '../components/CartTotal'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
// import MapPin from '../components/MapPin'
// import { geocodeAddress, geocodeQuery } from '../utils/geocoding'

const parseCartKey = (key) => {
  if (typeof key !== 'string') return { id: key, color: null, size: null };
  if (key.includes('::')) {
    const [id, ...rest] = key.split('::');
    const [color = null, size = null] = rest.join('::').split('||');
    return { id, color: color || null, size: size || null };
  }
  const dashIndex = key.indexOf('-');
  if (dashIndex > 0 && /^\d+$/.test(key.slice(0, dashIndex))) {
    return { id: key.slice(0, dashIndex), color: key.slice(dashIndex + 1) || null, size: null };
  }
  return { id: key, color: null, size: null };
}

const normalizePickupLocations = (seller) => {
  const raw = seller?.pickupLocations
  let normalized = []

  if (Array.isArray(raw)) {
    normalized = raw
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) normalized = parsed
      else if (typeof parsed === 'string') normalized = [parsed]
    } catch {
      normalized = raw.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
    }
  }

  normalized = normalized.map((s) => String(s || '').trim()).filter(Boolean)

  return [...new Set(normalized)]
}

// Helper to build items from cart
const buildItemsFromCart = (cartsItems, products) => {
  const items = [];
  for (const key in cartsItems) {
    const qty = cartsItems[key];
    if (!qty || qty <= 0) continue;
    const { id, color, size } = parseCartKey(key);
    // key may be string id; match product by id or _id
    const prod = products.find(p => (p._id ? String(p._id) === String(id) : String(p.id) === String(id)));
    if (prod) {
      items.push({ productId: prod.id || prod._id, name: prod.name, price: prod.price, quantity: qty, color: color || null, size: size || null, sellerId: prod.sellerId || prod.sellerId || null });
    } else {
      // fallback, include id only
      items.push({ productId: Number(id), quantity: qty, color: color || null, size: size || null });
    }
  }
  return items;
}

const PLACEHOLDER_PATTERN = /\b(test|asdf|qwe|zxc|n\/?a|na|none|unknown|sample|dummy|fake|12345|1111)\b/i;

const isLikelyPlaceholderText = (value) => {
  const text = String(value || '').trim();
  if (!text) return true;
  if (PLACEHOLDER_PATTERN.test(text)) return true;

  const compact = text.replace(/\s+/g, '');
  if (compact.length < 3) return true;
  if (/^(.)\1+$/.test(compact)) return true;

  return false;
};

const hasMinLetters = (value, min = 3) => {
  const matches = String(value || '').match(/[A-Za-z]/g);
  return (matches?.length || 0) >= min;
};

const validateDeliveryAddress = ({ fullName, phone, regionProvinceCityBarangay, street, zipcode }) => {
  const errors = [];

  const name = String(fullName || '').trim();
  if (!name || name.length < 3 || !hasMinLetters(name, 3) || isLikelyPlaceholderText(name)) {
    errors.push('Use your real full name (first and last name).');
  }

  const normalizedPhone = String(phone || '').replace(/[\s()-]/g, '');
  if (!/^(?:\+63|63|0)?9\d{9}$/.test(normalizedPhone)) {
    errors.push('Use a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).');
  }

  const location = String(regionProvinceCityBarangay || '').trim();
  const locationParts = location.split(/[/,]/).map((x) => x.trim()).filter(Boolean);
  if (!location || location.length < 5 || !hasMinLetters(location, 4) || locationParts.length < 1 || isLikelyPlaceholderText(location)) {
    errors.push('Provide a valid Region/Province/City/Barangay.');
  }

  const streetAddress = String(street || '').trim();
  if (!streetAddress || streetAddress.length < 5 || !/[A-Za-z]/.test(streetAddress) || isLikelyPlaceholderText(streetAddress)) {
    errors.push('Provide a complete street address with house/building number.');
  }

  if (!/^\d{4}$/.test(String(zipcode || '').trim())) {
    errors.push('Use a valid 4-digit postal code.');
  }

  return errors;
};

const buildPickupGeocodeQueries = (location) => {
  const base = String(location || '').trim();
  if (!base) return [];

  const withoutCountry = base.replace(/\s*,\s*philippines\s*$/i, '').trim();
  const withoutZip = withoutCountry.replace(/\b\d{4}\b/g, '').replace(/\s+,/g, ',').replace(/,{2,}/g, ',').replace(/\s{2,}/g, ' ').replace(/\s+,/g, ', ').trim();

  return [
    base,
    withoutCountry,
    withoutZip,
    `${withoutZip || withoutCountry || base}, Philippines`,
  ].filter((value, index, array) => value && array.indexOf(value) === index);
};

const PlaceOrder = () => {

  const [method,setMethod] = useState('delivery')
  const [paymentOption, setPaymentOption] = useState('cod')
  const [gcashReceipt, setGcashReceipt] = useState(null);
  const [gcashReceiptError, setGcashReceiptError] = useState('');

  const {navigate} = useContext(ShopContext);
  const { products, cartsItems, refreshProducts, getCartAmount, currency, clearCart } = useContext(ShopContext);
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [regionProvinceCityBarangay, setRegionProvinceCityBarangay] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [street, setStreet] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('Philippines');
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [, setLoadingSavedAddress] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [pickupLocationsBySeller, setPickupLocationsBySeller] = useState({})
  const [sellerPickupLocations, setSellerPickupLocations] = useState([])
  const [pickupPhotosBySeller, setPickupPhotosBySeller] = useState({})
  const [reservationDateTime] = useState('')
  const [reservationNote] = useState('')
  const [appliedDiscount] = useState(0)
  const [appliedCoupon] = useState(null)
  const [cartData, setCartData] = React.useState([])
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [selectedShippingRate, setSelectedShippingRate] = React.useState(null)
  const [sellerShippingInfo, setSellerShippingInfo] = React.useState({})
  const [sellerPaymentInfo, setSellerPaymentInfo] = React.useState({})
  const [availablePaymentMethods, setAvailablePaymentMethods] = React.useState({ cod: true, gcash: true })
  const [modalState, setModalState] = React.useState({
    open: false,
    title: '',
    message: '',
  })
  const [photoModal, setPhotoModal] = React.useState({ open: false, photoUrl: '', title: '' })
  const [deliveryMapLat, setDeliveryMapLat] = useState(null)
  const [deliveryMapLon, setDeliveryMapLon] = useState(null)
  const [pickupMapLocations, setPickupMapLocations] = useState({})

  const openModal = (title, message) => {
    setModalState({ open: true, title, message })
  }

  const closeModal = () => {
    setModalState({ open: false, title: '', message: '' })
  }

  const openPhotoModal = (url, title) => {
    setPhotoModal({ open: true, photoUrl: url, title: title || 'Photo preview' })
  }

  const closePhotoModal = () => {
    setPhotoModal({ open: false, photoUrl: '', title: '' })
  }

  React.useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  React.useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUseSavedAddress(false)
      setSavedAddress(null)
      return
    }

    const fetchProfileAddress = async () => {
      try {
        setLoadingSavedAddress(true)
        const res = await axios.get(`${apiUrl}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const profile = res.data || {}
        const nextSavedAddress = {
          fullName: profile.name || '',
          phone: profile.phone || '',
          regionProvinceCityBarangay: [profile.city, profile.state].filter(Boolean).join(', '),
          zipcode: profile.zipcode || '',
          street: profile.street || '',
          email: profile.email || '',
          country: profile.country || 'Philippines',
        }

        const hasAddress = Boolean(
          nextSavedAddress.fullName ||
          nextSavedAddress.phone ||
          nextSavedAddress.regionProvinceCityBarangay ||
          nextSavedAddress.zipcode ||
          nextSavedAddress.street
        )

        if (hasAddress) {
          setSavedAddress(nextSavedAddress)
          setUseSavedAddress(true)
          setFullName(nextSavedAddress.fullName)
          setPhone(nextSavedAddress.phone)
          setRegionProvinceCityBarangay(nextSavedAddress.regionProvinceCityBarangay)
          setZipcode(nextSavedAddress.zipcode)
          setStreet(nextSavedAddress.street)
          setEmail(nextSavedAddress.email)
          setCountry(nextSavedAddress.country)
        } else {
          setSavedAddress(null)
          setUseSavedAddress(false)
        }
      } catch (error) {
        console.error('Failed to load saved address:', error)
        setSavedAddress(null)
        setUseSavedAddress(false)
      } finally {
        setLoadingSavedAddress(false)
      }
    }

    fetchProfileAddress()
  }, [apiUrl])

  // Fetch pickup locations and shipping settings from sellers in cart
  React.useEffect(() => {
    const fetchSellerData = async () => {
      // Gather unique sellerIds from cart products
      const sellerIds = new Set()
      for (const key in cartsItems) {
        if (!cartsItems[key] || cartsItems[key] <= 0) continue
        const { id } = parseCartKey(key)
        const prod = (products || []).find(p => String(p._id || p.id) === String(id))
        if (prod?.sellerId) sellerIds.add(prod.sellerId)
      }
      if (sellerIds.size === 0) {
        setSellerPickupLocations([])
        setSellerPaymentInfo({})
        setAvailablePaymentMethods({ cod: true, gcash: true })
        return
      }

      const allLocations = []
      const allRates = []
      const shippingInfo = {}
      const paymentInfo = {}
      for (const sid of sellerIds) {
        try {
          const res = await fetch(`${apiUrl}/api/sellers/${sid}`)
            if (res.ok) {
            const seller = await res.json()
            // Pickup locations
            const locs = normalizePickupLocations(seller)
            locs.forEach(loc => {
              if (!allLocations.some(l => l.location === loc && l.sellerId === sid)) {
                allLocations.push({ location: loc, sellerId: sid, storeName: seller.storeName || 'Seller' })
              }
            })
            // Shipping settings
            const settings = seller.shippingSettings || {}
            const rates = Array.isArray(settings.shippingRates) ? settings.shippingRates : []
            if (rates.length > 0) {
              rates.forEach(r => {
                if (r.name && !allRates.some(ar => ar.name === r.name && ar.price === r.price)) {
                  allRates.push({ name: r.name, price: Number(r.price) || 0, estimatedDays: r.estimatedDays || '' })
                }
              })
            }
            shippingInfo[sid] = {
              rates,
              freeShippingMinimum: Number(settings.freeShippingMinimum) || 0,
              storeName: seller.storeName || 'Seller',
            }

            // Pickup-location photos (if seller provided pickupLocationPhotos mapping)
            try {
              const rawPhotos = seller.pickupLocationPhotos || seller.pickupLocationPhotos || null
              let normalizedPhotos = {}
              if (rawPhotos) {
                if (typeof rawPhotos === 'string') {
                  try { normalizedPhotos = JSON.parse(rawPhotos) } catch { normalizedPhotos = {} }
                } else if (typeof rawPhotos === 'object') {
                  normalizedPhotos = rawPhotos
                }
                // Ensure arrays
                for (const k of Object.keys(normalizedPhotos)) {
                  if (!Array.isArray(normalizedPhotos[k])) normalizedPhotos[k] = [String(normalizedPhotos[k] || '').trim()].filter(Boolean)
                }
              }
              setPickupPhotosBySeller(prev => ({ ...(prev || {}), [sid]: normalizedPhotos }))
            } catch (e) {
              console.error('Failed to parse pickupLocationPhotos for seller', sid, e)
            }

            const paymentSettings = seller.paymentSettings || {}
            paymentInfo[sid] = {
              sellerId: Number(sid),
              storeName: seller.storeName || 'Seller',
              acceptsCOD: paymentSettings.acceptsCOD !== false,
              acceptsGCash: paymentSettings.acceptsGCash !== false,
              gcashAccountName: String(paymentSettings.gcashAccountName || '').trim(),
              gcashNumber: String(paymentSettings.gcashNumber || '').trim(),
              gcashQr: String(paymentSettings.gcashQr || '').trim(),
            }
          }
        } catch (e) { console.error('Failed to fetch seller data', e) }
      }
      console.log('DEBUG allLocations:', allLocations)
      setSellerPickupLocations(allLocations)
      if (allLocations.length > 0) {
        setPickupLocationsBySeller((prev) => {
          const next = { ...prev }
          for (const loc of allLocations) {
            const sid = String(loc.sellerId)
            if (!next[sid]) next[sid] = loc.location
          }
          return next
        })
      }
      // Set shipping rates — if sellers have custom rates use them, otherwise default
      if (allRates.length > 0) {
        if (!selectedShippingRate) setSelectedShippingRate(allRates[0])
      } else {
        const defaultRates = [{ name: 'Standard Shipping', price: 40, estimatedDays: '5-7 business days' }]
        if (!selectedShippingRate) setSelectedShippingRate(defaultRates[0])
      }
      setSellerShippingInfo(shippingInfo)
      setSellerPaymentInfo(paymentInfo)

      const paymentValues = Object.values(paymentInfo)
      const canUseCOD = paymentValues.length === 0 ? true : paymentValues.every((info) => info.acceptsCOD)
      const canUseGCash = paymentValues.length === 0 ? true : paymentValues.every((info) => info.acceptsGCash)
      setAvailablePaymentMethods({ cod: canUseCOD, gcash: canUseGCash })

      setPaymentOption((prev) => {
        if (prev === 'cod' && !canUseCOD) return canUseGCash ? 'gcash' : 'cod'
        if (prev === 'gcash' && !canUseGCash) return canUseCOD ? 'cod' : 'gcash'
        return prev
      })
    }
    fetchSellerData()
  }, [cartsItems, products, apiUrl, selectedShippingRate])

  const pickupLocationsGrouped = React.useMemo(() => {
    const grouped = {}
    for (const loc of sellerPickupLocations) {
      const sid = String(loc.sellerId)
      if (!grouped[sid]) {
        grouped[sid] = { sellerId: sid, storeName: loc.storeName || 'Seller', locations: [] }
      }
      if (!grouped[sid].locations.includes(loc.location)) {
        grouped[sid].locations.push(loc.location)
      }
    }
    const result = Object.values(grouped)
    console.log('DEBUG pickupLocationsGrouped:', result)
    return result
  }, [sellerPickupLocations])

  React.useEffect(() => {
    const tempData = []
    for (const items in cartsItems) {
      if (cartsItems[items] > 0) {
        const { id, color, size } = parseCartKey(items)
        tempData.push({
          _id: items,
          productId: id,
          color: color || null,
          size: size || null,
          quantity: cartsItems[items]
        })
      }
    }
    setCartData(tempData)
  }, [cartsItems])

  // Geocode delivery address to get map coordinates


  const subtotal = getCartAmount ? getCartAmount() : 0

  const computedShippingFee = React.useMemo(() => {
    if (method === 'pickup') return 0

    const sellerSubtotals = {}
    const sellerIds = new Set()
    for (const key in cartsItems) {
      const qty = Number(cartsItems[key]) || 0
      if (qty <= 0) continue
      const { id } = parseCartKey(key)
      const prod = (products || []).find(p => String(p._id || p.id) === String(id))
      const sid = Number(prod?.sellerId)
      if (!Number.isFinite(sid) || sid <= 0) continue
      sellerIds.add(sid)
      const line = (Number(prod?.price) || 0) * qty
      sellerSubtotals[sid] = (sellerSubtotals[sid] || 0) + line
    }

    let totalShipping = 0
    const selectedMethodName = selectedShippingRate?.name || 'Standard Shipping'
    sellerIds.forEach((sid) => {
      const info = sellerShippingInfo[sid] || {}
      const rates = Array.isArray(info.rates) ? info.rates : []
      const matched = rates.find(r => r?.name === selectedMethodName)
      const fallback = rates[0]
      const baseRate = Number((matched || fallback)?.price)
      let sellerFee = Number.isFinite(baseRate) ? baseRate : 40

      const freeMin = Number(info.freeShippingMinimum) || 0
      if (freeMin > 0 && (sellerSubtotals[sid] || 0) >= freeMin) {
        sellerFee = 0
      }

      totalShipping += sellerFee
    })

    if (sellerIds.size === 0) return 40
    return totalShipping
  }, [method, cartsItems, products, sellerShippingInfo, selectedShippingRate])

  const fillNewAddress = () => {
    if (savedAddress) {
      setFullName(savedAddress.fullName)
      setPhone(savedAddress.phone)
      setRegionProvinceCityBarangay('')
      setZipcode('')
      setStreet('')
      setEmail(savedAddress.email)
      setCountry(savedAddress.country || 'Philippines')
    }
    setUseSavedAddress(false)
  }

  const useProfileAddress = () => {
    if (!savedAddress) return
    setUseSavedAddress(true)
    setFullName(savedAddress.fullName)
    setPhone(savedAddress.phone)
    setRegionProvinceCityBarangay(savedAddress.regionProvinceCityBarangay)
    setZipcode(savedAddress.zipcode)
    setStreet(savedAddress.street)
    setEmail(savedAddress.email)
    setCountry(savedAddress.country || 'Philippines')
  }

  const selectedAddress = useSavedAddress && savedAddress
    ? savedAddress
    : { fullName, phone, regionProvinceCityBarangay, zipcode, street, email, country }

  return (
    <div className='min-h-screen bg-white pt-6 sm:pt-8 pb-12 sm:pb-20 px-4 sm:px-0'>
      <div className='max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12'>
        {/* ----------------Left side - Form-------------- */}
        <div className='space-y-6 sm:space-y-8'>
          
          {/* Contact Section */}
          {/* Contact Section removed */}

          {/* Delivery Section */}
          {method !== 'pickup' ? (
            <div>
              <h2 className='text-xl sm:text-2xl font-bold mb-3 sm:mb-4'>Delivery</h2>

              {isLoggedIn && savedAddress && (
                <div className='mb-4 rounded border border-gray-200 bg-gray-50 p-4'>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-sm font-semibold text-gray-900'>Saved address from your profile</p>
                      <p className='text-xs text-gray-500'>Use it as-is, or switch to a new address for this order.</p>
                    </div>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={useProfileAddress}
                        className={`px-3 py-2 rounded text-sm border ${useSavedAddress ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300'}`}
                      >
                        Use saved address
                      </button>
                      <button
                        type='button'
                        onClick={fillNewAddress}
                        className={`px-3 py-2 rounded text-sm border ${!useSavedAddress ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300'}`}
                      >
                        Use new address
                      </button>
                    </div>
                  </div>

                  {useSavedAddress ? (
                    <div className='mt-4 grid gap-2 text-sm text-gray-700'>
                      <div><span className='font-medium'>Name:</span> {selectedAddress.fullName || '-'}</div>
                      <div><span className='font-medium'>Phone:</span> {selectedAddress.phone || '-'}</div>
                      <div><span className='font-medium'>Area:</span> {selectedAddress.regionProvinceCityBarangay || '-'}</div>
                      <div><span className='font-medium'>Street:</span> {selectedAddress.street || '-'}</div>
                      <div><span className='font-medium'>Postal code:</span> {selectedAddress.zipcode || '-'}</div>
                    </div>
                  ) : (
                    <p className='mt-3 text-xs text-gray-500'>Enter the new delivery address below for this order.</p>
                  )}
                </div>
              )}
              
              {/* Country Select */}
              {!useSavedAddress && (
                <>
                  <select 
                    value={country} 
                    onChange={e=>setCountry(e.target.value)}
                    className='w-full border border-gray-300 rounded px-3 sm:px-4 py-2.5 sm:py-3 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm sm:text-base'
                  >
                    <option value='Philippines'>Philippines</option>
                  </select>

                  {/* Full Name */}
                  <input 
                    value={fullName} 
                    onChange={e=>setFullName(e.target.value)} 
                    className='w-full border border-gray-300 rounded px-3 sm:px-4 py-2.5 sm:py-3 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base' 
                    type="text" 
                    placeholder='Full name' 
                  />

                  {/* Phone Number */}
                  <input 
                    value={phone} 
                    onChange={e=>setPhone(e.target.value)} 
                    className='w-full border border-gray-300 rounded px-3 sm:px-4 py-2.5 sm:py-3 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base' 
                    type="text" 
                    placeholder='Phone number' 
                  />

                  {/* Region/Province/City/Barangay */}
                  <input 
                    value={regionProvinceCityBarangay} 
                    onChange={e=>setRegionProvinceCityBarangay(e.target.value)} 
                    className='w-full border border-gray-300 rounded px-3 sm:px-4 py-2.5 sm:py-3 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base' 
                    type="text" 
                    placeholder='Region/Province/City/Barangay' 
                  />

                  {/* Postal code */}
                  <input 
                    value={zipcode} 
                    onChange={e=>setZipcode(e.target.value)} 
                    className='w-full border border-gray-300 rounded px-3 sm:px-4 py-2.5 sm:py-3 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base' 
                    type="text" 
                    placeholder='Postal code' 
                  />

                  {/* Street name, building, house no. */}
                  <input 
                    value={street} 
                    onChange={e=>setStreet(e.target.value)} 
                    className='w-full border border-gray-300 rounded px-3 sm:px-4 py-2.5 sm:py-3 mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-black text-sm sm:text-base' 
                    type="text" 
                    placeholder='Street name, building, house no.' 
                  />
                </>
              )}

              {useSavedAddress && savedAddress && (
                <input type='hidden' value={country} readOnly />
              )}

              {/* Delivery Location Map (works for both saved and new addresses) */}
              {deliveryMapLat && deliveryMapLon && (
                <div className='mt-4 sm:mt-6 mb-4 sm:mb-6'>
                  <MapPin
                    lat={deliveryMapLat}
                    lon={deliveryMapLon}
                    label="Your Delivery Location"
                    address={`${street}, ${regionProvinceCityBarangay}`}
                    isPickup={false}
                  />
                </div>
              )}

              {/* Payment Method Selection */}
              {(
                <div className='mt-2'>
                  <h3 className='text-sm font-semibold mb-2 text-gray-700'>Payment Methods</h3>
                  {!availablePaymentMethods.cod && !availablePaymentMethods.gcash && (
                    <p className='text-xs text-red-600 mb-2'>No common payment method is available for all sellers in your cart. Please edit your cart and try again.</p>
                  )}
                  <div className='space-y-2'>
                    <label className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                      paymentOption === 'gcash' ? 'border-black bg-gray-50' : 'border-gray-300 hover:bg-gray-50'
                    }`}>
                      <div className='flex items-center gap-3'>
                        <input
                          type='radio'
                          name='paymentOption'
                          checked={paymentOption === 'gcash'}
                          onChange={() => setPaymentOption('gcash')}
                          disabled={!availablePaymentMethods.gcash}
                          className='w-4 h-4'
                        />
                        <div>
                          <span className='text-sm font-medium'>GCash</span>
                          {!availablePaymentMethods.gcash && <span className='text-xs text-red-600 ml-2'>(Unavailable for one or more sellers)</span>}
                        </div>
                      </div>
                    </label>
                    <label className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                      paymentOption === 'cod' ? 'border-black bg-gray-50' : 'border-gray-300 hover:bg-gray-50'
                    }`}>
                      <div className='flex items-center gap-3'>
                        <input
                          type='radio'
                          name='paymentOption'
                          checked={paymentOption === 'cod'}
                          onChange={() => setPaymentOption('cod')}
                          disabled={!availablePaymentMethods.cod}
                          className='w-4 h-4'
                        />
                        <div>
                          <span className='text-sm font-medium'>Cash on Delivery (COD)</span>
                          {!availablePaymentMethods.cod && <span className='text-xs text-red-600 ml-2'>(Unavailable for one or more sellers)</span>}
                        </div>
                      </div>
                    </label>
                  </div>


                  {paymentOption === 'gcash' && availablePaymentMethods.gcash && Object.values(sellerPaymentInfo).length > 0 && (
                    <div className='mt-3 space-y-3'>
                      <p className='text-xs text-gray-600'>Pay directly to each seller&apos;s GCash account. Use the details below:</p>
                      {Object.values(sellerPaymentInfo).map((info) => {
                        const qrUrl = info.gcashQr
                          ? (info.gcashQr.startsWith('http')
                            ? info.gcashQr
                            : `${apiUrl}${info.gcashQr.startsWith('/') ? info.gcashQr : `/${info.gcashQr}`}`)
                          : ''
                        return (
                          <div key={info.sellerId} className='border rounded p-3 bg-gray-50'>
                            <p className='text-sm font-medium text-gray-800 mb-1'>{info.storeName}</p>
                            <p className='text-xs text-gray-700'>Account Name: {info.gcashAccountName || 'Not provided yet'}</p>
                            <p className='text-xs text-gray-700'>GCash Number: {info.gcashNumber || 'Not provided yet'}</p>
                            {qrUrl ? (
                              <>
                                <img
                                  src={qrUrl}
                                  alt={`${info.storeName} GCash QR`}
                                  className='mt-2 w-56 h-56 object-contain border-2 border-blue-400 rounded bg-white p-2 transition-transform hover:scale-105 cursor-pointer'
                                  onClick={() => setModalState({ open: true, title: info.storeName, message: qrUrl })}
                                />
                                <QRModal
                                  open={modalState.open && modalState.message === qrUrl}
                                  onClose={() => setModalState({ open: false, title: '', message: '' })}
                                  qrUrl={qrUrl}
                                  storeName={info.storeName}
                                />
                              </>
                            ) : (
                              <p className='text-xs text-amber-700 mt-2'>QR code not uploaded yet. Contact the seller in chat for payment instructions.</p>
                            )}
                          </div>
                        )
                      })}

                      {/* GCash Receipt Upload */}
                      <div className='mt-4'>
                        <label className='block text-xs font-medium mb-1 text-gray-700'>Upload GCash Receipt <span className='text-red-600'>*</span></label>
                        <input
                          type='file'
                          accept='image/*,application/pdf'
                          onChange={e => {
                            setGcashReceiptError('');
                            const file = e.target.files && e.target.files[0];
                            setGcashReceipt(file || null);
                          }}
                          className='block w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700'
                        />
                        {gcashReceiptError && <p className='text-xs text-red-600 mt-1'>{gcashReceiptError}</p>}
                        {gcashReceipt && <p className='text-xs text-green-700 mt-1'>Selected: {gcashReceipt.name}</p>}
                        <p className='text-xs text-gray-500 mt-1'>Attach a screenshot or PDF of your GCash payment receipt. This is required to complete your order.</p>
                      </div>
                    </div>
                  )}

                  <p className='text-xs text-gray-500 mt-2'>
                    Delivery fee is calculated per seller in your cart.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className='p-3 sm:p-4 border rounded bg-yellow-50'>
              <div className='text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4'>
                You selected <strong>Pick Up</strong>. No shipping address is required — your order will be held for pickup.
              </div>
              <div className='mb-3 sm:mb-4 p-3 bg-blue-50 border border-blue-200 rounded'>
                <p className='text-xs sm:text-sm text-blue-800'>
                  <strong>📋 Important:</strong> The seller will provide the number of working days needed to prepare your custom product. You will be notified of the estimated ready date for pickup.
                </p>
              </div>
              <div>
                <label className='block text-xs sm:text-sm font-medium mb-2'>Pickup location per seller</label>
                {pickupLocationsGrouped.length > 0 ? (
                  <div className='space-y-3'>
                    {pickupLocationsGrouped.map((seller) => (
                      <div key={seller.sellerId} className='border rounded p-3 bg-white'>
                        <p className='text-xs sm:text-sm font-medium text-gray-700 mb-2'>{seller.storeName}</p>
                        <select
                          value={pickupLocationsBySeller[seller.sellerId] || ''}
                          onChange={(e) => setPickupLocationsBySeller(prev => ({ ...prev, [seller.sellerId]: e.target.value }))}
                          className='w-full border px-3 py-2.5 rounded text-sm sm:text-base'
                        >
                          <option value=''>Select pickup location</option>
                          {seller.locations.map((loc, idx) => (
                            <option key={idx} value={loc}>{loc}</option>
                          ))}
                        </select>
                        {/* Show photos for the selected pickup location, if any */}
                        {pickupPhotosBySeller[String(seller.sellerId)] && (function(){
                          const selected = pickupLocationsBySeller[seller.sellerId]
                          const photosForSeller = pickupPhotosBySeller[String(seller.sellerId)] || {}
                          const photos = selected ? (Array.isArray(photosForSeller[selected]) ? photosForSeller[selected] : (photosForSeller[selected] ? [photosForSeller[selected]] : [])) : []
                          if (!photos || photos.length === 0) return null
                          return (
                            <div className='mt-2 flex flex-wrap gap-2'>
                              {photos.map((u, i) => (
                                <img
                                  key={i}
                                  src={u.startsWith('http') ? u : `${apiUrl}${u}`}
                                  alt={`pickup-${seller.sellerId}-${i}`}
                                  className='w-28 h-28 object-cover rounded border cursor-pointer hover:scale-105 transition-transform'
                                  onClick={() => openPhotoModal(u.startsWith('http') ? u : `${apiUrl}${u}`, `${seller.storeName || 'Seller'} pickup`)}
                                />
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-gray-500'>No pickup locations available. The sellers in your cart have not set pickup locations yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ----------------Right side - Order Summary-------------- */}
        <div>
          {/* Cart Items */}
          <div className='space-y-3 sm:space-y-4 mb-6 sm:mb-8'>
            {cartData.map((item, index) => {
              const productData = products.find((product) => {
                if (product._id && String(product._id) === String(item.productId)) return true
                if (product.id && String(product.id) === String(item.productId)) return true
                return false
              })

              if (!productData) return null

              const firstImg = Array.isArray(productData.image) && productData.image.length > 0 ? productData.image[0] : null
              let imgSrc = '/path/to/placeholder.jpg'
              if (firstImg) {
                if (typeof firstImg === 'object' && firstImg.url) {
                  imgSrc = firstImg.url.startsWith('http') ? firstImg.url : `${apiUrl}${firstImg.url}`
                } else if (typeof firstImg === 'string') {
                  imgSrc = firstImg.startsWith('http') ? firstImg : `${apiUrl}${firstImg}`
                }
              }

              return (
                <div key={index} className='flex gap-3 sm:gap-4'>
                  <div className='relative'>
                    <img src={imgSrc} alt={productData.name} className='w-16 h-16 sm:w-24 sm:h-24 object-cover rounded' />
                    <span className='absolute -top-2 -right-2 bg-gray-800 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium'>
                      {item.quantity}
                    </span>
                  </div>
                  <div className='flex-1'>
                    <h3 className='font-medium text-sm sm:text-base'>{productData.name}</h3>
                      {item.size ? (
                        <p className='text-xs sm:text-sm text-gray-600'>Size: {item.size}</p>
                      ) : Array.isArray(productData.sizes) && productData.sizes.length > 0 ? (
                        <p className='text-xs sm:text-sm text-gray-600'>Sizes: {productData.sizes.join(', ')}</p>
                      ) : typeof productData.size === 'string' && productData.size ? (
                        <p className='text-xs sm:text-sm text-gray-600'>Size: {productData.size}</p>
                      ) : null}
                    {item.color && <p className='text-xs sm:text-sm text-gray-600'>Color: {item.color}</p>}
                    <p className='text-xs sm:text-sm text-gray-600 mt-1'>{currency}{productData.price}</p>
                  </div>
                </div>
              )
            })}
          </div>



          {/* Order Summary */}
          <div className='border-t space-y-3 pt-4'>

            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Subtotal • {cartData.length} items</span>
              <span className='font-medium'>{currency}{subtotal.toFixed(2)}</span>
            </div>

            {appliedDiscount > 0 && (
              <div className='flex justify-between text-sm text-green-600'>
                <span>Discount ({appliedCoupon})</span>
                <span className='font-medium'>-{currency}{appliedDiscount.toFixed(2)}</span>
              </div>
            )}

            {method !== 'pickup' && (
              <div className='flex justify-between text-sm'>
                <span className='text-gray-600'>Shipping{selectedShippingRate ? ` (${selectedShippingRate.name})` : ''}</span>
                <span className='font-medium'>
                  {computedShippingFee === 0 ? (
                    <span className='text-green-600'>FREE</span>
                  ) : (
                    `${currency}${computedShippingFee.toFixed(2)}`
                  )}
                </span>
              </div>
            )}

            <div className='flex justify-between text-lg border-t pt-4'>
              <div>
                <span className='text-gray-600 text-sm mr-2'>Total</span>
                <span className='text-xs text-gray-500'>PHP</span>
              </div>
              <span className='font-bold'>{currency}{(Math.max(0, subtotal - appliedDiscount + computedShippingFee)).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className='mt-6 sm:mt-8'>
            <h3 className='font-bold mb-3 sm:mb-4 text-base sm:text-lg'>Mode of Delivery</h3>
            <div className='space-y-2 sm:space-y-3'>
              <label className='flex items-center gap-3 p-3 sm:p-4 border rounded cursor-pointer hover:bg-gray-50' onClick={()=>setMethod('pickup')}>
                <input type="radio" name="payment" checked={method === 'pickup'} onChange={() => setMethod('pickup')} className='w-4 h-4' />
                <span className='font-medium text-sm sm:text-base'>Pick Up</span>
              </label>
              <label className='flex items-center gap-3 p-3 sm:p-4 border rounded cursor-pointer hover:bg-gray-50' onClick={()=>setMethod('delivery')}>
                <input type="radio" name="payment" checked={method === 'delivery'} onChange={() => setMethod('delivery')} className='w-4 h-4' />
                <span className='font-medium text-sm sm:text-base'>Delivery</span>
              </label>
            </div>
          </div>

          {/* Checkout Button */}
          <button 
            onClick={async ()=>{
              const token = localStorage.getItem('token');
              if (!token) {
                openModal('Login Required', 'Please login to place order.')
                navigate('/login');
                return;
              }
              const items = buildItemsFromCart(cartsItems, products || []);
              if (items.length === 0) {
                openModal('Cart is Empty', 'Your cart is empty. Add at least one product before checkout.')
                return;
              }

              const sellerIdsInCart = [...new Set(items.map(it => String(it.sellerId || '')).filter(Boolean))]

              if (method === 'pickup') {
                const missingSellerPickup = sellerIdsInCart.filter((sid) => !pickupLocationsBySeller[sid])
                if (missingSellerPickup.length > 0) {
                  openModal('Pickup Location Required', 'Please select a pickup location for every seller in your order.')
                  return
                }
              } else {
                if (!availablePaymentMethods.cod && !availablePaymentMethods.gcash) {
                  openModal('Payment Method Unavailable', 'No common payment method is available for all sellers in your cart. Please remove conflicting items or use pickup.')
                  return
                }
                if (paymentOption === 'cod' && !availablePaymentMethods.cod) {
                  openModal('COD Not Available', 'At least one seller in your cart does not accept Cash on Delivery. Please choose GCash.')
                  return
                }
                if (paymentOption === 'gcash' && !availablePaymentMethods.gcash) {
                  openModal('GCash Not Available', 'At least one seller in your cart does not accept GCash. Please choose COD.')
                  return
                }
                // GCash receipt validation
                if (paymentOption === 'gcash') {
                  if (!gcashReceipt) {
                    setGcashReceiptError('GCash receipt is required.');
                    openModal('GCash Receipt Required', 'Please upload your GCash payment receipt to complete your order.');
                    return;
                  }
                }
              }

              const itemsWithPickup = method === 'pickup'
                ? items.map((it) => ({
                    ...it,
                    pickupLocation: pickupLocationsBySeller[String(it.sellerId)] || null,
                  }))
                : items

              if (method !== 'pickup') {
                const addressErrors = validateDeliveryAddress(selectedAddress)

                if (addressErrors.length > 0) {
                  openModal(
                    'Invalid Delivery Address',
                    `Please provide a valid real delivery address:\n- ${addressErrors.join('\n- ')}`
                  )
                  return
                }
              }

              // Split fullName into firstName and lastName
              let firstName = '';
              let lastName = '';
              if (fullName && fullName.trim().length > 0) {
                const parts = fullName.trim().split(' ');
                firstName = parts[0];
                lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
              }
              const address = method === 'pickup' ? {} : { firstName, lastName, phone: selectedAddress.phone, regionProvinceCityBarangay: selectedAddress.regionProvinceCityBarangay, zipcode: selectedAddress.zipcode, street: selectedAddress.street, email: selectedAddress.email, country: selectedAddress.country };
              const pickupInfo = method === 'pickup' ? { reservationDateTime: reservationDateTime || null, reservationNote: reservationNote || null } : undefined;

              try {
                setPlacing(true);
                console.log('ORDER DEBUG', {
                  cartsItems,
                  productsCount: Array.isArray(products) ? products.length : 0,
                  items,
                  pickupLocationsBySeller,
                })
                let orderPayload = {
                  items: itemsWithPickup,
                  address,
                  paymentMethod: method === 'pickup' ? 'pickup' : paymentOption,
                  subtotal,
                  shippingFee: computedShippingFee,
                  shippingMethod: selectedShippingRate?.name || 'Standard Shipping',
                  commission: 0,
                  discount: appliedDiscount,
                  couponCode: appliedCoupon || null,
                  pickupLocationsBySeller: method === 'pickup' ? pickupLocationsBySeller : null,
                  reservationDateTime: pickupInfo?.reservationDateTime || null,
                  reservationNote: pickupInfo?.reservationNote || null,
                };

                // If GCash, send as multipart/form-data with receipt
                if (paymentOption === 'gcash' && gcashReceipt) {
                  const formData = new FormData();
                  Object.entries(orderPayload).forEach(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                      formData.append(key, JSON.stringify(value));
                    } else {
                      formData.append(key, value);
                    }
                  });
                  formData.append('gcashReceipt', gcashReceipt);
                  await axios.post(`${apiUrl}/api/orders`, formData, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'multipart/form-data',
                    },
                  });
                } else {
                  await axios.post(`${apiUrl}/api/orders`, orderPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                }
                refreshProducts && refreshProducts();
                clearCart && clearCart();
                navigate('/orders');
              } catch (err) {
                console.error('Place order error', err, err?.response?.data || err?.response);
                const serverMsg = err?.response?.data?.message || err?.response?.data || err?.response?.statusText || err?.message || 'Failed to place order';
                openModal('Order Failed', String(serverMsg));
              } finally {
                setPlacing(false);
              }
            }}
            className='w-full bg-black text-white py-3 sm:py-4 rounded mt-6 sm:mt-8 font-medium hover:bg-gray-800 transition-colors text-sm sm:text-base'
          >
            {placing ? 'Placing order...' : 'Complete purchase'}
          </button>
        </div>
      </div>

      {modalState.open && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-md p-5'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>{modalState.title}</h3>
            <p className='text-sm text-gray-700 whitespace-pre-line mb-5'>{modalState.message}</p>
            <div className='flex justify-end'>
              <button
                onClick={closeModal}
                className='px-4 py-2 rounded bg-black text-white text-sm hover:bg-gray-800'
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <PhotoModal
        open={photoModal.open}
        onClose={closePhotoModal}
        photoUrl={photoModal.photoUrl}
        title={photoModal.title}
      />
    </div>
  )
}

export default PlaceOrder
