import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getArtisanPath } from '../utils/artisanUrl'
import { ShopContext } from '../context/ShopContext'

const CartSlideout = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { products, currency, cartsItems, updateQuantity, getCartAmount, parseCartKey } = useContext(ShopContext)
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
  const [cartData, setCartData] = useState([])
  const [sellers, setSellers] = useState({})

  useEffect(() => {
    const tempData = []
    for (const items in cartsItems) {
      if (cartsItems[items] > 0) {
        tempData.push({
          _id: items,
          quantity: cartsItems[items]
        })
      }
    }
    setCartData(tempData)
  }, [cartsItems])

  // Fetch all sellers once
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/sellers/all`)
        if (res.ok) {
          const sellerList = await res.json()
          const sellerMap = {}
          sellerList.forEach(seller => {
            sellerMap[seller.id] = seller
          })
          setSellers(sellerMap)
        }
      } catch (e) {
        console.error('Failed to fetch sellers:', e)
      }
    }
    
    if (isOpen) {
      fetchSellers()
    }
  }, [isOpen, apiUrl])

  const handleCheckout = () => {
    onClose()
    navigate('/place-order')
  }

  const subtotal = getCartAmount ? getCartAmount() : 0

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slideout Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 sm:p-6 border-b'>
          <h2 className='text-xl sm:text-2xl font-bold'>Your cart</h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
                        <button
                          onClick={() => { onClose(); navigate('/collection'); }}

        {/* Cart Items */}
        <div className='flex-1 overflow-y-auto p-6'>
          {cartData.length === 0 ? (
            <div className='text-center text-gray-500 mt-20'>
              <p>Your cart is empty</p>
              <button
                onClick={() => { onClose(); navigate('/orders'); }}
                className='mt-4 text-sm text-black underline hover:text-gray-700'
              >
                View my orders
              </button>
            </div>
          ) : (
            <>
              {/* Filter out items without products and check if any valid items remain */}
              {(() => {
                const validItems = cartData.filter((item) => {
                  const { id: productId } = parseCartKey(item._id)
                  return products.some((product) => {
                    if (product._id && String(product._id) === String(productId)) return true
                    if (product.id && String(product.id) === String(productId)) return true
                    return false
                  })
                })

                if (validItems.length === 0) {
                  return (
                    <div className='text-center text-gray-500 mt-20'>
                      <p>Your cart is empty</p>
                        <button
                        onClick={() => { onClose(); navigate('/collection'); }}
                        className='mt-4 text-sm text-black underline hover:text-gray-700'
                      >
                        Browse products
                      </button>
                    </div>
                  )
                }

                return (
                  <div className='space-y-6'>
                    {/* Header Row */}
                    <div className='grid grid-cols-[1fr_auto] gap-4 text-xs text-gray-500 uppercase border-b pb-2'>
                      <div>PRODUCT</div>
                      <div className='text-right'>TOTAL</div>
                    </div>

                    {/* Cart Items */}
                    {validItems.map((item, index) => {
                      const { id: productId, color, size } = parseCartKey(item._id)
                      const productData = products.find((product) => {
                        if (product._id && String(product._id) === String(productId)) return true
                        if (product.id && String(product.id) === String(productId)) return true
                        return false
                      })

                      if (!productData) return null

                // Resolve image URL
                const firstImg = Array.isArray(productData.image) && productData.image.length > 0 ? productData.image[0] : null
                let imgSrc = '/path/to/placeholder.jpg'
                if (firstImg) {
                  if (typeof firstImg === 'object' && firstImg.url) {
                    imgSrc = firstImg.url.startsWith('http') ? firstImg.url : `${apiUrl}${firstImg.url}`
                  } else if (typeof firstImg === 'string') {
                    imgSrc = firstImg.startsWith('http') ? firstImg : `${apiUrl}${firstImg}`
                  }
                }

                const itemTotal = productData.price * item.quantity

                return (
                  <div key={index} className='pb-6 border-b'>
                    <div className='grid grid-cols-[80px_1fr_auto] gap-4'>
                      {/* Product Image & Details */}
                      <div className='flex gap-4 col-span-2'>
                        <img
                          src={imgSrc}
                          alt={productData.name}
                          className='w-20 h-20 object-cover rounded'
                        />
                        <div className='flex flex-col justify-between'>
                          <div>
                            <h3 className='font-medium text-sm mb-1'>{productData.name}</h3>
                            <p className='text-sm text-gray-600'>{currency}{productData.price}</p>
                            {color && (
                              <p className='text-xs text-gray-500 mt-1'>Color: {color}</p>
                            )}
                            {size && (
                              <p className='text-xs text-gray-500 mt-1'>Size: {size}</p>
                            )}
                          </div>
                          {/* Quantity Controls */}
                          <div className='flex items-center gap-2 mt-2'>
                            <button
                              onClick={() => updateQuantity(item._id, item.quantity - 1)}
                              className='w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors'
                            >
                              −
                            </button>
                            <span className='w-8 text-center font-medium'>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item._id, item.quantity + 1)}
                              className='w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 transition-colors'
                            >
                              +
                            </button>
                            <button
                              onClick={() => updateQuantity(item._id, 0)}
                              className='ml-2 text-gray-400 hover:text-red-500 transition-colors'
                            >
                              <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                                <path fillRule='evenodd' d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z' clipRule='evenodd' />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className='text-right font-semibold'>
                        {currency}{itemTotal.toFixed(2)}
                      </div>
                    </div>

                    {/* Seller Info */}
                    {productData.sellerId && sellers[productData.sellerId] && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          onClose()
                          navigate(getArtisanPath(sellers[productData.sellerId]))
                        }}
                        className='mt-3 w-full text-left p-3 bg-gray-50 rounded border border-gray-200 hover:border-black hover:bg-white transition'
                      >
                        <p className='font-semibold text-gray-900 text-sm line-clamp-1'>{sellers[productData.sellerId].storeName}</p>
                      </button>
                    )}
                  </div>
                )
              })}
                  </div>
                )
              })()}
            </>
          )}
        </div>

        {/* Footer with Total and Checkout */}
        {(() => {
          const validItems = cartData.filter((item) => {
            const { id: productId } = parseCartKey(item._id)
            return products.some((product) => {
              if (product._id && String(product._id) === String(productId)) return true
              if (product.id && String(product.id) === String(productId)) return true
              return false
            })
          })
          return validItems.length > 0
        })() && (
          <div className='border-t p-6 space-y-4'>
            <div className='flex justify-between items-center text-lg'>
              <span className='font-semibold'>Estimated total</span>
              <span className='font-bold'>{currency}{subtotal.toFixed(2)} PHP</span>
            </div>
            <p className='text-xs text-gray-500'>
              Taxes, discounts and shipping calculated at checkout.
            </p>
            <button
              onClick={handleCheckout}
              className='w-full bg-black text-white py-4 rounded font-medium hover:bg-gray-800 transition-colors'
            >
              Check out
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default CartSlideout
