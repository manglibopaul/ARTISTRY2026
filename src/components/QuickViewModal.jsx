import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const QuickViewModal = ({ open, onClose, productId, initialImage }) => {
  const { addToCart, currency } = useContext(ShopContext)
  const [qty, setQty] = useState(1)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    let mounted = true
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
        const res = await axios.get(`${apiUrl}/api/products/${encodeURIComponent(productId)}`)
        if (mounted) setProduct(res.data)
      } catch (err) {
        console.error('QuickView fetch product', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchProduct()
    return () => { mounted = false }
  }, [open, productId])

  useEffect(() => {
    // Reset selections when product changes
    setSelectedColor(null)
    setSelectedSize(null)
    setQty(1)
  }, [product])

  if (!open) return null

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  // Normalize image URL (product.image can be various shapes across API versions)
  let image = initialImage || ''
  if (product) {
    if (Array.isArray(product.image) && product.image.length) {
      const first = product.image[0]
      if (typeof first === 'object' && first !== null) {
        const candidate = first.url || first.path || first.filename || ''
        if (candidate) {
          if (candidate.startsWith('http')) image = candidate
          else if (candidate.startsWith('/')) image = `${apiUrl}${candidate}`
          else image = `${apiUrl}/uploads/images/${candidate}`
        }
      } else if (typeof first === 'string') {
        if (first.startsWith('http')) image = first
        else if (first.startsWith('/')) image = `${apiUrl}${first}`
        else image = `${apiUrl}/uploads/images/${first}`
      }
    } else if (product.image && typeof product.image === 'string') {
      const first = product.image
      if (first.startsWith('http')) image = first
      else if (first.startsWith('/')) image = `${apiUrl}${first}`
      else image = `${apiUrl}/uploads/images/${first}`
    }
  }

  const handleAdd = () => {
    if (!product) return
    addToCart(product._id || product.id, qty, selectedColor, selectedSize)
    onClose()
  }

  const openProductPage = () => {
    if (!product) return
    navigate(`/product/${product._id || product.id}/${encodeURIComponent(product.name || '')}`)
    onClose()
  }

  const colorOptions = product?.colors || (product?.colorParts ? Object.keys(product.colorParts) : [])
  const sizeOptions = product?.sizes || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl p-6 animate-fadeIn">
        {loading ? (
          <div className='p-8 text-center'>Loading...</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/2 bg-gray-100 flex items-center justify-center rounded overflow-hidden">
              {image ? <img src={image} alt={product?.name} className="w-full h-72 object-cover" /> : <div className='p-6'>No image</div>}
            </div>
            <div className="md:w-1/2 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">{product?.name}</h3>
                <p className="text-gray-600 mb-3">{product?.description || product?.shortDescription || ''}</p>
                <div className="text-2xl font-extrabold mb-3">{currency}{product?.price}</div>

                {colorOptions && colorOptions.length > 0 && (
                  <div className='mb-3'>
                    <div className='text-sm font-medium mb-1'>Color</div>
                    <div className='flex gap-2 flex-wrap'>
                      {colorOptions.map((c, i) => (
                        <button key={i} onClick={() => setSelectedColor(c)} className={`px-3 py-1 border rounded text-sm ${selectedColor===c ? 'bg-black text-white' : 'bg-white'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sizeOptions && sizeOptions.length > 0 && (
                  <div className='mb-3'>
                    <div className='text-sm font-medium mb-1'>Size</div>
                    <div className='flex gap-2 flex-wrap'>
                      {sizeOptions.map((s, i) => (
                        <button key={i} onClick={() => setSelectedSize(s)} className={`px-3 py-1 border rounded text-sm ${selectedSize===s ? 'bg-black text-white' : 'bg-white'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <input type="number" min="1" value={qty} onChange={(e)=>setQty(Math.max(1, Number(e.target.value||1)))} className="w-24 px-3 py-2 border rounded" />
                <button onClick={handleAdd} className="bg-black text-white px-4 py-2 rounded">Add to cart</button>
                <button onClick={openProductPage} className="px-4 py-2 rounded border">View product</button>
                {product?.modelUrl && (
                  <button onClick={() => { window.open(product.modelUrl, '_blank'); onClose() }} className='px-4 py-2 rounded bg-gradient-to-r from-pink-500 to-yellow-400 text-white'>View AR</button>
                )}
                <div className="ml-auto">
                  <button onClick={onClose} className="px-4 py-2 rounded border">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickViewModal
