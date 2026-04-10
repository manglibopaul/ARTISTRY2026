import React, { useEffect, useState } from 'react'
import Title from '../components/Title';
import { Link, useNavigate } from 'react-router-dom';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState({ open: false, orderId: null });
  const [infoModal, setInfoModal] = useState({ open: false, title: '', message: '' });
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

  const formatStatus = (status) => {
    if (!status) return 'pending';
    if (status === 'ready_for_pickup') return 'ready for pickup';
    return status;
  };

  const parseJsonSafe = async (res) => {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return res.json()
    }
    const txt = await res.text()
    throw new Error(txt || 'Server returned a non-JSON response')
  }

  const cancelOrder = async (orderId) => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) return navigate('/login');
    try {
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        setInfoModal({ open: true, title: 'Cancel Failed', message: txt || 'Failed to cancel order' });
        return;
      }
      setOrders((prev) => prev.map((o) => (Number(o.id) === Number(orderId) ? { ...o, orderStatus: 'cancelled' } : o)));
      setInfoModal({ open: true, title: 'Order Cancelled', message: 'Your order has been cancelled.' });
    } catch (err) {
      setInfoModal({ open: true, title: 'Cancel Failed', message: err.message || 'Failed to cancel order' });
    }
  }

  const handleCustomerProfileClick = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    navigate(token ? '/profile' : '/login');
  }

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('userToken');
        if (!token) {
          setError('Please sign in to view your orders.');
          setLoading(false);
          return;
        }

        const res = await fetch(`${apiUrl}/api/orders/my-orders`, { headers: { Authorization: `Bearer ${token}` } });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setOrders([]);
            setError('Please sign in to view your orders.');
          } else {
            const text = await res.text();
            setError(text || 'Failed to load orders');
          }
          setLoading(false);
          return;
        }

        const data = await parseJsonSafe(res);

        // Augment items with product images when missing
        const augmented = await Promise.all((data || []).map(async (order) => {
          try {
            const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
            for (let i = 0; i < items.length; i++) {
              const it = items[i];
              const hasImage = it.image && ((Array.isArray(it.image) && it.image.length) || typeof it.image === 'string');
                if (!hasImage) {
                const prodId = it.productId || it.id || it._id;
                if (prodId) {
                  try {
                    const pRes = await fetch(`${apiUrl}/api/products/${prodId}`);
                    if (pRes.ok) {
                      const prod = await pRes.json();
                      if (prod && prod.image) items[i] = { ...it, image: prod.image };
                    }
                  } catch {
                    // ignore per-item fetch errors
                  }
                }
              }
            }
            return { ...order, items };
          } catch {
            return order;
          }
        }));

        setOrders(augmented || []);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) {
      // redirect to login if not authenticated
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [apiUrl, navigate]);

  const resolveImage = (image) => {
    let imageUrl = '/path/to/placeholder.jpg';
    if (!image) return imageUrl;
    // image may be array or string or array of objects
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

  return (
    <div className='border-t pt-8 sm:pt-16 px-2 sm:px-0'>
      <div className='flex items-center gap-2 mb-4 max-w-md'>
        <button
          type='button'
          onClick={handleCustomerProfileClick}
          className='px-4 py-2 bg-black text-white rounded text-sm sm:text-base'
        >
          My Profile
        </button>
        <button
          type='button'
          onClick={() => navigate('/orders')}
          className='px-4 py-2 bg-gray-700 text-white rounded text-sm sm:text-base'
        >
          View My Orders
        </button>
      </div>

      <div className='text-xl sm:text-2xl'>
        <Title text1={'MY'} text2={'ORDERS'} />
      </div>

      <div className='mt-6'>
        {loading && <p className='text-sm text-gray-500'>Loading orders…</p>}
        {error && <p className='text-sm text-red-500'>{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <p className='text-sm text-gray-500'>No orders yet.</p>
        )}

        {!loading && orders.map((order) => (
          <div key={order.id} className='py-4 border-t border-b text-gray-700 flex flex-col gap-3 sm:gap-4'>
            <div className='flex flex-col sm:flex-row justify-between items-start gap-1'>
              <div>
                <p className='text-sm text-gray-500'>Order</p>
                <p className='text-xs sm:text-sm text-gray-500'>Date: {new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className='sm:text-right'>
                <p className='font-medium text-sm sm:text-base'>{formatStatus(order.orderStatus)}</p>
                <p className='text-sm text-gray-500'>Total: ₱{order.total}</p>
              </div>
            </div>

            <div className='grid gap-3 md:grid-cols-2'>
              {Array.isArray(order.items) && order.items.map((item, idx) => (
                <div key={idx} className='flex items-start gap-4 text-sm'>
                  <img
                    className='w-16 sm:w-20'
                    src={resolveImage(item.image)}
                    alt={item.name || ''}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'>No image</text></svg>` }}
                  />
                  <div>
                    <p className='font-medium'>{item.name || item.title || 'Product'}</p>
                    <p className='text-gray-600'>Price: ₱{item.price}</p>
                    <p className='text-gray-600'>Quantity: {item.quantity || item.qty || 1}</p>
                    {item.size && <p className='text-gray-600'>Size: {item.size}</p>}
                    {item.color && <p className='text-gray-600'>Color: {item.color}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Working Days Info for Pickup Orders */}
            {order.paymentMethod === 'pickup' && order.workingDays && (
              <div className='p-3 bg-blue-50 border border-blue-200 rounded'>
                <div className='text-sm font-medium text-blue-800'>
                  📦 Pickup Order - Product Preparation
                </div>
                <div className='text-sm text-blue-700 mt-1'>
                  Working Days: {order.workingDays} business days
                </div>
                {order.estimatedReadyDate && (
                  <div className='text-sm text-blue-700'>
                    Estimated Ready Date: {new Date(order.estimatedReadyDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                )}
                {order.pickupLocation && (
                  <div className='text-sm text-blue-700 mt-1'>
                    Pickup Location: {order.pickupLocation}
                  </div>
                )}
              </div>
            )}

            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
              <div className='text-sm text-gray-500'>Payment: {order.paymentMethod || 'N/A'}</div>
              <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
                {order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' && (
                  <button
                    onClick={() => setCancelConfirm({ open: true, orderId: order.id })}
                    className='bg-red-500 text-white px-3 py-1 rounded text-sm'
                  >
                    Cancel
                  </button>
                )}
                <Link to={`/orders/${order.id}`} className='border px-4 py-2 text-sm font-medium rounded-sm hover:bg-gray-100 duration-200'>
                  View Order
                </Link>
                {order.orderStatus === 'completed' && (
                  <button
                    onClick={() => {
                      try {
                        const firstItem = Array.isArray(order.items) && order.items.length ? order.items[0] : null;
                        const pid = firstItem ? (firstItem.productId || firstItem.id || firstItem._id) : null;
                        const hash = pid ? `#review-form-${pid}` : '';
                        navigate(`/orders/${order.id}?focusReview=1${hash}`);
                      } catch {
                        // fallback to location assign
                        const firstItem = Array.isArray(order.items) && order.items.length ? order.items[0] : null;
                        const pid = firstItem ? (firstItem.productId || firstItem.id || firstItem._id) : null;
                        const hash = pid ? `#review-form-${pid}` : '';
                        navigate(`/orders/${order.id}?focusReview=1${hash}`);
                      }
                    }}
                    className='border px-4 py-2 text-sm font-medium rounded-sm hover:bg-gray-100 duration-200'
                  >
                    Write Review
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {cancelConfirm.open && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-md p-5'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>Cancel Order</h3>
            <p className='text-sm text-gray-700 mb-5'>Are you sure you want to cancel this order?</p>
            <div className='flex justify-end gap-2'>
              <button
                onClick={() => setCancelConfirm({ open: false, orderId: null })}
                className='px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200'
              >
                No
              </button>
              <button
                onClick={async () => {
                  const orderId = cancelConfirm.orderId
                  setCancelConfirm({ open: false, orderId: null })
                  await cancelOrder(orderId)
                }}
                className='px-4 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700'
              >
                Yes, Cancel
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
                onClick={() => setInfoModal({ open: false, title: '', message: '' })}
                className='px-4 py-2 rounded bg-black text-white text-sm hover:bg-gray-800'
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
