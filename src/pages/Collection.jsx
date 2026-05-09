import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
import ProductItem from '../components/ProductItem'

const Collection = () => {
  const { products, search, showSearch } = useContext(ShopContext)
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortType, setSortType] = useState('featured')
  const [activeCollection, setActiveCollection] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  const [remoteProducts, setRemoteProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalItems: 0, totalPages: 1 })
  const [remoteLoaded, setRemoteLoaded] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [filterSignature, setFilterSignature] = useState('')

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const fallbackProducts = useMemo(() => {
    const sourceProducts = Array.isArray(products) ? products.slice() : []
    let productsCopy = sourceProducts

    if (showSearch && search) {
      const searchTerm = search.toLowerCase()
      productsCopy = productsCopy.filter((item) =>
        item.name.toLowerCase().includes(searchTerm)
      )
    }

    if (activeCollection) {
      productsCopy = productsCopy.filter(
        (item) => item.category?.toLowerCase() === activeCollection.toLowerCase()
      )
    }

    if (availabilityFilter === 'in-stock') {
      productsCopy = productsCopy.filter((item) => (item.stock ?? 0) > 0)
    }

    if (availabilityFilter === 'sold-out') {
      productsCopy = productsCopy.filter((item) => (item.stock ?? 0) === 0)
    }

    if (minPrice !== '' || maxPrice !== '') {
      productsCopy = productsCopy.filter((item) => {
        const price = Number(item.price) || 0
        const min = minPrice === '' ? 0 : Number(minPrice)
        const max = maxPrice === '' ? Infinity : Number(maxPrice)
        return price >= min && price <= max
      })
    }

    if (sortType === 'price-asc') {
      productsCopy.sort((a, b) => a.price - b.price)
    } else if (sortType === 'price-desc') {
      productsCopy.sort((a, b) => b.price - a.price)
    }

    return productsCopy
  }, [products, showSearch, search, activeCollection, availabilityFilter, minPrice, maxPrice, sortType])

  const effectiveProducts = remoteLoaded ? remoteProducts : fallbackProducts
  const effectivePagination = remoteLoaded
    ? pagination
    : {
        page: 1,
        limit: pageSize,
        totalItems: fallbackProducts.length,
        totalPages: Math.max(1, Math.ceil(fallbackProducts.length / pageSize)),
      }

  const isLoading = remoteLoading && !remoteLoaded && fallbackProducts.length === 0

  const fetchProducts = useCallback(async () => {
    try {
      setRemoteLoading(true)
      setRemoteError('')

      const params = {
        page: currentPage,
        limit: pageSize,
        sort: sortType,
      }

      if (showSearch && search) {
        params.search = search
      }

      if (activeCollection) {
        params.category = activeCollection
      }

      if (availabilityFilter !== 'all') {
        params.availability = availabilityFilter
      }

      if (minPrice !== '') {
        params.minPrice = minPrice
      }

      if (maxPrice !== '') {
        params.maxPrice = maxPrice
      }

      const res = await axios.get(`${apiUrl}/api/products`, {
        params: {
          ...params,
          summary: 1,
        },
      })
      const remoteData = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.products)
          ? res.data.products
          : []

      setRemoteProducts(remoteData)
      setPagination(res.data?.pagination || {
        page: currentPage,
        limit: pageSize,
        totalItems: remoteData.length,
        totalPages: Math.max(1, Math.ceil(remoteData.length / pageSize)),
      })
      setRemoteLoaded(true)
    } catch (error) {
      console.error('Error fetching products for collection:', error)
      setRemoteError('Unable to load the latest products. Showing cached results instead.')
      setRemoteLoaded(false)
    } finally {
      setRemoteLoading(false)
    }
  }, [apiUrl, currentPage, pageSize, sortType, showSearch, search, activeCollection, availabilityFilter, minPrice, maxPrice])

  useEffect(() => {
    const nextSignature = [showSearch ? search : '', activeCollection, availabilityFilter, minPrice, maxPrice, sortType].join('|')

    if (nextSignature !== filterSignature) {
      setFilterSignature(nextSignature)
      if (currentPage !== 1) {
        setCurrentPage(1)
        return
      }
    }

    fetchProducts()
  }, [fetchProducts, currentPage, showSearch, search, activeCollection, availabilityFilter, minPrice, maxPrice, sortType, filterSignature])

  return (
    <div className='min-h-screen bg-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16'>
        <div className='flex flex-col gap-6 sm:gap-10'>
          <div className='flex flex-col gap-3 text-sm text-gray-700'>
            <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
              <span className='font-semibold text-gray-900 hidden sm:inline'>Filter:</span>
            </div>

            <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
              <div className='flex items-center gap-2 flex-1 min-w-[140px] sm:flex-none'>
                <span className='text-gray-600 text-xs sm:text-sm whitespace-nowrap'>Availability</span>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className='border border-gray-300 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black flex-1 sm:flex-none text-sm'
                >
                  <option value='all'>All</option>
                  <option value='in-stock'>In stock</option>
                  <option value='sold-out'>Sold out</option>
                </select>
              </div>

              <div className='flex items-center gap-2 flex-1 min-w-[200px] sm:flex-none'>
                <span className='text-gray-600 text-xs sm:text-sm whitespace-nowrap'>Price</span>
                <input
                  type='number'
                  placeholder='Min'
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className='w-24 sm:w-20 border border-gray-300 px-2 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm'
                />
                <span className='text-gray-400'>-</span>
                <input
                  type='number'
                  placeholder='Max'
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className='w-24 sm:w-20 border border-gray-300 px-2 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm'
                />
                {(minPrice !== '' || maxPrice !== '') && (
                  <button
                    onClick={() => {
                      setMinPrice('')
                      setMaxPrice('')
                    }}
                    className='text-xs text-gray-500 hover:text-gray-700'
                    title='Clear price filter'
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className='flex items-center gap-2 flex-1 min-w-[160px] sm:flex-none'>
                <span className='text-gray-600 text-xs sm:text-sm'>Sort by:</span>
                <select
                  onChange={(e) => setSortType(e.target.value)}
                  value={sortType}
                  className='flex-1 sm:flex-none border border-gray-300 px-2 sm:px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm'
                >
                  <option value='featured'>Featured</option>
                  <option value='price-asc'>Price: Low to High</option>
                  <option value='price-desc'>Price: High to Low</option>
                </select>
              </div>
            </div>

            {remoteError && (
              <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>
                {remoteError}
              </div>
            )}

            <div className='text-gray-600 text-sm'>
              {effectivePagination.totalItems} product{effectivePagination.totalItems !== 1 ? 's' : ''}
            </div>

            {activeCollection && (
              <button
                onClick={() => setActiveCollection('')}
                className='inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50'
              >
                Showing: {activeCollection}
                <span className='text-gray-400'>×</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className='text-center py-20 text-gray-500'>Loading products...</div>
          ) : effectiveProducts.length === 0 ? (
            <div className='text-center py-20'>
              <p className='text-gray-700 font-medium'>No products match your filters.</p>
              <p className='text-sm text-gray-500 mt-2'>Try adjusting filters or searching something else.</p>
            </div>
          ) : (
            <div className='grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
              {effectiveProducts.map((item, index) => (
                <ProductItem
                  key={index}
                  name={item.name}
                  id={item._id || item.id}
                  price={item.price}
                  image={item.image}
                  sellerId={item.sellerId}
                  sellerName={item.sellerName || item.seller?.storeName || item.seller?.name}
                  artisanType={item.artisanType || item.seller?.artisanType}
                  stock={item.stock}
                />
              ))}
            </div>
          )}

          <div className='flex items-center justify-between gap-3 pt-2'>
            <p className='text-sm text-gray-500'>
              Page {effectivePagination.page} of {effectivePagination.totalPages}
            </p>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={effectivePagination.page <= 1 || remoteLoading}
                className='px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((page) => Math.min(effectivePagination.totalPages, page + 1))}
                disabled={effectivePagination.page >= effectivePagination.totalPages || remoteLoading}
                className='px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Collection
