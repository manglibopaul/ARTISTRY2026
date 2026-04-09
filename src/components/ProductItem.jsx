import React, { useCallback, useState, useEffect } from 'react'
import { useShop } from '../context/ShopContext'
import { Link, useNavigate } from 'react-router-dom';

const ProductItem = ({id, image, name, price, sellerId, sellerName, artisanType}) => {

    const navigate = useNavigate()
    const { currency } = useShop();
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
    const [sellerData, setSellerData] = useState(null)
    const [, setLoadingSeller] = useState(false)

    const fetchSellerData = useCallback(async () => {
      try {
        setLoadingSeller(true)
        const res = await fetch(`${apiUrl}/api/sellers/${sellerId}`)
        if (res.ok) {
          const seller = await res.json()
          setSellerData(seller)
        }
      } catch (e) {
        console.error('Failed to fetch seller data:', e)
      } finally {
        setLoadingSeller(false)
      }
    }, [apiUrl, sellerId])

    useEffect(() => {
      if (sellerId && !sellerName) {
        fetchSellerData()
      } else if (sellerName) {
        setSellerData({ storeName: sellerName, artisanType, id: sellerId })
      }
    }, [sellerId, sellerName, artisanType, fetchSellerData])

    // Handle both array of strings and array of objects for images
    let imageUrl = '/path/to/placeholder.jpg';
    
    if (Array.isArray(image) && image.length > 0) {
      const firstImage = image[0];
      if (typeof firstImage === 'object' && firstImage.url) {
        // If URL is relative, make it absolute
        imageUrl = firstImage.url.startsWith('http') 
          ? firstImage.url 
          : `${apiUrl}${firstImage.url}`;
      } else if (typeof firstImage === 'string') {
          // If it's a string, normalize relative paths.
          if (firstImage.startsWith('http')) {
            imageUrl = firstImage;
          } else if (firstImage.startsWith('/')) {
            imageUrl = `${apiUrl}${firstImage}`;
          } else {
            // Seed data may contain bare filenames like 'p_img1.png'
            // Assume uploads are served under `/uploads/images/`
            imageUrl = `${apiUrl}/uploads/images/${firstImage}`;
          }
      }
    }

  return (
    <div className='text-gray cursor-pointer block h-full group'>
      <Link to={`/product/${id}`} className='block'>
        <div className='bg-white p-2 pb-4 shadow-lg hover:shadow-2xl transition-all duration-300 ease-out group-hover:-rotate-1 rounded-sm'>
          <div className='overflow-hidden w-full aspect-[4/5] bg-gray-100 flex items-center justify-center'>
            <img
              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out'
              src={imageUrl}
              alt={name}
              loading='lazy'
            />
          </div>
          <div className='pt-2 flex flex-col gap-0.5 text-center'>
            <p className='text-sm font-medium text-gray-800 line-clamp-1'>{name}</p>
            <p className='text-base font-bold text-gray-900'>{currency}{price}</p>
          </div>
        </div>
      </Link>

      {/* Seller Info */}
      {sellerData && (
        <button
          onClick={(e) => {
            e.preventDefault()
            navigate(`/artisan/${sellerData.id}`)
          }}
          className='mt-2 w-full text-left p-2 bg-gray-50 rounded border border-gray-200 hover:border-black hover:bg-white transition text-xs'
        >
          <p className='font-bold text-gray-900 line-clamp-1'>{sellerData.storeName}</p>
          {sellerData.artisanType && (
            <p className='text-[11px] text-gray-600 mt-0.5'>{sellerData.artisanType}</p>
          )}
        </button>
      )}
    </div>
  )
}

export default ProductItem
