import React, { useCallback, useState, useEffect } from 'react'
import { useShop } from '../context/ShopContext'
import { useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import { getArtisanPath } from '../utils/artisanUrl';
import { getProductPath } from '../utils/productUrl';
// Quick view feature removed — the product card now links directly to product page

const ProductItem = ({id, image, name, price, sellerId, sellerName, artisanType, stock}) => {

    const navigate = useNavigate()
    const { currency } = useShop();
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
    const fallbackImage = assets.p_img7
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

    // Handle array of strings and object formats returned by different API versions.
    let imageUrl = fallbackImage;
    
    if (Array.isArray(image) && image.length > 0) {
      const firstImage = image[0];
      if (typeof firstImage === 'object' && firstImage !== null) {
        const candidate = firstImage.url || firstImage.path || firstImage.filename || '';
        if (typeof candidate === 'string' && candidate) {
          if (candidate.startsWith('http')) {
            imageUrl = candidate;
          } else if (candidate.startsWith('/')) {
            imageUrl = `${apiUrl}${candidate}`;
          } else {
            imageUrl = `${apiUrl}/uploads/images/${candidate}`;
          }
        }
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

  const productHref = getProductPath({ id, name })
  // quick view removed

  return (
    <div className='text-gray cursor-pointer block h-full group'>
      <a href={productHref} className='block w-full text-left'>
        <div className='bg-white p-3 pb-6 shadow-md hover:shadow-xl transition-transform duration-300 ease-out transform group-hover:-translate-y-2 rounded-lg overflow-hidden'>
          <div className='overflow-hidden w-full aspect-[4/5] bg-gray-100 flex items-center justify-center relative rounded-md border border-gray-100'>
            <img
              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out rounded-md'
              src={imageUrl}
              alt={name}
              loading='lazy'
              onError={(e) => {
                if (e.currentTarget.src !== fallbackImage) {
                  e.currentTarget.src = fallbackImage
                }
              }}
            />
            {/* Quick View removed: clicking the card navigates to product page */}
            {typeof stock !== 'undefined' && Number(stock) <= 0 && (
              <div className='absolute left-2 top-2 inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700'>
                Sold out
              </div>
            )}
          </div>
          <div className='pt-3 flex flex-col gap-0.5 text-center'>
            <p className='text-sm font-medium text-gray-800 line-clamp-1'>{name}</p>
            <p className='text-base font-bold text-gray-900'>{currency}{price}</p>
          </div>
        </div>
      </a>

      {/* Seller Info */}
      {sellerData && (
        <button
          onClick={(e) => {
            e.preventDefault()
            navigate(getArtisanPath(sellerData))
          }}
          className='mt-2 w-full text-left p-2 bg-gray-50 rounded border border-gray-200 hover:border-black hover:bg-white transition text-xs opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300'
        >
          <p className='font-bold text-gray-900 line-clamp-1'>{sellerData.storeName}</p>
          {sellerData.artisanType && (
            <p className='text-[11px] text-gray-600 mt-0.5'>{sellerData.artisanType}</p>
          )}
        </button>
      )}

      {/* QuickView component removed */}
    </div>
  )
}

export default ProductItem
