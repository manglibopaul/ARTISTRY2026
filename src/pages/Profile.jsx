import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Title from '../components/Title'

const REQUEST_TIMEOUT_MS = 12000;

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

  const parseJsonSafe = async (res) => {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return res.json()
    }
    const txt = await res.text()
    throw new Error(txt || 'Server returned a non-JSON response')
  }

  const formatStatus = (status) => {
    if (!status) return 'pending'
    if (status === 'ready_for_pickup') return 'ready for pickup'
    return status
  }

  const resolveImage = (image) => {
    let imageUrl = '/path/to/placeholder.jpg'
    if (!image) return imageUrl
    const first = Array.isArray(image) && image.length > 0 ? image[0] : image
    if (typeof first === 'object' && first !== null && first.url) {
      imageUrl = first.url.startsWith('http') ? first.url : `${apiUrl}${first.url}`
    } else if (typeof first === 'string') {
      if (first.startsWith('http')) imageUrl = first
      else if (first.startsWith('/')) imageUrl = `${apiUrl}${first}`
      else imageUrl = `${apiUrl}/uploads/images/${first}`
    }
    return imageUrl
  }

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    let timeoutId;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');
      if (!token) throw new Error('Please sign in');
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(`${apiUrl}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          msg = JSON.parse(text).message || text;
        } catch {
          // Keep raw text when response is not valid JSON.
        }
        const normalizedMsg = String(msg || '').toLowerCase();
        if (
          res.status === 401 ||
          res.status === 403 ||
          res.status === 404 ||
          normalizedMsg.includes('invalid token') ||
          normalizedMsg.includes('user not found') ||
          normalizedMsg.includes('account is deleted')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('userToken');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('The server is taking too long to respond. It may be waking up, please try again.');
      } else {
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [apiUrl, navigate]);

  useEffect(() => {
    const customerToken = localStorage.getItem('token') || localStorage.getItem('userToken');

    if (customerToken) {
      fetchProfile();
      return;
    }

    navigate('/login');
    return;
  }, [navigate, fetchProfile]);

  useEffect(() => {
    const fetchOrders = async () => {
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('userToken');
        if (!token) {
          setOrdersError('Please sign in to view your orders.');
          setOrders([]);
          return;
        }

        const res = await fetch(`${apiUrl}/api/orders/my-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setOrders([]);
            setOrdersError('Please sign in to view your orders.');
          } else {
            const text = await res.text();
            setOrdersError(text || 'Failed to load orders');
          }
          return;
        }

        const data = await parseJsonSafe(res);
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setOrdersError(err.message || 'Failed to load orders');
      } finally {
        setOrdersLoading(false);
      }
    };

    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) return;
    fetchOrders();
  }, [apiUrl]);

  const onSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');
      const res = await fetch(`${apiUrl}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setProfile(updated);
      alert('Profile updated');
    } catch (err) {
      alert('Update failed: ' + (err.message || 'error'));
    }
  };

  if (loading) return <div className='pt-16'><p>Loading…</p></div>
  if (error) {
    return (
      <div className='pt-16 space-y-3'>
        <p className='text-red-500'>{error}</p>
        <button
          type='button'
          onClick={fetchProfile}
          className='px-4 py-2 bg-black text-white rounded text-sm'
        >
          Retry
        </button>
      </div>
    )
  }
  if (!profile) return <div className='pt-16'><p>Please sign in to view your profile.</p></div>

  const scrollToOrders = () => {
    const section = document.getElementById('my-orders')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className='pt-8 sm:pt-16 px-2 sm:px-0 pb-8 max-w-5xl mx-auto'>
      <form onSubmit={onSave} className='space-y-3 max-w-3xl mx-auto'>
        <div className='grid gap-3 sm:grid-cols-3'>
          <div>
            <label className='block text-sm mb-1'>Name</label>
            <input className='w-full border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
          </div>
          <div>
            <label className='block text-sm mb-1'>Email</label>
            <input className='w-full border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} />
          </div>
          <div>
            <label className='block text-sm mb-1'>Phone</label>
            <input className='w-full border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
          </div>
        </div>
        <div>
          <label className='block text-sm mb-1'>Street</label>
          <input className='w-full border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.street || ''} onChange={e => setProfile({...profile, street: e.target.value})} />
        </div>
        <div className='flex gap-2'>
          <input className='w-1/2 border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} placeholder='City' />
          <input className='w-1/2 border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.state || ''} onChange={e => setProfile({...profile, state: e.target.value})} placeholder='Province' />
        </div>
        <div className='flex gap-2'>
          <input className='w-1/2 border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.zipcode || ''} onChange={e => setProfile({...profile, zipcode: e.target.value})} placeholder='Zipcode' />
          <input className='w-1/2 border px-3 py-2.5 rounded text-sm sm:text-base' value={profile.country || ''} onChange={e => setProfile({...profile, country: e.target.value})} placeholder='Country' />
        </div>
        <div className='flex gap-3 pt-2'>
          <button className='px-5 py-2.5 bg-black text-white rounded text-sm sm:text-base'>Save</button>
          <button type='button' onClick={() => {
            // logout user
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('userToken')
            // clear any leftover seller/admin sessions so navbar falls back to Login
            localStorage.removeItem('sellerToken')
            localStorage.removeItem('seller')
            localStorage.removeItem('adminToken')
            navigate('/')
            window.location.reload()
          }} className='px-5 py-2.5 bg-red-600 text-white rounded text-sm sm:text-base'>Logout</button>
        </div>
      </form>

      <div id='my-orders' className='border-t pt-8 mt-8'>
        <div className='text-xl sm:text-2xl'>
          <Title text1={'MY'} text2={'ORDERS'} />
        </div>

        <div className='mt-6'>
          {ordersLoading && <p className='text-sm text-gray-500'>Loading orders…</p>}
          {ordersError && <p className='text-sm text-red-500'>{ordersError}</p>}

          {!ordersLoading && !ordersError && orders.length === 0 && (
            <p className='text-sm text-gray-500'>No orders yet.</p>
          )}

          {!ordersLoading && orders.map((order) => (
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

              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
                <div className='text-sm text-gray-500'>Payment: {order.paymentMethod || 'N/A'}</div>
                <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
                  <Link to={`/orders/${order.id}`} className='border px-4 py-2 text-sm font-medium rounded-sm hover:bg-gray-100 duration-200'>
                    View Order
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
