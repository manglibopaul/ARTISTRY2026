import React, { useCallback, useContext, useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext';
import RelatedProducts from '../components/RelatedProducts';
import ProductChat from '../components/ProductChat'

const Product = () => {

  const {productId} = useParams();
  const navigate = useNavigate()
  const {products, currency, addToCart} = useContext(ShopContext);
  // Use localhost fallback only in development; production must use configured API URL.
  const apiUrl = import.meta.env.VITE_API_URL
    || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:5000` : '')
  const [productData,setProductData] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [productError, setProductError] = useState('')
  const [sellerData, setSellerData] = useState(null)
  const [image,setImage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [showAR, setShowAR] = useState(false);
  const modelViewerRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [, setCurrentUser] = useState(null);
  const [arLoading, setArLoading] = useState(true);
  const [, setIsMobileDevice] = useState(false);
  const [arError, setArError] = useState('');
  const [selectedColor] = useState('#FF69B4');
  const [cartColor, setCartColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const modelViewerElementRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const applyColorToModel = (hexColor) => {
    if (!modelViewerElementRef.current) return;
    const viewer = modelViewerElementRef.current;
    
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    try {
      if (viewer.model && viewer.model.materials) {
        viewer.model.materials.forEach((material) => {
          if (material.pbrMetallicRoughness) {
            material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1.0]);
          }
        });
      }
    } catch {
      console.log('Color change may not be supported for this model');
    }
  };


  const getAvailableColors = (product) => {
    if (!product || !product.colors) return [];
    if (Array.isArray(product.colors)) return product.colors.filter(Boolean);
    if (typeof product.colors === 'string') {
      return product.colors.split(',').map(c => c.trim()).filter(Boolean);
    }
    return [];
  };

  const getAvailableSizes = (product) => {
    if (!product) return [];
    if (Array.isArray(product.sizes)) return product.sizes.filter(Boolean);
    if (typeof product.sizes === 'string') {
      return product.sizes.split(',').map(size => size.trim()).filter(Boolean);
    }
    if (typeof product.size === 'string' && product.size.trim()) {
      return [product.size.trim()];
    }
    return [];
  };

  const getImageUrl = useCallback((img) => {
    if (!img) return '/path/to/placeholder.jpg';

    if (typeof img === 'object' && img.url) {
      return img.url.startsWith('http') ? img.url : `${apiUrl}${img.url}`;
    } else if (typeof img === 'string') {
      if (img.startsWith('http')) return img;
      if (img.startsWith('/')) return `${apiUrl}${img}`;
      return `${apiUrl}/uploads/images/${img}`;
    }
    return '/path/to/placeholder.jpg';
  }, [apiUrl])

  const resolveUploadImage = (url) => {
    if (!url) return ''
    if (String(url).startsWith('http')) return url
    return `${apiUrl}${url}`
  }

  const renderStars = (rating = 0) => {
    const safe = Math.max(1, Math.min(5, Number(rating) || 0))
    return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)}`
  }

  const fetchSellerData = useCallback(async (sellerId) => {
    try {
      const res = await fetch(`${apiUrl}/api/sellers/${sellerId}`)
      if (res.ok) {
        const seller = await res.json()
        setSellerData(seller)
      }
    } catch (e) {
      console.error('Failed to fetch seller data:', e)
    }
  }, [apiUrl])

  const fetchProductData = useCallback(async () => {
    setLoadingProduct(true)
    setProductError('')
    // Try to find product in context first (fast)
    let found = null
    for (const item of products) {
      const id = item._id || item.id
      if (String(id) === String(productId)) {
        found = item
        break
      }
    }

    if (found) {
      console.log('Product found in context', found)
      setProductData(found)
      if (Array.isArray(found.image) && found.image.length > 0) {
        const imageUrl = getImageUrl(found.image[0])
        setImage(imageUrl)
      } else {
        setImage('/path/to/placeholder.jpg')
      }
      // Fetch seller data if available
      if (found.sellerId) {
        fetchSellerData(found.sellerId)
      }
      setLoadingProduct(false)
      return
    }

    // Fallback: fetch single product from backend if not present in context
    try {
      const res = await fetch(`${apiUrl}/api/products/${productId}`)
      console.log('Fallback product fetch', res.status, res.statusText)
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched single product', data)
        setProductData(data)
        if (Array.isArray(data.image) && data.image.length > 0) setImage(getImageUrl(data.image[0]))
        else setImage('/path/to/placeholder.jpg')
        // Fetch seller data if available
        if (data.sellerId) {
          fetchSellerData(data.sellerId)
        }
      } else if (res.status === 404) {
        setProductError('Product not found (404)')
      } else {
        setProductError(`Failed to load product: ${res.status} ${res.statusText}`)
      }
    } catch (e) {
      console.error('Failed to fetch single product fallback', e)
      setProductError(e.message || 'Network error')
    }

    setLoadingProduct(false)
    // fetch reviews for this product
    try {
      const res = await fetch(`${apiUrl}/api/reviews/product/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data || []);
        if (data && data.length) {
          const avg = (data.reduce((s, r) => s + (Number(r.rating) || 0), 0) / data.length).toFixed(1);
          setAvgRating(avg);
        } else {
          setAvgRating(null);
        }
      }
    } catch {
      // ignore
    }

    // fetch current user profile if logged in so we can show delete controls
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');
      if (token) {
        const pu = await fetch(`${apiUrl}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (pu.ok) {
          const ud = await pu.json();
          setCurrentUser(ud);
        }
      }
    } catch {
      // ignore
    }

    // no eligibility/form fetching here — reviews can be submitted from Order view only
  }, [apiUrl, productId, products, fetchSellerData, getImageUrl])

  useEffect(()=>{
    fetchProductData();
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobileDevice(mobile);
  },[fetchProductData])

  useEffect(() => {
    const availableColors = getAvailableColors(productData);
    if (availableColors.length > 0) {
      setCartColor(availableColors[0]);
    } else {
      setCartColor('');
    }
  }, [productData])

  useEffect(() => {
    const availableSizes = getAvailableSizes(productData);
    if (availableSizes.length > 0) {
      setSelectedSize(availableSizes[0]);
    } else {
      setSelectedSize('');
    }
  }, [productData])

  

  const resolvedModelUrl = productData?.modelUrl
    ? (productData.modelUrl.startsWith('http') ? productData.modelUrl : `${apiUrl}${productData.modelUrl}`)
    : '';
  const resolvedIosModelUrl = productData?.iosModel
    ? (productData.iosModel.startsWith('http') ? productData.iosModel : `${apiUrl}${productData.iosModel}`)
    : '';

  // Set model-viewer src when AR modal opens
  useEffect(() => {
    if (!productData || !showAR || !modelViewerRef.current) return
    if (!productData.modelUrl) return

    setArLoading(true);
    setArError('');
    // Clear previous content
    modelViewerRef.current.innerHTML = '';

    // Create model-viewer element
    const viewer = document.createElement('model-viewer');
    viewer.setAttribute('src', resolvedModelUrl);
    viewer.setAttribute('ar', '');
    viewer.setAttribute('ar-modes', 'scene-viewer quick-look webxr');
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('auto-rotate', '');
    // Allow the model to load immediately so the preview appears
    viewer.setAttribute('reveal', 'auto');
    viewer.setAttribute('interaction-prompt', 'auto');
    viewer.setAttribute('exposure', '1');
    viewer.setAttribute('shadow-intensity', '1');
    viewer.setAttribute('environment-image', 'neutral');
    viewer.setAttribute('scale-to-fit', 'true');
    viewer.style.width = '100%';
    viewer.style.height = '100%';

    if (resolvedIosModelUrl) {
      viewer.setAttribute('ios-src', resolvedIosModelUrl);
    }

    // Handle model loaded event
    const handleLoad = () => {
      setArLoading(false);
      modelViewerElementRef.current = viewer;
    };
    const handleError = () => {
      setArLoading(false);
      setArError('Failed to load 3D model. Check the model URL and network access.');
    };
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    modelViewerRef.current.appendChild(viewer);
    
    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [showAR, productData, selectedColor, resolvedModelUrl, resolvedIosModelUrl]);

  useEffect(() => {
    if (selectedColor && modelViewerElementRef.current) {
      applyColorToModel(selectedColor);
    }
  }, [selectedColor]);

  const handleNextImage = () => {
    if (productData.image && productData.image.length > 0) {
      const nextIndex = (currentImageIndex + 1) % productData.image.length;
      setCurrentImageIndex(nextIndex);
      const imgUrl = getImageUrl(productData.image[nextIndex]);
      setImage(imgUrl);
    }
  };

  const handlePrevImage = () => {
    if (productData.image && productData.image.length > 0) {
      const prevIndex = (currentImageIndex - 1 + productData.image.length) % productData.image.length;
      setCurrentImageIndex(prevIndex);
      const imgUrl = getImageUrl(productData.image[prevIndex]);
      setImage(imgUrl);
    }
  };

  if (loadingProduct) return <div className='py-20 text-center'>Loading product...</div>
  if (productError) return <div className='py-20 text-center text-red-600'>Error: {productError}</div>
  if (!productData) return <div className='py-20 text-center'>Product not found.</div>

  return (
    <div className='border-t-2 pt-4 sm:pt-10 px-2 sm:px-0 transition-opacity ease-in duration-500 opacity-100'>

      <div className='flex gap-4 sm:gap-12 flex-col sm:flex-row'>

        {/* -------------------------product images----------------- */}
        <div className='flex-1 flex flex-col-reverse gap-3 sm:flex-row'>
          <div className='flex sm:flex-col overflow-x-auto sm:overflow-y-scroll justify-start sm:justify-normal sm:w-[18.7%] w-full gap-2 pb-2 sm:pb-0'>
            {productData.image && productData.image.map((item,index)=>{
              const imgUrl = getImageUrl(item);
              const isActive = image === imgUrl;
              return (
                <img 
                  onClick={()=>{
                    setImage(imgUrl);
                    setCurrentImageIndex(index);
                  }} 
                  src={imgUrl} 
                  key={index} 
                  className={`w-[20%] sm:w-full aspect-square object-cover sm:mb-3 flex-shrink-0 cursor-pointer rounded transition-all min-h-[40px] sm:min-h-[60px] ${isActive ? 'border-2 border-black' : 'border border-gray-300'}`}
                  alt={`Product view ${index + 1}`}
                />
              )
            })}
          </div>
          <div className='w-full sm:w-[80%] relative'>
              <div className='w-full h-[300px] sm:h-[360px] md:h-[420px] bg-gray-50 rounded overflow-hidden flex items-center justify-center'>
                <img className='max-w-full max-h-full w-auto h-full object-contain' src={image} alt="" />
              </div>
              {productData.image && productData.image.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className='absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all z-10'
                    aria-label='Previous image'
                  >
                    <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className='absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all z-10'
                    aria-label='Next image'
                  >
                    <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </button>
                  <div className='absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm'>
                    {currentImageIndex + 1} / {productData.image.length}
                  </div>
                </>
              )}
          </div>
        </div>

        {/* ---------- Product info ---------- */}
        <div className='flex-1'>
          <h1 className='font-medium text-xl sm:text-2xl mt-2'>{productData.name}</h1>
            <div className='mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6'>
              <p className='text-2xl sm:text-3xl font-medium'>{currency}{productData.price}</p>
              <div className='text-xs sm:text-sm text-gray-600'>
                {avgRating ? (
                  <>
                    <span className='font-medium'>{avgRating}</span>
                    <span className='ml-1'>/ 5</span>
                    <span className='ml-2 text-gray-500'>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                  </>
                ) : (
                  <span className='text-gray-500'>No reviews yet</span>
                )}
              </div>
            </div>
          <p className='mt-5 text-gray-500 md:w-4/5'>{productData.description}</p>

          {/* ------- COLOR + QUANTITY + ADD TO CART ------- */}
          <div className='my-6 sm:my-8 space-y-4'>
            {/* Color Selection (seller-defined) */}
            {getAvailableColors(productData).length > 0 && (
              <div>
                <p className='text-sm font-medium mb-2'>Choose Color:</p>
                <div className='flex flex-wrap gap-2'>
                  {getAvailableColors(productData).map((color) => (
                    <button
                      key={color}
                      onClick={() => setCartColor(color)}
                      className={`px-4 py-2.5 sm:px-3 sm:py-2 rounded text-sm sm:text-xs font-medium transition-all ${
                        cartColor === color
                          ? 'ring-2 ring-offset-2 ring-black scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        border: '1px solid #ccc'
                      }}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {getAvailableSizes(productData).length > 0 && (
              <div>
                <p className='text-sm font-medium mb-2'>Available Sizes:</p>
                <div className='flex flex-wrap gap-2'>
                  {getAvailableSizes(productData).map((size) => (
                    <button
                      key={size}
                      type='button'
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2.5 sm:px-3 sm:py-2 rounded text-sm sm:text-xs font-medium border transition-all ${selectedSize === size ? 'border-black bg-black text-white' : 'border-gray-300 bg-white hover:border-black'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart + AR Button */}
            <div className='flex flex-col sm:flex-row gap-3'>
              {/* ⭐ View AR button */}
              {productData.modelUrl && (
                <button 
                  onClick={()=>setShowAR(true)} 
                  className='border border-black px-6 py-3 text-sm w-full sm:w-auto bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-semibold shadow-md hover:from-pink-600 hover:to-yellow-500 transition-colors duration-200'>
                  View AR
                </button>
              )}

              <div className='flex items-center gap-2 w-full sm:w-auto'>
                <input
                  type='number'
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  className='w-24 sm:w-20 px-3 py-3 border rounded text-sm min-h-[44px]'
                  aria-label='Quantity'
                />
                <button 
                  onClick={() => {
                    const availableColors = getAvailableColors(productData);
                    const availableSizes = getAvailableSizes(productData);
                    addToCart(
                      productData._id || productData.id,
                      quantity,
                      availableColors.length ? cartColor : null,
                      availableSizes.length ? selectedSize : null,
                    );
                  }} 
                  className='bg-black text-white px-6 py-3 text-sm active:bg-pink-700 flex-1 sm:flex-none'>
                  ADD TO CART
                </button>
              </div>
            </div>
          </div>

          <hr className='mt-6 sm:mt-8 sm:w-4/5' />

          {/* -------- Seller Info -------- */}
          {sellerData && (
            <div className='mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1'>
                  <button
                    onClick={() => navigate(`/artisan/${sellerData.id}`)}
                    className='hover:text-black transition'
                  >
                    <h3 className='font-bold text-lg text-left text-gray-900 hover:underline'>
                      {sellerData.storeName}
                    </h3>
                  </button>
                  {sellerData.expertise && sellerData.expertise.length > 0 && (
                    <div className='mt-2 flex flex-wrap gap-1'>
                      {sellerData.expertise.slice(0, 2).map(tag => (
                        <span key={tag} className='text-xs bg-white text-gray-600 px-2 py-0.5 rounded border border-gray-300'>
                          {tag}
                        </span>
                      ))}
                      {sellerData.expertise.length > 2 && (
                        <span className='text-xs text-gray-500'>+{sellerData.expertise.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/artisan/${sellerData.id}`)}
                  className='text-sm font-medium text-black hover:bg-black hover:text-white px-4 py-2 rounded border border-black transition'
                >
                  View Shop →
                </button>
              </div>
            </div>
          )}

          {/* Inline product chat - scoped to this product's seller */}
          <div className='mt-6'>
            <h3 className='font-semibold mb-2'>Chat with seller</h3>
            <div className='border rounded p-3'>
              <ProductChat
                productId={productId}
                sellerId={productData.sellerId || productData.seller?.id || sellerData?.id || null}
                sellerName={productData.sellerName || productData.seller?.storeName || productData.seller?.name || sellerData?.storeName || 'Seller'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Reviews (moved into Description tab) ---------- */}
      <div className='mt-20'>
        <div className='flex'>
          <b className='border px-5 py-3 text-sm'>Reviews</b>
        </div>
        <div className='flex flex-col gap-4 border px-6 py-6 text-sm text-gray-500'>
          <div className='mb-4'>
            {avgRating ? (
              <div className='text-sm text-gray-700'>
                <span className='font-medium'>{avgRating}</span>
                <span className='ml-1'>/ 5</span>
                <span className='ml-2 text-gray-500'>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </div>
            ) : (
              <div className='text-sm text-gray-500'>No reviews yet.</div>
            )}
          </div>

          <div className='space-y-4'>
            {reviews.map((r, i) => (
              <div key={i} className='p-3 border rounded bg-gray-50'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm font-medium'>{r.userName || 'Customer'}</div>
                  <div className='text-sm text-amber-500'>{renderStars(r.rating)}</div>
                </div>
                <div className='text-sm text-gray-700 mt-1'>{r.comment}</div>
                {r.imageUrl && (
                  <img
                    src={resolveUploadImage(r.imageUrl)}
                    alt='Review attachment'
                    className='mt-2 rounded border border-gray-200 max-h-56 w-auto'
                  />
                )}
                {r.sellerReply && (
                  <div className='mt-2 p-2 bg-white border rounded'>
                    <div className='text-sm sm:text-xs text-gray-600 font-medium'>Seller reply</div>
                    <div className='text-sm text-gray-700 mt-1'>{r.sellerReply}</div>
                    {r.sellerReplyAt && <div className='text-sm sm:text-xs text-gray-400 mt-1'>{new Date(r.sellerReplyAt).toLocaleString()}</div>}
                  </div>
                )}
                <div className='mt-2 text-sm sm:text-xs text-gray-400'>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Related Products ---------- */}
      <RelatedProducts category={productData.category} subCategory={productData.subCategory}/>

      

      {/* ---------- AR POPUP MODAL ---------- */}
      {showAR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-lg text-center relative max-w-[900px] w-full max-h-[90vh] overflow-y-auto">

            <button 
              className="absolute top-1 right-2 sm:top-2 sm:right-3 text-xl hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center z-10"
              onClick={() => setShowAR(false)}
            >
              ✖
            </button>

            <h2 className="text-base sm:text-lg font-medium mb-2 sm:mb-3">View in Augmented Reality</h2>

            {!productData.modelUrl ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 text-base">📦 No 3D model available for this product</p>
              </div>
            ) : (
              <>
                <div className="relative overflow-hidden">
                  <div ref={modelViewerRef} style={{ width: "100%", background: "#f5f5f5" }} className="h-[50vh] sm:h-[60vh] md:h-[70vh]">
                  </div>
                  {arError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90">
                      <div className="text-red-700 text-center text-sm px-4">
                        {arError}
                      </div>
                    </div>
                  )}
                  {arLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                      <div className="text-gray-600 text-center">
                        <div className="text-2xl mb-2">⏳</div>
                        <span>Loading 3D model...</span>
                      </div>
                    </div>
                  )}
                </div>

              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default Product
