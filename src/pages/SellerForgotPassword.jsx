import React, { useState } from 'react';

const SellerForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/sellers/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      setStatus(data.message || 'If that email exists, a reset link was sent.');
    } catch (err) {
      setStatus(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center px-4'>
      <div className='bg-white rounded-lg shadow-lg p-8 w-full max-w-md'>
        <h2 className='text-2xl font-bold mb-6 text-center'>Seller Forgot Password</h2>
        <form onSubmit={onSubmit} className='space-y-4'>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            type='email'
            placeholder='Email'
            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black'
          />
          {status && <p className='text-sm text-gray-600'>{status}</p>}
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50'
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellerForgotPassword;
