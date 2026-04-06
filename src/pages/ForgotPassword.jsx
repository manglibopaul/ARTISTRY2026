import React, { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/users/forgot-password`, {
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
    <div className='min-h-[70vh] flex items-center justify-center py-12'>
      <div className='w-full max-w-md bg-white rounded-lg shadow-lg p-8'>
        <h2 className='text-center text-2xl font-semibold mb-6'>Forgot Password</h2>
        <form onSubmit={onSubmit} className='space-y-4'>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            type='email'
            placeholder='Email'
            className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
          />
          {status && <p className='text-sm text-gray-600'>{status}</p>}
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-black text-white py-3 rounded-md text-center font-medium hover:opacity-95'
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
