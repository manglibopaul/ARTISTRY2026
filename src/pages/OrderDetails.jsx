import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Title from '../components/Title'
import MapPin from '../components/MapPin'
import { geocodeAddress } from '../utils/geocoding'




const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewForms, setReviewForms] = useState({});
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm' });
  const [infoModal, setInfoModal] = useState({ open: false, title: '', message: '' });
  const [deliveryMapLat, setDeliveryMapLat] = useState(null);
  const [deliveryMapLon, setDeliveryMapLon] = useState(null);
  const [pickupMapLat, setPickupMapLat] = useState(null);
  const [pickupMapLon, setPickupMapLon] = useState(null);
  const [pickupPhotos, setPickupPhotos] = useState([]);
  const [photoModal, setPhotoModal] = useState({ open: false, photoUrl: '', title: '' });
  // Edit review state (merged from duplicate)
  const [editingReview, setEditingReview] = useState(null); // {productId, reviewId, fields}
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Helper to open edit form for a review
  const startEditReview = (productId, review) => {
    setEditingReview({
      productId,
      reviewId: review.id,
      rating: review.rating,
      comment: review.comment,
      message: review.message || '',
      images: Array.isArray(review.images) ? review.images : [],
      imageFiles: [], // new uploads
    });
  };

  const cancelEditReview = () => setEditingReview(null);

  // Handle edit form field changes
  const handleEditReviewChange = (field, value) => {
    setEditingReview(prev => ({ ...prev, [field]: value }));
  };

  // Submit PATCH to backend
  const submitEditReview = async () => {
    if (!editingReview) return;
    const { productId, reviewId, rating, comment, message, imageFiles } = editingReview;
    if (!comment || !rating) {
      openInfoModal('Incomplete Review', 'Please provide a rating and comment');
      return;
    }
    setEditSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');
      if (!token) return navigate('/login');
      const formData = new FormData();
      formData.append('rating', String(rating));
      formData.append('comment', comment);
      if (message) formData.append('message', message);
      imageFiles.forEach(f => formData.append('images', f));
      // PATCH endpoint: /api/reviews/:id
      const res = await fetch(`${apiUrl}/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const txt = await res.text();
        openInfoModal('Edit Failed', txt || 'Failed to edit review');
        setEditSubmitting(false);
        return;
      }
      const updatedReview = await parseJsonSafe(res);
      const updated = updatedReview.review || updatedReview;
      // Update local order state
      setOrder(prev => {
        const items = Array.isArray(prev.items) ? prev.items.map(it => {
          const pid = it.productId || it.id || it._id;
          if (Number(pid) === Number(productId)) {
            const revs = Array.isArray(it.reviews)
              ? it.reviews.map(r => Number(r.id) === Number(reviewId) ? updated : r)
              : it.reviews;
            return { ...it, reviews: revs };
          }
          return it;
        }) : prev.items;
        return { ...prev, items };
      });
      openInfoModal('Review Updated', 'Your review was updated successfully.');
      setEditingReview(null);
    } catch (err) {
      openInfoModal('Edit Failed', err.message || 'Failed to edit review');
    } finally {
      setEditSubmitting(false);
    }
  };

  const parseJsonSafe = async (res) => {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return res.json()
    }
    const txt = await res.text()
    throw new Error(txt || 'Server returned a non-JSON response')
  }

  const isMissingMessageColumnResponse = (text) => {
    if (!text) return false;
    const t = String(text).toLowerCase();
    return t.includes('column "message" does not exist') || (t.includes('unknown column') && t.includes('message')) || t.includes('no such column: message') || t.includes('column not found: message');
  }

  const openInfoModal = (title, message) => {
    setInfoModal({ open: true, title, message });
  };

  const closeInfoModal = () => {
    setInfoModal({ open: false, title: '', message: '' });
  };

  const openConfirmModal = (title, message, onConfirm, confirmText = 'Confirm') => {
    setConfirmModal({ open: true, title, message, onConfirm, confirmText });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm' });
  };

  const cancelOrder = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) return navigate('/login');
    openConfirmModal('Cancel Order', 'Are you sure you want to cancel this order?', async () => {
      try {
        const res = await fetch(`${apiUrl}/api/orders/${id}/cancel`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const txt = await res.text();
          openInfoModal('Cancel Failed', txt || 'Failed to cancel order');
          return;
        }
        const data = await parseJsonSafe(res);
        setOrder(data);
        navigate('/orders');
      } catch (err) {
        openInfoModal('Cancel Failed', err.message || 'Failed to cancel order');
      }
    }, 'Yes, Cancel');
  }

  const markAsReceived = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) return navigate('/login');
    openConfirmModal('Mark as Received', 'Confirm you have received this order?', async () => {
      try {
        const res = await fetch(`${apiUrl}/api/orders/${id}/received`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const txt = await res.text();
          openInfoModal('Action Failed', txt || 'Failed to mark as received');
          return;
        }
        const data = await parseJsonSafe(res);
        setOrder(data);
        navigate('/orders');
      } catch (err) {
        openInfoModal('Action Failed', err.message || 'Failed to mark as received');
      }
    }, 'Yes, Confirm');
  }

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('userToken');
        const res = await fetch(`${apiUrl}/api/orders/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError('Please sign in to view this order.');
          } else if (res.status === 404) {
            setError('Order not found.');
          } else {
            const txt = await res.text();
            setError(txt || 'Failed to load order');
          }
          setLoading(false);
          return;
        }

        const data = await parseJsonSafe(res);
        // If items lack images, try to fetch product info for each
        try {
          const items = Array.isArray(data.items) ? data.items : JSON.parse(data.items || '[]');
          const apiBase = apiUrl;
          // If token present, attempt to fetch current user profile to check review eligibility
          const token = localStorage.getItem('token') || localStorage.getItem('userToken');
          let userId = null;
          if (token) {
            try {
                const up = await fetch(`${apiBase}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
              if (up.ok) {
                  const userData = await parseJsonSafe(up);
                setCurrentUser(userData);
                userId = userData.id;
              }
            } catch {
              // ignore profile fetch errors — we'll still show the review form when a token exists and order is completed
            }
          }

          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const hasImage = it.image && ((Array.isArray(it.image) && it.image.length) || typeof it.image === 'string');
            const prodId = it.productId || it.id || it._id;
            if (!hasImage && prodId) {
              try {
                const pRes = await fetch(`${apiBase}/api/products/${prodId}`);
                if (pRes.ok) {
                  const prod = await parseJsonSafe(pRes);
                  if (prod && prod.image) items[i] = { ...it, image: prod.image };
                }
              } catch {
                // ignore per-item fetch errors
              }
            }

            // fetch reviews for this product and determine if user can review
            if (prodId) {
              let rdata = null;
              try {
                const rRes = await fetch(`${apiBase}/api/reviews/product/${prodId}`);
                if (rRes.ok) {
                  rdata = await parseJsonSafe(rRes);
                  const list = rdata.reviews || rdata;
                  items[i] = { ...items[i], reviews: list };
                  const hasUserReview = userId
                    ? list.some(r => Number(r.userId) === Number(userId) && Number(r.orderId) === Number(data.id))
                    : false;
                  items[i].canReview = Boolean(token) && (data.orderStatus === 'completed') && (!userId ? true : !hasUserReview);
                }
              } catch {
                // ignore review fetch errors
              }

              // If review fetch failed (network or 500), still allow the UI to show the form
              // when the user is authenticated and the order is completed. Server still enforces eligibility.
              if (!Object.prototype.hasOwnProperty.call(items[i], 'canReview')) {
                items[i].canReview = Boolean(token) && (data.orderStatus === 'completed');
              }

                if (items[i].canReview) {
                const key = prodId;
                setReviewForms(prev => ({ ...prev, [key]: prev[key] || { rating: 5, title: '', comment: '', message: '', submitting: false } }));
              }
            }
          }

          data.items = items;
        } catch {
          // ignore
        }

        setOrder(data);
      } catch (err) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [apiUrl, id]);

  // Geocode delivery address when order loads
  useEffect(() => {
    if (!order) {
      setDeliveryMapLat(null);
      setDeliveryMapLon(null);
      setPickupMapLat(null);
      setPickupMapLon(null);
      return;
    }

    const geocodeAddresses = async () => {
      // Geocode delivery address
      if (order.street && order.city && order.state) {
        try {
          const coords = await geocodeAddress(order.street, order.city, order.state);
          if (coords) {
            setDeliveryMapLat(coords.lat);
            setDeliveryMapLon(coords.lon);
          }
        } catch (error) {
          console.error('Geocoding delivery address failed:', error);
        }
      }

      // Geocode pickup location if order has one
      if (order.pickupLocation && (order.paymentMethod === 'pickup' || order.method === 'pickup')) {
        try {
          // Pickup location format is usually just the address string
          // Try to geocode it - Nominatim is flexible with location format
          const coords = await geocodeAddress(order.pickupLocation, 'Philippines', 'Philippines');
          if (coords) {
            setPickupMapLat(coords.lat);
            setPickupMapLon(coords.lon);
          }
        } catch (error) {
          console.error('Geocoding pickup location failed:', error);
        }
      }
    };

    geocodeAddresses();
  }, [order]);

  // If the URL includes ?focusReview=1 (or any value), scroll to the first review form when available
  const location = useLocation();
  useEffect(() => {
    if (!order) return;
    const params = new URLSearchParams(location.search);
    if (!params.get('focusReview') && !location.hash) return;

    // If hash provided, try to scroll there first
    try {
      if (location.hash) {
        const targetId = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        return;
      }

      // otherwise, find first item with canReview true and scroll its form into view
      const items = Array.isArray(order.items) ? order.items : [];
      let targetId = null;
      for (let it of items) {
        const pid = it.productId || it.id || it._id;
        if (it.canReview && pid) { targetId = `review-form-${pid}`; break; }
      }
      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    } catch {
      // ignore
    }
  }, [order, location.search, location.hash, reviewForms]);

  const handleReviewChange = (productId, field, value) => {
    setReviewForms(prev => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
  };

  const submitReview = async (productId) => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) return navigate('/login');
    const form = reviewForms[productId];
    if (!form) return;
    if (!form.comment || !form.rating) {
      openInfoModal('Incomplete Review', 'Please provide a rating and comment');
      return;
    }
    try {
      setReviewForms(prev => ({ ...prev, [productId]: { ...prev[productId], submitting: true } }));
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('orderId', String(order.id));
      formData.append('rating', String(form.rating));
      if (form.title) formData.append('title', form.title);
      formData.append('comment', form.comment);
      if (form.message) formData.append('message', form.message);
      if (form.imageFile) formData.append('image', form.imageFile);

      const res = await fetch(`${apiUrl}/api/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const txt = await res.text();
        // If DB on the server doesn't have the `message` column yet, retry without the message field.
        if (isMissingMessageColumnResponse(txt) && form.message) {
          // resend without message
          const retryData = new FormData();
          retryData.append('productId', productId);
          retryData.append('orderId', String(order.id));
          retryData.append('rating', String(form.rating));
          if (form.title) retryData.append('title', form.title);
          retryData.append('comment', form.comment);
          if (form.imageFile) retryData.append('image', form.imageFile);
          const retryRes = await fetch(`${apiUrl}/api/reviews`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: retryData,
          });
          if (!retryRes.ok) {
            const rt = await retryRes.text();
            openInfoModal('Review Failed', rt || txt || 'Failed to submit review');
            setReviewForms(prev => ({ ...prev, [productId]: { ...prev[productId], submitting: false } }));
            return;
          }
          // success on retry
          const newReview = await parseJsonSafe(retryRes);
          const created = newReview.review || newReview;
          setOrder(prev => {
            const items = Array.isArray(prev.items) ? prev.items.map(it => {
              const pid = it.productId || it.id || it._id;
              if (Number(pid) === Number(productId)) {
                const revs = Array.isArray(it.reviews) ? [created, ...it.reviews] : [created];
                return { ...it, reviews: revs, canReview: false };
              }
              return it;
            }) : prev.items;
            return { ...prev, items };
          });
          openInfoModal('Review Submitted', 'Your review was submitted successfully. (without message)');
          return;
        }
        openInfoModal('Review Failed', txt || 'Failed to submit review');
        setReviewForms(prev => ({ ...prev, [productId]: { ...prev[productId], submitting: false } }));
        return;
      }
      const newReview = await parseJsonSafe(res);
      const created = newReview.review || newReview;
      // Update local order state to include the new review and prevent additional reviews
      setOrder(prev => {
        const items = Array.isArray(prev.items) ? prev.items.map(it => {
          const pid = it.productId || it.id || it._id;
          if (Number(pid) === Number(productId)) {
            const revs = Array.isArray(it.reviews) ? [created, ...it.reviews] : [created];
            return { ...it, reviews: revs, canReview: false };
          }
          return it;
        }) : prev.items;
        return { ...prev, items };
      });
      openInfoModal('Review Submitted', 'Your review was submitted successfully.');
    } catch (err) {
      openInfoModal('Review Failed', err.message || 'Failed to submit review');
    } finally {
      setReviewForms(prev => ({ ...prev, [productId]: { ...prev[productId], submitting: false } }));
    }
  };

  const resolveImage = (image) => {
    let imageUrl = '/path/to/placeholder.jpg';
    if (!image) return imageUrl;
    const first = Array.isArray(image) && image.length > 0 ? image[0] : image;
    if (typeof first === 'object' && first !== null && first.url) {
      imageUrl = first.url.startsWith('http') ? first.url : `${apiUrl}${first.url}`;
    } else if (typeof first === 'string') {
      if (first.startsWith('http')) imageUrl = first;
      else if (first.startsWith('/')) imageUrl = `${apiUrl}${first}`;
      else imageUrl = `${apiUrl}/uploads/images/${first}`;
    }
    return imageUrl;
  }

  const resolveUploadImage = (url) => {
    if (!url) return '';
    if (String(url).startsWith('http')) return url;
    return `${apiUrl}${url}`;
  }

  const openPhotoModal = (url, title) => setPhotoModal({ open: true, photoUrl: url, title: title || 'Photo preview' });
  const closePhotoModal = () => setPhotoModal({ open: false, photoUrl: '', title: '' });

  const renderStars = (rating = 0) => {
    const safe = Math.max(1, Math.min(5, Number(rating) || 0));
    return (
      <span className='text-amber-500'>
        {'★'.repeat(safe)}{'☆'.repeat(5 - safe)}
      </span>
    );
  }

  const isPickupOrder = order?.paymentMethod === 'pickup' || order?.method === 'pickup'

  // Fetch pickup-location photos from sellers referenced in this order
  useEffect(() => {
    const fetchPickupPhotos = async () => {
      if (!order || !(order.paymentMethod === 'pickup' || order.method === 'pickup')) {
        setPickupPhotos([]);
        return;
      }

      try {
        const sellerIds = Array.from(new Set((Array.isArray(order.items) ? order.items : []).map(it => Number(it.sellerId)).filter(Boolean)));
        const photos = [];
        await Promise.all(sellerIds.map(async (sid) => {
          try {
            const res = await fetch(`${apiUrl}/api/sellers/${sid}`);
            if (!res.ok) return;
            const seller = await res.json();
            let raw = seller?.pickupLocationPhotos || seller?.pickupLocationPhotos || null;
            let mapping = null;
            if (!raw) return;
            if (typeof raw === 'string') {
              try { mapping = JSON.parse(raw); } catch { mapping = null; }
            } else if (typeof raw === 'object') {
              mapping = raw;
            }
            if (!mapping) return;
            const key = order.pickupLocation;
            const arr = Array.isArray(mapping[key]) ? mapping[key] : (Array.isArray(mapping[String(key)]) ? mapping[String(key)] : []);
            if (arr && arr.length) {
              arr.forEach(u => photos.push(resolveUploadImage(u)));
            }
          } catch (err) {
            // ignore per-seller errors
          }
        }));
        setPickupPhotos(photos);
      } catch (err) {
        setPickupPhotos([]);
      }
    };

    fetchPickupPhotos();
  }, [order, apiUrl]);
  const statusLabel = order?.orderStatus === 'ready_for_pickup' ? 'ready for pickup' : (order?.orderStatus || 'pending')

  if (loading) return <div className='pt-16'><p className='text-sm text-gray-500'>Loading order…</p></div>
  if (error) return <div className='pt-16'><p className='text-sm text-red-500'>{error}</p></div>
  if (!order) return <div className='pt-16'><p className='text-sm text-gray-500'>No order selected.</p></div>

  return (
    <div className='border-t pt-8 sm:pt-16 px-2 sm:px-0'>
      {/* debug panel removed */}
      <div className='text-xl sm:text-2xl mb-4'>
        <Title text1={'ORDER'} text2={`#${order.id}`} />
      </div>
      <div className='space-y-4'>
        <div className='flex justify-between'>
          <div>
            <p className='text-sm text-gray-500'>Date</p>
            <p>{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className='text-right'>
            <p className='text-sm text-gray-500'>Status</p>
            <p className='font-medium'>{statusLabel}</p>
          </div>
        </div>
        <div className='border p-3 sm:p-4 rounded'>
          <h3 className='font-medium mb-2'>{isPickupOrder ? 'Pickup Details' : 'Shipping Address'}</h3>
          {isPickupOrder ? (
            <div>
              <p className='font-medium text-green-700'>📦 Pickup Order</p>
              <p className='text-sm mt-2'>Pickup Location: {order.pickupLocation || 'N/A'}</p>
              {pickupPhotos && pickupPhotos.length > 0 && (
                <div className='mt-3 flex gap-2 flex-wrap'>
                  {pickupPhotos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Pickup photo ${i+1}`}
                      className='w-24 h-24 object-cover rounded border cursor-pointer'
                      onClick={() => openPhotoModal(url, `Pickup photo ${i+1}`)}
                    />
                  ))}
                </div>
              )}
              {order.reservationDateTime && (
                <p className='text-sm'>Reservation: {new Date(order.reservationDateTime).toLocaleString()}</p>
              )}
              {order.reservationNote && (
                <p className='text-sm text-gray-600'>Note: {order.reservationNote}</p>
              )}
              {order.estimatedReadyDate ? (
                <div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded'>
                  <p className='text-sm font-medium text-blue-800'>Ready for Pickup</p>
                  <p className='text-sm text-blue-700'>
                    Ready Date: {new Date(order.estimatedReadyDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              ) : (
                <div className='mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded'>
                  <p className='text-sm text-yellow-800'>
                    ⏳ The seller will set your pickup ready date after confirming the order.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p>{order.firstName} {order.lastName}</p>
              <p>{order.street}</p>
              <p>{order.city}, {order.state} {order.zipcode}</p>
              <p>{order.country}</p>
              <p className='text-sm text-gray-500'>Email: {order.email}</p>
              <p className='text-sm text-gray-500'>Phone: {order.phone}</p>
              {/* Delivery Location Map */}
              {deliveryMapLat && deliveryMapLon && (
                <div className='mt-4'>
                  <MapPin
                    lat={deliveryMapLat}
                    lon={deliveryMapLon}
                    label="Your Delivery Location"
                    address={`${order.street}, ${order.city}, ${order.state} ${order.zipcode}`}
                    isPickup={false}
                  />
                </div>
              )}
            </div>
          )}
          {isPickupOrder && pickupMapLat && pickupMapLon && (
            <div className='mt-4'>
              <MapPin
                lat={pickupMapLat}
                lon={pickupMapLon}
                label="Seller Pickup Location"
                address={order.pickupLocation || 'Pickup Location'}
                isPickup={true}
              />
            </div>
          )}
        </div>
        {/* Product Items List */}
        <div className='mt-6 space-y-6'>
          {Array.isArray(order.items) && order.items.map((item, idx) => (
            <div key={idx} className='flex gap-4 border-b pb-6'>
              <img
                className='w-16 h-16 object-cover rounded border'
                src={resolveImage(item.image)}
                alt={item.name || ''}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'>No image</text></svg>` }}
              />
              <div className='flex-1'>
                <p className='font-medium'>{item.name || item.title || 'Product'}</p>
                <p className='text-sm text-gray-600'>Price: ₱{item.price} • Qty: {item.quantity || item.qty || 1}</p>
                {item.color && <p className='text-sm text-gray-600'>Color: {item.color}</p>}
                {isPickupOrder && item.pickupLocation && (
                  <p className='text-sm text-gray-600'>Pickup Location: {item.pickupLocation}</p>
                )}
                {/* Review Form or Info */}
                {item.canReview ? (
                  <div id={`review-form-${item.productId || item.id || item._id}`} className='mt-2 border rounded p-3 bg-white'>
                    <p className='text-sm font-medium mb-2'>Leave a review</p>
                    <div className='mb-2'>
                      <label className='text-sm block mb-1'>Rating</label>
                      <div className='flex gap-1'>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const current = reviewForms[item.productId || item.id || item._id]?.rating || 5;
                          return (
                            <button
                              key={star}
                              type='button'
                              onClick={() => handleReviewChange(item.productId || item.id || item._id, 'rating', star)}
                              className={`text-lg ${star <= current ? 'text-amber-500' : 'text-gray-300'}`}
                              aria-label={`Set rating ${star}`}
                            >
                              ★
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        className='w-full border px-2 py-1 mb-2 text-sm rounded'
                        value={reviewForms[item.productId || item.id || item._id]?.comment || ''}
                        onChange={e => handleReviewChange(item.productId || item.id || item._id, 'comment', e.target.value)}
                        rows={3}
                        placeholder='Write your review...'
                      />
                      <input
                        type='text'
                        className='w-full border px-2 py-1 mb-2 text-sm rounded'
                        value={reviewForms[item.productId || item.id || item._id]?.message || ''}
                        onChange={e => handleReviewChange(item.productId || item.id || item._id, 'message', e.target.value)}
                        placeholder='Optional short message for the seller (e.g. delivery notes)'
                      />
                      <input
                        type='file'
                        accept='image/*'
                        onChange={e => handleReviewChange(item.productId || item.id || item._id, 'imageFile', e.target.files?.[0] || null)}
                        className='w-full border px-2 py-1 mb-2 text-sm'
                      />
                      {reviewForms[item.productId || item.id || item._id]?.imageFile && (
                        <p className='text-xs text-gray-600 mb-2'>Photo: {reviewForms[item.productId || item.id || item._id]?.imageFile?.name}</p>
                      )}
                      <div className='text-right'>
                        <button onClick={() => submitReview(item.productId || item.id || item._id)} className='bg-black text-white px-3 py-1 text-sm rounded'>Submit Review</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='mt-2 text-sm text-gray-500'>
                    {(() => {
                      const pid = item.productId || item.id || item._id;
                      if (!pid) return 'Review unavailable: product information is missing for this item.';
                      if (!currentUser) return (<span>Please <a href="/login" className='text-blue-600 underline'>sign in</a> to leave a review.</span>);
                      if (order.orderStatus !== 'completed') return 'You can leave a review after you have received (completed) this order.';
                      const hasReviewed = Array.isArray(item.reviews) && item.reviews.some(r => Number(r.userId) === Number(currentUser?.id));
                      if (hasReviewed) return 'You have already reviewed this product.';
                      return null;
                    })()}
                  </div>
                )}
                {/* Existing reviews for this product */}
                {Array.isArray(item.reviews) && item.reviews.length > 0 && (
                  <div className='mt-3 space-y-3'>
                    <h4 className='text-sm font-medium'>Reviews</h4>
                    {item.reviews.map((r, idx2) => {
                      const isOwn = currentUser && Number(r.userId) === Number(currentUser.id);
                      const isEditing = editingReview && editingReview.reviewId === r.id;
                      return (
                        <div key={idx2} className='p-3 border rounded bg-gray-50'>
                          <div className='flex items-center justify-between'>
                            <div className='text-sm font-medium'>{r.userName || 'Customer'}</div>
                            <div className='text-sm'>{renderStars(r.rating)}</div>
                          </div>
                          {isEditing ? (
                            <div className='mt-2'>
                              <label className='text-sm block mb-1'>Rating</label>
                              <div className='flex gap-1 mb-2'>
                                {[1,2,3,4,5].map(star => (
                                  <button
                                    key={star}
                                    type='button'
                                    onClick={() => handleEditReviewChange('rating', star)}
                                    className={`text-lg ${star <= (editingReview.rating || 5) ? 'text-amber-500' : 'text-gray-300'}`}
                                    aria-label={`Set rating ${star}`}
                                  >★</button>
                                ))}
                              </div>
                              <textarea
                                className='w-full border px-2 py-1 mb-2 text-sm rounded'
                                value={editingReview.comment}
                                onChange={e => handleEditReviewChange('comment', e.target.value)}
                                rows={2}
                                placeholder='Update your review...'
                              />
                              <input
                                type='text'
                                className='w-full border px-2 py-1 mb-2 text-sm rounded'
                                value={editingReview.message || ''}
                                onChange={e => handleEditReviewChange('message', e.target.value)}
                                placeholder='Optional short message for the seller'
                              />
                              <label className='text-sm block mb-1'>Add Images</label>
                              <input
                                type='file'
                                accept='image/*'
                                multiple
                                onChange={e => handleEditReviewChange('imageFiles', Array.from(e.target.files || []))}
                                className='w-full border px-2 py-1 mb-2 text-sm'
                              />
                              {/* Preview new uploads */}
                              {Array.isArray(editingReview.imageFiles) && editingReview.imageFiles.length > 0 && (
                                <div className='flex flex-wrap gap-2 mb-2'>
                                  {editingReview.imageFiles.map((file, idx3) => (
                                    <div key={idx3} className='flex flex-col items-center'>
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${file.name}`}
                                        className='w-16 h-16 object-cover rounded border mb-1'
                                      />
                                      <span className='text-xs text-gray-600'>{file.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Show existing images */}
                              {Array.isArray(editingReview.images) && editingReview.images.length > 0 && (
                                <div className='flex flex-wrap gap-2 mb-2'>
                                  {editingReview.images.map((img, idx4) => (
                                    <img
                                      key={idx4}
                                      src={resolveUploadImage(img)}
                                      alt={`Review image ${idx4+1}`}
                                      className='w-16 h-16 object-cover rounded border'
                                    />
                                  ))}
                                </div>
                              )}
                              <div className='flex gap-2 justify-end'>
                                <button onClick={cancelEditReview} className='border px-3 py-1 text-sm rounded'>Cancel</button>
                                <button onClick={submitEditReview} className='bg-black text-white px-3 py-1 text-sm rounded' disabled={editSubmitting}>{editSubmitting ? 'Saving...' : 'Save'}</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className='text-sm text-gray-700 mt-1'>{r.comment}</div>
                              {r.message && (
                                <div className='text-xs text-gray-500 mt-1 italic'>Note: {r.message}</div>
                              )}
                              {/* Support multiple images */}
                              {Array.isArray(r.images) && r.images.length > 0 && (
                                <div className='flex flex-wrap gap-2 mt-2'>
                                  {r.images.map((img, imgIdx) => (
                                    <img
                                      key={imgIdx}
                                      src={resolveUploadImage(img)}
                                      alt={`Review attachment ${imgIdx + 1}`}
                                      className='rounded border border-gray-200 max-h-32 w-auto'
                                    />
                                  ))}
                                </div>
                              )}
                              {/* Legacy single image support */}
                              {r.imageUrl && !r.images && (
                                <img
                                  src={resolveUploadImage(r.imageUrl)}
                                  alt='Review attachment'
                                  className='mt-2 rounded border border-gray-200 max-h-56 w-auto'
                                />
                              )}
                              <div className='mt-2 text-xs text-gray-400'>{new Date(r.createdAt).toLocaleString()}</div>
                              {isOwn && (
                                <div className='mt-2 text-right'>
                                  <button onClick={() => startEditReview(item.productId || item.id || item._id, r)} className='text-xs px-2 py-1 border rounded'>Edit</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className='flex flex-wrap justify-end gap-4 sm:gap-6'>
          <div className='text-right'>
            <p className='text-xs sm:text-sm text-gray-500'>Subtotal</p>
            <p className='text-sm sm:text-base'>₱{order.subtotal}</p>
          </div>
          {!isPickupOrder && (
            <div className='text-right'>
              <p className='text-xs sm:text-sm text-gray-500'>Shipping</p>
              <p className='text-sm sm:text-base'>₱{order.shippingFee}</p>
            </div>
          )}
          <div className='text-right'>
            <p className='text-xs sm:text-sm text-gray-500'>Total</p>
            <p className='font-medium text-sm sm:text-base'>₱{order.total}</p>
          </div>
        </div>

        <div className='flex flex-wrap gap-2 sm:gap-3'>
          <button onClick={() => navigate(-1)} className='border px-4 py-2.5 text-sm rounded'>Back</button>
          {order && order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' && (
            <button onClick={cancelOrder} className='bg-red-500 text-white px-4 py-2.5 rounded text-sm'>Cancel Order</button>
          )}
          {order && order.orderStatus === 'shipped' && (
            <button onClick={markAsReceived} className='bg-green-600 text-white px-4 py-2.5 rounded text-sm'>Mark as Received</button>
          )}
        </div>
      </div>

      {confirmModal.open && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-md p-5'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>{confirmModal.title}</h3>
            <p className='text-sm text-gray-700 whitespace-pre-line mb-5'>{confirmModal.message}</p>
            <div className='flex justify-end gap-2'>
              <button
                onClick={closeConfirmModal}
                className='px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200'
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmModal.onConfirm
                  closeConfirmModal()
                  if (typeof action === 'function') await action()
                }}
                className='px-4 py-2 rounded bg-black text-white text-sm hover:bg-gray-800'
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {infoModal.open && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-md p-5'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>{infoModal.title}</h3>
            <p className='text-sm text-gray-700 whitespace-pre-line mb-5'>{infoModal.message}</p>
            <div className='flex justify-end'>
              <button
                onClick={closeInfoModal}
                className='px-4 py-2 rounded bg-black text-white text-sm hover:bg-gray-800'
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {photoModal.open && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-4xl p-4'>
            <div className='flex justify-between items-start'>
              <h3 className='text-lg font-semibold text-gray-900'>{photoModal.title}</h3>
              <button onClick={closePhotoModal} className='text-gray-500 ml-3'>Close</button>
            </div>
            <div className='mt-3 flex justify-center'>
              <img src={photoModal.photoUrl} alt={photoModal.title} className='max-w-full max-h-[80vh] object-contain' />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetails;
