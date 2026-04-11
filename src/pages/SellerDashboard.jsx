import React, { useState, useEffect, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

import { ShopContext } from '../context/ShopContext'
import SellerChat from '../components/SellerChat'
import SellerAdminChat from '../components/SellerAdminChat'

const MAX_GLTF_FILE_BYTES = 25 * 1024 * 1024
const MAX_USDZ_FILE_BYTES = 10 * 1024 * 1024

// Helper: Compress image before upload
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Calculate new dimensions (max 1000px width)
        let width = img.width
        let height = img.height
        const maxWidth = 1000
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
            resolve(compressedFile)
          },
          'image/jpeg',
          0.8 // 80% quality
        )
      }
    }
  })
}

const SellerDashboard = () => {
  const navigate = useNavigate()
  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [sellerOrders, setSellerOrders] = useState([])
  const [selectedTab, setSelectedTab] = useState('products')
  const [sellerReviews, setSellerReviews] = useState([])
  const [sellerUnreadChats, setSellerUnreadChats] = useState(0)
  const [replyDrafts, setReplyDrafts] = useState({})
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  const [loading, setLoading] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState(null)
  // Shipping settings state
  const [shippingSettings, setShippingSettings] = useState({
    freeShippingMinimum: 0,
    shippingRates: [{ name: 'Standard Shipping', price: 40, estimatedDays: '5-7 business days' }],
    processingTime: '1-3 business days',
    shipsFrom: '',
  })
  const [paymentSettings, setPaymentSettings] = useState({
    acceptsCOD: true,
    acceptsGCash: true,
    gcashAccountName: '',
    gcashNumber: '',
    gcashQr: '',
  })
  // Return policy state
  const [returnPolicy, setReturnPolicy] = useState({
    acceptsReturns: true,
    returnWindow: 7,
    conditions: 'Item must be unused and in original packaging.',
    refundMethod: 'Original payment method',
  })
  const [returnRequests, setReturnRequests] = useState([])
  const [returnReplyDrafts, setReturnReplyDrafts] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Flowers',
    subCategory: '',
    colors: '',
    sizes: '',
    stock: '',
    image: [],
    model: null,
    iosModel: null,
  })
  const [imagePreview, setImagePreview] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [newImages, setNewImages] = useState([])
  const [isImageDropActive, setIsImageDropActive] = useState(false)
  const imageInputRef = useRef(null)

  const token = localStorage.getItem('sellerToken')
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
  const isSellerVerified = Boolean(seller?.isVerified)
  const { refreshProducts } = useContext(ShopContext)
  // Polling id for conversations
  const [convoPollId, setConvoPollId] = useState(null)

  const resolveImageUrl = (image) => {
    if (!image) return ''

    if (typeof image === 'object' && image.url) {
      return image.url.startsWith('http') ? image.url : `${apiUrl}${image.url}`
    }

    if (typeof image === 'string') {
      if (image.startsWith('http')) return image
      if (image.startsWith('/')) return `${apiUrl}${image}`
      return `${apiUrl}/uploads/images/${image}`
    }

    return ''
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  // Intentional mount auth/bootstrap flow; keeping stable startup behavior over broad callback refactor.
  useEffect(() => {
    if (!token) {
      navigate('/')
      return
    }

    const sellerData = localStorage.getItem('seller')
    if (sellerData) {
      setSeller(JSON.parse(sellerData))
    }

    fetchSellerProfile()

    // Fetch products and seller orders on mount so counts show correctly after refresh
    fetchProducts()
    fetchSellerOrders()
  }, [token, navigate])

  const fetchSellerProfile = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/sellers/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.data) {
        setSeller(response.data)
        localStorage.setItem('seller', JSON.stringify(response.data))
      }
    } catch (error) {
      console.error('Error fetching seller profile:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('sellerToken')
        localStorage.removeItem('seller')
        navigate('/seller/login')
      }
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${apiUrl}/api/products/seller/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProducts(response.data)
    } catch (error) {
      console.error('Error fetching products:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('sellerToken')
        navigate('/seller/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSellerOrders = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${apiUrl}/api/orders/seller/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSellerOrders(response.data || [])
    } catch (error) {
      console.error('Error fetching seller orders:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('sellerToken')
        navigate('/seller/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSellerReviews = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${apiUrl}/api/reviews/seller`, { headers: { Authorization: `Bearer ${token}` } })
      setSellerReviews(res.data || [])
    } catch (err) {
      console.error('fetchSellerReviews', err)
      if (err.response?.status === 401) {
        localStorage.removeItem('sellerToken')
        navigate('/seller/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReplyChange = (reviewId, text) => {
    setReplyDrafts(prev => ({ ...prev, [reviewId]: text }))
  }

  const submitReply = async (review) => {
    const draft = replyDrafts[review.id] || ''
    if (!draft) return toast.error('Enter a reply')
    try {
      setLoading(true)
      const res = await axios.post(`${apiUrl}/api/reviews/${review.id}/reply`, { reply: draft }, { headers: { Authorization: `Bearer ${token}` } })
      setSellerReviews(prev => prev.map(r => r.id === res.data.id ? res.data : r))
      toast.success('Reply posted')
    } catch (err) {
      console.error('submitReply', err)
      toast.error(err.response?.data?.message || 'Failed to post reply')
    } finally {
      setLoading(false)
    }
  }

  // Shipping settings
  const fetchShippingSettings = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/sellers/shipping-settings`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.data) setShippingSettings(res.data)
    } catch (err) {
      console.error('fetchShippingSettings', err)
    }
  }

  const saveShippingSettings = async () => {
    try {
      setLoading(true)
      await axios.put(`${apiUrl}/api/sellers/shipping-settings`, shippingSettings, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Shipping settings saved')
    } catch (err) {
      console.error('saveShippingSettings', err)
      toast.error('Failed to save shipping settings')
    } finally {
      setLoading(false)
    }
  }

  // Payment settings
  const fetchPaymentSettings = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/sellers/payment-settings`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.data) {
        setPaymentSettings({
          acceptsCOD: res.data.acceptsCOD !== false,
          acceptsGCash: res.data.acceptsGCash !== false,
          gcashAccountName: res.data.gcashAccountName || '',
          gcashNumber: res.data.gcashNumber || '',
          gcashQr: res.data.gcashQr || '',
        })
      }
    } catch (err) {
      console.error('fetchPaymentSettings', err)
    }
  }

  const savePaymentSettings = async () => {
    try {
      setLoading(true)
      await axios.put(`${apiUrl}/api/sellers/payment-settings`, paymentSettings, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Payment settings saved')
    } catch (err) {
      console.error('savePaymentSettings', err)
      toast.error('Failed to save payment settings')
    } finally {
      setLoading(false)
    }
  }

  const uploadGcashQr = async (file) => {
    if (!file) return
    try {
      setLoading(true)
      const form = new FormData()
      form.append('image', file)
      const res = await axios.put(`${apiUrl}/api/sellers/payment-settings/qr`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      if (res.data?.paymentSettings) {
        setPaymentSettings({
          acceptsCOD: res.data.paymentSettings.acceptsCOD !== false,
          acceptsGCash: res.data.paymentSettings.acceptsGCash !== false,
          gcashAccountName: res.data.paymentSettings.gcashAccountName || '',
          gcashNumber: res.data.paymentSettings.gcashNumber || '',
          gcashQr: res.data.paymentSettings.gcashQr || '',
        })
      }
      toast.success('GCash QR uploaded')
    } catch (err) {
      console.error('uploadGcashQr', err)
      toast.error(err.response?.data?.message || 'Failed to upload GCash QR')
    } finally {
      setLoading(false)
    }
  }

  // Return policy
  const fetchReturnPolicy = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/sellers/return-policy`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.data) setReturnPolicy(res.data)
    } catch (err) {
      console.error('fetchReturnPolicy', err)
    }
  }

  const saveReturnPolicy = async () => {
    try {
      setLoading(true)
      await axios.put(`${apiUrl}/api/sellers/return-policy`, returnPolicy, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Return policy saved')
    } catch (err) {
      console.error('saveReturnPolicy', err)
      toast.error('Failed to save return policy')
    } finally {
      setLoading(false)
    }
  }

  // Return requests
  const fetchReturnRequests = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${apiUrl}/api/returns/seller`, { headers: { Authorization: `Bearer ${token}` } })
      setReturnRequests(res.data || [])
    } catch (err) {
      console.error('fetchReturnRequests', err)
    } finally {
      setLoading(false)
    }
  }

  const updateReturnStatus = async (returnId, status, sellerNote) => {
    try {
      setLoading(true)
      const res = await axios.put(`${apiUrl}/api/returns/seller/${returnId}`, { status, sellerNote }, { headers: { Authorization: `Bearer ${token}` } })
      setReturnRequests(prev => prev.map(r => r.id === res.data.id ? res.data : r))
      toast.success(`Return request ${status}`)
    } catch (err) {
      console.error('updateReturnStatus', err)
      toast.error('Failed to update return request')
    } finally {
      setLoading(false)
    }
  }

  // Intentional tab-driven lazy loads for seller dashboard sections.
  useEffect(() => {
    if (selectedTab === 'orders') fetchSellerOrders()
    if (selectedTab === 'reviews') fetchSellerReviews()
    if (selectedTab === 'chat') {
      fetchSellerConversations()
    }
    if (selectedTab === 'shipping') {
      fetchShippingSettings()
      fetchPaymentSettings()
    }
    if (selectedTab === 'returns') {
      fetchReturnPolicy()
      fetchReturnRequests()
    }
  }, [selectedTab])

  // Intentional background polling lifecycle for conversation badges.
  useEffect(() => {
    // start background polling for new conversations/unread counts
    fetchSellerConversations()
    if (convoPollId) clearInterval(convoPollId)
    const id = setInterval(fetchSellerConversations, 10000)
    setConvoPollId(id)
    return () => clearInterval(id)
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */

  const fetchSellerConversations = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/chat/seller/conversations`, { headers: { Authorization: `Bearer ${token}` } })
      const convs = res.data || []
      const unread = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
      setSellerUnreadChats(unread)
    } catch (err) {
      console.error('fetchSellerConversations', err)
      // Dev fallback: if API fails (e.g., token issues) try the dev messages endpoint
      if (import.meta.env.DEV) {
        try {
          const devRes = await fetch(`${apiUrl}/api/chat/dev/messages`)
          const all = await devRes.json()
          // In dev, count unread across all recent messages so popup-created messages are visible
          const convMap = new Map()
          for (const m of (all || [])) {
            const key = m.userId ? `u:${m.userId}` : `g:${m.guestId || 'guest'}`
            if (!convMap.has(key) || new Date(m.createdAt) > new Date(convMap.get(key).createdAt)) convMap.set(key, m)
          }
          const convs = Array.from(convMap.values())
          const unread = convs.reduce((acc, m) => acc + (m.unreadCount || 0), 0)
          setSellerUnreadChats(unread)
        } catch (devErr) {
          console.error('fetchSellerConversations dev fallback', devErr)
        }
      }
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageFiles = async (files, inputElement = null) => {
    const imageFiles = Array.from(files || [])
    console.log('Files selected:', imageFiles.length, imageFiles)

    if (imageFiles.length > 0) {
      toast.info('Compressing images...')
      try {
        const compressedImages = await Promise.all(
          imageFiles.map(file => compressImage(file))
        )
        setNewImages(prev => [...prev, ...compressedImages])

        const newPreviews = compressedImages.map(file => URL.createObjectURL(file))
        setImagePreview(prev => [...prev, ...newPreviews])
        toast.success(`${compressedImages.length} image(s) compressed and ready`)
      } catch (error) {
        console.error('Image compression error:', error)
        toast.error('Failed to compress images')
      }
    }

    if (inputElement) {
      setTimeout(() => {
        inputElement.value = ''
      }, 0)
    }
  }

  const handleImageChange = async (e) => {
    await handleImageFiles(e.target.files, e.target)
  }

  const handleImageDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsImageDropActive(false)
    await handleImageFiles(e.dataTransfer.files)
  }

  const removeImage = (index) => {
    // Determine if it's an existing image or a new image
    if (index < existingImages.length) {
      // Remove from existing images
      setExistingImages(prev => prev.filter((_, i) => i !== index))
    } else {
      // Remove from new images
      const newIndex = index - existingImages.length
      setNewImages(prev => prev.filter((_, i) => i !== newIndex))
    }
    // Remove from preview
    setImagePreview(prev => prev.filter((_, i) => i !== index))
  }

  const handleModelChange = (e) => {
    const file = e.target.files[0]
    const fieldName = e.target.name // 'model' or 'iosModel'
    if (!file) {
      setFormData(prev => ({ ...prev, [fieldName]: null }))
      return
    }


    // No file size validation for model uploads

    setFormData(prev => ({ ...prev, [fieldName]: file }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isSellerVerified) {
      toast.error('Your account is pending admin verification. You cannot upload products yet.')
      return
    }

    setIsSubmitting(true)
    setUploadProgress(0)
    setUploadError('')

    try {
      // Validate form
      if (!formData.name || !formData.description || !formData.price || !formData.stock) {
        toast.error('Please fill in all required fields')
        setIsSubmitting(false)
        return
      }

      // Create FormData for multipart upload
      const uploadData = new FormData()
      uploadData.append('name', formData.name)
      uploadData.append('description', formData.description)
      uploadData.append('price', formData.price)
      uploadData.append('category', formData.category)
      uploadData.append('subCategory', formData.subCategory)
      if (formData.colors) {
        uploadData.append('colors', formData.colors)
      }
      if (formData.sizes) {
        uploadData.append('sizes', formData.sizes)
      }
      uploadData.append('stock', formData.stock)

      // Always send existing images when editing, including [] when user removed all old photos.
      if (editingProduct) {
        uploadData.append('existingImages', JSON.stringify(existingImages))
      }

      // Add new image files
      if (newImages.length > 0) {
        newImages.forEach((img) => {
          uploadData.append('image', img)
        })
      }

      // Add model files
      if (formData.model) {
        uploadData.append('model', formData.model)
      }
      if (formData.iosModel) {
        uploadData.append('iosModel', formData.iosModel)
      }

      // Create axios instance with custom timeout and progress
      const axiosInstance = axios.create({
        timeout: 5 * 60 * 1000, // 5 minute timeout for slow connections
      })

      let uploadUrl = `${apiUrl}/api/products`
      if (editingProduct) {
        uploadUrl = `${apiUrl}/api/products/${editingProduct.id}`
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        },
      }

      if (editingProduct) {
        await axiosInstance.put(uploadUrl, uploadData, config)
      } else {
        await axiosInstance.post(uploadUrl, uploadData, config)
      }

      // Success
      toast.success(editingProduct ? 'Product updated successfully!' : 'Product created successfully!')
      
      // Refresh product lists
      fetchProducts()
      try { refreshProducts && refreshProducts() } catch (refreshErr) { console.warn('refreshProducts failed:', refreshErr) }
      resetForm()
      setShowForm(false)
      setUploadProgress(0)
    } catch (error) {
      console.error('Upload error:', error)
      let errorMsg = 'Failed to upload product'
      
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Upload timed out. Check your connection and try again.'
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error.message) {
        errorMsg = error.message
      }
      
      setUploadError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (productId) => {
    try {
      setLoading(true)
      await axios.delete(`${apiUrl}/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchProducts()
      try { refreshProducts && refreshProducts() } catch (refreshErr) { console.warn('refreshProducts failed:', refreshErr) }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!orderId) return
    try {
      setLoading(true)
      await axios.delete(`${apiUrl}/api/orders/seller/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Order deleted')
      fetchSellerOrders()
    } catch (err) {
      console.error('deleteOrder', err)
      toast.error(err.response?.data?.message || 'Failed to delete order')
    } finally {
      setLoading(false)
      setOrderDeleteConfirm(null)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      subCategory: product.subCategory || '',
      colors: Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || ''),
        sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || product.size || ''),
      stock: product.stock,
      image: product.image || [],
      model: null,
      iosModel: null,
    })
    // Store existing images
    const existingImgs = Array.isArray(product.image) ? product.image : []
    setExistingImages(existingImgs)
    setNewImages([])
    
    // Show existing images in preview
    if (existingImgs.length > 0) {
      const previews = existingImgs.map(img => {
        // Handle string URLs
        if (typeof img === 'string') {
          return img.startsWith('http') ? img : `${apiUrl}${img}`
        }
        // Handle object with url property
        if (img && img.url) {
          return img.url.startsWith('http') ? img.url : `${apiUrl}${img.url}`
        }
        // Fallback
        return ''
      }).filter(url => url !== '')
      setImagePreview(previews)
    } else {
      setImagePreview([])
    }
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Flowers',
      subCategory: '',
      colors: '',
        sizes: '',
      stock: '',
      image: [],
      model: null,
      iosModel: null,
    })
    setImagePreview([])
    setExistingImages([])
    setNewImages([])
  }

  const handleLogout = () => {
    localStorage.removeItem('sellerToken')
    localStorage.removeItem('seller')
    // Force a clean app state so navbar/session checks don't use stale in-memory values.
    window.location.href = '/'
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      {/* Header */}
      <div className='bg-black text-white p-4 sm:p-6'>
        <div className='max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
          <div>
            <h1 className='text-xl sm:text-3xl font-bold'>Seller Dashboard</h1>
            {seller && <p className='text-gray-400 text-sm sm:text-base'>{seller.storeName}</p>}
          </div>
          <div className='flex gap-2 sm:gap-3 w-full sm:w-auto'>
            <button
              onClick={() => navigate('/support', { state: { role: 'seller' } })}
              className='bg-emerald-600 hover:bg-emerald-700 px-4 sm:px-6 py-2 rounded-lg font-medium text-sm sm:text-base flex-1 sm:flex-none'
            >
              Support
            </button>
            <button
              onClick={() => navigate('/seller/profile')}
              className='bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-2 rounded-lg font-medium text-sm sm:text-base flex-1 sm:flex-none'
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className='bg-red-600 hover:bg-red-700 px-4 sm:px-6 py-2 rounded-lg font-medium text-sm sm:text-base flex-1 sm:flex-none'
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8'>
        {!isSellerVerified && (
          <div className='mb-4 sm:mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900'>
            <p className='text-sm sm:text-base font-medium'>Your seller account is pending admin verification.</p>
            <p className='text-xs sm:text-sm mt-1'>You can browse your dashboard, but product uploads are locked until an admin verifies your account.</p>
          </div>
        )}

        {/* Tabs + Add Product Button */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6'>
          <div className='flex overflow-x-auto gap-2 pb-2 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative' style={{ maskImage: 'linear-gradient(90deg, black 85%, transparent)' }}>
            <button
              onClick={() => setSelectedTab('products')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${selectedTab === 'products' ? 'bg-black text-white' : 'bg-gray-200'}`}>
              Products ({products.length})
            </button>
            <button
              onClick={() => setSelectedTab('orders')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${selectedTab === 'orders' ? 'bg-black text-white' : 'bg-gray-200'}`}>
              Orders ({sellerOrders.length})
            </button>
            <button
              onClick={() => setSelectedTab('chat')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${selectedTab === 'chat' ? 'bg-black text-white' : 'bg-gray-200'}`}>
              Chat {sellerUnreadChats > 0 && <span className='inline-block ml-1 sm:ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full'>{sellerUnreadChats}</span>}
            </button>
            <button
              onClick={() => setSelectedTab('reviews')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${selectedTab === 'reviews' ? 'bg-black text-white' : 'bg-gray-200'}`}>
              Reviews
            </button>
            <button
              onClick={() => setSelectedTab('inventory')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${selectedTab === 'inventory' ? 'bg-black text-white' : 'bg-gray-200'}`}>
              Inventory
            </button>
            <button
              onClick={() => setSelectedTab('shipping')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${selectedTab === 'shipping' ? 'bg-black text-white' : 'bg-gray-200'}`}>
              Shipping
            </button>
            <button
              onClick={() => setSelectedTab('returns')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${selectedTab === 'returns' ? 'bg-black text-white' : 'bg-gray-200'}`}>
              Returns {returnRequests.filter(r => r.status === 'pending').length > 0 && <span className='inline-block ml-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full'>{returnRequests.filter(r => r.status === 'pending').length}</span>}
            </button>
          </div>

          <button
            onClick={() => {
              if (!isSellerVerified) return
              resetForm()
              setShowForm(!showForm)
              setSelectedTab('products')
            }}
            disabled={!isSellerVerified}
            className='bg-black text-white px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-gray-800 text-sm sm:text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {!isSellerVerified ? 'Awaiting Verification' : (showForm ? 'Cancel' : 'Add Product')}
          </button>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className='bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8'>
            <h2 className='text-xl sm:text-2xl font-bold mb-4 sm:mb-6'>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            {/* Error Display */}
            {uploadError && (
              <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
                ⚠️ {uploadError}
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className='mb-4'>
                <p className='text-sm text-gray-600 mb-1'>Uploading: {uploadProgress}%</p>
                <div className='w-full bg-gray-200 rounded-lg h-2 overflow-hidden'>
                  <div
                    className='bg-blue-600 h-full transition-all duration-300'
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className='grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6'>

              <input
                type='text'
                name='name'
                placeholder='Product Name'
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                className='col-span-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:bg-gray-100'
                required
              />

              <input
                type='text'
                name='subCategory'
                placeholder='Collection (e.g. Bouquets, Amigurumi, Bags)'
                value={formData.subCategory}
                onChange={handleChange}
                disabled={isSubmitting}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:bg-gray-100'
              />

              <input
                type='text'
                name='colors'
                placeholder='Available Colors (comma-separated)'
                value={formData.colors}
                onChange={handleChange}
                disabled={isSubmitting}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:bg-gray-100'
              />

              <input
                type='text'
                name='sizes'
                placeholder='Available Sizes (comma-separated)'
                value={formData.sizes}
                onChange={handleChange}
                disabled={isSubmitting}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:bg-gray-100'
              />

              <input
                type='number'
                name='price'
                placeholder='Price'
                value={formData.price}
                onChange={handleChange}
                disabled={isSubmitting}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:bg-gray-100'
                required
              />

              <input
                type='number'
                name='stock'
                placeholder='Stock Quantity'
                value={formData.stock}
                onChange={handleChange}
                disabled={isSubmitting}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black disabled:bg-gray-100'
                required
              />

              <textarea
                name='description'
                placeholder='Product Description'
                value={formData.description}
                onChange={handleChange}
                className='col-span-1 md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                rows='4'
                required
              />

              <div className='col-span-1 md:col-span-2'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Product Images <span className='text-red-500'>*</span>
                  <span className='text-xs text-gray-500 font-normal ml-2'>(drag and drop or tap Browse Images)</span>
                </label>
                <div
                  className={`rounded-lg border-2 border-dashed px-4 py-5 transition-colors ${isImageDropActive ? 'border-black bg-gray-50' : 'border-gray-300 bg-white'}`}
                  onDragEnter={(e) => { e.preventDefault(); setIsImageDropActive(true) }}
                  onDragOver={(e) => { e.preventDefault(); setIsImageDropActive(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsImageDropActive(false) }}
                  onDrop={handleImageDrop}
                >
                  <input
                    ref={imageInputRef}
                    id='product-images'
                    type='file'
                    multiple
                    accept='image/*'
                    onChange={handleImageChange}
                    className='hidden'
                  />
                  <div className='flex flex-col sm:flex-row gap-3 sm:items-center'>
                    <button
                      type='button'
                      onClick={() => imageInputRef.current?.click()}
                      className='bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 text-sm'
                    >
                      Browse Images
                    </button>
                    <p className='text-xs text-gray-500'>
                      On phone, tap Browse Images and pick multiple photos from your gallery, or keep tapping Browse Images to add more.
                    </p>
                  </div>
                  <p className='text-xs text-gray-500 mt-3'>You can also drag in several images on desktop. Recommended: upload at least 3 different angles.</p>
                </div>
                {imagePreview.length > 0 && (
                  <div className='mt-3'>
                    <p className='text-sm text-gray-600 mb-2'>
                      Selected images: <span className='font-medium text-green-600'>{imagePreview.length}</span>
                      {imagePreview.length < 3 && <span className='text-xs text-orange-600 ml-2'>(Recommended: 3+)</span>}
                    </p>
                    {editingProduct && existingImages.length > 0 && (
                      <p className='text-xs text-gray-500 mb-2'>
                        Existing photos: <span className='font-medium'>{existingImages.length}</span>. Use Remove old to delete them before updating.
                      </p>
                    )}
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                      {imagePreview.map((preview, idx) => (
                        <div key={idx} className='relative group'>
                          <img src={preview} alt={`Preview ${idx}`} className='w-full h-24 object-cover rounded border border-gray-200' />
                          {idx < existingImages.length ? (
                            <span className='absolute bottom-1 left-1 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded'>Old</span>
                          ) : (
                            <span className='absolute bottom-1 left-1 bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded'>New</span>
                          )}
                          <span className='absolute top-1 right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>{idx + 1}</span>
                          <button
                            type='button'
                            onClick={() => removeImage(idx)}
                            className='absolute top-1 left-1 bg-red-500 hover:bg-red-600 text-white text-[10px] rounded px-2 py-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
                            title={idx < existingImages.length ? 'Remove old image' : 'Remove new image'}
                          >
                            {idx < existingImages.length ? 'Remove old' : 'Remove'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='col-span-1 md:col-span-2 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>3D Model File - Android (.glb)</label>
                  <input
                    type='file'
                    name='model'
                    accept='.glb,.gltf'
                    onChange={handleModelChange}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                  />
                  {formData.model && (
                    <p className='mt-2 text-sm text-green-600'>✓ {formData.model.name}</p>
                  )}
                  <p className='mt-1 text-xs text-gray-500'>Maximum file size: 25MB</p>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>3D Model File - iOS (.usdz)</label>
                  <input
                    type='file'
                    name='iosModel'
                    accept='.usdz'
                    onChange={handleModelChange}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
                  />
                  {formData.iosModel && (
                    <p className='mt-2 text-sm text-green-600'>✓ {formData.iosModel.name}</p>
                  )}
                  <p className='mt-1 text-xs text-gray-500'>Maximum file size: 10MB</p>
                </div>
              </div>

              <button
                type='submit'
                disabled={isSubmitting}
                className='col-span-1 md:col-span-2 bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
                title={isSubmitting ? 'Submitting...' : 'Ready'}
              >
                {isSubmitting ? (
                  <>
                    <span className='inline-block mr-2'>⏳</span>
                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                  </>
                ) : (
                  editingProduct ? 'Update Product' : 'Create Product'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab panels */}
        {selectedTab === 'products' && (
          <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
            <div className='p-4 sm:p-6 border-b border-gray-200'>
              <h2 className='text-xl sm:text-2xl font-bold'>Your Products ({products.length})</h2>
            </div>

            {loading && !products.length ? (
              <div className='p-6 text-center text-gray-500'>Loading products...</div>
            ) : products.length === 0 ? (
              <div className='p-6 text-center text-gray-500'>No products yet. Add your first product!</div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className='sm:hidden divide-y divide-gray-200'>
                  {products.map((product) => {
                    const img = Array.isArray(product.image) && product.image.length > 0 ? product.image[0] : null
                    const src = resolveImageUrl(img)
                    const stock = product.stock ?? 0
                    return (
                      <div key={product.id} className='p-4'>
                        <div className='flex gap-3'>
                          {src ? (
                            <img src={src} alt={product.name} className='w-16 h-16 object-cover rounded flex-shrink-0' />
                          ) : (
                            <div className='w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0'>N/A</div>
                          )}
                          <div className='flex-1 min-w-0'>
                            <p className='font-medium text-gray-900 text-sm truncate'>{product.name}</p>
                            <p className='text-sm text-gray-700 mt-0.5'>₱{product.price}</p>
                            <div className='flex items-center gap-2 mt-1'>
                              <span className='text-xs text-gray-500'>Stock: {product.stock}</span>
                              {product.hidden ? (
                                <span className='inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600'>Hidden</span>
                              ) : stock <= 0 ? (
                                <span className='inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>Out of Stock</span>
                              ) : (
                                <span className='inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700'>Active</span>
                              )}
                            </div>
                            {product.subCategory && <p className='text-xs text-gray-500 mt-0.5'>{product.subCategory}</p>}
                          </div>
                        </div>
                        <div className='flex gap-2 mt-3'>
                          <button onClick={() => handleEdit(product)} className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm flex-1'>Edit</button>
                          <button onClick={() => setDeleteConfirm(product.id)} className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm flex-1'>Delete</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop table view */}
                <div className='hidden sm:block overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gray-50 border-b border-gray-200'>
                      <tr>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700 w-16'>Image</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Product Name</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Price</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Stock</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Status</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Category</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className='border-b border-gray-200 hover:bg-gray-50'>
                          <td className='px-6 py-4'>
                            {(() => {
                              const img = Array.isArray(product.image) && product.image.length > 0 ? product.image[0] : null
                              const src = resolveImageUrl(img)
                              return src ? (
                                <img src={src} alt={product.name} className='w-10 h-10 object-cover rounded' />
                              ) : (
                                <div className='w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs'>N/A</div>
                              )
                            })()}
                          </td>
                          <td className='px-6 py-4 text-sm font-medium text-gray-900'>{product.name}</td>
                          <td className='px-6 py-4 text-sm text-gray-700'>₱{product.price}</td>
                          <td className='px-6 py-4 text-sm text-gray-700'>{product.stock}</td>
                          <td className='px-6 py-4 text-sm'>
                            {(() => {
                              const stock = product.stock ?? 0
                              if (product.hidden) return <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600'>❌ Hidden</span>
                              if (stock <= 0) return <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>⏸ Out of Stock</span>
                              return <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700'>Active</span>
                            })()}
                          </td>
                          <td className='px-6 py-4 text-sm text-gray-700'>{product.subCategory}</td>
                          <td className='px-6 py-4 text-sm space-x-2'>
                            <button
                              onClick={() => handleEdit(product)}
                              className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded'
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product.id)}
                              className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded'
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {selectedTab === 'orders' && (
          <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
            <div className='p-4 sm:p-6 border-b border-gray-200'>
              <h2 className='text-xl sm:text-2xl font-bold'>Orders ({sellerOrders.length})</h2>
            </div>

            {loading && !sellerOrders.length ? (
              <div className='p-6 text-center text-gray-500'>Loading orders...</div>
            ) : sellerOrders.length === 0 ? (
              <div className='p-6 text-center text-gray-500'>No orders yet for your products.</div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className='sm:hidden divide-y divide-gray-200'>
                  {sellerOrders.map((order) => (
                    <div key={order.id} className='p-4'>
                      <div className='flex justify-between items-start mb-2'>
                        <div>
                          <p className='font-medium text-sm text-gray-900'>{order.firstName} {order.lastName}</p>
                          <p className='text-xs text-gray-500'>{order.email}</p>
                        </div>
                        <p className='font-bold text-sm'>₱{order.total}</p>
                      </div>
                      <div className='space-y-2 mb-3'>
                        {order.sellerItems.map((it, idx) => {
                          const img = Array.isArray(it.image) && it.image.length > 0 ? it.image[0] : (typeof it.image === 'string' ? it.image : null)
                          let imgSrc = null
                          if (img) {
                            if (typeof img === 'object' && img.url) imgSrc = img.url.startsWith('http') ? img.url : `${apiUrl}${img.url}`
                            else if (typeof img === 'string') imgSrc = img.startsWith('http') ? img : `${apiUrl}${img}`
                          }
                          return (
                            <div key={idx} className='flex items-center gap-2'>
                              {imgSrc ? (
                                <img src={imgSrc} alt={it.name || 'Product'} className='w-10 h-10 object-cover rounded border' />
                              ) : (
                                <div className='w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs'>N/A</div>
                              )}
                              <div className='text-xs text-gray-700'>
                                <p className='font-medium'>{it.name ?? `Product ${it.productId ?? ''}`}</p>
                                <p className='text-gray-500'>x{it.quantity ?? 1} · ₱{it.price ?? ''}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className='mb-3'>
                        <select
                          value={order.orderStatus}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            try {
                              await axios.put(`${apiUrl}/api/orders/${order.id}/status-seller`, { orderStatus: newStatus }, {
                                headers: { Authorization: `Bearer ${token}` },
                              })
                              toast.success('Order status updated')
                              fetchSellerOrders()
                            } catch (err) {
                              console.error(err)
                              toast.error(err.response?.data?.message || 'Failed to update status')
                            }
                          }}
                          className='w-full px-3 py-2 border rounded text-sm'>
                          <option value='pending'>pending</option>
                          <option value='processing'>processing</option>
                          {order.paymentMethod === 'pickup' && (
                            <option value='ready_for_pickup'>ready for pickup</option>
                          )}
                          {order.paymentMethod !== 'pickup' && order.method !== 'pickup' && (
                            <option value='shipped'>shipped</option>
                          )}
                          <option value='completed'>completed</option>
                          <option value='cancelled'>cancelled</option>
                        </select>
                      </div>
                      <div className='flex gap-2'>
                        <button onClick={() => setViewOrder(order)} className='bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm flex-1'>View</button>
                        <button onClick={() => setOrderDeleteConfirm(order)} className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm flex-1'>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table view */}
                <div className='hidden sm:block overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gray-50 border-b border-gray-200'>
                      <tr>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Order ID</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Buyer</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Items</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Total</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Status</th>
                        <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerOrders.map((order) => (
                        <tr key={order.id} className='border-b border-gray-200 hover:bg-gray-50'>
                          <td className='px-6 py-4 text-sm font-medium text-gray-900'>{order.id}</td>
                          <td className='px-6 py-4 text-sm text-gray-700'>
                            {order.firstName || order.lastName ? (
                              <>
                                {order.firstName} {order.lastName}
                                <div className='text-xs text-gray-500'>{order.email}</div>
                              </>
                            ) : (
                              <span className='text-gray-500'>{order.email || 'No buyer info'}</span>
                            )}
                          </td>
                          <td className='px-6 py-4 text-sm text-gray-700'>
                            {order.sellerItems.map((it, idx) => {
                              const img = Array.isArray(it.image) && it.image.length > 0 ? it.image[0] : (typeof it.image === 'string' ? it.image : null)
                              let imgSrc = null
                              if (img) {
                                if (typeof img === 'object' && img.url) imgSrc = img.url.startsWith('http') ? img.url : `${apiUrl}${img.url}`
                                else if (typeof img === 'string') imgSrc = img.startsWith('http') ? img : `${apiUrl}${img}`
                              }
                              return (
                                <div key={idx} className='flex items-center gap-3 mb-2'>
                                  {imgSrc ? (
                                    <img src={imgSrc} alt={it.name || 'Product'} className='w-12 h-12 object-cover rounded border flex-shrink-0' />
                                  ) : (
                                    <div className='w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs flex-shrink-0'>N/A</div>
                                  )}
                                  <div>
                                    <span className='font-medium'>{it.name ?? it.title ?? `Product ${it.productId ?? it.id ?? ''}`}</span>
                                    <div className='text-xs text-gray-500'>x{it.quantity ?? it.qty ?? it.q ?? 1} · ₱{it.price ?? it.unitPrice ?? ''}</div>
                                  </div>
                                </div>
                              )
                            })}
                          </td>
                          <td className='px-6 py-4 text-sm text-gray-700'>₱{order.total}</td>
                          <td className='px-6 py-4 text-sm text-gray-700'>
                            <select
                              value={order.orderStatus}
                              onChange={async (e) => {
                                const newStatus = e.target.value
                                try {
                                  await axios.put(`${apiUrl}/api/orders/${order.id}/status-seller`, { orderStatus: newStatus }, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  })
                                  toast.success('Order status updated')
                                  fetchSellerOrders()
                                } catch (err) {
                                  console.error(err)
                                  toast.error(err.response?.data?.message || 'Failed to update status')
                                }
                              }}
                              className='px-2 py-1 border rounded'>
                              <option value='pending'>pending</option>
                              <option value='processing'>processing</option>
                              {order.paymentMethod === 'pickup' && (
                                <option value='ready_for_pickup'>ready for pickup</option>
                              )}
                              {order.paymentMethod !== 'pickup' && order.method !== 'pickup' && (
                                <option value='shipped'>shipped</option>
                              )}
                              <option value='completed'>completed</option>
                              <option value='cancelled'>cancelled</option>
                            </select>
                          </td>
                          <td className='px-6 py-4 text-sm text-gray-700'>
                            <div className='flex gap-2'>
                            <button onClick={() => setViewOrder(order)} className='bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded'>View</button>
                            <button onClick={() => setOrderDeleteConfirm(order)} className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded'>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {selectedTab === 'chat' && (
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h2 className='text-2xl font-bold mb-4'>Customer Chat</h2>
            <div>
              <div className='mb-4 text-sm text-gray-600'>Messages with customers — view conversations and reply below.</div>
              <div>
                {/* Customer chat component */}
                <React.Suspense fallback={<div className='text-sm text-gray-500'>Loading chat...</div>}>
                  <SellerChat />
                </React.Suspense>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'support' && (
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h2 className='text-2xl font-bold mb-4'>Support Inbox</h2>
            <div>
              <div className='mb-4 text-sm text-gray-600'>Private support chat with admin.</div>
              <div>
                <React.Suspense fallback={<div className='text-sm text-gray-500'>Loading support chat...</div>}>
                  <SellerAdminChat />
                </React.Suspense>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'reviews' && (
          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h2 className='text-2xl font-bold mb-4'>Product Reviews</h2>

            {loading && !sellerReviews.length ? (
              <div className='text-sm text-gray-500'>Loading reviews...</div>
            ) : sellerReviews.length === 0 ? (
              <div className='text-sm text-gray-500'>No reviews yet for your products.</div>
            ) : (
              <div className='space-y-4'>
                {sellerReviews.map((r) => (
                  <div key={r.id} className='p-4 border rounded bg-gray-50'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <div className='text-sm font-medium'>{r.userName || 'Customer'}</div>
                        <div className='text-xs text-gray-500'>{new Date(r.createdAt).toLocaleString()}</div>
                        <div className='text-sm text-gray-700 mt-2'>{r.comment}</div>
                      </div>
                      <div className='text-sm text-gray-600 ml-4'>Rating: {r.rating}</div>
                    </div>

                    {r.sellerReply ? (
                      <div className='mt-3 p-3 bg-white border rounded'>
                        <div className='text-sm font-medium'>Your reply</div>
                        <div className='text-sm text-gray-700 mt-1'>{r.sellerReply}</div>
                        <div className='text-xs text-gray-400 mt-1'>{r.sellerReplyAt ? new Date(r.sellerReplyAt).toLocaleString() : ''}</div>
                      </div>
                    ) : (
                      <div className='mt-3'>
                        <textarea
                          placeholder='Write a public reply to this review'
                          value={replyDrafts[r.id] || ''}
                          onChange={(e) => handleReplyChange(r.id, e.target.value)}
                          className='w-full border rounded p-2'
                        />
                        <div className='mt-2 flex gap-2'>
                          <button onClick={() => submitReply(r)} className='bg-black text-white px-4 py-2 rounded'>Post Reply</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'inventory' && (
          <div className='bg-white rounded-lg shadow-lg overflow-hidden p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-2xl font-bold'>Inventory</h2>
              <div className='flex items-center gap-2'>
                <label className='text-sm text-gray-600'>Low stock threshold</label>
                <input type='number' value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Number(e.target.value) || 1)} className='w-20 px-2 py-1 border rounded' />
              </div>
            </div>

            {/* Low stock alerts */}
            <div className='mb-6'>
              <h3 className='font-medium mb-2'>Low Stock Items</h3>
              {products.filter(p => Number(p.stock) <= lowStockThreshold).length === 0 ? (
                <div className='text-sm text-gray-500'>No low-stock items.</div>
              ) : (
                <div className='grid gap-3'>
                  {products.filter(p => Number(p.stock) <= lowStockThreshold).map(p => (
                    <div key={p.id} className='flex items-center justify-between border p-3 rounded'>
                      <div>
                        <div className='font-medium'>{p.name}</div>
                        <div className='text-sm text-gray-600'>Stock: {p.stock}</div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <input type='number' min='1' placeholder='Add qty' id={`restock-${p.id}`} className='w-24 px-2 py-1 border rounded' />
                        <button
                          onClick={async () => {
                            const input = document.getElementById(`restock-${p.id}`)
                            const qty = Number(input?.value || 0)
                            if (qty <= 0) return toast.error('Enter a quantity to add')
                            try {
                              await axios.put(`${apiUrl}/api/products/${p.id}`, { stock: Number(p.stock) + qty }, {
                                headers: { Authorization: `Bearer ${token}` },
                              })
                              toast.success('Stock updated')
                              fetchProducts()
                            } catch (err) {
                              console.error(err)
                              toast.error('Failed to update stock')
                            }
                          }}
                          className='bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded'
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Full product inventory table */}
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Product</th>
                    <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Stock</th>
                    <th className='px-6 py-3 text-left text-sm font-medium text-gray-700'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className='border-b border-gray-200 hover:bg-gray-50'>
                      <td className='px-6 py-4 text-sm font-medium text-gray-900'>{p.name}</td>
                      <td className='px-6 py-4 text-sm text-gray-700'>{p.stock}</td>
                      <td className='px-6 py-4 text-sm space-x-2'>
                        <button onClick={() => handleEdit(p)} className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded'>Edit</button>
                        <button onClick={() => setDeleteConfirm(p.id)} className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded'>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== SHIPPING SETTINGS TAB ===== */}
        {selectedTab === 'shipping' && (
          <div className='bg-white rounded-lg shadow-lg p-6'>
            {/* Payment Settings FIRST for priority */}
            <h2 className='text-2xl font-bold mb-6'>Payment Settings</h2>
            <div className='space-y-6'>
              <div>
                <div className='space-y-4'>
                  <div className='flex flex-col sm:flex-row gap-3'>
                    <label className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={paymentSettings.acceptsCOD}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, acceptsCOD: e.target.checked }))}
                      />
                      Accept Cash on Delivery (COD)
                    </label>
                    <label className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={paymentSettings.acceptsGCash}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, acceptsGCash: e.target.checked }))}
                      />
                      Accept GCash
                    </label>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>GCash Account Name</label>
                    <input
                      type='text'
                      value={paymentSettings.gcashAccountName || ''}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, gcashAccountName: e.target.value }))}
                      className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                      placeholder='e.g., Juan Dela Cruz'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>GCash Number</label>
                    <input
                      type='text'
                      value={paymentSettings.gcashNumber || ''}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, gcashNumber: e.target.value }))}
                      className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                      placeholder='09XXXXXXXXX'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>GCash QR Code</label>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={(e) => uploadGcashQr(e.target.files?.[0])}
                      className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                    />
                    <p className='text-xs text-gray-500 mt-1'>Upload a clear QR image so buyers can scan during checkout.</p>
                    {paymentSettings.gcashQr && (
                      <img
                        src={paymentSettings.gcashQr.startsWith('http') ? paymentSettings.gcashQr : `${apiUrl}${paymentSettings.gcashQr.startsWith('/') ? paymentSettings.gcashQr : `/${paymentSettings.gcashQr}`}`}
                        alt='GCash QR'
                        className='mt-2 w-36 h-36 object-contain border rounded bg-white p-1'
                      />
                    )}
                  </div>

                  <div className='pt-2'>
                    <button onClick={savePaymentSettings} className='bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800'>
                      Save Payment Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <h2 className='text-2xl font-bold mb-6 mt-10'>Shipping Settings</h2>
            <div className='space-y-6'>
              {/* Ships From */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Ships From</label>
                <input
                  type='text'
                  value={shippingSettings.shipsFrom || ''}
                  onChange={(e) => setShippingSettings(prev => ({ ...prev, shipsFrom: e.target.value }))}
                  className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                  placeholder='e.g., Baguio City, Benguet'
                />
              </div>

              {/* Processing Time */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Processing Time</label>
                <select
                  value={shippingSettings.processingTime || ''}
                  onChange={(e) => setShippingSettings(prev => ({ ...prev, processingTime: e.target.value }))}
                  className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                >
                  <option value='1-2 business days'>1-2 business days</option>
                  <option value='1-3 business days'>1-3 business days</option>
                  <option value='3-5 business days'>3-5 business days</option>
                  <option value='5-7 business days'>5-7 business days</option>
                  <option value='1-2 weeks'>1-2 weeks</option>
                  <option value='2-4 weeks'>2-4 weeks (custom/made-to-order)</option>
                </select>
              </div>

              {/* Free Shipping Minimum */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Free Shipping Minimum Order (₱)</label>
                <input
                  type='number'
                  min='0'
                  value={shippingSettings.freeShippingMinimum || 0}
                  onChange={(e) => setShippingSettings(prev => ({ ...prev, freeShippingMinimum: Number(e.target.value) || 0 }))}
                  className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                  placeholder='Set to 0 to disable free shipping'
                />
                <p className='text-xs text-gray-500 mt-1'>Orders above this amount get free shipping. Set to 0 to disable.</p>
              </div>

              {/* Shipping Rates */}
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <label className='text-sm font-medium text-gray-700'>Shipping Rates</label>
                  <button
                    onClick={() => setShippingSettings(prev => ({
                      ...prev,
                      shippingRates: [...(prev.shippingRates || []), { name: '', price: 0, estimatedDays: '' }]
                    }))}
                    className='text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors'
                  >
                    + Add Rate
                  </button>
                </div>

                <div className='space-y-3'>
                  {(shippingSettings.shippingRates || []).map((rate, idx) => (
                    <div key={idx} className='border rounded-lg p-4 bg-gray-50'>
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                        <div>
                          <label className='block text-xs text-gray-500 mb-1'>Rate Name</label>
                          <input
                            type='text'
                            value={rate.name || ''}
                            onChange={(e) => {
                              const updated = [...shippingSettings.shippingRates]
                              updated[idx] = { ...updated[idx], name: e.target.value }
                              setShippingSettings(prev => ({ ...prev, shippingRates: updated }))
                            }}
                            className='w-full px-3 py-2 border rounded focus:outline-none focus:border-black'
                            placeholder='e.g., Standard, Express'
                          />
                        </div>
                        <div>
                          <label className='block text-xs text-gray-500 mb-1'>Price (₱)</label>
                          <input
                            type='number'
                            min='0'
                            value={rate.price || 0}
                            onChange={(e) => {
                              const updated = [...shippingSettings.shippingRates]
                              updated[idx] = { ...updated[idx], price: Number(e.target.value) || 0 }
                              setShippingSettings(prev => ({ ...prev, shippingRates: updated }))
                            }}
                            className='w-full px-3 py-2 border rounded focus:outline-none focus:border-black'
                          />
                        </div>
                        <div>
                          <label className='block text-xs text-gray-500 mb-1'>Estimated Delivery</label>
                          <input
                            type='text'
                            value={rate.estimatedDays || ''}
                            onChange={(e) => {
                              const updated = [...shippingSettings.shippingRates]
                              updated[idx] = { ...updated[idx], estimatedDays: e.target.value }
                              setShippingSettings(prev => ({ ...prev, shippingRates: updated }))
                            }}
                            className='w-full px-3 py-2 border rounded focus:outline-none focus:border-black'
                            placeholder='e.g., 3-5 business days'
                          />
                        </div>
                      </div>
                      {shippingSettings.shippingRates.length > 1 && (
                        <button
                          onClick={() => {
                            const updated = shippingSettings.shippingRates.filter((_, i) => i !== idx)
                            setShippingSettings(prev => ({ ...prev, shippingRates: updated }))
                          }}
                          className='mt-2 text-red-500 hover:text-red-700 text-sm'
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className='pt-4 border-t'>
                <button onClick={saveShippingSettings} className='bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800'>
                  Save Shipping Settings
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ===== RETURNS & REFUNDS TAB ===== */}
        {selectedTab === 'returns' && (
          <div className='space-y-6'>
            {/* Return Policy Settings */}
            <div className='bg-white rounded-lg shadow-lg p-6'>
              <h2 className='text-2xl font-bold mb-4'>Return & Refund Policy</h2>

              <div className='space-y-4'>
                <div className='flex items-center gap-3'>
                  <label className='text-sm font-medium text-gray-700'>Accept Returns</label>
                  <button
                    onClick={() => setReturnPolicy(prev => ({ ...prev, acceptsReturns: !prev.acceptsReturns }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${returnPolicy.acceptsReturns ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${returnPolicy.acceptsReturns ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className='text-sm text-gray-500'>{returnPolicy.acceptsReturns ? 'Yes' : 'No'}</span>
                </div>

                {returnPolicy.acceptsReturns && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Return Window (days)</label>
                      <select
                        value={returnPolicy.returnWindow || 7}
                        onChange={(e) => setReturnPolicy(prev => ({ ...prev, returnWindow: Number(e.target.value) }))}
                        className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                      >
                        <option value={3}>3 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Return Conditions</label>
                      <textarea
                        value={returnPolicy.conditions || ''}
                        onChange={(e) => setReturnPolicy(prev => ({ ...prev, conditions: e.target.value }))}
                        className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                        rows={3}
                        placeholder='Describe the conditions for accepting returns...'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>Refund Method</label>
                      <select
                        value={returnPolicy.refundMethod || 'Original payment method'}
                        onChange={(e) => setReturnPolicy(prev => ({ ...prev, refundMethod: e.target.value }))}
                        className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-black'
                      >
                        <option value='Original payment method'>Original payment method</option>
                        <option value='Store credit'>Store credit</option>
                        <option value='Exchange only'>Exchange only</option>
                        <option value='Cash refund'>Cash refund</option>
                      </select>
                    </div>
                  </>
                )}

                <div className='pt-4 border-t'>
                  <button onClick={saveReturnPolicy} className='bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800'>
                    Save Return Policy
                  </button>
                </div>
              </div>
            </div>

            {/* Return Requests List */}
            <div className='bg-white rounded-lg shadow-lg p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-2xl font-bold'>Return Requests</h2>
                <button onClick={fetchReturnRequests} className='text-sm text-gray-500 hover:text-black'>Refresh</button>
              </div>

              {returnRequests.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <svg className='w-12 h-12 mx-auto mb-3 text-gray-300' fill='none' stroke='currentColor' strokeWidth='1.5' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' />
                  </svg>
                  <p>No return requests yet</p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {returnRequests.map((ret) => {
                    const statusColors = {
                      pending: 'bg-yellow-100 text-yellow-800',
                      approved: 'bg-green-100 text-green-800',
                      rejected: 'bg-red-100 text-red-800',
                      refunded: 'bg-blue-100 text-blue-800',
                      completed: 'bg-gray-100 text-gray-800',
                    }
                    return (
                      <div key={ret.id} className='border rounded-lg p-4'>
                        <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3'>
                          <div>
                            <div className='flex items-center gap-2 mb-1'>
                              <span className='font-semibold'>Return #{ret.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ret.status] || 'bg-gray-100 text-gray-800'}`}>
                                {ret.status}
                              </span>
                            </div>
                            <div className='text-sm text-gray-600'>Order #{ret.orderId}</div>
                            <div className='text-sm text-gray-600'>{ret.buyerName || 'Customer'} — {ret.buyerEmail || ''}</div>
                            <div className='text-xs text-gray-400 mt-1'>{new Date(ret.createdAt).toLocaleString()}</div>
                          </div>
                          <div className='text-right'>
                            <div className='text-sm font-medium'>Refund: ₱{(ret.refundAmount || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Reason */}
                        <div className='mb-3'>
                          <div className='text-sm font-medium text-gray-700'>Reason: <span className='font-normal'>{ret.reason}</span></div>
                          {ret.description && <div className='text-sm text-gray-600 mt-1'>{ret.description}</div>}
                        </div>

                        {/* Items */}
                        <div className='mb-3'>
                          <div className='text-sm font-medium text-gray-700 mb-1'>Items:</div>
                          <div className='space-y-1'>
                            {(Array.isArray(ret.items) ? ret.items : []).map((it, idx) => (
                              <div key={idx} className='text-sm text-gray-600 flex justify-between'>
                                <span>{it.name || `Product ${it.productId || ''}`} x{it.quantity || 1}</span>
                                <span>₱{((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Seller note if already responded */}
                        {ret.sellerNote && (
                          <div className='mb-3 p-3 bg-gray-50 rounded'>
                            <div className='text-sm font-medium'>Your response:</div>
                            <div className='text-sm text-gray-700'>{ret.sellerNote}</div>
                          </div>
                        )}

                        {/* Actions for pending requests */}
                        {ret.status === 'pending' && (
                          <div className='border-t pt-3 mt-3'>
                            <div className='mb-2'>
                              <textarea
                                value={returnReplyDrafts[ret.id] || ''}
                                onChange={(e) => setReturnReplyDrafts(prev => ({ ...prev, [ret.id]: e.target.value }))}
                                className='w-full border rounded p-2 text-sm'
                                rows={2}
                                placeholder='Add a note to the customer (optional)...'
                              />
                            </div>
                            <div className='flex gap-2'>
                              <button
                                onClick={() => updateReturnStatus(ret.id, 'approved', returnReplyDrafts[ret.id] || '')}
                                className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium'
                              >
                                Approve & Refund
                              </button>
                              <button
                                onClick={() => updateReturnStatus(ret.id, 'rejected', returnReplyDrafts[ret.id] || '')}
                                className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium'
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order details modal */}
        {viewOrder && (
          <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'>
            <div className='absolute inset-0 bg-black opacity-40' onClick={() => setViewOrder(null)} />
            <div className='bg-white rounded-t-2xl sm:rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative z-10'>
              <div className='flex items-start justify-between mb-4'>
                <div>
                  <h3 className='text-xl font-bold'>Order #{viewOrder.id}</h3>
                  <div className='text-sm text-gray-500'>Placed: {new Date(viewOrder.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <button onClick={() => setViewOrder(null)} className='text-sm text-gray-600'>Close ✖</button>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <h4 className='font-medium'>Buyer</h4>
                  <div className='text-sm'>{viewOrder.firstName} {viewOrder.lastName}</div>
                  <div className='text-xs text-gray-500'>{viewOrder.email}</div>
                  {viewOrder.phone && <div className='text-sm mt-1'>Phone: {viewOrder.phone}</div>}

                  <h4 className='font-medium mt-4'>
                    {viewOrder.paymentMethod === 'pickup' ? 'Pickup Details' : 'Shipping Details'}
                  </h4>
                  {viewOrder.paymentMethod === 'pickup' ? (
                    <div className='text-sm'>
                      <div>Pickup Location: {viewOrder.pickupLocation || 'N/A'}</div>
                      {viewOrder.reservationDateTime && <div>Reservation: {new Date(viewOrder.reservationDateTime).toLocaleString()}</div>}
                      {viewOrder.reservationNote && <div className='text-xs text-gray-600 mt-1'>Note: {viewOrder.reservationNote}</div>}
                      {viewOrder.workingDays && (
                        <div className='mt-2 p-2 bg-blue-50 border border-blue-200 rounded'>
                          <div className='font-medium text-blue-800'>Working Days: {viewOrder.workingDays} days</div>
                          {viewOrder.estimatedReadyDate && (
                            <div className='text-xs text-blue-700'>
                              Ready by: {new Date(viewOrder.estimatedReadyDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='text-sm'>
                      <div>{viewOrder.street}, {viewOrder.city} {viewOrder.state}</div>
                      <div className='text-xs text-gray-600'>{viewOrder.zipcode} {viewOrder.country}</div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className='font-medium'>Order Summary</h4>
                  <div className='text-sm'>Subtotal: ₱{viewOrder.subtotal}</div>
                  {viewOrder.paymentMethod !== 'pickup' && (
                    <div className='text-sm'>Shipping: ₱{viewOrder.shippingFee ?? 0}</div>
                  )}
                  <div className='text-sm'>Total: ₱{viewOrder.total}</div>
                  <div className='text-sm'>Status: {viewOrder.orderStatus}</div>
                </div>
              </div>

              <div className='mt-4'>
                <h4 className='font-medium mb-2'>Your Items</h4>
                <div className='space-y-2'>
                  {Array.isArray(viewOrder.sellerItems) && viewOrder.sellerItems.map((it, idx) => (
                    <div key={idx} className='p-3 border rounded flex items-center justify-between'>
                      <div>
                        <div className='font-medium'>{it.name || `Product ${it.productId}`}</div>
                        <div className='text-xs text-gray-600'>Qty: {it.quantity}</div>
                      </div>
                      <div className='text-sm'>₱{it.price}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ready Date Section for Pickup Orders */}
              {viewOrder.paymentMethod === 'pickup' && (
                <div className='mt-4 p-4 border rounded bg-amber-50'>
                  <h4 className='font-medium mb-3'>Set Ready Date for Pickup</h4>
                  <div className='text-xs text-gray-600 mb-3'>
                    Select the calendar date when this order will be ready for pickup. The customer will be notified of this date.
                  </div>
                  <div className='flex gap-3 items-end'>
                    <div className='flex-1'>
                      <label className='block text-sm font-medium mb-1'>Ready Date</label>
                      <input 
                        type='date'
                        defaultValue={viewOrder.estimatedReadyDate ? new Date(viewOrder.estimatedReadyDate).toISOString().split('T')[0] : ''}
                        className='w-full px-3 py-2 border rounded'
                        id={`readyDate-${viewOrder.id}`}
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        const readyDateInput = document.getElementById(`readyDate-${viewOrder.id}`)
                        const readyDate = readyDateInput?.value
                        
                        if (!readyDate) {
                          toast.error('Please select a ready date')
                          return
                        }
                        
                        try {
                          await axios.put(`${apiUrl}/api/orders/${viewOrder.id}/status-seller`, 
                            { 
                              orderStatus: viewOrder.orderStatus,
                              estimatedReadyDate: readyDate
                            }, 
                            {
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          )
                          toast.success('Ready date set successfully')
                          setViewOrder(null)
                          fetchSellerOrders()
                        } catch (err) {
                          console.error(err)
                          toast.error(err.response?.data?.message || 'Failed to set ready date')
                        }
                      }}
                      className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded'
                    >
                      Set Ready Date
                    </button>
                  </div>
                </div>
              )}

              <div className='mt-4 text-right'>
                <button onClick={() => setViewOrder(null)} className='bg-black text-white px-4 py-2 rounded'>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4'>
              <h3 className='text-lg font-bold text-gray-900 mb-2'>Delete Product</h3>
              <p className='text-sm text-gray-600 mb-6'>Are you sure you want to delete this product? This action cannot be undone.</p>
              <div className='flex justify-end gap-3'>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200'
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700'
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Delete Confirmation Modal */}
        {orderDeleteConfirm && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4'>
              <h3 className='text-lg font-bold text-gray-900 mb-2'>Delete Order</h3>
              <p className='text-sm text-gray-600 mb-6'>Delete this order? This will remove the order if it belongs only to you.</p>
              <div className='flex justify-end gap-3'>
                <button
                  onClick={() => setOrderDeleteConfirm(null)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200'
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteOrder(orderDeleteConfirm.id)}
                  className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700'
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SellerDashboard
