import React, { useCallback, useContext, useEffect, useState, useRef } from 'react'
// Simple iOS detection
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
import { useParams, useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext';
const RelatedProducts = React.lazy(() => import('../components/RelatedProducts'));
const ProductChat = React.lazy(() => import('../components/ProductChat'))
import { getArtisanPath } from '../utils/artisanUrl'
import { getProductPath } from '../utils/productUrl'

const Product = () => {

  const { productRef } = useParams();
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
  const [quantityInput, setQuantityInput] = useState('1')
  const [showAR, setShowAR] = useState(false);
  const modelViewerRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [, setCurrentUser] = useState(null);
  const [arLoading, setArLoading] = useState(true);
  const [, setIsMobileDevice] = useState(false);
  const [arError, setArError] = useState('');
  const [arInSession, setArInSession] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF69B4');
  const [cartColor, setCartColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const modelViewerElementRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAdded, setShowAdded] = useState(false);
  const [detectedParts, setDetectedParts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [showPartsList, setShowPartsList] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const reviewsRef = useRef(null);
  const [reviewsInView, setReviewsInView] = useState(true);

  const normalizeToHex = (color) => {
    if (!color || typeof window === 'undefined') return null;
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = color;
      const computed = ctx.fillStyle;
      if (!computed) return null;
      if (computed.startsWith('#')) return computed;
      const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!m) return null;
      const toHex = (n) => (Number(n).toString(16).padStart(2, '0'));
      return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
    } catch (e) {
      return null;
    }
  };

  const detectModelParts = (viewer) => {
    try {
      const names = new Set();
      if (!viewer) return setDetectedParts([]);
      const model = viewer.model || viewer.scene || null;
      if (model && model.materials) {
        model.materials.forEach((m) => {
          const n = (m && (m.name || m._name)) || '';
          if (n && String(n).trim()) names.add(String(n).trim());
        });
      }
      if (model && model.scene && typeof model.scene.traverse === 'function') {
        model.scene.traverse((node) => {
          if (!node) return;
          const n = node.name || (node.material && (node.material.name || node.material._name)) || '';
          if (n && String(n).trim()) names.add(String(n).trim());
        });
      }
      const arr = Array.from(names).filter(Boolean);
      // default selection: if product defines colorableParts use that, otherwise select all except likely exclusions
      const defaultSelected = Array.isArray(productData?.colorableParts) && productData.colorableParts.length > 0
        ? productData.colorableParts
        : arr.filter(n => !/eye|pupil|button|stitch|seam|tongue/i.test(n));
      setDetectedParts(arr);
      setSelectedParts(defaultSelected);
    } catch (err) {
      console.error('detectModelParts error', err);
      setDetectedParts([]);
      setSelectedParts([]);
    }
  };

  const applyColorToModel = (hexColor) => {
    if (!modelViewerElementRef.current) return;
    const viewer = modelViewerElementRef.current;
    
    const hexVal = normalizeToHex(hexColor);
    if (!hexVal) return;
    const hex = hexVal.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    try {
      if (viewer.model && viewer.model.materials) {
        // Determine allowed parts: prefer explicit selectedParts set by the user in the modal
        const userSelected = Array.isArray(selectedParts) && selectedParts.length > 0
          ? selectedParts.map(s => String(s).toLowerCase())
          : null;
        const whitelist = userSelected || ((productData && Array.isArray(productData.colorableParts)) ? productData.colorableParts.map(s => String(s).toLowerCase()) : []);
        const blacklist = (productData && Array.isArray(productData.colorExclusions)) ? productData.colorExclusions.map(s => String(s).toLowerCase()) : [];

        viewer.model.materials.forEach((material) => {
          try {
            const mName = (material.name || material._name || '').toString().toLowerCase();
            // Skip if explicitly excluded
            if (blacklist.length && blacklist.some(ex => mName.includes(ex))) return;
            // If whitelist provided (non-empty), only apply when material name matches one of the whitelist items
            if (whitelist && whitelist.length && !whitelist.some(w => mName.includes(w))) return;

            if (material.pbrMetallicRoughness && typeof material.pbrMetallicRoughness.setBaseColorFactor === 'function') {
              material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1.0]);
            }
          } catch (inner) {
            // ignore individual material failures
          }
        });
      }
    } catch (e) {
      // Primary API failed — log and continue to fallback strategies
      console.log('Primary material API failed:', e);
    }

    // Fallback strategy: traverse underlying scene/meshes and try common material APIs
    try {
      const sceneRoot = (viewer.model && (viewer.model.scene || viewer.model)) || null;
      if (sceneRoot && typeof sceneRoot.traverse === 'function') {
        sceneRoot.traverse((node) => {
          try {
            if (!node || !node.material) return;
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((mat) => {
              if (!mat) return;
              try {
                if (mat.pbrMetallicRoughness && typeof mat.pbrMetallicRoughness.setBaseColorFactor === 'function') {
                  mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1.0]);
                } else if (Array.isArray(mat.baseColorFactor)) {
                  mat.baseColorFactor = [r, g, b, 1.0];
                } else if (mat.setBaseColorFactor && typeof mat.setBaseColorFactor === 'function') {
                  mat.setBaseColorFactor([r, g, b, 1.0]);
                } else if (mat.color && typeof mat.color.set === 'function') {
                  mat.color.set(hexVal);
                } else if (mat.uniforms && mat.uniforms.baseColor && mat.uniforms.baseColor.value) {
                  const u = mat.uniforms.baseColor;
                  if (u.value && typeof u.value.set === 'function') {
                    u.value.set(hexVal);
                  } else if (Array.isArray(u.value)) {
                    u.value = [r, g, b, 1.0];
                  }
                }
              } catch (innerMatErr) {
                // ignore material update failure
              }
              try { mat.needsUpdate = true; } catch (_) {}
            });
          } catch (nodeErr) {
            // ignore node traversal errors
          }
        });
      }
    } catch (e2) {
      console.log('Fallback material traversal failed:', e2);
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
    const ref = String(productRef || '').trim()
    const idSuffixMatch = ref.match(/-p(\d+)$/i)
    const refId = idSuffixMatch ? idSuffixMatch[1] : null
    const slugRef = (idSuffixMatch ? ref.replace(/-p\d+$/i, '') : ref).toLowerCase()
    const isNumericRef = /^\d+$/.test(ref) || Boolean(refId)

    if (!ref) {
      setProductError('Product not found')
      setLoadingProduct(false)
      return
    }

    // Try to find product in context first (fast)
    let found = null
    for (const item of products) {
      const id = item._id || item.id
      if (isNumericRef && String(id) === String(refId || ref)) {
        found = item
        break
      }
      if (!isNumericRef) {
        const localSlug = String(item?.name || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        if (localSlug === slugRef) {
          found = item
          break
        }
      }
    }

    if (found) {
      setProductData(found)
      if (found.sellerId) fetchSellerData(found.sellerId)
      setLoadingProduct(false)
      // fetch reviews for this product
      try {
        const pId = found._id || found.id
        if (pId) {
          const res = await fetch(`${apiUrl}/api/reviews/product/${pId}`);
          if (res.ok) {
            const data = await res.json();
            const list = data.reviews || data;
            setReviews(list || []);
            if (list && list.length) {
              const avg = (list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length).toFixed(1);
              setAvgRating(avg);
            } else {
              setAvgRating(null);
            }
          }
        }
      } catch {
        // ignore
      }
    } else {
      // Product not found in context, try API fallback
      try {
        const response = await fetch(`${apiUrl}/api/products/by-name/${encodeURIComponent(ref)}`)
        if (response.ok) {
          const product = await response.json()
          setProductData(product)
          if (product.sellerId) fetchSellerData(product.sellerId)
          // fetch reviews for this product
          const pId = product._id || product.id
          if (pId) {
            const res = await fetch(`${apiUrl}/api/reviews/product/${pId}`)
            if (res.ok) {
              const data = await res.json()
              const list = data.reviews || data
              setReviews(list || [])
              if (list && list.length) {
                const avg = (list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length).toFixed(1)
                setAvgRating(avg)
              } else {
                setAvgRating(null)
              }
            }
          }
        } else {
          setProductError('Product not found')
        }
      } catch (e) {
        console.error('Failed to fetch single product fallback', e)
        setProductError(e.message || 'Network error')
      }
      setLoadingProduct(false)
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
  }, [apiUrl, productRef, products, fetchSellerData, getImageUrl, navigate])

  useEffect(()=>{
    fetchProductData();
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobileDevice(mobile);
  },[fetchProductData])

  useEffect(() => {
    if (!reviewsRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          setReviewsInView(true);
          obs.disconnect();
        }
      })
    }, { threshold: 0.08 });
    obs.observe(reviewsRef.current);
    return () => obs.disconnect();
  }, [reviewsRef]);

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

  useEffect(() => {
    setQuantityInput(String(quantity));
  }, [quantity]);

  

  const resolvedModelUrl = productData?.modelUrl
    ? (productData.modelUrl.startsWith('http') ? productData.modelUrl : `${apiUrl}${productData.modelUrl}`)
    : '';
  const resolvedIosModelUrl = productData?.iosModel
    ? (productData.iosModel.startsWith('http') ? productData.iosModel : `${apiUrl}${productData.iosModel}`)
    : '';

  const availableColors = getAvailableColors(productData);

  // Set model-viewer src when AR modal opens
  useEffect(() => {
    if (!productData || !showAR || !modelViewerRef.current) return
    if (!productData.modelUrl) return
    // Lazy-load the model-viewer module only when AR is requested
    const ensureModelViewer = async () => {
      try {
        if (typeof window !== 'undefined' && !window.customElements?.get('model-viewer')) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.type = 'module';
            s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js';
            s.onload = () => resolve();
            s.onerror = (e) => reject(e);
            document.head.appendChild(s);
          });
        }
      } catch (e) {
        console.warn('Failed to load model-viewer script dynamically', e);
      }
    };

    // load the module first
    ensureModelViewer().catch(() => {});

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
    viewer.setAttribute('loading', 'eager');
    if (image) {
      viewer.setAttribute('poster', image);
    }
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
      // detect model parts for debugging / selective recolor
      try {
        detectModelParts(viewer);
      } catch (e) {
        // ignore detection errors
      }
    };
    const handleError = () => {
      setArLoading(false);
      setArError('Failed to load 3D model. Check the model URL and network access.');
    };
    // When entering AR/VR (WebXR) disable camera controls to prevent pinch-zoom in real world
    const handleEnterXR = () => {
      try {
        viewer.removeAttribute('camera-controls');
        setArInSession(true);
      } catch (e) {}
    };
    const handleExitXR = () => {
      try {
        viewer.setAttribute('camera-controls', '');
        setArInSession(false);
      } catch (e) {}
    };
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    viewer.addEventListener('enter-vr', handleEnterXR);
    viewer.addEventListener('exit-vr', handleExitXR);

    modelViewerRef.current.appendChild(viewer);
    
    return () => {
      try { viewer.removeEventListener('load', handleLoad); } catch (e) {}
      try { viewer.removeEventListener('error', handleError); } catch (e) {}
      try { viewer.removeEventListener('enter-vr', handleEnterXR); } catch (e) {}
      try { viewer.removeEventListener('exit-vr', handleExitXR); } catch (e) {}
    };
  }, [showAR, productData, selectedColor, resolvedModelUrl, resolvedIosModelUrl, image]);

  useEffect(() => {
    if (selectedColor && modelViewerElementRef.current) {
      applyColorToModel(selectedColor);
    }
  }, [selectedColor]);

  // Reapply color when selected parts change or when viewer is (re)loaded
  useEffect(() => {
    if (modelViewerElementRef.current) {
      applyColorToModel(selectedColor);
    }
  }, [selectedParts, modelViewerElementRef.current, showAR]);

  // compute seller image URL (robust fallback) for rendering
  const sellerImageSrc = (() => {
    if (!sellerData) return null;
    const candidate = sellerData.logo || sellerData.image || sellerData.profileImage || sellerData.avatar || sellerData.imageUrl || sellerData.picture || sellerData.photo || sellerData.profile_pic || sellerData.profilePicture || null;
    if (candidate) {
      let url = String(candidate);
      if (!url.startsWith('http') && url.startsWith('/')) url = `${apiUrl}${url}`;
      return url;
    }
    try {
      const found = products.find(p => (p.sellerId && sellerData.id && String(p.sellerId) === String(sellerData.id)) || (p.sellerId && sellerData._id && String(p.sellerId) === String(sellerData._id)));
      if (found && found.image && found.image.length > 0) return getImageUrl(found.image[0]);
    } catch (e) {}
    return null;
  })();

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
          <div className='flex sm:flex-col overflow-x-auto sm:overflow-y-scroll justify-start sm:justify-normal sm:w-1/4 w-full gap-3 pb-2 sm:pb-0 sm:sticky sm:top-28'>
            {productData.image && productData.image.map((item,index)=>{
              const imgUrl = getImageUrl(item);
              const isActive = image === imgUrl;
              return (
                <img 
                  onClick={()=>{
                    setImage(imgUrl);
                    setCurrentImageIndex(index);
                  }} 
                  loading='lazy' decoding='async' 
                  src={imgUrl} 
                  key={index} 
                  className={`thumbnail-img w-20 sm:w-full aspect-square object-cover sm:mb-3 flex-shrink-0 cursor-pointer rounded transition transform hover:scale-105 duration-200 min-h-[48px] sm:min-h-[60px] ${isActive ? 'thumbnail-active' : 'border border-gray-200'}`}
                  alt={`Product view ${index + 1}`}
                />
              )
            })}
          </div>
          <div className='w-full sm:w-3/4 relative'>
              <div className='w-full h-[420px] sm:h-[520px] md:h-[640px] bg-white rounded overflow-hidden flex items-center justify-center border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 product-image-frame'>
                <img loading={currentImageIndex===0?"eager":"lazy"} fetchpriority={currentImageIndex===0?"high":"low"} decoding='async' className='max-w-full max-h-full w-auto h-full object-contain transition-transform duration-500 hover:scale-105' src={image} alt="" />
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
          <h1 className='product-title mt-2'>{productData.name}</h1>
            <div className='mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6'>
              <p className='product-price'>{currency}{productData.price}</p>
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
              <button 
                onClick={()=>setShowAR(true)} 
                className={`border border-black px-5 py-2.5 text-sm w-full sm:w-auto rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-semibold shadow-md transition transform hover:-translate-y-0.5 ${productData.modelUrl ? 'hover:from-pink-600 hover:to-yellow-500' : 'opacity-50 cursor-not-allowed'}`}
                disabled={!productData.modelUrl}
              >
                View AR
              </button>

              <div className='flex items-center gap-2 w-full sm:w-auto relative'>
                <input
                  type='number'
                  min={1}
                  value={quantityInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setQuantityInput(next);
                    if (next === '') return;
                    const parsed = Number(next);
                    if (Number.isFinite(parsed) && parsed >= 1) {
                      setQuantity(Math.floor(parsed));
                    }
                  }}
                  onBlur={() => {
                    if (quantityInput === '' || Number(quantityInput) < 1) {
                      setQuantity(1);
                      setQuantityInput('1');
                      return;
                    }
                    const parsed = Math.floor(Number(quantityInput));
                    setQuantity(parsed);
                    setQuantityInput(String(parsed));
                  }}
                  className='w-24 sm:w-20 px-3 py-3 border rounded text-sm min-h-[44px]'
                  aria-label='Quantity'
                />
                <button 
                  onClick={(e) => {
                    if (productData.stock <= 0) return;
                    const btnRect = e.currentTarget.getBoundingClientRect();
                    // dispatch fly event with start coords and image
                    window.dispatchEvent(new CustomEvent('cart:add', { detail: { image, start: { left: btnRect.left, top: btnRect.top, width: btnRect.width, height: btnRect.height } } }));
                    const availableColors = getAvailableColors(productData);
                    const availableSizes = getAvailableSizes(productData);
                    addToCart(
                      productData._id || productData.id,
                      quantity,
                      availableColors.length ? cartColor : null,
                      availableSizes.length ? selectedSize : null,
                    );
                    // show temporary added feedback
                    try { setShowAdded(true); setTimeout(()=>setShowAdded(false), 900); } catch(e){}
                  }} 
                  className={`bg-black text-white px-6 py-3 text-sm rounded-md active:opacity-90 shadow-md hover:shadow-lg flex-1 sm:flex-none ${productData.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={productData.stock <= 0}
                >
                  {productData.stock <= 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                </button>
                {/* added feedback badge */}
                <div aria-hidden={!showAdded} className={`absolute -top-3 right-0 transform translate-x-1/2 transition-all duration-300 ${showAdded ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                  <div className='bg-black text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md'>Added ✓</div>
                </div>
              </div>
            </div>
          </div>

          <hr className='mt-6 sm:mt-8 sm:w-4/5' />

          {/* -------- Seller Info -------- */}
          {sellerData && (
            <div className='mt-6 p-4 border border-gray-100 rounded-lg bg-gray-50 flex items-center gap-4 product-seller-card'>
              <div className='w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-base font-semibold text-gray-700 overflow-hidden shadow'>
                {sellerImageSrc ? (
                  <img loading='lazy' decoding='async' src={sellerImageSrc} alt={sellerData.storeName || 'Seller'} className='w-full h-full object-cover' width={64} height={64} />
                ) : (
                  <span className='text-base font-semibold text-gray-700'>{sellerData.storeName ? sellerData.storeName[0] : 'S'}</span>
                )}
              </div>
              <div className='flex-1'>
                <button onClick={() => navigate(getArtisanPath(sellerData))} className='hover:text-black transition'>
                  <h3 className='font-bold text-lg text-left text-gray-900 hover:underline'>
                    {sellerData.storeName}
                  </h3>
                </button>
                {sellerData.expertise && sellerData.expertise.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {sellerData.expertise.slice(0, 3).map(tag => (
                      <span key={tag} className='text-xs bg-white text-gray-600 px-2 py-0.5 rounded border border-gray-100 shadow-sm'>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <button onClick={() => navigate(getArtisanPath(sellerData))} className='text-sm font-medium text-black border border-gray-300 hover:bg-black hover:text-white px-3 py-2 rounded-full transition shadow-sm'>
                  View Shop →
                </button>
              </div>
            </div>
          )}

          {/* Inline product chat - scoped to this product's seller */}
          <div className='mt-6'>
            <h3 className='font-semibold mb-2'>Chat with seller</h3>
            <div className='border rounded p-3'>
              <React.Suspense fallback={<div className='text-sm text-gray-500'>Loading chat…</div>}>
                <ProductChat
                  productId={productData?.id || productData?._id || productRef}
                  sellerId={productData.sellerId || productData.seller?.id || sellerData?.id || null}
                  sellerName={productData.sellerName || productData.seller?.storeName || productData.seller?.name || sellerData?.storeName || 'Seller'}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Reviews (moved into Description tab) ---------- */}
      <div className='mt-20'>
        <div className='flex'>
          <b className='border px-5 py-3 text-sm'>Reviews</b>
        </div>
        <div ref={reviewsRef} className={`${reviewsInView ? 'enter-to' : 'enter-from'} flex flex-col gap-4 border px-6 py-6 text-sm text-gray-500`}>
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
                {r.message && (
                  <div className='text-xs text-gray-500 mt-1 italic'>Note: {r.message}</div>
                )}
                {r.imageUrl && (
                  <img
                    loading='lazy' decoding='async' src={resolveUploadImage(r.imageUrl)}
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

      {/* ---------- Related Products (lazy) ---------- */}
      <React.Suspense fallback={<div className='py-6 text-center text-gray-500'>Loading related products…</div>}>
        <RelatedProducts category={productData.category} subCategory={productData.subCategory}/>
      </React.Suspense>

      

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
                  {/* Dimension toggle - small top-right toggle to avoid overlap */}
                  <button
                    onClick={() => setShowDimensions(v => !v)}
                    aria-pressed={showDimensions}
                    className="absolute z-30 right-3 top-3 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs shadow-sm"
                    title="Toggle dimensions"
                  >
                    {showDimensions ? 'Hide' : 'Show'}
                  </button>
                  
                  {/* Dimension overlays on model */}
                  {(productData?.width || productData?.height || productData?.depth) && !arLoading && (
                    <div className="absolute inset-0 pointer-events-none">
                      <svg className="w-full h-full absolute top-0 left-0" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ transition: 'opacity .18s ease' }}>
                        <defs>
                          <marker id="triA" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                            <path d="M0,0 L5,2.5 L0,5 z" fill="#475569" />
                          </marker>
                          <marker id="triB" markerWidth="5" markerHeight="5" refX="1" refY="2.5" orient="auto">
                            <path d="M5,0 L0,2.5 L5,5 z" fill="#475569" />
                          </marker>
                        </defs>
                        {!showDimensions && (
                          <g>
                            <rect x="44" y="82" width="12" height="5" rx="2" fill="#ffffff" stroke="rgba(0,0,0,0.04)" />
                            <text x="50" y="84.5" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="2.4" fontWeight="600">
                              {([productData.width, productData.height, productData.depth].filter(Boolean).join(' × '))} cm
                            </text>
                          </g>
                        )}
                        {showDimensions && (
                          <g>
                            {productData?.height && (
                              <>
                                <circle cx="16" cy="14" r="1.2" fill="#475569" opacity="0.9" />
                                <circle cx="16" cy="86" r="1.2" fill="#475569" opacity="0.9" />
                                <line x1="16" y1="14" x2="16" y2="86" stroke="#475569" strokeWidth="0.9" strokeLinecap="butt" strokeOpacity="0.9" />
                                <line x1="16" y1="30" x2="28" y2="30" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="1.5" strokeOpacity="0.25" />
                                <rect x="10" y="43" width="12" height="5" rx="2" fill="#ffffff" stroke="rgba(0,0,0,0.04)" />
                                <text x="16" y="46" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="3.4" fontWeight="600">
                                  {productData.height} cm
                                </text>
                              </>
                            )}
                            {productData?.width && (
                              <>
                                <circle cx="24" cy="94" r="1.2" fill="#475569" opacity="0.9" />
                                <circle cx="76" cy="94" r="1.2" fill="#475569" opacity="0.9" />
                                <line x1="24" y1="94" x2="76" y2="94" stroke="#475569" strokeWidth="0.9" strokeLinecap="butt" strokeOpacity="0.9" />
                                <line x1="40" y1="84" x2="40" y2="76" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="1.5" strokeOpacity="0.25" />
                                <rect x="44" y="96" width="12" height="5" rx="2" fill="#ffffff" stroke="rgba(0,0,0,0.04)" />
                                <text x="50" y="98" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="3.4" fontWeight="600">
                                  {productData.width} cm
                                </text>
                              </>
                            )}
                            {productData?.depth && (
                              <>
                                <circle cx="70" cy="18" r="1.2" fill="#475569" opacity="0.9" />
                                <circle cx="90" cy="18" r="1.2" fill="#475569" opacity="0.9" />
                                <line x1="70" y1="18" x2="90" y2="18" stroke="#475569" strokeWidth="0.9" strokeLinecap="butt" strokeOpacity="0.9" />
                                <rect x="74" y="12" width="12" height="5" rx="2" fill="#ffffff" stroke="rgba(0,0,0,0.04)" />
                                <text x="80" y="14.5" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="3" fontWeight="600">
                                  {productData.depth} cm
                                </text>
                              </>
                            )}
                          </g>
                        )}
                      </svg>
                    </div>
                  )}
                  
                  {/* Color picker controls - only show when product supports color change */}
                  {(productData?.colorChangeable || availableColors.length > 0) && (
                    <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedColor}
                          onChange={(e) => setSelectedColor(e.target.value)}
                          className="w-10 h-10 p-0 border rounded"
                          aria-label="Pick model color"
                        />
                        <button
                          onClick={() => setSelectedColor('#ffffff')}
                          className="text-xs px-2 py-1 border rounded"
                        >Reset</button>
                      </div>
                      {/* swatches removed as they were redundant */}
                      <div className="text-sm text-gray-600">Change model color</div>
                      {/* removed 'Affects' / exclusions display per request */}
                      <div className="ml-3">
                        <button onClick={() => setShowPartsList(v => !v)} className="text-xs px-2 py-1 border rounded">List model parts</button>
                      </div>
                      {showPartsList && (
                        <div className="mt-3 bg-white border rounded p-3 max-h-48 overflow-auto text-left text-sm w-full">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">Detected model parts</div>
                            <div className="flex gap-2">
                              <button onClick={() => setSelectedParts(detectedParts.slice())} className="px-2 py-1 text-xs border rounded">Select all</button>
                              <button onClick={() => setSelectedParts([])} className="px-2 py-1 text-xs border rounded">Clear</button>
                            </div>
                          </div>
                          {detectedParts.length === 0 ? (
                            <div className="text-xs text-gray-500">No parts detected yet. Close and reopen the AR modal after the model loads.</div>
                          ) : (
                            detectedParts.map((p) => (
                              <label key={p} className="flex items-center gap-2 mb-1">
                                <input type="checkbox" checked={selectedParts.includes(p)} onChange={(e) => {
                                  if (e.target.checked) setSelectedParts(prev => Array.from(new Set([...prev, p])));
                                  else setSelectedParts(prev => prev.filter(x => x !== p));
                                }} />
                                <span>{p}</span>
                              </label>
                            ))
                          )}
                        </div>
                      )}
                      <div className="w-full text-left mt-3 text-xs text-gray-700">
                        <div className="font-medium text-sm mb-1">How to change color</div>
                        <ol className="list-decimal list-inside text-xs leading-5">
                          <li>Open "View AR" and wait for the 3D model to load.</li>
                          <li>Click "List model parts" to see detected materials/meshes.</li>
                          <li>Pick a color from the color input or click a swatch — the model updates immediately.</li>
                          <li>Select the parts you want recolored (uncheck eyes/buttons).</li>
                        </ol>
                      </div>
                      </div>
                    )}
                    {/* iOS AR Quick Look Button */}
                  {/* iOS AR Quick Look button removed as requested */}
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
