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
        <div className="mb-4 text-lg font-bold">Artist Verification</div>
        <div className="mb-2"><span className="font-semibold">Full Name:</span> {seller.name}</div>
        <div className="mb-2"><span className="font-semibold">Store Name:</span> {seller.storeName}</div>
        <div className="mb-2"><span className="font-semibold">Phone Number:</span> {seller.phone || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Address:</span> {seller.address || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Pickup Locations:</span> {Array.isArray(seller.pickupLocations) ? seller.pickupLocations.join(', ') : '-'}</div>
        <div className="mb-2"><span className="font-semibold">Proof of Artist (photo of shop, etc.):</span></div>
        {proofUrl ? (
          <img src={proofUrl} alt="Proof of Artist" className="mb-4 max-h-48 rounded border" style={{ background: '#eee', objectFit: 'contain' }} />
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

function ViewOrderModal({ open, onClose, order }) {
  if (!open || !order) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[360px] max-w-[95vw] max-h-[90vh] overflow-auto">
        <div className="mb-4 text-lg font-bold">Order #{order.id}</div>
        <div className="mb-2"><span className="font-semibold">Customer:</span> {order.firstName} {order.lastName} ({order.email || '-'})</div>
        <div className="mb-2"><span className="font-semibold">Status:</span> {order.orderStatus}</div>
        <div className="mb-2"><span className="font-semibold">Mode:</span> {order.paymentMethod || '-'}</div>
        <div className="mb-2"><span className="font-semibold">Created:</span> {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>
        <div className="mb-4"><span className="font-semibold">Completed:</span> {order.completedAt ? new Date(order.completedAt).toLocaleString() : '-'}</div>
        <div className="mb-3 font-semibold">Items</div>
        <div className="space-y-3">
          {Array.isArray(order.items) && order.items.length > 0 ? order.items.map((it, idx) => (
            <div key={idx} className="border rounded p-3">
              <div className="font-medium">{it.name || it.title || 'Item'}</div>
              <div className="text-sm text-gray-600">Qty: {it.quantity || it.qty || 1} • Seller: {it.sellerStoreName || it.sellerName || '-'}</div>
              <div className="text-sm text-gray-500">Price: {typeof it.price !== 'undefined' ? (Number(it.price).toLocaleString()) : '-'}</div>
            </div>
          )) : (
            <div className="text-gray-500">No items listed.</div>
          )}
        </div>
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
          setSuccessMessage('Artist verified!');
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
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const CUSTOMER_PAGE_SIZE = 8;
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerPage, setSellerPage] = useState(1);
  const SELLER_PAGE_SIZE = 8;
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

  // Derived filtered & paginated customers
  const filteredCustomers = React.useMemo(() => {
    const q = (customerSearch || '').trim().toLowerCase();
    if (!q) return Array.isArray(customers) ? customers : [];
    return (customers || []).filter(c => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const totalCustomerPages = Math.max(1, Math.ceil((filteredCustomers || []).length / CUSTOMER_PAGE_SIZE));
  useEffect(() => { if (customerPage > totalCustomerPages) setCustomerPage(1) }, [totalCustomerPages]);
  const paginatedCustomers = React.useMemo(() => (filteredCustomers || []).slice((customerPage - 1) * CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE), [filteredCustomers, customerPage]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }

  // Sellers filtered & paginated
  const filteredSellers = React.useMemo(() => {
    const q = (sellerSearch || '').trim().toLowerCase();
    if (!q) return Array.isArray(sellers) ? sellers : [];
    return (sellers || []).filter(s => (s.name || '').toLowerCase().includes(q) || (s.storeName || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
  }, [sellers, sellerSearch]);

  const totalSellerPages = Math.max(1, Math.ceil((filteredSellers || []).length / SELLER_PAGE_SIZE));
  useEffect(() => { if (sellerPage > totalSellerPages) setSellerPage(1) }, [totalSellerPages]);
  const paginatedSellers = React.useMemo(() => (filteredSellers || []).slice((sellerPage - 1) * SELLER_PAGE_SIZE, sellerPage * SELLER_PAGE_SIZE), [filteredSellers, sellerPage]);

  const verifySellerById = async (id) => {
    try {
      const res = await authFetch(`/sellers/${id}/verify`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      setSellers(prev => (Array.isArray(prev) ? prev.map(s => s.id === id ? ({ ...s, isVerified: true }) : s) : prev));
      setSuccessMessage('Artist verified!');
      setSuccessModalOpen(true);
    } catch (err) {
      openErrorModal('Verification failed', err.message || 'error');
    }
  }

  // State for bin (soft-deleted sellers)
  const [binSellers, setBinSellers] = useState([]);
  const [binCustomers, setBinCustomers] = useState([]);
  const [loadingBin, setLoadingBin] = useState(false);
  const [binError, setBinError] = useState(null);
  const [binSellerPage, setBinSellerPage] = useState(1);
  const [binCustomerPage, setBinCustomerPage] = useState(1);
  const BIN_PAGE_SIZE = 8;
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

  // Derived filtered & paginated bin lists
  const filteredBinSellers = React.useMemo(() => (Array.isArray(binSellers) ? binSellers : []), [binSellers]);
  const totalBinSellerPages = Math.max(1, Math.ceil((filteredBinSellers || []).length / BIN_PAGE_SIZE));
  useEffect(() => { if (binSellerPage > totalBinSellerPages) setBinSellerPage(1); }, [totalBinSellerPages]);
  const paginatedBinSellers = React.useMemo(() => (filteredBinSellers || []).slice((binSellerPage - 1) * BIN_PAGE_SIZE, binSellerPage * BIN_PAGE_SIZE), [filteredBinSellers, binSellerPage]);

  const filteredBinCustomers = React.useMemo(() => (Array.isArray(binCustomers) ? binCustomers : []), [binCustomers]);
  const totalBinCustomerPages = Math.max(1, Math.ceil((filteredBinCustomers || []).length / BIN_PAGE_SIZE));
  useEffect(() => { if (binCustomerPage > totalBinCustomerPages) setBinCustomerPage(1); }, [totalBinCustomerPages]);
  const paginatedBinCustomers = React.useMemo(() => (filteredBinCustomers || []).slice((binCustomerPage - 1) * BIN_PAGE_SIZE, binCustomerPage * BIN_PAGE_SIZE), [filteredBinCustomers, binCustomerPage]);

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
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const ORDER_PAGE_SIZE = 8;
  useEffect(() => {
    if (selectedTab === 'orders') fetchOrders();
    // eslint-disable-next-line
  }, [selectedTab]);

  // Derived filtered & paginated orders
  const filteredOrders = React.useMemo(() => {
    const q = (orderSearch || '').trim().toLowerCase();
    return (orders || []).filter(o => {
      if (orderStatusFilter !== 'all' && String(o.orderStatus || '').toLowerCase() !== String(orderStatusFilter).toLowerCase()) return false;
      if (!q) return true;
      // match by id, buyer name, email, or product name
      if (String(o.id || '').toLowerCase().includes(q)) return true;
      if (((o.firstName || '') + ' ' + (o.lastName || '')).toLowerCase().includes(q)) return true;
      if ((o.email || '').toLowerCase().includes(q)) return true;
      if (Array.isArray(o.items) && o.items.some(it => (it.name || it.title || '').toLowerCase().includes(q))) return true;
      return false;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const totalOrderPages = Math.max(1, Math.ceil((filteredOrders || []).length / ORDER_PAGE_SIZE));
  useEffect(() => { if (orderPage > totalOrderPages) setOrderPage(1) }, [totalOrderPages]);
  const paginatedOrders = React.useMemo(() => (filteredOrders || []).slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE), [filteredOrders, orderPage]);

  const [viewOrder, setViewOrder] = useState(null);
  const [viewOrderModalOpen, setViewOrderModalOpen] = useState(false);

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
      <div className="mb-4">
        <div className='flex gap-2 overflow-x-auto pb-2 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <button className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded ${selectedTab === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('customers')}>Customers</button>
          <button className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded ${selectedTab === 'sellers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('sellers')}>Artists</button>
          <button className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded ${selectedTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('orders')}>Orders</button>
          <button className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded ${selectedTab === 'support' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('support')}>Support Chat</button>
          <button className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded ${selectedTab === 'bin' ? 'bg-red-600 text-white' : 'bg-gray-200'}`} onClick={() => setSelectedTab('bin')}>Bin</button>
        </div>
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
            <>
              <div className='mb-3'>
                <div className='max-w-md'>
                  <input value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setCustomerPage(1); }} placeholder='Search name, email, phone...' className='w-full px-3 py-2 border rounded text-sm' />
                </div>
              </div>

              {/* Mobile list */}
              <div className='block sm:hidden space-y-3'>
                {paginatedCustomers.map(u => (
                  <div key={u.id} className='border rounded p-3'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 font-semibold'>{getInitials(u.name)}</div>
                      <div className='flex-1 min-w-0'>
                        <div className='font-medium truncate'>{u.name}</div>
                        <div className='text-sm text-gray-600 truncate'>{u.email}</div>
                      </div>
                      <div className='text-sm text-gray-500'>{u.phone || '-'}</div>
                    </div>
                    <div className='mt-3 flex gap-2'>
                      <button onClick={() => { setViewCustomer(u); setViewModalOpen(true); }} className='px-3 py-1 rounded bg-blue-600 text-white text-sm'>View</button>
                      <button onClick={() => {
                        setConfirmMessage('Delete this customer? This cannot be undone.');
                        setConfirmAction(() => () => { deleteCustomer(u.id); setConfirmOpen(false); });
                        setConfirmOpen(true);
                      }} className='px-3 py-1 rounded bg-red-600 text-white text-sm'>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet table */}
              <div className='flex items-center justify-between gap-3 mb-3 hidden sm:flex'>
                <div className='text-sm text-gray-600'>Showing {Math.min(1 + (customerPage-1)*CUSTOMER_PAGE_SIZE, filteredCustomers.length)}–{Math.min(customerPage*CUSTOMER_PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}</div>
                <div className='flex items-center gap-2'>
                  <button disabled={customerPage<=1} onClick={() => setCustomerPage(p => Math.max(1, p-1))} className='px-3 py-1 border rounded disabled:opacity-50'>Prev</button>
                  <button disabled={customerPage*CUSTOMER_PAGE_SIZE >= filteredCustomers.length} onClick={() => setCustomerPage(p => p+1)} className='px-3 py-1 border rounded disabled:opacity-50'>Next</button>
                </div>
              </div>
              <div className='hidden sm:block overflow-x-auto'>
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
                    {paginatedCustomers.map(u => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 flex items-center gap-3">
                          <div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 font-semibold'>{getInitials(u.name)}</div>
                          <div>{u.name}</div>
                        </td>
                        <td className="p-3 truncate max-w-xs">{u.email}</td>
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
            </>
          )}
        </div>
      )}
      {/* Sellers Tab */}
      {selectedTab === 'sellers' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Artists</h2>
          {loadingSellers ? (
            <div>Loading artists...</div>
          ) : sellerError ? (
            <div className="text-red-600">{sellerError}</div>
          ) : (
            <>
              <div className='mb-3'>
                <div className='max-w-md'>
                  <input value={sellerSearch} onChange={(e) => { setSellerSearch(e.target.value); setSellerPage(1); }} placeholder='Search name, store, email...' className='w-full px-3 py-2 border rounded text-sm' />
                </div>
              </div>

              {/* Mobile list */}
              <div className='block sm:hidden space-y-3'>
                {paginatedSellers.map(s => (
                  <div key={s.id} className='border rounded p-3'>
                    <div className='flex justify-between items-start'>
                      <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 font-semibold'>{getInitials(s.name)}</div>
                        <div>
                          <div className='font-medium'>{s.name}</div>
                          <div className='text-sm text-gray-600'>{s.storeName}</div>
                          <div className='text-sm text-gray-500'>{s.email}</div>
                        </div>
                      </div>
                      <div>
                        {s.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">✓ Yes</span>
                        ) : (
                          <button onClick={() => verifySellerById(s.id)} className='inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium'>Verify</button>
                        )}
                      </div>
                    </div>
                      <div className='mt-3 flex gap-2'>
                      <button onClick={() => { setViewSeller(s); setViewSellerModalOpen(true); }} className='px-3 py-1 rounded bg-blue-600 text-white text-sm'>View</button>
                      <button onClick={() => {
                        setConfirmMessage('Delete this artist? This cannot be undone.');
                        setConfirmAction(() => () => { deleteSeller(s.id); setConfirmOpen(false); });
                        setConfirmOpen(true);
                      }} className='px-3 py-1 rounded bg-red-600 text-white text-sm'>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet table */}
              <div className='flex items-center justify-between gap-3 mb-3 hidden sm:flex'>
                <div className='text-sm text-gray-600'>Showing {Math.min(1 + (sellerPage-1)*SELLER_PAGE_SIZE, filteredSellers.length)}–{Math.min(sellerPage*SELLER_PAGE_SIZE, filteredSellers.length)} of {filteredSellers.length}</div>
                <div className='flex items-center gap-2'>
                  <button disabled={sellerPage<=1} onClick={() => setSellerPage(p => Math.max(1, p-1))} className='px-3 py-1 border rounded disabled:opacity-50'>Prev</button>
                  <button disabled={sellerPage*SELLER_PAGE_SIZE >= filteredSellers.length} onClick={() => setSellerPage(p => p+1)} className='px-3 py-1 border rounded disabled:opacity-50'>Next</button>
                </div>
              </div>
              <div className='hidden sm:block overflow-x-auto'>
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
                    {paginatedSellers.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 flex items-center gap-3">
                          <div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 font-semibold'>{getInitials(s.name)}</div>
                          <div>{s.name}</div>
                        </td>
                        <td className="p-3">{s.storeName}</td>
                        <td className="p-3 truncate max-w-xs">{s.email}</td>
                        <td className="p-3">
                          {s.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">✓ Yes</span>
                          ) : (
                            <button onClick={() => verifySellerById(s.id)} className='px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white text-sm'>Verify</button>
                          )}
                        </td>
                        <td className="p-3 flex gap-2">
                          <button onClick={() => { setViewSeller(s); setViewSellerModalOpen(true); }} className="px-3 py-1 rounded bg-blue-600 text-white">View</button>
                          <button onClick={() => {
                            setConfirmMessage('Delete this artist? This cannot be undone.');
                            setConfirmAction(() => () => { deleteSeller(s.id); setConfirmOpen(false); });
                            setConfirmOpen(true);
                          }} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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
            <>
              <div className='mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                <div className='max-w-md w-full'>
                  <input value={orderSearch} onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }} placeholder='Search id, buyer, email, product...' className='w-full px-3 py-2 border rounded text-sm' />
                </div>
                <div className='flex items-center gap-2'>
                  <select value={orderStatusFilter} onChange={(e) => { setOrderStatusFilter(e.target.value); setOrderPage(1); }} className='px-3 py-2 border rounded text-sm'>
                    <option value='all'>All status</option>
                    <option value='pending'>pending</option>
                    <option value='shipped'>shipped</option>
                    <option value='completed'>completed</option>
                    <option value='cancelled'>cancelled</option>
                  </select>
                  <div className='hidden sm:flex items-center gap-2'>
                    <button disabled={orderPage<=1} onClick={() => setOrderPage(p => Math.max(1, p-1))} className='px-3 py-1 border rounded disabled:opacity-50'>Prev</button>
                    <button disabled={orderPage*ORDER_PAGE_SIZE >= filteredOrders.length} onClick={() => setOrderPage(p => p+1)} className='px-3 py-1 border rounded disabled:opacity-50'>Next</button>
                  </div>
                </div>
              </div>

              {/* Mobile cards */}
              <div className='block sm:hidden space-y-3'>
                {paginatedOrders.map(o => {
                  let artisans = [];
                  let deliveryModes = [];
                  if (Array.isArray(o.items)) {
                    o.items.forEach(item => {
                      if (item.sellerStoreName && !artisans.includes(item.sellerStoreName)) artisans.push(item.sellerStoreName);
                      else if (item.sellerName && !artisans.includes(item.sellerName)) artisans.push(item.sellerName);
                      if (item.deliveryMode && !deliveryModes.includes(item.deliveryMode)) deliveryModes.push(item.deliveryMode);
                    });
                  }
                  if (artisans.length === 0) artisans = ['-'];
                  if (deliveryModes.length === 0) deliveryModes = [o.paymentMethod || '-'];
                  return (
                    <div key={o.id} className='border rounded p-3'>
                      <div className='flex justify-between items-start'>
                        <div>
                          <div className='font-medium'>Order #{o.id}</div>
                          <div className='text-sm text-gray-600'>{o.firstName} {o.lastName}</div>
                          <div className='text-sm text-gray-500'>Items: {Array.isArray(o.items) ? o.items.length : 0}</div>
                          <div className='text-sm text-gray-500'>Artist: {artisans.join(', ')}</div>
                        </div>
                        <div className='text-right'>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${o.orderStatus === 'completed' ? 'bg-green-100 text-green-800' : o.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{o.orderStatus}</div>
                        </div>
                      </div>
                      <div className='mt-2 text-xs text-gray-500'>Mode: {deliveryModes.map(mode => mode.charAt(0).toUpperCase() + mode.slice(1)).join(', ')}</div>
                      <div className='mt-2 text-xs text-gray-400'>{new Date(o.createdAt).toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop/tablet table */}
              <div className='hidden sm:block overflow-x-auto'>
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      <th className="text-left p-3 font-semibold sticky top-0 bg-white z-10">Order ID</th>
                      <th className="text-left p-3 font-semibold">Customer</th>
                      <th className="text-left p-3 font-semibold">Items</th>
                      <th className="text-left p-3 font-semibold">Artist</th>
                      <th className="text-left p-3 font-semibold">Mode of Delivery</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-left p-3 font-semibold">Created</th>
                      <th className="text-left p-3 font-semibold">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(o => {
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
                          <td className="p-3 font-medium"><button onClick={() => { setViewOrder(o); setViewOrderModalOpen(true); }} className='text-blue-600 hover:underline'>#{o.id}</button></td>
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
            </>
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
          <h2 className="text-xl font-semibold mb-4">Bin (Soft-Deleted Artists & Customers)</h2>
          {loadingBin ? (
            <div>Loading bin sellers...</div>
          ) : binError ? (
            <div className="text-gray-500">No soft-deleted sellers.</div>
          ) : (binSellers.length === 0 && binCustomers.length === 0) ? (
            <div className="text-gray-500">No soft-deleted records.</div>
          ) : (
            <div className="space-y-6">
              <div className='mb-3 flex items-center justify-between gap-3'>
                <div className='text-sm text-gray-600'>Showing <strong>{binSellers.length}</strong> deleted artists • <strong>{binCustomers.length}</strong> deleted customers</div>
              </div>
              {/* Deleted Sellers */}
              <div>
                <h3 className="font-semibold mb-2">Deleted Artists</h3>
                <div className='block sm:hidden space-y-3'>
                  {paginatedBinSellers.map(seller => (
                    <div key={seller.id} className='border rounded p-3'>
                      <div className='font-medium'>{seller.name}</div>
                      <div className='text-sm text-gray-600'>{seller.storeName}</div>
                      <div className='text-sm text-gray-500'>{seller.email}</div>
                      <div className='mt-3 flex gap-2'>
                        <button onClick={() => {
                          setConfirmMessage('Restore this artist?');
                          setConfirmButtonLabel('Restore');
                          setConfirmButtonColor('bg-green-600');
                          setConfirmAction(() => () => { restoreSeller(seller.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Restore</button>
                        <button onClick={() => {
                          setConfirmMessage('Permanently delete this artist? This cannot be undone.');
                          setConfirmButtonLabel('Delete');
                          setConfirmButtonColor('bg-red-600');
                          setConfirmAction(() => () => { permanentDeleteSeller(seller.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='hidden sm:block overflow-x-auto'>
                  <table className="min-w-full border">
                    <thead>
                      <tr>
                        <th className="text-left p-3 font-semibold">Artist</th>
                        <th className="text-left p-3 font-semibold">Store Name</th>
                        <th className="text-left p-3 font-semibold">Email</th>
                        <th className="text-left p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBinSellers.map(seller => (
                        <tr key={seller.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 flex items-center gap-3"><div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 font-semibold'>{getInitials(seller.name)}</div><div>{seller.name}</div></td>
                          <td className="p-3">{seller.storeName}</td>
                          <td className="p-3">{seller.email}</td>
                          <td className="p-3 flex gap-2">
                            <button onClick={() => {
                              setConfirmMessage('Restore this artist?');
                              setConfirmButtonLabel('Restore');
                              setConfirmButtonColor('bg-green-600');
                              setConfirmAction(() => () => { restoreSeller(seller.id); setConfirmOpen(false); });
                              setConfirmOpen(true);
                            }} className="px-3 py-1 rounded bg-green-600 text-white">Restore</button>
                            <button onClick={() => {
                              setConfirmMessage('Permanently delete this artist? This cannot be undone.');
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
                <div className='flex items-center justify-between gap-3 mt-2'>
                  <div className='text-sm text-gray-600'>Page {binSellerPage} of {totalBinSellerPages}</div>
                  <div className='flex gap-2'>
                    <button disabled={binSellerPage<=1} onClick={() => setBinSellerPage(p => Math.max(1, p-1))} className='px-3 py-1 border rounded disabled:opacity-50'>Prev</button>
                    <button disabled={binSellerPage>=totalBinSellerPages} onClick={() => setBinSellerPage(p => Math.min(totalBinSellerPages, p+1))} className='px-3 py-1 border rounded disabled:opacity-50'>Next</button>
                  </div>
                </div>
              </div>

              {/* Deleted Customers */}
              <div>
                <h3 className="font-semibold mb-2">Deleted Customers</h3>
                <div className='block sm:hidden space-y-3'>
                  {paginatedBinCustomers.map(customer => (
                    <div key={customer.id} className='border rounded p-3'>
                      <div className='font-medium'>{customer.name}</div>
                      <div className='text-sm text-gray-600'>{customer.email}</div>
                      <div className='text-sm text-gray-500'>{customer.phone || '-'}</div>
                      <div className='mt-3 flex gap-2'>
                        <button onClick={() => {
                          setConfirmMessage('Restore this customer?');
                          setConfirmButtonLabel('Restore');
                          setConfirmButtonColor('bg-green-600');
                          setConfirmAction(() => () => { restoreCustomer(customer.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Restore</button>
                        <button onClick={() => {
                          setConfirmMessage('Permanently delete this customer? This cannot be undone.');
                          setConfirmButtonLabel('Delete');
                          setConfirmButtonColor('bg-red-600');
                          setConfirmAction(() => () => { permanentDeleteCustomer(customer.id); setConfirmOpen(false); });
                          setConfirmOpen(true);
                        }} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='hidden sm:block overflow-x-auto'>
                  <table className="min-w-full border">
                    <thead>
                      <tr>
                        <th className="text-left p-3 font-semibold">Customer</th>
                        <th className="text-left p-3 font-semibold">Email</th>
                        <th className="text-left p-3 font-semibold">Phone</th>
                        <th className="text-left p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBinCustomers.map(customer => (
                        <tr key={customer.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 flex items-center gap-3"><div className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 font-semibold'>{getInitials(customer.name)}</div><div>{customer.name}</div></td>
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
                <div className='flex items-center justify-between gap-3 mt-2'>
                  <div className='text-sm text-gray-600'>Page {binCustomerPage} of {totalBinCustomerPages}</div>
                  <div className='flex gap-2'>
                    <button disabled={binCustomerPage<=1} onClick={() => setBinCustomerPage(p => Math.max(1, p-1))} className='px-3 py-1 border rounded disabled:opacity-50'>Prev</button>
                    <button disabled={binCustomerPage>=totalBinCustomerPages} onClick={() => setBinCustomerPage(p => Math.min(totalBinCustomerPages, p+1))} className='px-3 py-1 border rounded disabled:opacity-50'>Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ViewCustomerModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} customer={viewCustomer} />
      <ViewSellerModal open={viewSellerModalOpen} onClose={() => setViewSellerModalOpen(false)} seller={viewSeller} onVerifyClick={handleVerifyClick} uploadBaseUrl={normalizedApiBase} />
      <ConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmAction} message={confirmMessage} buttonLabel={confirmButtonLabel} buttonColor={confirmButtonColor} />
      <ConfirmModal open={verificationModalOpen} onClose={() => setVerificationModalOpen(false)} onConfirm={() => { handleVerifySeller(); setVerificationModalOpen(false); }} message={`Verify artist "${viewSeller?.storeName || 'N/A'}"? This will approve them for the platform.`} buttonLabel="Verify" buttonColor="bg-green-600" />
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
