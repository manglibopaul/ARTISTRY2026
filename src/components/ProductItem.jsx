import React, { useCallback, useState, useEffect } from 'react'
import { useShop } from '../context/ShopContext'
import { useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import { getArtisanPath } from '../utils/artisanUrl';
import { getProductPath } from '../utils/productUrl';
import QuickViewModal from './QuickViewModal'

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
  const [quickOpen, setQuickOpen] = useState(false)

  return (
    <div className='text-gray cursor-pointer block h-full group'>
      <a href={productHref} className='block w-full text-left'>
        <div className='bg-white p-2 pb-4 shadow-lg hover:shadow-2xl transition-all duration-300 ease-out group-hover:-rotate-1 rounded-sm'>
          <div className='overflow-hidden w-full aspect-[4/5] bg-gray-100 flex items-center justify-center relative'>
            <img
              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out'
              src={imageUrl}
              alt={name}
              loading='lazy'
              onError={(e) => {
                if (e.currentTarget.src !== fallbackImage) {
                  e.currentTarget.src = fallbackImage
                }
              }}
            />
            {/* Quick View overlay */}
            <button type='button' onClick={(e)=>{ e.preventDefault(); setQuickOpen(true); }} className='absolute right-2 bottom-2 bg-white/90 px-3 py-1 rounded-full text-sm shadow-sm hover:shadow-md transition'>Quick View</button>
            {typeof stock !== 'undefined' && Number(stock) <= 0 && (
              <div className='absolute left-2 top-2 inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700'>
                Sold out
              </div>
            )}
          </div>
          <div className='pt-2 flex flex-col gap-0.5 text-center'>
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
          className='mt-2 w-full text-left p-2 bg-gray-50 rounded border border-gray-200 hover:border-black hover:bg-white transition text-xs'
        >
          <p className='font-bold text-gray-900 line-clamp-1'>{sellerData.storeName}</p>
          {sellerData.artisanType && (
            <p className='text-[11px] text-gray-600 mt-0.5'>{sellerData.artisanType}</p>
          )}
        </button>
      )}

      <QuickViewModal open={quickOpen} onClose={() => setQuickOpen(false)} productId={id} initialImage={imageUrl} />
    </div>
  )
}

export default ProductItem
