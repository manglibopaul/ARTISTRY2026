import React, { useState, useEffect, useContext, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../context/ShopContext'
import ProductItem from '../components/ProductItem'
import { toArtisanSlug } from '../utils/artisanUrl'

const ArtisanProfile = () => {
  const navigate = useNavigate()
  const { sellerRef } = useParams()
  const { products } = useContext(ShopContext)
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const fetchSellerProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const ref = String(sellerRef || '').trim()
      if (!ref) {
        setError('Artist not found')
        return
      }

      let resolvedId = ref
      if (!/^\d+$/.test(ref)) {
        const byName = await axios.get(`${apiUrl}/api/sellers/by-name/${encodeURIComponent(ref)}`)
        resolvedId = String(byName?.data?.id || '')
      }

      const res = await axios.get(`${apiUrl}/api/sellers/${resolvedId}`)
      
      if (!res.data) {
        setError('Artist not found')
        return
      }
      
      setSeller(res.data)
    } catch (err) {
      console.error('Error fetching seller profile:', err)
      setError('Failed to load artist profile')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, sellerRef])

  useEffect(() => {
    fetchSellerProfile()
  }, [fetchSellerProfile])

  const sellerProducts = products.filter(p => {
    const pid = p.sellerId || p.id
    return Number(pid) === Number(seller?.id)
  })

  const getProductCategory = (product) => product?.subCategory || product?.category || 'Other'

  const categoryOptions = Array.from(
    new Set(sellerProducts.map(getProductCategory).filter(Boolean))
  )

  const filteredProducts = selectedCategory === 'all'
    ? sellerProducts
    : sellerProducts.filter(p => getProductCategory(p) === selectedCategory)

  const categoryCount = (category) => {
    if (category === 'all') return sellerProducts.length
    return sellerProducts.filter(p => getProductCategory(p) === category).length
  }

  const pickupLocations = (() => {
    const raw = seller?.pickupLocations
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map((loc) => String(loc || '').trim()).filter(Boolean)
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed)
          ? parsed.map((loc) => String(loc || '').trim()).filter(Boolean)
          : [String(parsed || '').trim()].filter(Boolean)
      } catch {
        return raw.split(/\r?\n|,/).map((loc) => loc.trim()).filter(Boolean)
      }
    }
    return []
  })()

  const avatarUrl = seller?.avatar
    ? (seller.avatar.startsWith('http') ? seller.avatar : `${apiUrl}${seller.avatar}`)
    : ''

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-gray-500'>Loading artist profile...</p>
      </div>
    )
  }

  if (error || !seller) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-600 mb-4'>{error || 'Artist not found'}</p>
          <button
            onClick={() => navigate('/artisans')}
            className='text-black hover:underline font-medium'
          >
            Back to Artist Directory
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='border-t'>
      {/* Hero Header Section */}
      <div className='bg-white border-b border-gray-200 py-8 sm:py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col sm:flex-row gap-6 sm:gap-12 items-center sm:items-start'>
            {/* Avatar & CTAs */}
            <div className='flex-shrink-0 flex flex-col items-center sm:items-start'>
              <div className='relative'>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={seller.storeName}
                    className='w-28 h-28 sm:w-40 sm:h-40 rounded-full object-cover border border-gray-200 shadow-md'
                  />
                ) : (
                  <div className='w-28 h-28 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-4xl sm:text-5xl border border-gray-200 shadow-md'>
                    {seller.storeName?.charAt(0) || 'A'}
                  </div>
                )}
                {seller.isVerified && (
                  <span className='absolute bottom-0 right-0 -mb-1 -mr-1 bg-white rounded-full p-0.5 shadow'>
                    <svg className='w-5 h-5 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path d='M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z' />
                    </svg>
                  </span>
                )}
              </div>

              <div className='w-full mt-4 flex flex-col gap-2'>
                <button
                  onClick={() => {
                    const sellerSlug = toArtisanSlug(seller?.storeName || seller?.name || '')
                    if (sellerSlug) {
                      navigate(`/chat/${encodeURIComponent(sellerSlug)}`)
                    } else {
                      navigate('/chat')
                    }
                  }}
                  className='w-full bg-black text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-900 transition transform hover:-translate-y-0.5 text-sm'
                >
                  Chat with Artist
                </button>
                <button
                  onClick={() => document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' })}
                  className='w-full bg-white border border-gray-300 text-gray-900 px-5 py-2.5 rounded-lg font-medium hover:shadow-sm transition text-sm'
                >
                  View Shop
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className='w-full sm:flex-1 bg-gradient-to-b from-white to-gray-50 border border-gray-100 rounded-lg p-5 sm:p-8 text-left shadow-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1'>
                  <h1 className='text-xl sm:text-4xl font-extrabold text-gray-900 mb-1 leading-tight'>{seller.storeName}</h1>
                  <p className='text-gray-600 mb-2'>by {seller.name}</p>

                  {seller.artisanType && (
                    <div className='mb-4'>
                      <span className='inline-block bg-black text-white px-4 py-1 rounded-full font-semibold text-xs'>
                        {seller.artisanType}
                      </span>
                    </div>
                  )}

                  <div className='flex flex-wrap gap-4 text-sm text-gray-600'>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold text-gray-900'>{sellerProducts.length}</span>
                      <span>Products</span>
                    </div>
                    {seller.address && (
                      <div className='flex items-center gap-2'>
                        <span>📍</span>
                        <span>{seller.address}</span>
                      </div>
                    )}
                    {seller.phone && (
                      <div className='flex items-center gap-2'>
                        <span>📞</span>
                        <span>{seller.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className='hidden sm:flex flex-col items-end text-sm text-gray-500'>
                  {seller.reviewsAverage || seller.reviewsCount ? (
                    <div className='text-right'>
                      <div className='flex items-center gap-2 justify-end'>
                        <span className='text-lg font-semibold text-gray-900'>{(seller.reviewsAverage || 0).toFixed(1)}</span>
                        <span className='text-xs text-gray-500'>/5</span>
                      </div>
                      <div className='text-xs mt-1'>{seller.reviewsCount || 0} reviews</div>
                    </div>
                  ) : (
                    <div className='text-xs text-gray-400'>No reviews yet</div>
                  )}
                </div>
              </div>

              {pickupLocations.length > 0 && (
                <div className='mt-4 pt-4 border-t border-gray-100'>
                  <p className='font-bold text-gray-900 text-xs uppercase tracking-wide mb-1'>Pickup Locations</p>
                  <ul className='space-y-1 text-gray-700'>
                    {pickupLocations.map((loc, idx) => (
                      <li key={idx} className='flex items-center gap-2'>
                        <span>📍</span>
                        <span>{loc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='bg-white py-12 sm:py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          {/* Shop Collection Header with Filters */}
          <div className='bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 p-6 sm:p-8 mb-8'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
              <div>
                <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-1'>Shop Collection</h2>
                <p className='text-gray-600 text-sm'>{filteredProducts.length} {filteredProducts.length === 1 ? 'piece' : 'pieces'} available</p>
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className='flex flex-wrap gap-3'>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                All Products ({categoryCount('all')})
              </button>
              {categoryOptions.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-black text-white shadow-md'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  {cat} ({categoryCount(cat)})
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid - Full Width */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
            <p className='text-sm text-gray-600'>
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            </p>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className='w-full sm:w-56 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black'
            >
              <option value='all'>All Products</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className='bg-white rounded-xl border border-gray-200 p-12 sm:p-16 text-center mb-8'>
              <p className='text-gray-600 text-lg font-semibold mb-2'>No products in this category</p>
              <p className='text-gray-400 text-sm'>Try a different category filter.</p>
            </div>
          ) : (
            <div id='products-grid' className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 mb-8'>
              {filteredProducts.map(product => (
                <div key={product._id || product.id} className='group'>
                  <span className='inline-block mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600'>
                    {getProductCategory(product)}
                  </span>
                  <ProductItem
                    id={product._id || product.id}
                    image={product.image}
                    name={product.name}
                    price={product.price}
                    sellerId={product.sellerId}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Sidebar - Below Products on Smaller Screens */}
          <div className='grid grid-cols-1 gap-8'>
            <div className='col-span-1'>
              <div className='sticky top-20 space-y-6'>
                {/* About Card */}
                {(seller.bio || seller.description) && (
                  <div className='bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition'>
                    <h3 className='text-lg font-bold text-gray-900 mb-4'>About</h3>
                    {seller.bio && (
                      <p className='text-gray-700 text-sm leading-relaxed mb-4'>{seller.bio}</p>
                    )}
                    {seller.description && (
                      <p className='text-gray-600 text-xs leading-relaxed'>{seller.description}</p>
                    )}
                  </div>
                )}

                {/* Expertise Card */}
                {seller.expertise && seller.expertise.length > 0 && (
                  <div className='bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition'>
                    <h4 className='font-bold text-gray-900 mb-3 text-sm'>Specialties</h4>
                    <div className='flex flex-wrap gap-2'>
                      {seller.expertise.map(tag => (
                        <span key={tag} className='bg-black text-white text-xs px-3 py-1.5 rounded-full font-medium'>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications Card */}
                {seller.certifications && seller.certifications.length > 0 && (
                  <div className='bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition'>
                    <h4 className='font-bold text-gray-900 mb-3 text-sm'>Certifications</h4>
                    <ul className='space-y-2'>
                      {seller.certifications.map((cert, idx) => (
                        <li key={idx} className='flex items-start gap-2 text-sm'>
                          <span className='text-green-600 font-bold text-lg'>✓</span>
                          <span className='text-gray-700'>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className='bg-gray-50 border-t border-gray-200 py-8'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-bold text-gray-900'>Support Local Artists</h3>
            <p className='text-gray-600 text-sm'>Every purchase supports handmade craftsmanship</p>
          </div>
          <button
            onClick={() => navigate('/artisans')}
            className='text-black hover:bg-gray-200 font-medium text-sm px-4 py-2 rounded-lg transition'
          >
            ← Back to Directory
          </button>
        </div>
      </div>
    </div>
  )
}

export default ArtisanProfile
