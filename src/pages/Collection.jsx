import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import ProductItem from '../components/ProductItem'

const Collection = () => {
  const { products, search, showSearch } = useContext(ShopContext)
  const [filterProducts, setFilterProducts] = useState([])
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortType, setSortType] = useState('featured')
  const [activeCollection, setActiveCollection] = useState('')

  const isLoading = !products

  const applyFilter = () => {
    let productsCopy = products.slice()

    if (showSearch && search) {
      productsCopy = productsCopy.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
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

    // Apply custom price range filter
    if (minPrice !== '' || maxPrice !== '') {
      productsCopy = productsCopy.filter((item) => {
        const price = Number(item.price) || 0
        const min = minPrice === '' ? 0 : Number(minPrice)
        const max = maxPrice === '' ? Infinity : Number(maxPrice)
        return price >= min && price <= max
      })
    }

    setFilterProducts(productsCopy)
  }

  const sortProduct = () => {
    const fpCopy = filterProducts.slice()

    switch (sortType) {
      case 'price-asc':
        setFilterProducts(fpCopy.sort((a, b) => a.price - b.price))
        break

      case 'price-desc':
        setFilterProducts(fpCopy.sort((a, b) => b.price - a.price))
        break

      default:
        applyFilter()
        break
    }
  }

  useEffect(() => {
    applyFilter()
  }, [search, showSearch, products, availabilityFilter, minPrice, maxPrice, activeCollection])

  useEffect(() => {
    sortProduct()
  }, [sortType])

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

            <div className='text-gray-600 text-sm'>
              {filterProducts.length} product{filterProducts.length !== 1 ? 's' : ''}
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
          ) : filterProducts.length === 0 ? (
            <div className='text-center py-20'>
              <p className='text-gray-700 font-medium'>No products match your filters.</p>
              <p className='text-sm text-gray-500 mt-2'>Try adjusting filters or searching something else.</p>
            </div>
          ) : (
            <div className='grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
              {filterProducts.map((item, index) => (
                <ProductItem
                  key={index}
                  name={item.name}
                  id={item._id || item.id}
                  price={item.price}
                  image={item.image}
                  sellerId={item.sellerId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Collection
