import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SellerResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    if (password !== confirm) {
      setStatus('Passwords do not match');
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setStatus('Missing reset token');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/sellers/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setStatus('Password updated. You can now login.');
      setTimeout(() => navigate('/seller/login'), 800);
    } catch (err) {
      setStatus(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center px-4'>
      <div className='bg-white rounded-lg shadow-lg p-8 w-full max-w-md'>
        <h2 className='text-2xl font-bold mb-6 text-center'>Reset Seller Password</h2>
        <form onSubmit={onSubmit} className='space-y-4'>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            type='password'
            placeholder='New password'
            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
          />
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            type='password'
            placeholder='Confirm new password'
            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
          />
          {status && <p className='text-sm text-gray-600'>{status}</p>}
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50'
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellerResetPassword;
