import React, { useEffect, useState } from "react";
import { ShopContext } from "./ShopContext";
import axios from 'axios'
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ShopContextProvider = (props) => {

  const currency = "₱";
  const delivery_fee = 40;
  const [search,setSearch] = useState ('');
  const [showSearch,setShowSearch] = useState (false);
  const [cartsItems, setCartItems] = useState({});
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  // Use localhost fallback only in development; production must use configured API URL.
  const apiUrl = import.meta.env.VITE_API_URL
    || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:5000` : '')
  
  const parseCartKey = (key) => {
    if (typeof key !== 'string') return { id: key, color: null };
    if (key.includes('::')) {
      const [id, ...rest] = key.split('::');
      return { id, color: rest.join('::') || null };
    }
    const dashIndex = key.indexOf('-');
    if (dashIndex > 0 && /^\d+$/.test(key.slice(0, dashIndex))) {
      return { id: key.slice(0, dashIndex), color: key.slice(dashIndex + 1) || null };
    }
    return { id: key, color: null };
  };

  const findProductByCartKey = (key) => {
    const { id } = parseCartKey(key);
    return products.find((product) => (
      product._id ? String(product._id) === String(id) : String(product.id) === String(id)
    ));
  };

  // Sync cart to backend (debounced)
  const syncCartRef = React.useRef(null);
  const syncCartToServer = (items) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (syncCartRef.current) clearTimeout(syncCartRef.current);
    syncCartRef.current = setTimeout(async () => {
      try {
        await axios.post(`${apiUrl}/api/cart`, { items }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        // Silent fail — cart will still work locally
      }
    }, 500);
  };

  // Load cart from server on mount if logged in
  const loadCartFromServer = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${apiUrl}/api/cart`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.items && Object.keys(res.data.items).length > 0) {
        setCartItems(res.data.items);
      }
    } catch (err) {
      // Silent fail
    }
  };

  // Clear cart (after order placed)
  const clearCart = async () => {
    setCartItems({});
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.delete(`${apiUrl}/api/cart`, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) { /* silent */ }
    }
  };

  // Add item to cart with optional quantity (default 1) and color
  const addToCart = async (itemId, qty = 1, color = null) => {

    let cartData = structuredClone(cartsItems);
    
    // Create a unique key combining itemId and color
    const cartKey = color ? `${itemId}::${color}` : itemId;

    if (cartData[cartKey]) {
      cartData[cartKey] += Number(qty || 0);
    } else {
      cartData[cartKey] = Number(qty || 0) || 1;
    }
    setCartItems(cartData);
    syncCartToServer(cartData);
    const colorText = color ? ` (${color})` : '';
    toast.success(`Item added to cart${colorText}!`);

  }

  const getCartCount = () => {
    let totalCount = 0;
    for(const items in cartsItems){
      try {
        if (cartsItems[items] > 0 && findProductByCartKey(items)) {
          totalCount += cartsItems[items];
        }
      } catch (error) {
        
      }
    }
    return totalCount;
  }

  const updateQuantity = async (itemId,quantity) => {

    let cartData = structuredClone(cartsItems);

    cartData[itemId] = quantity;

    setCartItems(cartData);
    syncCartToServer(cartData);
  }

  const getCartAmount =  () => {
    let totalAmount = 0;
    for(const items in cartsItems){
      const itemInfo = findProductByCartKey(items);
      try {
        if (cartsItems[items] > 0 && itemInfo) {
          totalAmount += itemInfo.price * cartsItems[items]
        }
      } catch (error) {
        
      }
    }
    return totalAmount;
  }

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/products`);
      setProducts(res.data || []);
    } catch (error) {
      console.error('Error fetching products for context:', error);
      toast.error('Failed to load products');
    }
  }

  useEffect(() => {
    fetchProducts();
    loadCartFromServer();
  }, [])

  useEffect(() => {
    if (!products || products.length === 0) return;

    const cleanedCart = {};
    let cartChanged = false;

    Object.entries(cartsItems).forEach(([key, quantity]) => {
      if (!quantity || quantity <= 0) return;
      if (findProductByCartKey(key)) {
        cleanedCart[key] = quantity;
      } else {
        cartChanged = true;
      }
    });

    if (cartChanged) {
      setCartItems(cleanedCart);
      syncCartToServer(cleanedCart);
    }
  }, [products]);

  const value = {
    products,
    refreshProducts: fetchProducts,
    currency,
    delivery_fee,
    search,setSearch,showSearch,setShowSearch,
    cartsItems,addToCart,clearCart,
    getCartCount,updateQuantity,getCartAmount, navigate,
    parseCartKey
  };

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
