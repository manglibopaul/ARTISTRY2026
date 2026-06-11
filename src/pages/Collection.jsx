import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import ProductItem from '../components/ProductItem'

const Collection = () => {
  const { products, productsLoading, search, showSearch } = useContext(ShopContext)
  const [filterProducts, setFilterProducts] = useState([])
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortType, setSortType] = useState('featured')
  const [activeCollection, setActiveCollection] = useState('')

  const isLoading = productsLoading

  const applyFilter = useCallback(() => {
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
  }, [products, showSearch, search, activeCollection, availabilityFilter, minPrice, maxPrice])

  const sortProduct = useCallback(() => {
    const fpCopy = filterProducts.slice()

    if (sortType === 'price-asc') {
      setFilterProducts(fpCopy.sort((a, b) => a.price - b.price))
      return
    }

    if (sortType === 'price-desc') {
      setFilterProducts(fpCopy.sort((a, b) => b.price - a.price))
      return
    }

    // 'featured' or unknown sort: keep current filtered order (no-op)
  }, [filterProducts, sortType, applyFilter])

  useEffect(() => {
    applyFilter()
  }, [applyFilter])

  useEffect(() => {
    sortProduct()
  }, [sortProduct])

  return (
    <div className='min-h-screen bg-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16'>
        <div className='flex flex-col gap-6 sm:gap-10'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between text-sm text-gray-700'>
            <div className='flex flex-wrap items-center gap-4'>
              <span className='font-semibold text-gray-900'>Filter:</span>

              <div className='flex items-center gap-2'>
                <span className='text-gray-600 text-xs sm:text-sm whitespace-nowrap'>Availability</span>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className='border border-gray-300 px-3 py-2 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm'
                >
                  <option value='all'>All</option>
                  <option value='in-stock'>In stock</option>
                  <option value='sold-out'>Sold out</option>
                </select>
              </div>

              <div className='flex items-center gap-2'>
                <span className='text-gray-600 text-xs sm:text-sm whitespace-nowrap'>Price</span>
                <select
                  value={priceRange}
                  onChange={(e) => {
                    const value = e.target.value
                    setPriceRange(value)
                    if (value === 'all') {
                      setMinPrice('')
                      setMaxPrice('')
                    } else if (value === 'under-500') {
                      setMinPrice('')
                      setMaxPrice('500')
                    } else if (value === '500-1000') {
                      setMinPrice('500')
                      setMaxPrice('1000')
                    } else if (value === '1000-plus') {
                      setMinPrice('1000')
                      setMaxPrice('')
                    }
                  }}
                  className='border border-gray-300 px-3 py-2 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm'
                >
                  <option value='all'>All</option>
                  <option value='under-500'>Under 500</option>
                  <option value='500-1000'>500-1000</option>
                  <option value='1000-plus'>1000+</option>
                </select>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2'>
                <span className='text-gray-600 text-xs sm:text-sm whitespace-nowrap'>Sort by:</span>
                <select
                  onChange={(e) => setSortType(e.target.value)}
                  value={sortType}
                  className='border border-gray-300 px-3 py-2 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm'
                >
                  <option value='featured'>Best selling</option>
                  <option value='price-asc'>Price: Low to High</option>
                  <option value='price-desc'>Price: High to Low</option>
                </select>
              </div>

              <div className='text-gray-600 text-sm whitespace-nowrap'>
                {filterProducts.length} product{filterProducts.length !== 1 ? 's' : ''}
              </div>
            </div>
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
                  sellerName={item.sellerName || item.seller?.storeName || item.seller?.name}
                  artisanType={item.artisanType || item.seller?.artisanType}
                  stock={item.stock}
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
