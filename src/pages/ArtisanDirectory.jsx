import React, { useState, useEffect, useContext, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import { getArtisanPath } from '../utils/artisanUrl'

const ArtisanDirectory = () => {
  const navigate = useNavigate()
  const { products } = useContext(ShopContext)
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState(null)
  const [artisanTypes, setArtisanTypes] = useState([])
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const resolveAvatarUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${apiUrl}${url}`
  }

  const fetchArtisanTypes = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/sellers/types`)
      setArtisanTypes(res.data?.artisanTypes || [])
    } catch (error) {
      console.error('Error fetching artisan types:', error)
    }
  }, [apiUrl])

  const fetchSellers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${apiUrl}/api/sellers/all`)
      const sellersData = res.data || []
      setSellers(sellersData)

      // Include artisan types typed by sellers so they appear in customer filters.
      const dynamicTypes = Array.from(
        new Set(
          sellersData
            .map((s) => String(s.artisanType || '').trim())
            .filter(Boolean)
        )
      )

      setArtisanTypes((prev) => {
        const merged = [...prev]
        for (const type of dynamicTypes) {
          if (!merged.some((t) => normalizeType(t) === normalizeType(type))) {
            merged.push(type)
          }
        }
        return merged
      })
    } catch (error) {
      console.error('Error fetching sellers:', error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchArtisanTypes()
    fetchSellers()
  }, [fetchArtisanTypes, fetchSellers])

  // reveal animation for artist cards using IntersectionObserver
  const cardsObservedRef = useRef(false)
  useEffect(() => {
    // (moved) placeholder - actual observer runs after `filteredSellers` is defined
  }, [sellers])

  const normalizeType = (value) => String(value || '').trim().toLowerCase()

  const getSellerProductCount = (sellerId) => {
    return products.filter(p => {
      const pid = p.sellerId || p.id
      return Number(pid) === Number(sellerId)
    }).length
  }

  const filteredSellers = selectedType
    ? sellers.filter(s => normalizeType(s.artisanType) === normalizeType(selectedType))
    : sellers

  // reveal animation for artist cards using IntersectionObserver
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.artist-card'))
    if (!nodes || nodes.length === 0) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    nodes.forEach(n => {
      if (!n.classList.contains('is-visible')) obs.observe(n)
    })
    return () => obs.disconnect()
  }, [filteredSellers])

  return (
    <div className='border-t'>
        {/* Hero Section */}
          <div className='bg-gradient-to-r from-gray-900 to-black py-12 sm:py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center text-white mb-8'>
            <h1 className='text-4xl sm:text-5xl font-bold mb-3'>Discover Artists</h1>
            <p className='text-gray-300 text-lg'>Connect with passionate craftspeople creating handmade treasures</p>
          </div>

          <div className='mx-auto mb-8 max-w-3xl rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4 sm:p-5 text-white shadow-lg'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <p className='text-sm font-semibold uppercase tracking-wider text-gray-300'>Are you an artist?</p>
                <p className='text-sm sm:text-base text-gray-200'>List your store, share pickup locations, and reach customers directly.</p>
              </div>
              <div className='flex flex-col sm:flex-row gap-2'>
                <button
                  onClick={() => navigate('/seller/login?mode=signup')}
                  className='hero-cta px-5 py-2.5 rounded-full text-sm font-semibold btn-primary transition'
                >
                  Artist Sign Up
                </button>
                <button
                  onClick={() => navigate('/seller/login')}
                  className='px-5 py-2.5 rounded-full border border-white/20 text-sm font-semibold text-white hover:bg-white/6 transition'
                >
                  Artist Sign In
                </button>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className='bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6'>
            <p className='text-white text-sm font-medium mb-4'>Filter by Craft Type:</p>
            <div className='flex flex-wrap gap-2'>
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
                  selectedType === null
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                All Artists ({sellers.length})
              </button>
              {artisanTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
                    selectedType === type
                      ? 'bg-white text-black shadow-lg'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {type} ({sellers.filter(s => normalizeType(s.artisanType) === normalizeType(type)).length})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16'>
        {/* Loading State */}
        {loading ? (
          <div className='text-center py-20'>
            <p className='text-gray-500 text-lg'>Loading artists...</p>
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className='text-center py-20'>
            <p className='text-gray-500 text-lg'>No artists found in this category</p>
            <button
              onClick={() => setSelectedType(null)}
              className='mt-4 text-black hover:underline font-medium'
            >
              View all artists
            </button>
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className='mb-8'>
              <p className='text-gray-600 text-sm'>
                Showing <span className='font-bold text-gray-900'>{filteredSellers.length}</span> {selectedType ? `${selectedType} artists` : 'artists'}
              </p>
            </div>

            {/* Artists Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {filteredSellers.map((seller, idx) => (
                <div
                  key={seller.id}
                  onClick={() => navigate(getArtisanPath(seller))}
                  className='artist-card group bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-black hover:shadow-2xl transition-all duration-500 cursor-pointer opacity-0 translate-y-6'
                  style={{ transitionDelay: `${idx * 60}ms` }}
                >
                  {/* Card Header with Avatar */}
                  <div className='bg-gradient-to-r from-gray-100 to-gray-50 p-6 border-b border-gray-200 group-hover:from-gray-200 group-hover:to-gray-100 transition relative'>
                    {seller.avatar ? (
                      <img
                        src={resolveAvatarUrl(seller.avatar)}
                        alt={seller.storeName}
                        className='w-16 h-16 rounded-full object-cover mb-4 border-2 border-white shadow-md avatar-img'
                      />
                    ) : (
                      <div className='w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-xl mb-4 border-2 border-white shadow-md'>
                        {seller.storeName?.charAt(0) || 'A'}
                      </div>
                    )}

                    <h3 className='text-lg font-bold text-gray-900'>{seller.storeName}</h3>
                    <p className='text-sm text-gray-600'>{seller.name}</p>
                  </div>

                  {/* Card Body */}
                  <div className='p-6'>
                    {/* Craft Type Badge */}
                    {seller.artisanType && (
                      <div className='mb-4'>
                        <span className='inline-block badge-primary text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm'>
                          {seller.artisanType}
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    <p className='text-sm text-gray-700 mb-4 line-clamp-2 leading-relaxed fade-up'>
                      {seller.bio || seller.description || 'Talented artist creating beautiful handmade items'}
                    </p>

                    {/* Expertise Tags */}
                    {seller.expertise && seller.expertise.length > 0 && (
                      <div className='mb-4 flex flex-wrap gap-1.5'>
                        {seller.expertise.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className='text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200'
                          >
                            {tag}
                          </span>
                        ))}
                        {seller.expertise.length > 3 && (
                          <span className='text-xs text-gray-500 px-2.5 py-1'>
                            +{seller.expertise.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Product Count + CTA */}
                    <div className='flex items-center justify-between text-sm text-gray-600 border-t pt-4'>
                      <div>
                        <span className='font-bold text-gray-900'>{getSellerProductCount(seller.id)}</span>
                        <span className='text-gray-600 ml-1'>
                          {getSellerProductCount(seller.id) === 1 ? 'product' : 'products'}
                        </span>
                      </div>
                      <div className='flex items-center gap-3'>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(getArtisanPath(seller)) }}
                          className='visit-shop inline-block btn-primary text-xs opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out'
                        >
                          Visit Shop
                        </button>
                        <div className='text-black font-bold group-hover:translate-x-1 transition'>→</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ArtisanDirectory
