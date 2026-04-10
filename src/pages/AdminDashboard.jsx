import React, { useCallback, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSupportChat from '../components/AdminSupportChat';

const resolveSellerProofUrl = (rawValue, uploadBaseUrl) => {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  const normalized = value.replace(/\\/g, '/');
  const marker = '/uploads/';
  const markerIndex = normalized.lastIndexOf(marker);

  let relative = '';
  if (markerIndex >= 0) {
    relative = normalized.slice(markerIndex);
  } else if (normalized.startsWith('uploads/')) {
    relative = `/${normalized}`;
  } else if (normalized.startsWith('/')) {
    relative = normalized;
  } else {
    relative = `/uploads/images/${normalized}`;
  }

  return uploadBaseUrl ? `${uploadBaseUrl}${relative}` : relative;
};

// Modal to view and verify seller
function ViewSellerModal({ open, onClose, seller, onVerifyClick, uploadBaseUrl }) {
  if (!open || !seller) return null;
  const proofUrl = resolveSellerProofUrl(seller.proofOfArtisan, uploadBaseUrl);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[340px] max-w-[95vw]">
        <div className="mb-4 text-lg font-bold">Seller Verification</div>
        <div className="mb-2"><span className="font-semibold">Full Name:</span> {seller.name}</div>
        <div className="mb-2"><span className="font-semibold">Store Name:</span> {seller.storeName}</div>
        <div className="mb-2"><span className="font-semibold">Phone Number:</span> {seller.phone || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Address:</span> {seller.address || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Pickup Locations:</span> {Array.isArray(seller.pickupLocations) ? seller.pickupLocations.join(', ') : '-'}</div>
        <div className="mb-2"><span className="font-semibold">Proof of Artisan (photo of shop, etc.):</span></div>
        {proofUrl ? (
          <img src={proofUrl} alt="Proof of Artisan" className="mb-4 max-h-48 rounded border" style={{ background: '#eee', objectFit: 'contain' }} />
        ) : (
          <div className="mb-4 text-gray-500">No proof image provided.</div>
        )}
        <div className="mb-2"><span className="font-semibold">Email:</span> {seller.email}</div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          {seller.isVerified ? (
            <button disabled className="px-4 py-2 rounded bg-gray-400 text-white cursor-not-allowed flex items-center gap-2">
              ✓ Verified
            </button>
          ) : (
            <button onClick={onVerifyClick} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Verify</button>
          )}
        </div>
      </div>
    </div>
  );
}
// Success Modal
function SuccessModal({ open, onClose, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
        <div className="text-center">
          <div className="mb-4 text-5xl">✓</div>
          <div className="mb-4 text-lg font-semibold text-gray-800">{message}</div>
        </div>
        <div className="flex justify-center mt-4">
          <button onClick={onClose} className="px-6 py-2 rounded bg-blue-600 text-white">OK</button>
        </div>
      </div>
    </div>
  );
}

function ErrorModal({ open, onClose, title = 'Error', message = 'Something went wrong.' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-[92vw]">
        <div className="text-center">
          <div className="mb-4 text-5xl text-red-600">!</div>
          <div className="mb-2 text-lg font-semibold text-gray-800">{title}</div>
          <div className="mb-4 text-sm text-gray-700 whitespace-pre-line">{message}</div>
        </div>
        <div className="flex justify-center mt-4">
          <button onClick={onClose} className="px-6 py-2 rounded bg-red-600 text-white">OK</button>
        </div>
      </div>
    </div>
  );
}

// Simple Modal Components
function ConfirmModal({ open, onClose, onConfirm, message, buttonLabel = 'Delete', buttonColor = 'bg-red-600' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px]">
        <div className="mb-4 text-lg">{message}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded text-white ${buttonColor}`}>{buttonLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ViewCustomerModal({ open, onClose, customer }) {
  if (!open || !customer) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-[90vw]">
        <div className="mb-4 text-lg font-bold">Customer Information</div>
        <div className="mb-2"><span className="font-semibold">Name:</span> {customer.name}</div>
        <div className="mb-2"><span className="font-semibold">Email:</span> {customer.email}</div>
        <div className="mb-2"><span className="font-semibold">Phone:</span> {customer.phone || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Street:</span> {customer.street || '-'}</div>
        <div className="mb-2"><span className="font-semibold">City:</span> {customer.city || '-'}</div>
        <div className="mb-2"><span className="font-semibold">State:</span> {customer.state || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Zipcode:</span> {customer.zipcode || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Country:</span> {customer.country || '-'}</div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded border">Close</button>
        </div>
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
      // Verify seller
      const handleVerifySeller = async () => {
        if (!viewSeller) return;
        try {
          const res = await fetch(`${apiRoot}/sellers/${viewSeller.id}/verify`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
          });
          if (!res.ok) throw new Error(await res.text());
          // Optionally update UI
          setSellers(sellers => sellers.map(s => s.id === viewSeller.id ? { ...s, isVerified: true } : s));
          setViewSeller(prev => ({ ...prev, isVerified: true }));
          setVerificationModalOpen(false);
          setViewSellerModalOpen(false);
          setSuccessMessage('Seller verified!');
          setSuccessModalOpen(true);
        } catch (err) {
          setSuccessMessage('Verification failed: ' + (err.message || 'error'));
          setSuccessModalOpen(true);
        }
      };

      const handleVerifyClick = () => {
        setVerificationModalOpen(true);
      };
    // Modals and state for viewing/deleting sellers and customers
    const [viewCustomer, setViewCustomer] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewSeller, setViewSeller] = useState(null);
    const [viewSellerModalOpen, setViewSellerModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});
    const [confirmButtonLabel, setConfirmButtonLabel] = useState('Delete');
    const [confirmButtonColor, setConfirmButtonColor] = useState('bg-red-600');
    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorModalTitle, setErrorModalTitle] = useState('Error');
    const [errorModalMessage, setErrorModalMessage] = useState('');

    const openErrorModal = (title, message) => {
      setErrorModalTitle(title || 'Error');
      setErrorModalMessage(message || 'Something went wrong.');
      setErrorModalOpen(true);
    };

    // Delete customer
    const deleteCustomer = async (id) => {
      try {
        const res = await fetch(`${apiRoot}/users/${id}`, { method: 'DELETE', headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!res.ok) throw new Error(await res.text());
        setCustomers((c) => c.filter(u => u.id !== id));
      } catch (err) {
        openErrorModal('Delete Failed', err.message || 'error');
      }
    };

    // Delete seller
    const deleteSeller = async (id) => {
      try {
        const res = await fetch(`${apiRoot}/sellers/${id}`, { method: 'DELETE', headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!res.ok) throw new Error(await res.text());
        setSellers((s) => s.filter(x => x.id !== id));
      } catch (err) {
        openErrorModal('Delete Failed', err.message || 'error');
      }
    };
  const [selectedTab, setSelectedTab] = useState(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    const allowedTabs = ['customers', 'sellers', 'orders', 'support', 'bin'];
    return allowedTabs.includes(tab) ? tab : 'customers';
  });
  // State for customers and sellers
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellerError, setSellerError] = useState(null);
  const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
  const normalizedApiBase = rawApiUrl.replace(/\/+$/, '');
  const apiRoot = normalizedApiBase.endsWith('/api') ? normalizedApiBase : `${normalizedApiBase}/api`;
  const token = localStorage.getItem('adminToken');
  const userToken = localStorage.getItem('token') || localStorage.getItem('userToken');
  const sellerToken = localStorage.getItem('sellerToken');
  const adminUserRaw = localStorage.getItem('adminUser');
  let adminUser = null;
  try {
    adminUser = adminUserRaw ? JSON.parse(adminUserRaw) : null;
  } catch {
    adminUser = null;
  }

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  }, [navigate]);

  const authFetch = useCallback(async (url, options = {}) => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      handleAuthFailure();
      throw new Error('Admin login required');
    }

    const mergedOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${adminToken}`,
      },
    };

    const requestUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${apiRoot}${url.startsWith('/api') ? url.slice(4) : (url.startsWith('/') ? url : `/${url}`)}`;

    const res = await fetch(requestUrl, mergedOptions);
    if (res.status === 401 || res.status === 403) {
      handleAuthFailure();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }, [apiRoot, handleAuthFailure]);

  const readErrorMessage = async (res) => {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      return parsed?.message || 'Request failed';
    } catch {
      return text || 'Request failed';
    }
  };

  useEffect(() => {
    // Valid admin session always takes priority over stale customer/seller tokens.
    if (token && adminUser?.isAdmin) {
      return;
    }

    if (userToken || sellerToken) {
      navigate('/');
      return;
    }

    if (!token || !adminUser?.isAdmin) {
      navigate('/admin/login');
    }
  }, [token, userToken, sellerToken, adminUser, navigate]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    const allowedTabs = ['customers', 'sellers', 'orders', 'support', 'bin'];
    if (allowedTabs.includes(tab) && tab !== selectedTab) {
      setSelectedTab(tab);
    }
  }, [location.search, selectedTab]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    setCustomerError(null);
    try {
      const res = await authFetch('/users');
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      setCustomerError(err.message || 'Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  }, [authFetch]);

  // Fetch sellers
  const fetchSellers = useCallback(async () => {
    setLoadingSellers(true);
    setSellerError(null);
    try {
      const res = await authFetch('/sellers');
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const data = await res.json();
      setSellers(data);
    } catch (err) {
      setSellerError(err.message || 'Failed to load sellers');
    } finally {
      setLoadingSellers(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (selectedTab === 'customers') fetchCustomers();
    if (selectedTab === 'sellers') fetchSellers();
  }, [selectedTab, fetchCustomers, fetchSellers]);

  // State for bin (soft-deleted sellers)
  const [binSellers, setBinSellers] = useState([]);
  const [binCustomers, setBinCustomers] = useState([]);
  const [loadingBin, setLoadingBin] = useState(false);
  const [binError, setBinError] = useState(null);
  useEffect(() => {
    if (selectedTab === 'bin') fetchBinSellers();
    // eslint-disable-next-line
  }, [selectedTab]);

  // Fetch bin sellers
  const fetchBinSellers = async () => {
    setLoadingBin(true);
    setBinError(null);
    try {
      const [sellerRes, customerRes] = await Promise.all([
        authFetch('/sellers/bin'),
        authFetch('/users/bin'),
      ]);

      if (!sellerRes.ok) throw new Error(await readErrorMessage(sellerRes));
      if (!customerRes.ok) throw new Error(await readErrorMessage(customerRes));

      const sellerData = await sellerRes.json();
      const customerData = await customerRes.json();
      setBinSellers(Array.isArray(sellerData) ? sellerData : []);
      setBinCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (err) {
      setBinError(err.message || 'No soft-deleted records.');
    } finally {
      setLoadingBin(false);
    }
  };

  // Restore seller from bin
  const restoreSeller = async (id) => {
    try {
      const res = await authFetch(`/sellers/bin/${id}/restore`, { method: 'PUT' });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      setBinSellers((s) => s.filter(x => x.id !== id));
      fetchSellers(); // Refresh sellers list
    } catch (err) {
      openErrorModal('Restore Failed', err.message || 'error');
    }
  };

  // Permanently delete seller from bin
  const permanentDeleteSeller = async (id) => {
    try {
      const res = await authFetch(`/sellers/bin/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      setBinSellers((s) => s.filter(x => x.id !== id));
    } catch (err) {
      openErrorModal('Permanent Delete Failed', err.message || 'error');
    }
  };

  // Restore customer from bin
  const restoreCustomer = async (id) => {
    try {
      const res = await authFetch(`/users/bin/${id}/restore`, { method: 'PUT' });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      setBinCustomers((u) => u.filter(x => x.id !== id));
      fetchCustomers();
    } catch (err) {
      openErrorModal('Restore Failed', err.message || 'error');
    }
  };

  // Permanently delete customer from bin
  const permanentDeleteCustomer = async (id) => {
    try {
      const res = await authFetch(`/users/bin/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      setBinCustomers((u) => u.filter(x => x.id !== id));
    } catch (err) {
      openErrorModal('Permanent Delete Failed', err.message || 'error');
    }
  };

  // State for orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState(null);
  useEffect(() => {
    if (selectedTab === 'orders') fetchOrders();
    // eslint-disable-next-line
  }, [selectedTab]);

  // Fetch orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    setOrderError(null);
    try {
      const res = await authFetch('/orders');
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrderError(err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  // Restore full dashboard UI
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="mb-4 flex gap-2">
        <button className={`px-4 py-2 rounded ${selectedTab === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('customers')}>Customers</button>
        <button className={`px-4 py-2 rounded ${selectedTab === 'sellers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('sellers')}>Sellers</button>
        <button className={`px-4 py-2 rounded ${selectedTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('orders')}>Orders</button>
        <button className={`px-4 py-2 rounded ${selectedTab === 'support' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('support')}>Support Chat</button>
        <button className={`px-4 py-2 rounded ${selectedTab === 'bin' ? 'bg-red-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('bin')}>Bin</button>
      </div>
      {/* Customers Tab */}
      {selectedTab === 'customers' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Customers</h2>
          {loadingCustomers ? (
            <div>Loading customers...</div>
          ) : customerError ? (
            <div className="text-red-600">{customerError === 'Invalid token' ? 'Session expired. Please log in again.' : customerError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr>
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Email</th>
                    <th className="text-left p-3 font-semibold">Phone</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(u => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.phone || '-'}</td>
                      <td className="p-3 flex gap-2">
                        <button onClick={() => { setViewCustomer(u); setViewModalOpen(true); }} className="px-3 py-1 rounded bg-blue-600 text-white">View</button>
                        <button onClick={() => {
                          setConfirmMessage('Delete this customer? This cannot be undone.');
                          setConfirmAction(() => () => { deleteCustomer(u.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Sellers Tab */}
      {selectedTab === 'sellers' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Sellers</h2>
          {loadingSellers ? (
            <div>Loading sellers...</div>
          ) : sellerError ? (
            <div className="text-red-600">{sellerError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr>
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Store Name</th>
                    <th className="text-left p-3 font-semibold">Email</th>
                    <th className="text-left p-3 font-semibold">Verified</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{s.name}</td>
                      <td className="p-3">{s.storeName}</td>
                      <td className="p-3">{s.email}</td>
                      <td className="p-3">
                        {s.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                            ✓ Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                            ✗ No
                          </span>
                        )}
                      </td>
                      <td className="p-3 flex gap-2">
                        <button onClick={() => { setViewSeller(s); setViewSellerModalOpen(true); }} className="px-3 py-1 rounded bg-blue-600 text-white">View</button>
                        <button onClick={() => {
                          setConfirmMessage('Delete this seller? This cannot be undone.');
                          setConfirmAction(() => () => { deleteSeller(s.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Orders Tab */}
      {selectedTab === 'orders' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Orders</h2>
          {loadingOrders ? (
            <div>Loading orders...</div>
          ) : orderError ? (
            <div className="text-red-600">{orderError}</div>
          ) : orders.length === 0 ? (
            <div className="text-gray-500">No orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr>
                    <th className="text-left p-3 font-semibold">Order ID</th>
                    <th className="text-left p-3 font-semibold">Customer</th>
                    <th className="text-left p-3 font-semibold">Items</th>
                    <th className="text-left p-3 font-semibold">Artisan</th>
                    <th className="text-left p-3 font-semibold">Mode of Delivery</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Created</th>
                    <th className="text-left p-3 font-semibold">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    let artisans = [];
                    let deliveryModes = [];
                    if (Array.isArray(o.items)) {
                      o.items.forEach(item => {
                        if (item.sellerStoreName && !artisans.includes(item.sellerStoreName)) {
                          artisans.push(item.sellerStoreName);
                        } else if (item.sellerName && !artisans.includes(item.sellerName)) {
                          artisans.push(item.sellerName);
                        }
                        if (item.deliveryMode && !deliveryModes.includes(item.deliveryMode)) {
                          deliveryModes.push(item.deliveryMode);
                        }
                      });
                    }
                    if (artisans.length === 0) artisans = ['-'];
                    if (deliveryModes.length === 0) deliveryModes = [o.paymentMethod || '-'];
                    return (
                      <tr key={o.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">#{o.id}</td>
                        <td className="p-3">{o.firstName} {o.lastName}</td>
                        <td className="p-3">{Array.isArray(o.items) ? o.items.length : 0}</td>
                        <td className="p-3">{artisans.join(', ')}</td>
                        <td className="p-3">{deliveryModes.map(mode => mode.charAt(0).toUpperCase() + mode.slice(1)).join(', ')}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${o.orderStatus === 'completed' ? 'bg-green-100 text-green-800' : o.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="p-3">{new Date(o.createdAt).toLocaleString()}</td>
                        <td className="p-3">{o.completedAt ? new Date(o.completedAt).toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Support Chat Tab */}
      {selectedTab === 'support' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Admin Support Inbox</h2>
          <AdminSupportChat />
        </div>
      )}
      {/* Bin Tab */}
      {selectedTab === 'bin' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Bin (Soft-Deleted Sellers & Customers)</h2>
          {loadingBin ? (
            <div>Loading bin sellers...</div>
          ) : binError ? (
            <div className="text-gray-500">No soft-deleted sellers.</div>
          ) : (binSellers.length === 0 && binCustomers.length === 0) ? (
            <div className="text-gray-500">No soft-deleted records.</div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <h3 className="font-semibold mb-2">Deleted Sellers</h3>
              <table className="min-w-full border">
                <thead>
                  <tr>
                    <th className="text-left p-3 font-semibold">Seller Name</th>
                    <th className="text-left p-3 font-semibold">Store Name</th>
                    <th className="text-left p-3 font-semibold">Email</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {binSellers.map(seller => (
                    <tr key={seller.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{seller.name}</td>
                      <td className="p-3">{seller.storeName}</td>
                      <td className="p-3">{seller.email}</td>
                      <td className="p-3 flex gap-2">
                        <button onClick={() => {
                          setConfirmMessage('Restore this seller?');
                          setConfirmButtonLabel('Restore');
                          setConfirmButtonColor('bg-green-600');
                          setConfirmAction(() => () => { restoreSeller(seller.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-green-600 text-white">Restore</button>
                        <button onClick={() => {
                          setConfirmMessage('Permanently delete this seller? This cannot be undone.');
                          setConfirmButtonLabel('Delete');
                          setConfirmButtonColor('bg-red-600');
                          setConfirmAction(() => () => { permanentDeleteSeller(seller.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <div className="overflow-x-auto">
                <h3 className="font-semibold mb-2">Deleted Customers</h3>
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="text-left p-3 font-semibold">Customer Name</th>
                      <th className="text-left p-3 font-semibold">Email</th>
                      <th className="text-left p-3 font-semibold">Phone</th>
                      <th className="text-left p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {binCustomers.map(customer => (
                      <tr key={customer.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{customer.name}</td>
                        <td className="p-3">{customer.email}</td>
                        <td className="p-3">{customer.phone || '-'}</td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => {
                            setConfirmMessage('Restore this customer?');
                            setConfirmButtonLabel('Restore');
                            setConfirmButtonColor('bg-green-600');
                            setConfirmAction(() => () => { restoreCustomer(customer.id); setConfirmOpen(false); });
                            setConfirmOpen(true);
                          }} className="px-3 py-1 rounded bg-green-600 text-white">Restore</button>
                          <button onClick={() => {
                            setConfirmMessage('Permanently delete this customer? This cannot be undone.');
                            setConfirmButtonLabel('Delete');
                            setConfirmButtonColor('bg-red-600');
                            setConfirmAction(() => () => { permanentDeleteCustomer(customer.id); setConfirmOpen(false); });
                            setConfirmOpen(true);
                          }} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <ViewCustomerModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} customer={viewCustomer} />
      <ViewSellerModal open={viewSellerModalOpen} onClose={() => setViewSellerModalOpen(false)} seller={viewSeller} onVerifyClick={handleVerifyClick} uploadBaseUrl={normalizedApiBase} />
      <ConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmAction} message={confirmMessage} buttonLabel={confirmButtonLabel} buttonColor={confirmButtonColor} />
      <ConfirmModal open={verificationModalOpen} onClose={() => setVerificationModalOpen(false)} onConfirm={() => { handleVerifySeller(); setVerificationModalOpen(false); }} message={`Verify seller "${viewSeller?.storeName || 'N/A'}"? This will approve them for the platform.`} buttonLabel="Verify" buttonColor="bg-green-600" />
      <SuccessModal open={successModalOpen} onClose={() => setSuccessModalOpen(false)} message={successMessage} />
      <ErrorModal
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title={errorModalTitle}
        message={errorModalMessage}
      />
    </div>
  );
}

export default AdminDashboard;
