import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${apiUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Login failed')
      }

      const data = await res.json()
      if (!data.user?.isAdmin) {
        throw new Error('Admin access required')
      }

      if (data.token) localStorage.setItem('adminToken', data.token)
      if (data.user) localStorage.setItem('adminUser', JSON.stringify(data.user))

      navigate('/admin')
    } catch (err) {
      // Show a user-friendly message for invalid credentials
      if (err.message && err.message.toLowerCase().includes('invalid credentials')) {
        setError('Wrong email or password');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-[70vh] flex items-center justify-center py-12'>
      <div className='w-full max-w-md bg-white rounded-lg shadow-lg p-8'>
        <h2 className='text-center text-2xl font-semibold mb-6'>Admin Login</h2>

        <form onSubmit={submit} className='space-y-4'>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            type='email'
            placeholder='Admin Email'
            className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
          />

          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            type='password'
            placeholder='Password'
            className='w-full border rounded-md px-4 py-3 placeholder-gray-400'
          />

          {error && <p className='text-sm text-red-500'>{error}</p>}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-black text-white py-3 rounded-md text-center font-medium hover:opacity-95'
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
