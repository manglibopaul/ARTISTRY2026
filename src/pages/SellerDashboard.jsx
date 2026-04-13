import React from 'react'
import { Link } from 'react-router-dom'

const SellerDashboard = () => {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">Seller Dashboard</h1>
        <p className="mb-6 text-gray-600">Welcome to your seller dashboard. Use the links below to navigate.</p>
        <ul className="space-y-3">
          <li>
            <Link to="/seller/orders" className="text-blue-600 hover:underline">View Orders</Link>
          </li>
          <li>
            <Link to="/seller/profile" className="text-blue-600 hover:underline">Edit Profile</Link>
          </li>
          <li>
            <Link to="/seller/login" className="text-blue-600 hover:underline">Seller Login</Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default SellerDashboard
