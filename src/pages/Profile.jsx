import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const REQUEST_TIMEOUT_MS = 12000;

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

  const fetchProfile = async () => {
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
        try { msg = JSON.parse(text).message || text; } catch {}
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
  };

  useEffect(() => {
    const customerToken = localStorage.getItem('token') || localStorage.getItem('userToken');
    
    // If customer token exists, this is a customer — proceed with profile
    if (customerToken) {
      fetchProfile();
      return;
    }

    // No token found, redirect to login
    navigate('/login');
    return;
  }, [navigate]);

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

  return (
    <div className='pt-8 sm:pt-16 px-2 sm:px-0 pb-8'>
      <div className='flex items-center gap-2 mb-4 max-w-md'>
        <button
          type='button'
          onClick={() => navigate('/profile')}
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
      <form onSubmit={onSave} className='space-y-3 max-w-md'>
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
    </div>
  );
};

export default Profile;
