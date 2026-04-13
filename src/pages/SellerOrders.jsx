import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
  const token = localStorage.getItem('sellerToken');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/api/orders/seller/my-orders`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setOrders(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load seller orders');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className='my-6 px-3 sm:px-4'>
      <h2 className='text-xl sm:text-2xl font-semibold mb-4'>Seller — Orders</h2>
      {loading && <p>Loading orders…</p>}
      {error && <p className='text-red-600'>{error}</p>}
      {!loading && orders.length === 0 && <p>No orders for your products yet.</p>}
      {orders.length > 0 && (
        <div className='space-y-4'>
          {orders.map(o => (
            <div key={o.id} className='p-4 border rounded'>
              <div className='flex justify-between'>
                <div>
                  <div className='font-semibold'>Order</div>
                  <div className='text-sm text-gray-600'>Buyer: {o.firstName} {o.lastName} ({o.email})</div>
                  <div className='text-sm text-gray-600'>Payment: {(o.paymentMethod || '-').toString().charAt(0).toUpperCase() + (o.paymentMethod || '-').toString().slice(1)}</div>
                  <div className='text-sm text-gray-600'>Mode: {Array.isArray(o.items) && o.items.length > 0 && o.items[0].deliveryMode ? (o.items[0].deliveryMode.charAt(0).toUpperCase() + o.items[0].deliveryMode.slice(1)) : (o.paymentMethod === 'pickup' ? 'Pick Up' : 'Delivery')}</div>
                </div>
                <div className='text-right'>
                  <div>₱{o.total}</div>
                  <div className='text-sm'>{o.orderStatus}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerOrders;
