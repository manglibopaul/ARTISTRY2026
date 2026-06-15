import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const NewsletterBox = () => {
  const [showPopup, setShowPopup] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user')
    const hasSeenPopup = localStorage.getItem('hasSeenSignupPopup')
    
    // Show popup after 2 seconds if user is not logged in and hasn't seen it
    if (!user && !hasSeenPopup) {
      const timer = setTimeout(() => {
        setShowPopup(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setShowPopup(false)
    localStorage.setItem('hasSeenSignupPopup', 'true')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!firstName.trim()) {
      setError('Please enter your first name')
      return
    }
    
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    
    // Store the signup intent
    localStorage.setItem('signupEmail', email)
    localStorage.setItem('signupName', firstName)
    setIsSubmitted(true)
    
    // Redirect to login/register page after a brief moment
    setTimeout(() => {
      handleClose()
      navigate('/login')
    }, 1500)
  }

  const handlePrivacyClick = () => {
    window.open('/privacy-policy', '_blank')
  }

  const handleTermsClick = () => {
    window.open('/terms-of-service', '_blank')
  }

  if (!showPopup) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full relative animate-fadeIn">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!isSubmitted ? (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center mb-2">SIGN UP AND SAVE MORE</h2>
            <p className="text-center text-gray-600 mb-6">
              Get exclusive deals and updates on your first order.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 active:bg-gray-900 transition-all font-medium shadow-md hover:shadow-lg"
              >
                Go to Sign Up
              </button>

              <p className="text-xs text-center text-gray-500 leading-relaxed">
                By signing up, you agree to receive marketing emails. View our{' '}
                <button
                  type="button"
                  onClick={handlePrivacyClick}
                  className="underline text-gray-700 hover:text-gray-900 cursor-pointer transition-colors font-medium"
                >
                  privacy policy
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={handleTermsClick}
                  className="underline text-gray-700 hover:text-gray-900 cursor-pointer transition-colors font-medium"
                >
                  terms of service
                </button>
                {' '}for more info.
              </p>
            </form>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Welcome, {firstName}!</h3>
            <p className="text-gray-600">Redirecting you to create your account...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsletterBox
