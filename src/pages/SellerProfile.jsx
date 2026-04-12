import React, { useCallback, useState, useEffect } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const SellerProfile = () => {
    const [showSaveModal, setShowSaveModal] = useState(false)
  const navigate = useNavigate()
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [artisanTypes, setArtisanTypes] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    storeName: '',
    phone: '',
    address: '',
    description: '',
    artisanType: '',
    bio: '',
    expertise: [],
    pickupLocations: [],
  })
  const [newPickupLocation, setNewPickupLocation] = useState('')
  const [pickupFileError, setPickupFileError] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUploadError, setImageUploadError] = useState('')
  const [saveError, setSaveError] = useState('')

  // Defensive: always ensure formData and artisanTypes are defined
  const safeFormData = formData || {
    name: '',
    storeName: '',
    phone: '',
    address: '',
    description: '',
    artisanType: '',
    bio: '',
    expertise: [],
    pickupLocations: [],
  };
  const safeArtisanTypes = Array.isArray(artisanTypes) ? artisanTypes : [];

  const token = localStorage.getItem('sellerToken')
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const normalizeAvatarUrl = useCallback((url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${apiUrl}${url}`
  }, [apiUrl])

  const fetchArtisanTypes = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/sellers/types`)
      setArtisanTypes(res.data?.artisanTypes || [])
    } catch (error) {
      console.error('Error fetching artisan types:', error)
    }
  }, [apiUrl])

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${apiUrl}/api/sellers/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSeller(response.data)
      setFormData({
        name: response.data?.name || '',
        storeName: response.data?.storeName || '',
        phone: response.data?.phone || '',
        address: response.data?.address || '',
        description: response.data?.description || '',
        artisanType: response.data?.artisanType || '',
        bio: response.data?.bio || '',
        expertise: Array.isArray(response.data?.expertise) ? response.data.expertise : [],
        pickupLocations: Array.isArray(response.data?.pickupLocations) ? response.data.pickupLocations : [],
      })
      setAvatarPreview(normalizeAvatarUrl(response.data?.avatar))
    } catch (error) {
      console.error('Error fetching profile:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('sellerToken')
        localStorage.removeItem('seller')
        navigate('/seller/login')
      }
    } finally {
      setLoading(false)
    }
  }, [apiUrl, navigate, token, normalizeAvatarUrl])

  useEffect(() => {
    // Check for seller token - if not present, redirect immediately
    if (!token) {
      navigate('/seller/login')
      return
    }
    fetchArtisanTypes()
    fetchProfile()
  }, [token, navigate, fetchArtisanTypes, fetchProfile])

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-gray-500'>Loading profile...</p>
      </div>
    )
  }

  const handleEditToggle = () => {
    setSaveError('')
    if (!isEditing) {
      setFormData({
        name: seller?.name || '',
        storeName: seller?.storeName || '',
        phone: seller?.phone || '',
        address: seller?.address || '',
        description: seller?.description || '',
        artisanType: seller?.artisanType || '',
        bio: seller?.bio || '',
        expertise: Array.isArray(seller?.expertise) ? seller.expertise : [],
        pickupLocations: Array.isArray(seller?.pickupLocations) ? seller.pickupLocations : [],
      })
    }
    setIsEditing(!isEditing)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError('')
    const localUrl = URL.createObjectURL(file)
    setAvatarPreview(localUrl)

    try {
      setIsUploadingAvatar(true)
      const data = new FormData()
      data.append('image', file)

      const res = await axios.put(`${apiUrl}/api/sellers/profile/avatar`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      const nextAvatar = normalizeAvatarUrl(res.data?.avatar)
      setSeller(prev => ({ ...(prev || {}), avatar: res.data?.avatar || prev?.avatar }))
      setAvatarPreview(nextAvatar || localUrl)
      if (nextAvatar) {
        URL.revokeObjectURL(localUrl)
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setAvatarError(error.response?.data?.message || 'Failed to upload profile photo')
      setAvatarPreview(normalizeAvatarUrl(seller?.avatar))
      URL.revokeObjectURL(localUrl)
    } finally {
      setIsUploadingAvatar(false)
      e.target.value = ''
    }
  }


  // Handle pickup locations file upload
  const handlePickupFileUpload = async (e) => {
    setPickupFileError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.json') && !file.name.endsWith('.txt')) {
      setPickupFileError('Invalid file type. Please upload a CSV, TXT, or JSON file.');
      return;
    }
    try {
      const text = await file.text();
      let locations = [];
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) locations = parsed;
        else if (typeof parsed === 'string') locations = [parsed];
      } else {
        locations = text.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
      }
      setFormData(prev => ({ ...prev, pickupLocations: locations }));
    } catch (err) {
      setPickupFileError('Failed to parse file. Please check the format.');
    }
  };

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setImageUploadError('')
    try {
      setUploadingImages(true)
      const data = new FormData()
      for (const f of files) data.append('images', f)

      const res = await axios.put(`${apiUrl}/api/sellers/profile/images`, data, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      })
      const images = res.data?.images || []
      setSeller(prev => ({ ...(prev || {}), portfolioImages: images }))
    } catch (err) {
      console.error('Error uploading images:', err)
      setImageUploadError(err.response?.data?.message || 'Failed to upload images')
    } finally {
      setUploadingImages(false)
      e.target.value = ''
    }
  }

  const handleRemovePortfolioImage = async (url) => {
    try {
      const current = Array.isArray(seller?.portfolioImages) ? seller.portfolioImages : []
      const next = current.filter((u) => u !== url)
      const res = await axios.put(`${apiUrl}/api/sellers/profile/portfolio`, { portfolioImages: next }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      // server returns updated seller via profile endpoint; update locally
      setSeller(prev => ({ ...(prev || {}), portfolioImages: next }))
    } catch (err) {
      console.error('Error removing image:', err)
      setImageUploadError(err.response?.data?.message || 'Failed to remove image')
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setSaveError('')
      const payload = {
        name: formData.name.trim(),
        storeName: formData.storeName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        description: formData.description.trim(),
        artisanType: formData.artisanType || null,
        bio: formData.bio.trim(),
        expertise: formData.expertise,
        pickupLocations: formData.pickupLocations,
      }
      const res = await axios.put(`${apiUrl}/api/sellers/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.data?.seller) {
        const nextSeller = {
          ...(seller || {}),
          ...payload,
          id: res.data.seller.id ?? seller?.id,
          email: res.data.seller.email ?? seller?.email,
          name: res.data.seller.name ?? payload.name,
          storeName: res.data.seller.storeName ?? payload.storeName,
          artisanType: res.data.seller.artisanType ?? payload.artisanType,
        }
        setSeller(nextSeller)
        localStorage.setItem('seller', JSON.stringify({
          id: nextSeller.id,
          name: nextSeller.name,
          email: nextSeller.email,
          storeName: nextSeller.storeName,
        }))
      } else {
        setSeller(prev => ({ ...(prev || {}), ...payload }))
      }

      setIsEditing(false)
      setShowSaveModal(true)
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveError(error.response?.data?.message || 'Failed to update profile')
      if (error.response?.status === 401) {
        localStorage.removeItem('sellerToken')
        localStorage.removeItem('seller')
        navigate('/seller/login')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-dismiss non-blocking toast for profile updates
  useEffect(() => {
    if (!showSaveModal) return
    const t = setTimeout(() => setShowSaveModal(false), 3000)
    return () => clearTimeout(t)
  }, [showSaveModal])

  return (
    <ErrorBoundary>
    <div className='min-h-screen bg-gray-50 py-6 sm:py-12 px-3 sm:px-4'>
      {/* Save Confirmation Modal */}
      {showSaveModal && (
        <div className='fixed top-4 right-4 z-50'>
          <div className='bg-black text-white px-4 py-2 rounded shadow-lg'>
            <div className='flex items-center gap-3'>
              <div className='text-sm'>Profile updated</div>
              <button onClick={() => setShowSaveModal(false)} className='text-xs text-gray-200 hover:text-white ml-2'>Dismiss</button>
            </div>
          </div>
        </div>
      )}
      <div className='max-w-2xl mx-auto'>
        <div className='bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6'>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
            <div className='flex items-start gap-4'>
              <div className='flex flex-col items-start'>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={seller?.storeName || 'Seller'}
                    className='w-20 h-20 rounded-lg object-cover border border-gray-200 shadow-sm'
                  />
                ) : (
                  <div className='w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-2xl'>
                    {seller?.storeName?.charAt(0) || 'A'}
                  </div>
                )}

                {isEditing && (
                  <label className='mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer transition'>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleAvatarChange}
                      className='hidden'
                    />
                    {isUploadingAvatar ? 'Uploading...' : (avatarPreview ? 'Change Photo' : 'Add Photo')}
                  </label>
                )}

                {avatarError && (
                  <p className='text-xs text-red-600 mt-2'>{avatarError}</p>
                )}
              </div>

              <div>
                <h1 className='text-xl sm:text-3xl font-bold text-gray-900'>{seller?.storeName}</h1>
                <p className='text-gray-600 mt-2'>{seller?.name}</p>
              </div>
            </div>

            <div className='flex gap-2'>
              <button
                onClick={handleEditToggle}
                className='bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800'
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className='bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60'
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => {
                    localStorage.removeItem('sellerToken')
                    localStorage.removeItem('seller')
                    navigate('/')
                    window.location.reload()
                  }}
                  className='bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700'
                >
                  Logout
                </button>
              )}
            </div>
          </div>
          {saveError && (
            <p className='mt-3 text-sm text-red-600'>{saveError}</p>
          )}
        </div>

        {/* Profile Content */}
        <div className='bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-5 sm:space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      {/* Pickup Locations Upload */}
                      <div>
                        <label className='text-sm font-medium text-gray-600'>Pickup Locations (Upload CSV, TXT, or JSON)</label>
                        {isEditing ? (
                          <>
                            <input
                              type='file'
                              accept='.csv,.txt,.json,text/csv,text/plain,application/json'
                              onChange={handlePickupFileUpload}
                              className='mt-2 mb-2 block w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white'
                            />
                            {pickupFileError && <p className='text-xs text-red-600 mt-1'>{pickupFileError}</p>}
                            <ul className='list-disc pl-5 mt-2'>
                              {formData.pickupLocations.map((loc, idx) => (
                                <li key={idx} className='text-sm text-gray-700 flex items-center gap-2'>
                                  <span>{loc}</span>
                                  <button type='button' onClick={() => setFormData(prev => ({ ...prev, pickupLocations: prev.pickupLocations.filter((_, i) => i !== idx) }))} className='text-red-500 text-xs'>Remove</button>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <ul className='list-disc pl-5 mt-2'>
                            {seller?.pickupLocations?.length > 0 ? (
                              seller.pickupLocations.map((loc, idx) => (
                                <li key={idx} className='text-sm text-gray-700'>{loc}</li>
                              ))
                            ) : (
                              <li className='text-sm text-gray-500'>No pickup locations uploaded yet.</li>
                            )}
                          </ul>
                        )}
                      </div>

                      {/* Pickup Photos (portfolio) */}
                      <div>
                        <label className='text-sm font-medium text-gray-600'>Pickup Photos</label>
                        {isEditing ? (
                          <>
                            <input
                              type='file'
                              accept='image/*'
                              multiple
                              onChange={handleUploadImages}
                              className='mt-2 mb-2 block w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white'
                            />
                            {imageUploadError && <p className='text-xs text-red-600 mt-1'>{imageUploadError}</p>}
                            <div className='flex flex-wrap gap-2 mt-2'>
                              {(seller?.portfolioImages || []).map((img, idx) => (
                                <div key={idx} className='relative'>
                                  <img src={img} alt={`pickup-${idx}`} className='w-24 h-24 object-cover rounded-md border' />
                                  <button type='button' onClick={() => handleRemovePortfolioImage(img)} className='absolute top-0 right-0 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs'>×</button>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className='flex flex-wrap gap-2 mt-2'>
                            {(seller?.portfolioImages || []).length ? (
                              (seller.portfolioImages || []).map((img, idx) => (
                                <img key={idx} src={img} alt={`pickup-${idx}`} className='w-24 h-24 object-cover rounded-md border' />
                              ))
                            ) : (
                              <p className='text-sm text-gray-500'>No pickup photos uploaded yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                      
            <div>
              <label className='text-sm font-medium text-gray-600'>Owner Name</label>
              {isEditing ? (
                <input
                  name='name'
                  value={safeFormData.name}
                  onChange={handleInputChange}
                  className='mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-black'
                />
              ) : (
                <p className='text-lg text-gray-900 mt-1'>{seller?.name}</p>
              )}
            </div>
            <div>
              <label className='text-sm font-medium text-gray-600'>Store Name</label>
              {isEditing ? (
                <input
                  name='storeName'
                  value={safeFormData.storeName}
                  onChange={handleInputChange}
                  className='mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-black'
                />
              ) : (
                <p className='text-lg text-gray-900 mt-1'>{seller?.storeName}</p>
              )}
            </div>
            <div>
              <label className='text-sm font-medium text-gray-600'>Email</label>
              <p className='text-lg text-gray-900 mt-1'>{seller?.email}</p>
            </div>
            <div>
              <label className='text-sm font-medium text-gray-600'>Phone</label>
              {isEditing ? (
                <input
                  name='phone'
                  value={safeFormData.phone}
                  onChange={handleInputChange}
                  className='mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-black'
                />
              ) : (
                <p className='text-lg text-gray-900 mt-1'>{seller?.phone || 'Not provided'}</p>
              )}
            </div>
          </div>

          <div>
            <label className='text-sm font-medium text-gray-600'>Address</label>
            {isEditing ? (
              <input
                name='address'
                value={safeFormData.address}
                onChange={handleInputChange}
                className='mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-black'
              />
            ) : (
              <p className='text-lg text-gray-900 mt-1'>{seller?.address || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className='text-sm font-medium text-gray-600'>Store Description</label>
            {isEditing ? (
              <textarea
                name='description'
                value={safeFormData.description}
                onChange={handleInputChange}
                rows='4'
                className='mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-black'
              />
            ) : (
              <p className='text-gray-700 mt-1 leading-relaxed'>
                {seller?.description || 'No description yet'}
              </p>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='text-sm font-medium text-gray-600'>Artisan Type</label>
              {isEditing ? (
                <select
                  name='artisanType'
                  value={safeFormData.artisanType}
                  onChange={handleInputChange}
                  className='mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-black'
                >
                  <option value=''>Select a craft type...</option>
                  {safeArtisanTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              ) : (
                <p className='text-lg text-gray-900 mt-1'>{seller?.artisanType || 'Not specified'}</p>
              )}
            </div>
          </div>

          <div>
            <label className='text-sm font-medium text-gray-600'>Artisan Bio</label>
            {isEditing ? (
              <textarea
                name='bio'
                value={safeFormData.bio}
                onChange={handleInputChange}
                rows='3'
                placeholder='Tell your unique story and journey as an artisan...'
                className='mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-black'
              />
            ) : (
              <p className='text-gray-700 mt-1 leading-relaxed'>
                {seller?.bio || 'No bio yet'}
              </p>
            )}
          </div>


        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}

export default SellerProfile
