import React, { useCallback, useContext, useEffect, useState, useRef, useMemo } from 'react'
// Simple iOS detection
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext';
const RelatedProducts = React.lazy(() => import('../components/RelatedProducts'));
const ProductChat = React.lazy(() => import('../components/ProductChat'))
const ProductDetailsSidebar = React.lazy(() => import('../components/ProductDetailsSidebar'))
const ProductMediaColumn = React.lazy(() => import('../components/ProductMediaColumn'))
import { getArtisanPath } from '../utils/artisanUrl'
import { getProductPath } from '../utils/productUrl'

const Product = () => {

  const { productRef } = useParams();
  const location = useLocation();
  const navigate = useNavigate()
  const {products, currency, addToCart} = useContext(ShopContext);
  const hasRouteProduct = Boolean(location.state?.product);
  // Use localhost fallback only in development; production must use configured API URL.
  const apiUrl = import.meta.env.VITE_API_URL
    || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:5000` : '')
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('userToken') : null
  const [productData,setProductData] = useState(location.state?.product || false);
  const [loadingProduct, setLoadingProduct] = useState(!hasRouteProduct)
  const [productError, setProductError] = useState('')
  const [sellerData, setSellerData] = useState(null)
  const [image,setImage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [quantityInput, setQuantityInput] = useState('1')
  const [showAR, setShowAR] = useState(false);
  const modelViewerRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const safeReviews = Array.isArray(reviews) ? reviews : [];
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
  const [hasUserSelectedParts, setHasUserSelectedParts] = useState(false);
  const [showPartsList, setShowPartsList] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const reviewsRef = useRef(null);
  const [reviewsInView, setReviewsInView] = useState(true);
  const [showZoomMessage, setShowZoomMessage] = useState(false);
  const zoomMessageTimeoutRef = useRef(null);

  const normalizeToHex = useCallback((color) => {
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
  }, []);

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
      if (!hasUserSelectedParts) {
        setSelectedParts(defaultSelected);
      }
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

    const explicitSelectionLower = Array.isArray(selectedParts)
      ? selectedParts.map(s => String(s).toLowerCase()).filter(Boolean)
      : null;

    const whitelist = explicitSelectionLower && explicitSelectionLower.length > 0
      ? explicitSelectionLower
      : ((productData && Array.isArray(productData.colorableParts) && productData.colorableParts.length > 0)
        ? productData.colorableParts.map(s => String(s).toLowerCase())
        : null);
    const blacklist = (productData && Array.isArray(productData.colorExclusions))
      ? productData.colorExclusions.map(s => String(s).toLowerCase())
      : [];

    const matchesWhiteList = (name) => {
      if (!whitelist || whitelist.length === 0) return true;
      if (!name) return false;
      return whitelist.some(w => name === w || name.includes(w));
    };

    const matchesNodeOrMaterial = (nodeName, materialNames) => {
      if (!whitelist || whitelist.length === 0) return true;
      if (matchesWhiteList(nodeName)) return true;
      if (!materialNames) return false;
      if (typeof materialNames === 'string') {
        return matchesWhiteList(materialNames);
      }
      if (Array.isArray(materialNames)) {
        return materialNames.some(name => matchesWhiteList(name));
      }
      return false;
    };

    try {
      if (viewer.model && viewer.model.materials) {
        viewer.model.materials.forEach((material) => {
          try {
            const mName = (material.name || material._name || '').toString().toLowerCase();
            if (blacklist.length && blacklist.some(ex => mName === ex || mName.includes(ex))) return;
            if (!matchesWhiteList(mName)) return;

            if (material.pbrMetallicRoughness && typeof material.pbrMetallicRoughness.setBaseColorFactor === 'function') {
              material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1.0]);
            }
          } catch (inner) {
            // ignore individual material failures
          }
        });
      }
    } catch (e) {
      console.log('Primary material API failed:', e);
    }

    try {
      const sceneRoot = (viewer.model && (viewer.model.scene || viewer.model)) || null;
      if (sceneRoot && typeof sceneRoot.traverse === 'function') {
        sceneRoot.traverse((node) => {
          try {
            if (!node || !node.material) return;

            const nodeName = (node.name || '').toString().toLowerCase();
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            const materialNames = mats.map(mat => (mat && (mat.name || mat._name) ? String(mat.name || mat._name).toLowerCase() : ''));

            if (!matchesNodeOrMaterial(nodeName, materialNames)) {
              return;
            }

            const cloneMaterial = (material) => {
              if (!material) return material;
              try {
                if (Array.isArray(material)) {
                  return material.map(m => (m && typeof m.clone === 'function') ? m.clone() : m);
                }
                if (typeof material.clone === 'function') {
                  return material.clone();
                }
              } catch (_) {}
              return material;
            };

            if (Array.isArray(node.material)) {
              node.material = cloneMaterial(node.material);
            } else {
              node.material = cloneMaterial(node.material);
            }

            const updatedMats = Array.isArray(node.material) ? node.material : [node.material];
            updatedMats.forEach((mat) => {
              if (!mat) return;
              const mName = (mat.name || mat._name || '').toString().toLowerCase();
              if (blacklist.length && blacklist.some(ex => mName === ex || mName.includes(ex))) return;
              if (!matchesNodeOrMaterial(nodeName, mName)) return;

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


  const getAvailableColors = useCallback((product) => {
    if (!product || !product.colors) return [];
    if (Array.isArray(product.colors)) return product.colors.filter(Boolean);
    if (typeof product.colors === 'string') {
      return product.colors.split(',').map(c => c.trim()).filter(Boolean);
    }
    return [];
  }, []);

  const getAvailableSizes = useCallback((product) => {
    if (!product) return [];
    if (Array.isArray(product.sizes)) return product.sizes.filter(Boolean);
    if (typeof product.sizes === 'string') {
      return product.sizes.split(',').map(size => size.trim()).filter(Boolean);
    }
    if (typeof product.size === 'string' && product.size.trim()) {
      return [product.size.trim()];
    }
    return [];
  }, []);

  const getGuestId = () => {
    let gid = typeof window !== 'undefined' ? localStorage.getItem('guestChatId') : null;
    if (!gid && typeof window !== 'undefined') {
      gid = `g_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('guestChatId', gid);
    }
    return gid;
  };

  const getSizeDimensionsMap = useCallback((product) => {
    if (!product) return {};
    const raw = product?.arMetadata?.sizeDimensions || product?.sizeDimensions || {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    const map = {};
    for (const [rawSize, rawDimensions] of Object.entries(raw)) {
      const size = String(rawSize || '').trim();
      if (!size || !rawDimensions || typeof rawDimensions !== 'object') continue;

      const width = Number(rawDimensions.width);
      const height = Number(rawDimensions.height);
      const depth = Number(rawDimensions.depth);

      if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 && Number.isFinite(depth) && depth > 0) {
        map[size] = { width, height, depth };
      }
    }

    return map;
  }, []);

  const getImageUrl = useCallback((img) => {
    if (!img) return '/path/to/placeholder.jpg';
    const base = apiUrl && apiUrl.length ? apiUrl : (typeof window !== 'undefined' ? window.location.origin : '');

    if (typeof img === 'object' && img.url) {
      return img.url.startsWith('http') ? img.url : `${base}${img.url}`;
    } else if (typeof img === 'string') {
      if (img.startsWith('http')) return img;
      if (img.startsWith('/')) return `${base}${img}`;
      return `${base}/uploads/images/${img}`;
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

  const normalizeSlug = useCallback((name) => {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }, []);

  const fetchProductData = useCallback(async () => {
    if (!hasRouteProduct) {
      setLoadingProduct(true)
    }
    setProductError('')
    const ref = String(productRef || '').trim()
    const idSuffixMatch = ref.match(/-p(\d+)$/i)
    const refId = idSuffixMatch ? idSuffixMatch[1] : null
    const slugRef = normalizeSlug(idSuffixMatch ? ref.replace(/-p\d+$/i, '') : ref)
    const isNumericRef = /^\d+$/.test(ref) || Boolean(refId)

    if (!ref) {
      setProductError('Product not found')
      setLoadingProduct(false)
      return
    }

    const routeProduct = location.state?.product || null

    if (routeProduct && (String(routeProduct.id || routeProduct._id || '') === String(refId || ref) || normalizeSlug(routeProduct.name) === slugRef)) {
      setProductData(routeProduct)
      setLoadingProduct(false)
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
        const localSlug = normalizeSlug(item?.name)
        if (localSlug === slugRef) {
          found = item
          break
        }
      }
    }

    if (found) {
      setProductData(found)
      setLoadingProduct(false)
      
      // Parallelize all async operations instead of sequential fetches
      const pId = found._id || found.id
      const promises = []
      
      if (found.sellerId) {
        promises.push(
          fetch(`${apiUrl}/api/sellers/${found.sellerId}`)
            .then(res => res.ok ? res.json() : null)
            .then(seller => seller && setSellerData(seller))
            .catch(() => {})
        )
      }
      
      if (pId) {
        promises.push(
          fetch(`${apiUrl}/api/reviews/product/${pId}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) {
                const list = Array.isArray(data.reviews)
                  ? data.reviews
                  : Array.isArray(data)
                    ? data
                    : [];
                setReviews(list)
                if (list && list.length) {
                  const avg = (list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length).toFixed(1)
                  setAvgRating(avg)
                } else {
                  setAvgRating(null)
                }
              }
            })
            .catch(() => {})
        )
      }
      
      // Fire all requests in parallel
      if (promises.length > 0) {
        Promise.all(promises).catch(() => {})
      }
    } else {
      // Product not found in context, try API fallback
      try {
        const response = await fetch(`${apiUrl}/api/products/by-name/${encodeURIComponent(ref)}`)
        if (response.ok) {
          const product = await response.json()
          setProductData(product)
          setLoadingProduct(false)
          
          // Parallelize seller and reviews fetches
          const pId = product._id || product.id
          const fallbackPromises = []
          
          if (product.sellerId) {
            fallbackPromises.push(
              fetch(`${apiUrl}/api/sellers/${product.sellerId}`)
                .then(res => res.ok ? res.json() : null)
                .then(seller => seller && setSellerData(seller))
                .catch(() => {})
            )
          }
          
          if (pId) {
            fallbackPromises.push(
              fetch(`${apiUrl}/api/reviews/product/${pId}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                  if (data) {
                    const list = Array.isArray(data.reviews)
                      ? data.reviews
                      : Array.isArray(data)
                        ? data
                        : [];
                    setReviews(list)
                    if (list && list.length) {
                      const avg = (list.reduce((s, r) => s + (Number(r.rating) || 0), 0) / list.length).toFixed(1)
                      setAvgRating(avg)
                    } else {
                      setAvgRating(null)
                    }
                  }
                })
                .catch(() => {})
            )
          }
          
          if (fallbackPromises.length > 0) {
            Promise.all(fallbackPromises).catch(() => {})
          }
        } else {
          setProductError('Product not found')
          setLoadingProduct(false)
        }
      } catch (e) {
        console.error('Failed to fetch single product fallback', e)
        setProductError(e.message || 'Network error')
        setLoadingProduct(false)
      }
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
  }, [apiUrl, productRef, products, normalizeSlug, navigate, hasRouteProduct])

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

  // Ensure the main displayed image defaults to the first product image
  useEffect(() => {
    try {
      if (!productData || !productData.image || productData.image.length === 0) return;
      // If image already set, do not override (preserve user selection)
      if (image && String(image).trim()) return;
      const first = getImageUrl(productData.image[0]);
      setImage(first);
      setCurrentImageIndex(0);
    } catch (e) {
      // ignore
    }
  }, [productData, getImageUrl]);

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

  const availableColors = useMemo(() => getAvailableColors(productData), [getAvailableColors, productData]);
  const availableSizes = useMemo(() => getAvailableSizes(productData), [getAvailableSizes, productData]);
  const sizeDimensionsMap = useMemo(() => getSizeDimensionsMap(productData), [getSizeDimensionsMap, productData]);
  const selectedDimensions = useMemo(() => {
    const exact = sizeDimensionsMap[selectedSize];
    if (exact) return exact;
    const matchedKey = Object.keys(sizeDimensionsMap).find((key) => key.toLowerCase() === String(selectedSize || '').toLowerCase());
    if (matchedKey) return sizeDimensionsMap[matchedKey];

    const width = Number(productData?.width);
    const height = Number(productData?.height);
    const depth = Number(productData?.depth);
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 && Number.isFinite(depth) && depth > 0) {
      return { width, height, depth };
    }
    return null;
  }, [sizeDimensionsMap, selectedSize, productData?.width, productData?.height, productData?.depth]);

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

    let viewer = null;
    let cameraResetInterval = null;
    let webxrGesturePreventionInterval = null;
    let webxrRAF = null;
    let lockedCameraTransform = null;

    const initializeModelViewer = async () => {
      await ensureModelViewer().catch(() => {});

      setArLoading(true);
      setArError('');
      // Clear previous content
      modelViewerRef.current.innerHTML = '';

      // Create model-viewer element
      viewer = document.createElement('model-viewer');
      viewer.setAttribute('src', resolvedModelUrl);
      viewer.setAttribute('ar', '');
      viewer.setAttribute('ar-modes', 'scene-viewer quick-look webxr');
      viewer.setAttribute('ar-scale', 'fixed');
      viewer.setAttribute('disable-zoom', '');
      viewer.setAttribute('camera-controls', '');
      // Enable rotation in preview mode, but zoom is disabled
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
      viewer.style.touchAction = 'none';
      viewer.style.userSelect = 'none';
      viewer.style.webkitUserSelect = 'none';
      viewer.style.webkitTouchCallout = 'none';

      if (resolvedIosModelUrl) {
        viewer.setAttribute('ios-src', resolvedIosModelUrl);
      }

      // Handle model loaded event
      const handleLoad = () => {
        setArLoading(false);
        modelViewerElementRef.current = viewer;
        
        // Camera controls enabled for rotation, zoom prevention handles restrictions
        
        // Get initial camera position for true scale locking
        let trueScaleRadius = null;
        try {
          const orbit = viewer.getCameraOrbit();
          trueScaleRadius = orbit.radius;
          
          // Lock RADIUS only - allow full rotation but NO ZOOM
          // Format: min-camera-orbit="<phi>rad <theta>rad <radius>m"
          // phi: 0 to 6.28 (full circle), theta: 0 to 3.14 (full hemisphere)
          // radius: locked to exact value - PREVENTS ALL ZOOM
          viewer.setAttribute('min-camera-orbit', `0rad 0rad ${orbit.radius}m`);
          viewer.setAttribute('max-camera-orbit', `6.28rad 3.14rad ${orbit.radius}m`);
        } catch (e) {
          console.log('Failed to lock camera orbit:', e);
        }
        
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
      
      // When entering AR/VR (WebXR) - disable all camera controls for true 1:1 scale
      const handleEnterXR = () => {
      try {
        setArInSession(true);
        
        // Disable camera controls entirely in AR mode - no zoom, no pan
        viewer.removeAttribute('camera-controls');
        // Disable all scroll based zoom
        viewer.removeAttribute('enable-zoom');
        // Disable interaction prompt completely
        viewer.setAttribute('interaction-prompt', 'none');
        
        // Get the current camera position at true scale
        const orbit = viewer.getCameraOrbit();
        const trueScale = { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius };
        lockedCameraTransform = { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius };
        
        // Lock camera to EXACT true scale position - completely locked
        viewer.setAttribute('min-camera-orbit', `${trueScale.theta}rad ${trueScale.phi}rad ${trueScale.radius}m`);
        viewer.setAttribute('max-camera-orbit', `${trueScale.theta}rad ${trueScale.phi}rad ${trueScale.radius}m`);
        
        // Mark that we're in WebXR mode
        viewer.setAttribute('data-in-webxr', 'true');
        
        // Aggressively reset camera radius EVERY frame to prevent ANY zoom attempt
        cameraResetInterval = setInterval(() => {
          try {
            const currentOrbit = viewer.getCameraOrbit();
            // STRICT check - reset if radius differs at all
            if (Math.abs(currentOrbit.radius - trueScale.radius) > 0.00001) {
              // Force reset with exact radius and angles - BOTH angles AND radius
              viewer.setCameraOrbit(trueScale.theta, trueScale.phi, trueScale.radius);
            }
          } catch (e) {
            // ignore errors
          }
        }, 2); // Check every 2ms - maximum frequency to catch any zoom
        
        // ULTRA-AGGRESSIVE: Continuous min-max orbit enforcement
        webxrGesturePreventionInterval = setInterval(() => {
          try {
            // Re-enforce the exact locked values every frame
            viewer.setAttribute('min-camera-orbit', `${trueScale.theta}rad ${trueScale.phi}rad ${trueScale.radius}m`);
            viewer.setAttribute('max-camera-orbit', `${trueScale.theta}rad ${trueScale.phi}rad ${trueScale.radius}m`);
          } catch (e) {}
        }, 5); // Every 5ms
        
        // Use requestAnimationFrame to lock camera at WebXR frame level
        const lockCameraInXR = () => {
          try {
            const currentOrbit = viewer.getCameraOrbit();
            if (Math.abs(currentOrbit.radius - lockedCameraTransform.radius) > 0.00001 ||
                Math.abs(currentOrbit.theta - lockedCameraTransform.theta) > 0.00001 ||
                Math.abs(currentOrbit.phi - lockedCameraTransform.phi) > 0.00001) {
              viewer.setCameraOrbit(lockedCameraTransform.theta, lockedCameraTransform.phi, lockedCameraTransform.radius);
            }
          } catch (e) {}
          webxrRAF = requestAnimationFrame(lockCameraInXR);
        };
        webxrRAF = requestAnimationFrame(lockCameraInXR);
      } catch (e) {}
    };
    const handleExitXR = () => {
      try {
        if (cameraResetInterval) {
          clearInterval(cameraResetInterval);
          cameraResetInterval = null;
        }
        if (webxrGesturePreventionInterval) {
          clearInterval(webxrGesturePreventionInterval);
          webxrGesturePreventionInterval = null;
        }
        if (webxrRAF) {
          cancelAnimationFrame(webxrRAF);
          webxrRAF = null;
        }
        // Remove WebXR marker
        viewer.removeAttribute('data-in-webxr');
        // Restore interaction prompt when exiting AR
        viewer.setAttribute('interaction-prompt', 'auto');
        // NEVER re-enable camera controls - keep zoom disabled
        viewer.removeAttribute('camera-controls');
        setArInSession(false);
      } catch (e) {}
    };
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    viewer.addEventListener('enter-vr', handleEnterXR);
    viewer.addEventListener('exit-vr', handleExitXR);

    // Continuous zoom prevention - always running to catch any zoom attempts
    let zoomResetInterval = null;
    let zoomResetRAF = null;
    let lastLockedRadius = null;
    
    const startContinuousZoomPrevention = () => {
      if (zoomResetInterval) return; // Already running
      
      // Use BOTH setInterval AND requestAnimationFrame for maximum coverage
      zoomResetInterval = setInterval(() => {
        try {
          const orbit = viewer.getCameraOrbit();
          
          // Store the locked radius on first run
          if (lastLockedRadius === null) {
            lastLockedRadius = orbit.radius;
          }
          
          // If radius changed even SLIGHTLY - reset it immediately
          if (Math.abs(orbit.radius - lastLockedRadius) > 0.00001) {
            viewer.setCameraOrbit(orbit.theta, orbit.phi, lastLockedRadius);
            
            // Only show message in actual WebXR/AR session
            if (arInSession) {
              setShowZoomMessage(true);
              if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
              zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
            }
          }
        } catch (e) {
          // ignore errors
        }
      }, 3); // Check every 3ms - ultra frequent to catch zoom immediately
      
      // Also use requestAnimationFrame for even smoother detection
      const runRAF = () => {
        try {
          const orbit = viewer.getCameraOrbit();
          
          if (lastLockedRadius === null) {
            lastLockedRadius = orbit.radius;
          }
          
          if (Math.abs(orbit.radius - lastLockedRadius) > 0.00001) {
            viewer.setCameraOrbit(orbit.theta, orbit.phi, lastLockedRadius);
          }
        } catch (e) {}
        
        zoomResetRAF = requestAnimationFrame(runRAF);
      };
      zoomResetRAF = requestAnimationFrame(runRAF);
    };

    // Start continuous zoom prevention shortly after initialization
    setTimeout(() => {
      startContinuousZoomPrevention();
    }, 100);

    // Robust pinch-to-zoom prevention
    let lastDistance = 0;

    const getDistance = (touches) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const preventPinchZoom = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        
        // Show zoom message only in WebXR mode
        if (arInSession) {
          setShowZoomMessage(true);
          if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
          zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
        }
        
        const currentDistance = getDistance(e.touches);
        if (lastDistance > 0) {
          // Block the zoom by preventing default behavior
          e.preventDefault();
        }
        lastDistance = currentDistance;
      }
    };

    const resetPinchZoom = (e) => {
      lastDistance = 0;
    };

    const preventWheel = (e) => {
      // Completely prevent all scroll wheel zoom in AR mode
      if (arInSession) {
        e.preventDefault();
        e.stopPropagation();
        
        // Show zoom message when attempting scroll zoom
        setShowZoomMessage(true);
        if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
        zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
      }
    };

    // Document-level wheel prevention for AR mode (capture phase) - MUST prevent default
    const handleDocumentWheel = (e) => {
      if (arInSession || modelViewerRef.current?.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Only show message if in actual WebXR mode
        if (arInSession) {
          setShowZoomMessage(true);
          if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
          zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
        }
        
        return false;
      }
    };

    const preventDoubleTab = (e) => {
      // Prevent double-tap zoom on touch devices
      if (e.detail > 1) {
        e.preventDefault();
        
        // Show zoom message only in WebXR mode
        if (arInSession) {
          setShowZoomMessage(true);
          if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
          zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
        }
      }
    };

    // Pointer event prevention for WebXR mode (catches pinch on pointer devices)
    const preventPointerZoom = (e) => {
      if (arInSession && e.pointerType === 'touch') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Aggressive touch interception for AR mode
    const arModeZoomPrevention = {
      touches: [],
      startListener: (e) => {
        arModeZoomPrevention.touches = Array.from(e.touches);
        if (e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
          // Only show zoom message in WebXR mode
          if (arInSession) {
            setShowZoomMessage(true);
            if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
            zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
          }
        }
      },
      moveListener: (e) => {
        if (e.touches && e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
          // Only show zoom message in WebXR mode
          if (arInSession) {
            setShowZoomMessage(true);
            if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
            zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
          }
          // Cancel any momentum scrolling
          return false;
        }
      },
      endListener: (e) => {
        arModeZoomPrevention.touches = [];
      }
    };

    // Apply event listeners with passive: false to allow preventDefault
    viewer.addEventListener('touchstart', preventPinchZoom, { passive: false });
    viewer.addEventListener('touchmove', preventPinchZoom, { passive: false });
    viewer.addEventListener('touchend', resetPinchZoom, { passive: false });
    viewer.addEventListener('dblclick', preventDoubleTab, { passive: false });
    viewer.addEventListener('pointerdown', preventPointerZoom, { passive: false });
    viewer.addEventListener('pointermove', preventPointerZoom, { passive: false });
    viewer.addEventListener('pointerup', preventPointerZoom, { passive: false });
    // Note: wheel listener is now at document level in capture phase (added in startARZoomPrevention)

    // Additional document-level handlers for AR mode
    const startARZoomPrevention = () => {
      document.addEventListener('touchstart', arModeZoomPrevention.startListener, { passive: false });
      document.addEventListener('touchmove', arModeZoomPrevention.moveListener, { passive: false });
      document.addEventListener('touchend', arModeZoomPrevention.endListener, { passive: false });
      document.addEventListener('pointerdown', preventPointerZoom, { passive: false });
      document.addEventListener('pointermove', preventPointerZoom, { passive: false });
      document.addEventListener('pointerup', preventPointerZoom, { passive: false });
      // Add wheel listener in capture phase to intercept before model-viewer sees it
      document.addEventListener('wheel', handleDocumentWheel, { passive: false, capture: true });
    };

    const stopARZoomPrevention = () => {
      document.removeEventListener('touchstart', arModeZoomPrevention.startListener);
      document.removeEventListener('touchmove', arModeZoomPrevention.moveListener);
      document.removeEventListener('touchend', arModeZoomPrevention.endListener);
      document.removeEventListener('pointerdown', preventPointerZoom);
      document.removeEventListener('pointermove', preventPointerZoom);
      document.removeEventListener('pointerup', preventPointerZoom);
      document.removeEventListener('wheel', handleDocumentWheel, { capture: true });
    };

    viewer.addEventListener('enter-vr', startARZoomPrevention);
    viewer.addEventListener('exit-vr', stopARZoomPrevention);

    modelViewerRef.current.appendChild(viewer);
    };

    initializeModelViewer().catch(() => {});

    return () => {
      try { if (cameraResetInterval) clearInterval(cameraResetInterval); } catch (e) {}
      try { if (webxrGesturePreventionInterval) clearInterval(webxrGesturePreventionInterval); } catch (e) {}
      try { if (webxrRAF) cancelAnimationFrame(webxrRAF); } catch (e) {}
      try { if (zoomResetInterval) clearInterval(zoomResetInterval); } catch (e) {}
      try { if (zoomResetRAF) cancelAnimationFrame(zoomResetRAF); } catch (e) {}
      try { if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current); } catch (e) {}
      try { viewer.removeEventListener('load', handleLoad); } catch (e) {}
      try { viewer.removeEventListener('error', handleError); } catch (e) {}
      try { viewer.removeEventListener('enter-vr', handleEnterXR); } catch (e) {}
      try { viewer.removeEventListener('exit-vr', handleExitXR); } catch (e) {}
      try { viewer.removeEventListener('touchstart', preventPinchZoom); } catch (e) {}
      try { viewer.removeEventListener('touchmove', preventPinchZoom); } catch (e) {}
      try { viewer.removeEventListener('touchend', resetPinchZoom); } catch (e) {}
      try { viewer.removeEventListener('dblclick', preventDoubleTab); } catch (e) {}
      try { viewer.removeEventListener('pointerdown', preventPointerZoom); } catch (e) {}
      try { viewer.removeEventListener('pointermove', preventPointerZoom); } catch (e) {}
      try { viewer.removeEventListener('pointerup', preventPointerZoom); } catch (e) {}
      try { document.removeEventListener('wheel', handleDocumentWheel, { capture: true }); } catch (e) {}
      try { viewer.removeEventListener('enter-vr', startARZoomPrevention); } catch (e) {}
      try { viewer.removeEventListener('exit-vr', stopARZoomPrevention); } catch (e) {}
      try { stopARZoomPrevention(); } catch (e) {}
    };
  }, [showAR, productData, selectedColor, resolvedModelUrl, resolvedIosModelUrl, image]);

  // Prevent zoom whenever AR modal is shown (not just in WebXR)
  useEffect(() => {
    if (!showAR) return;

    const preventARModalZoom = (e) => {
      // Only prevent zoom on the model-viewer element itself, allow scrolling elsewhere
      if (modelViewerRef.current?.firstChild && modelViewerRef.current.firstChild.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Only show message during WebXR
        if (arInSession) {
          setShowZoomMessage(true);
          if (zoomMessageTimeoutRef.current) clearTimeout(zoomMessageTimeoutRef.current);
          zoomMessageTimeoutRef.current = setTimeout(() => setShowZoomMessage(false), 2500);
        }
        
        return false;
      }
    };

    // Attach wheel listener during AR modal in capture and bubble phases
    document.addEventListener('wheel', preventARModalZoom, { passive: false, capture: true });
    document.addEventListener('wheel', preventARModalZoom, { passive: false, capture: false });

    return () => {
      document.removeEventListener('wheel', preventARModalZoom, { capture: true });
      document.removeEventListener('wheel', preventARModalZoom, { capture: false });
    };
  }, [showAR, arInSession]);

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
    <div className='border-t-2 pt-4 md:pt-10 px-3 md:px-4 transition-opacity ease-in duration-500 opacity-100'>

      <div className='flex flex-col md:flex-row gap-6 md:gap-12 w-full'>

        {/* -------------------------product images----------------- */}
        <React.Suspense fallback={<div className='w-full md:w-1/2 py-20 text-center'>Loading images...</div>}>
          <ProductMediaColumn productData={productData} apiUrl={apiUrl} />
        </React.Suspense>

        {/* ---------- Product info ---------- */}
        <div className='w-full md:flex-1'>
          <React.Suspense fallback={<div className='py-20 text-center'>Loading product details...</div>}>
            <ProductDetailsSidebar
              product={productData}
              availableColors={availableColors}
              availableSizes={getAvailableSizes(productData)}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              selectedDimensions={selectedDimensions}
              cartColor={cartColor}
              setCartColor={setCartColor}
              onARClick={() => setShowAR(true)}
              onAddToCart={(qty) => {
                const availableColors = getAvailableColors(productData);
                const availableSizes = getAvailableSizes(productData);
                addToCart(
                  productData._id || productData.id,
                  qty,
                  availableColors.length ? cartColor : null,
                  availableSizes.length ? selectedSize : null,
                );
                try { setShowAdded(true); setTimeout(()=>setShowAdded(false), 900); } catch(e){}
              }}
              onBuyNow={async (qty) => {
                if (productData.stock <= 0) return;
                const availableColors = getAvailableColors(productData);
                const availableSizes = getAvailableSizes(productData);
                try {
                  await addToCart(
                    productData._id || productData.id,
                    qty,
                    availableColors.length ? cartColor : null,
                    availableSizes.length ? selectedSize : null,
                  );
                } catch (e) {}
                try { navigate('/place-order'); } catch (e) {}
              }}
            />
          </React.Suspense>

          <hr className='mt-6 sm:mt-8' />

          {/* -------- Artist Info -------- */}
          {sellerData && (
            <div className='mt-6 p-4 border border-gray-100 rounded-lg bg-gray-50 flex items-center gap-4 product-seller-card'>
              <div className='w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-base font-semibold text-gray-700 overflow-hidden shadow'>
                {sellerImageSrc ? (
                  <img loading='lazy' decoding='async' src={sellerImageSrc} alt={sellerData.storeName || 'Artist'} className='w-full h-full object-cover' width={64} height={64} />
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

          {/* Inline product chat - scoped to this product's artist */}
          <div className='mt-6'>
            <h3 className='font-semibold mb-2'>Chat with artist</h3>
            <div className='border rounded p-3'>
              <React.Suspense fallback={<div className='text-sm text-gray-500'>Loading chat…</div>}>
                <ProductChat
                  productId={productData?.id || productData?._id || productRef}
                  sellerId={productData.sellerId || productData.seller?.id || sellerData?.id || null}
                  sellerName={productData.sellerName || productData.seller?.storeName || productData.seller?.name || sellerData?.storeName || 'Artist'}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Reviews (moved into Description tab) ---------- */}
      <div className='mt-20'>
        <div className='flex'>
          <b className='border border-b-0 px-5 py-3 text-sm'>Reviews</b>
        </div>
        <div ref={reviewsRef} className={`${reviewsInView ? 'enter-to' : 'enter-from'} flex flex-col gap-4 border px-6 py-6 text-sm text-gray-500`}>
          <div className='mb-4'>
            {avgRating ? (
              <div className='text-sm text-gray-700'>
                <span className='font-medium'>{avgRating}</span>
                <span className='ml-1'>/ 5</span>
                <span className='ml-2 text-gray-500'>({safeReviews.length} review{safeReviews.length !== 1 ? 's' : ''})</span>
              </div>
            ) : (
              <div className='text-sm text-gray-500'>No reviews yet.</div>
            )}
          </div>

          <div className='space-y-4'>
            {safeReviews.map((r, i) => (
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
                    <div className='text-sm sm:text-xs text-gray-600 font-medium'>Artist reply</div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4" style={{ touchAction: 'manipulation' }}>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-lg text-center relative max-w-[900px] w-full max-h-[90vh] overflow-y-auto" style={{ touchAction: 'auto' }}>

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
                <div className="relative overflow-hidden" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
                  <div ref={modelViewerRef} style={{ width: "100%", background: "#f5f5f5", touchAction: 'none', overflow: 'hidden', overscrollBehavior: 'none' }} className="h-[50vh] sm:h-[60vh] md:h-[70vh]">
                  </div>
                  
                  {/* Zoom prevention message */}
                  {showZoomMessage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded pointer-events-none z-40 animate-pulse">
                      <div className="bg-white px-6 py-4 rounded-lg shadow-lg text-center">
                        <p className="text-gray-800 font-medium">Object can only be viewed in true scale</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Dimension toggle - small top-right toggle to avoid overlap */}
                  <button
                    onClick={() => setShowDimensions(v => !v)}
                    aria-pressed={showDimensions}
                    className="absolute z-30 right-3 top-3 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs shadow-sm"
                    title="Toggle dimensions"
                  >
                    {showDimensions ? 'Hide' : 'Show'}
                  </button>

                  {showDimensions && selectedDimensions && (
                    <div className="absolute z-20 left-3 bottom-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-sm">
                      <div className="font-semibold text-gray-800 mb-1">Overlay Dimensions {selectedSize ? `(${selectedSize})` : ''}</div>
                      <div className="text-gray-700">
                        W {selectedDimensions.width.toFixed(1)} cm
                      </div>
                      <div className="text-gray-700">
                        H {selectedDimensions.height.toFixed(1)} cm
                      </div>
                      <div className="text-gray-700">
                        D {selectedDimensions.depth.toFixed(1)} cm
                      </div>
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
                              <button onClick={() => { setSelectedParts(detectedParts.slice()); setHasUserSelectedParts(true); }} className="px-2 py-1 text-xs border rounded">Select all</button>
                              <button onClick={() => { setSelectedParts([]); setHasUserSelectedParts(true); }} className="px-2 py-1 text-xs border rounded">Clear</button>
                            </div>
                          </div>
                          {detectedParts.length === 0 ? (
                            <div className="text-xs text-gray-500">No parts detected yet. Close and reopen the AR modal after the model loads.</div>
                          ) : (
                            detectedParts.map((p) => (
                              <label key={p} className="flex items-center gap-2 mb-1">
                                <input type="checkbox" checked={selectedParts.includes(p)} onChange={(e) => {
                                  setHasUserSelectedParts(true);
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
