import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';
import Notification from '../models/Notification.js';
import { useCoupon } from './couponController.js';
const normalizePickupLocations = (seller) => {
  const raw = seller?.pickupLocations
  let locations = []

  if (Array.isArray(raw)) {
    locations = raw
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) locations = parsed
      else if (typeof parsed === 'string') locations = [parsed]
    } catch {
      locations = raw.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
    }
  }

  locations = locations.map((loc) => String(loc || '').trim()).filter(Boolean)
  return [...new Set(locations)]
}

import { sendEmail } from '../utils/email.js';
import safeFindOrderByPk from '../utils/orderUtils.js';

const PLACEHOLDER_PATTERN = /\b(test|asdf|qwe|zxc|n\/?a|na|none|unknown|sample|dummy|fake|12345|1111)\b/i;

const isLikelyPlaceholderText = (value) => {
  const text = String(value || '').trim();
  if (!text) return true;
  if (PLACEHOLDER_PATTERN.test(text)) return true;

  const compact = text.replace(/\s+/g, '');
  if (compact.length < 3) return true;
  if (/^(.)\1+$/.test(compact)) return true;

  return false;
};

const hasMinLetters = (value, min = 3) => {
  const matches = String(value || '').match(/[A-Za-z]/g);
  return (matches?.length || 0) >= min;
};

const validateDeliveryAddress = (address = {}) => {
  const errors = [];

  const fullName = String(address.firstName || '').trim();
  const phone = String(address.phone || '').trim();
  const location = String(address.regionProvinceCityBarangay || address.city || '').trim();
  const street = String(address.street || '').trim();
  const zipcode = String(address.zipcode || '').trim();

  if (!fullName || fullName.length < 3 || !hasMinLetters(fullName, 3) || isLikelyPlaceholderText(fullName)) {
    errors.push('Enter your real full name (first and last name).');
  }

  const normalizedPhone = phone.replace(/[\s()-]/g, '');
  if (!/^(?:\+63|63|0)?9\d{9}$/.test(normalizedPhone)) {
    errors.push('Enter a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX).');
  }

  const locationParts = location.split(/[/,]/).map((x) => x.trim()).filter(Boolean);
  if (!location || location.length < 5 || !hasMinLetters(location, 4) || locationParts.length < 1 || isLikelyPlaceholderText(location)) {
    errors.push('Enter a valid Region/Province/City/Barangay address.');
  }

  if (!street || street.length < 5 || !/[A-Za-z]/.test(street) || isLikelyPlaceholderText(street)) {
    errors.push('Enter a complete street address with house/building number.');
  }

  if (!/^\d{4}$/.test(zipcode)) {
    errors.push('Enter a valid 4-digit postal code.');
  }

  return errors;
};

const createNotificationSafe = async (payload) => {
  try {
    await Notification.create(payload);
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

const normalizePaymentSettings = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    acceptsCOD: source.acceptsCOD !== undefined ? Boolean(source.acceptsCOD) : true,
    acceptsGCash: source.acceptsGCash !== undefined ? Boolean(source.acceptsGCash) : true,
  };
};

// Create order
export const createOrder = async (req, res) => {
  try {
    // Accept JSON strings when requests are sent as multipart/form-data (e.g., with file uploads)
    let items = req.body.items;
    let address = req.body.address;
    let paymentMethod = req.body.paymentMethod;
    let subtotal = req.body.subtotal;
    let commission = req.body.commission;
    const couponCode = req.body.couponCode || null;
    const discount = Number(req.body.discount) || 0;
    const isPickup = (String(paymentMethod || '') === 'pickup');

    // If `items` was sent as a JSON string (multipart/form-data), parse it.
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
    }

    // Try parsing address if it was JSON-stringified
    if (typeof address === 'string') {
      try { address = JSON.parse(address); } catch (e) { /* keep as string fallback */ }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cannot place order with empty cart' });
    }

    if (!isPickup) {
      if (!['cod', 'gcash'].includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method for delivery.' });
      }

      const addressErrors = validateDeliveryAddress(address);
      if (addressErrors.length) {
        return res.status(400).json({
          message: `Delivery address validation failed: ${addressErrors.join(' ')}`,
        });
      }
    }

    // Ensure each item includes sellerId; if missing, look up from Product table
    let normalizedItems = await Promise.all(
      (items || []).map(async (it) => {
        try {
          const prodId = it.productId || it.id || it._id;
          if (!prodId) return it;
          const product = await Product.findByPk(prodId);
          if (!product) return it;

          // Build augmented item: preserve original properties but fill missing ones
          const newItem = { ...it };
          if (!newItem.sellerId && product.sellerId) newItem.sellerId = product.sellerId;
          if (!newItem.image && product.image) newItem.image = product.image;
          if ((!newItem.name || !newItem.price) && (product.name || product.price)) {
            if (!newItem.name && product.name) newItem.name = product.name;
            if (!newItem.price && typeof product.price !== 'undefined') newItem.price = product.price;
          }
          // Add seller/store name for admin display
          if (!newItem.sellerStoreName || !newItem.sellerName) {
            // Fetch seller if needed
            let seller = null;
            if (product.sellerId) {
              const SellerModel = (await import('../models/Seller.js')).default;
              seller = await SellerModel.findByPk(product.sellerId);
            }
            if (seller) {
              newItem.sellerStoreName = seller.storeName || '';
              newItem.sellerName = seller.name || '';
            }
          }
          // Add delivery mode for admin display
          if (!newItem.deliveryMode) {
            newItem.deliveryMode = req.body.paymentMethod === 'pickup' ? 'pickup' : 'delivery';
          }
          return newItem;
        } catch {
          // ignore lookup errors and return original item
          return it;
        }
      })
    );

    // Determine shipping fee and initial status for pickup vs delivery.
    // Delivery shipping is summed per seller in the cart.
    let shippingFee = 0;
    const shippingFeeBySeller = {};
    const shippingMethod = req.body.shippingMethod || 'Standard Shipping';
    const initialStatus = 'pending';

    if (!isPickup) {
      const sellerIds = [...new Set(
        normalizedItems
          .map((it) => Number(it.sellerId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )];

      if (sellerIds.length > 0) {
        const sellers = await Seller.findAll({ where: { id: sellerIds } });
        const sellerMap = sellers.reduce((acc, seller) => {
          acc[Number(seller.id)] = seller;
          return acc;
        }, {});

        const unsupportedSellers = sellerIds
          .filter((sid) => {
            const seller = sellerMap[sid];
            const paymentSettings = normalizePaymentSettings(seller?.paymentSettings);
            if (paymentMethod === 'cod') return !paymentSettings.acceptsCOD;
            if (paymentMethod === 'gcash') return !paymentSettings.acceptsGCash;
            return true;
          })
          .map((sid) => sellerMap[sid]?.storeName || `Seller #${sid}`);

        if (unsupportedSellers.length > 0) {
          const methodLabel = paymentMethod === 'gcash' ? 'GCash' : 'Cash on Delivery';
          return res.status(400).json({
            message: `${methodLabel} is not accepted by: ${unsupportedSellers.join(', ')}. Please choose another payment method.`,
          });
        }
      }

      // Calculate each seller subtotal to support seller-level free shipping thresholds.
      const sellerSubtotals = normalizedItems.reduce((acc, it) => {
        const sid = Number(it.sellerId);
        if (!Number.isFinite(sid) || sid <= 0) return acc;
        const line = (Number(it.price) || 0) * (Number(it.quantity) || 1);
        acc[sid] = (acc[sid] || 0) + line;
        return acc;
      }, {});

      for (const sid of sellerIds) {
        const seller = await Seller.findByPk(sid);
        const settings = seller?.shippingSettings || {};
        const rates = Array.isArray(settings.shippingRates) ? settings.shippingRates : [];
        const matched = rates.find((r) => r?.name === shippingMethod);
        const fallback = rates[0];
        const baseRate = Number((matched || fallback)?.price);
        let sellerFee = Number.isFinite(baseRate) ? baseRate : 40;

        const freeMin = Number(settings.freeShippingMinimum) || 0;
        if (freeMin > 0 && (sellerSubtotals[sid] || 0) >= freeMin) {
          sellerFee = 0;
        }

        shippingFeeBySeller[sid] = sellerFee;
        shippingFee += sellerFee;
      }

      // Fallback if no seller IDs were resolved.
      if (sellerIds.length === 0) shippingFee = 40;
    }

    // Validate pickup location per seller for pickup orders.
    let pickupLocation = null;
    if (isPickup) {
      const pickupLocationsBySeller = req.body?.pickupLocationsBySeller || {};
      const sellerIds = [...new Set(
        normalizedItems
          .map((it) => Number(it.sellerId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )];

      if (!sellerIds.length) {
        return res.status(400).json({ message: 'Pickup orders require seller information per item.' });
      }

      const sellers = await Seller.findAll({ where: { id: sellerIds } });
      const sellerMap = sellers.reduce((acc, s) => {
        acc[Number(s.id)] = s;
        return acc;
      }, {});

      for (const sid of sellerIds) {
        const selectedLocation = pickupLocationsBySeller[String(sid)] || pickupLocationsBySeller[sid];
        const seller = sellerMap[sid];
        const allowedLocations = normalizePickupLocations(seller);

        if (!selectedLocation) {
          return res.status(400).json({ message: 'Please select a pickup location for each seller.' });
        }

        if (!allowedLocations.includes(selectedLocation)) {
          return res.status(400).json({ message: `Invalid pickup location for seller #${sid}.` });
        }
      }

      normalizedItems = normalizedItems.map((it) => {
        const sid = Number(it.sellerId);
        if (!Number.isFinite(sid) || sid <= 0) return it;
        return {
          ...it,
          pickupLocation: pickupLocationsBySeller[String(sid)] || pickupLocationsBySeller[sid] || null,
        };
      });

      const uniquePickupLocations = [...new Set(
        normalizedItems
          .map((it) => it.pickupLocation)
          .filter(Boolean)
      )];
      pickupLocation = uniquePickupLocations.length <= 1
        ? (uniquePickupLocations[0] || null)
        : 'Multiple pickup locations';
    }

    // Reservation fields (optional)
    let reservationDateTime = req.body?.reservationDateTime ? new Date(req.body.reservationDateTime) : null;
    let reservationNote = req.body?.reservationNote || null;
    if (!isPickup) {
      reservationDateTime = null;
      reservationNote = null;
    }

    // If a GCash receipt file was uploaded via multipart/form-data, record its public path
    let gcashReceiptPath = null;
    try {
      if (req.file && req.file.filename) {
        // Files are saved under uploads/images by multer configuration
        gcashReceiptPath = `/uploads/images/${req.file.filename}`;
      }
    } catch (e) {
      gcashReceiptPath = null;
    }

    // If pickup and no name/email provided, use user profile
    let firstName = address?.firstName;
    let lastName = address?.lastName;
    let email = address?.email;
    if (isPickup && (!firstName && !lastName)) {
      // Fetch user profile
      const user = await (await import('../models/User.js')).default.findByPk(req.user.id);
      if (user) {
        // Try to split user.name into first/last
        const nameParts = user.name ? user.name.split(' ') : [];
        firstName = nameParts[0] || '';
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        email = user.email;
      }
    }

    const groupedBySeller = normalizedItems.reduce((acc, item) => {
      const sid = Number(item.sellerId);
      const key = Number.isFinite(sid) && sid > 0 ? String(sid) : 'unspecified';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const sellerGroupKeys = Object.keys(groupedBySeller);
    const shouldSplitBySeller = sellerGroupKeys.length > 1;

    const createdOrders = [];
    for (const groupKey of sellerGroupKeys) {
      const itemsForOrder = groupedBySeller[groupKey];
      const sellerSpecificSubtotal = itemsForOrder.reduce((sum, it) => {
        return sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1));
      }, 0);

      const numericSellerId = Number(groupKey);
      const sellerSpecificShipping = isPickup
        ? 0
        : (Number.isFinite(numericSellerId) && shippingFeeBySeller[numericSellerId] !== undefined
          ? Number(shippingFeeBySeller[numericSellerId])
          : (shouldSplitBySeller ? 40 : shippingFee));

      const sellerSpecificPickupLocation = isPickup
        ? (itemsForOrder[0]?.pickupLocation || null)
        : null;

      const sellerSpecificDiscount = shouldSplitBySeller
        ? 0
        : discount;


      const created = await Order.create({
        userId: req.user.id,
        items: itemsForOrder,
        firstName,
        lastName,
        email,
        street: address?.street,
        city: address?.regionProvinceCityBarangay || address?.city,
        state: address?.state,
        zipcode: address?.zipcode,
        country: address?.country,
        phone: address?.phone,
        pickupLocation: sellerSpecificPickupLocation,
        reservationDateTime,
        reservationNote,
        paymentMethod,
        subtotal: sellerSpecificSubtotal,
        commission,
        shippingFee: sellerSpecificShipping,
        discount: sellerSpecificDiscount,
        couponCode,
        total: Math.max(0, sellerSpecificSubtotal + sellerSpecificShipping + commission - sellerSpecificDiscount),
        paymentStatus: 'pending',
        orderStatus: initialStatus,
        gcashReceipt: gcashReceiptPath,
      });

      createdOrders.push(created);

      await createNotificationSafe({
        userId: req.user.id,
        orderId: created.id,
        type: 'order-placed',
        title: 'Order Placed',
        message: `Your order #${created.id} has been placed successfully.`,
        meta: {
          orderStatus: created.orderStatus,
          paymentMethod: created.paymentMethod,
          total: created.total,
        },
      });
    }

    // Increment coupon usage if one was applied
    if (couponCode) {
      await useCoupon(couponCode);
    }

    // Decrement stock for each ordered item
    for (const item of normalizedItems) {
      const prodId = item.productId || item.id;
      if (!prodId) continue;
      try {
        const product = await Product.findByPk(prodId);
        if (product && product.stock !== null && product.stock !== undefined) {
          const newStock = Math.max(0, product.stock - (item.quantity || 1));
          await product.update({ stock: newStock });
        }
      } catch (stockErr) {
        console.error('Failed to decrement stock for product', prodId, stockErr.message);
      }
    }

    // Send order confirmation email
    const orderEmail = address?.email || createdOrders[0]?.email;
    if (orderEmail) {
      const itemsList = normalizedItems.map(it =>
        `<li>${it.name || 'Item'} x${it.quantity || 1}${it.color ? ` (${it.color})` : ''} — ₱${((it.price || 0) * (it.quantity || 1)).toFixed(2)}</li>`
      ).join('');

      const orderIdList = createdOrders.map((o) => `#${o.id}`).join(', ');
      const combinedTotal = createdOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      const paymentLabel = paymentMethod === 'pickup'
        ? 'Pickup'
        : paymentMethod === 'gcash'
          ? 'GCash'
          : 'Cash on Delivery';

      try {
        await sendEmail({
          to: orderEmail,
          subject: `Aninaya — Order ${orderIdList} Confirmed`,
          text: `Your order ${orderIdList} has been placed successfully!\n\nTotal: ₱${combinedTotal.toFixed(2)}\nPayment: ${paymentLabel}\n\nThank you for shopping with Aninaya!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Order Confirmed! 🎉</h2>
              <p>Hi${address?.firstName ? ' ' + address.firstName : ''},</p>
              <p>Your order(s) <strong>${orderIdList}</strong> have been placed successfully.</p>
              <h3>Order Summary</h3>
              <ul>${itemsList}</ul>
              <hr style="border: 1px solid #eee;" />
              <p>Subtotal: <strong>₱${subtotal.toFixed(2)}</strong></p>
              ${discount > 0 ? `<p>Discount: <strong>-₱${discount.toFixed(2)}</strong></p>` : ''}
              <p>Shipping: <strong>₱${shippingFee.toFixed(2)}</strong></p>
              <p style="font-size: 18px;">Total: <strong>₱${combinedTotal.toFixed(2)}</strong></p>
              <p>Payment Method: <strong>${paymentLabel}</strong></p>
              ${isPickup && pickupLocation ? `<p>Pickup Location: <strong>${pickupLocation}</strong></p>` : ''}
              <hr style="border: 1px solid #eee;" />
              <p style="color: #666; font-size: 14px;">Thank you for shopping with Aninaya!</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send order confirmation email:', emailErr.message);
      }
    }

    if (createdOrders.length === 1) {
      return res.status(201).json(createdOrders[0]);
    }

    return res.status(201).json({
      message: 'Orders created per seller',
      orders: createdOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    let orders;
    try {
      orders = await Order.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    } catch (err) {
      if (String(err.message || '').includes('gcashReceipt') || String(err.message || '').includes('does not exist')) {
        orders = await Order.findAll({ attributes: { exclude: ['gcashReceipt'] }, where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
      } else throw err;
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by id
export const getOrder = async (req, res) => {
  try {
    let order;
    try {
      order = await Order.findByPk(req.params.id);
    } catch (err) {
      if (String(err.message || '').includes('gcashReceipt') || String(err.message || '').includes('does not exist')) {
        order = await Order.findByPk(req.params.id, { attributes: { exclude: ['gcashReceipt'] } });
      } else throw err;
    }
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status (admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber } = req.body;
    const order = await safeFindOrderByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = order.orderStatus;
    const updateData = { orderStatus, trackingNumber };
    if (orderStatus === 'completed') {
      updateData.completedAt = new Date();
    } else if (orderStatus) {
      updateData.completedAt = null;
    }
    await order.update(updateData);

    if (orderStatus && previousStatus !== orderStatus) {
      await createNotificationSafe({
        userId: order.userId,
        orderId: order.id,
        type: 'order-status',
        title: 'Order Status Updated',
        message: `Your order #${order.id} status changed to ${orderStatus}.`,
        meta: {
          previousStatus,
          orderStatus,
          trackingNumber: order.trackingNumber || null,
        },
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    let orders;
    try {
      orders = await Order.findAll();
    } catch (err) {
      if (String(err.message || '').includes('gcashReceipt') || String(err.message || '').includes('does not exist')) {
        orders = await Order.findAll({ attributes: { exclude: ['gcashReceipt'] } });
      } else throw err;
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get orders for a seller (seller)
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    let orders;
    try {
      orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
    } catch (err) {
      // Defensive fallback: if the DB schema in production is missing the `gcashReceipt`
      // column, retry the query excluding that attribute to avoid a hard 500.
      if (String(err.message || '').includes('gcashReceipt') || String(err.message || '').includes('does not exist')) {
        console.warn('getSellerOrders: retrying without gcashReceipt attribute due to DB schema mismatch');
        orders = await Order.findAll({ attributes: { exclude: ['gcashReceipt'] }, order: [['createdAt', 'DESC']] });
      } else {
        throw err;
      }
    }

    // Filter orders where any item belongs to this seller
    const sellerOrders = orders
      .map(order => {
        try {
          const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
          const sellerItems = items.filter(item => Number(item.sellerId) === Number(sellerId));
          if (sellerItems.length > 0) {
            // include a sellerItems property for frontend convenience
            return { ...order.toJSON(), sellerItems };
          }
        } catch {
          return null;
        }
        return null;
      })
      .filter(Boolean);

    res.json(sellerOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Seller: update order status for items that belong to this seller
export const updateOrderStatusBySeller = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const { orderStatus, workingDays, estimatedReadyDate } = req.body;
    const order = await safeFindOrderByPk(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check that this order has at least one item for this seller
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    const hasSellerItem = items.some(item => Number(item.sellerId) === Number(sellerId));
    if (!hasSellerItem) return res.status(403).json({ message: 'Not authorized for this order' });

    // Keep old values so we only notify on actual changes.
    const previousStatus = order.orderStatus;
    const oldReadyDateMs = order.estimatedReadyDate ? new Date(order.estimatedReadyDate).getTime() : null;

    // Prepare update data
    const updateData = { orderStatus };

    if (estimatedReadyDate !== undefined && order.paymentMethod === 'pickup') {
      const parsed = new Date(estimatedReadyDate)
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid ready date' })
      }
      updateData.estimatedReadyDate = parsed
      updateData.workingDays = null
    }
    
    // If working days provided for pickup orders, calculate estimated ready date
    if (estimatedReadyDate === undefined && workingDays !== undefined && order.paymentMethod === 'pickup') {
      updateData.workingDays = workingDays;
      
      // Calculate estimated ready date (excluding weekends)
      if (workingDays > 0) {
        const startDate = new Date();
        let daysAdded = 0;
        let currentDate = new Date(startDate);
        
        while (daysAdded < workingDays) {
          currentDate.setDate(currentDate.getDate() + 1);
          const dayOfWeek = currentDate.getDay();
          // Skip weekends (0 = Sunday, 6 = Saturday)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
          }
        }
        
        updateData.estimatedReadyDate = currentDate;
      }
    }

    if (orderStatus === 'completed') {
      updateData.completedAt = new Date();
    } else if (orderStatus) {
      updateData.completedAt = null;
    }

    // Update the orderStatus but don't allow sellers to set arbitrary admin-only fields
    await order.update(updateData);

    if (orderStatus && previousStatus !== orderStatus) {
      await createNotificationSafe({
        userId: order.userId,
        orderId: order.id,
        type: 'order-status',
        title: 'Order Status Updated',
        message: `Your order #${order.id} status changed to ${orderStatus}.`,
        meta: {
          previousStatus,
          orderStatus,
          updatedBy: 'seller',
        },
      });
    }

    // Notify customer when pickup date is set or changed by seller.
    if (order.paymentMethod === 'pickup' && order.estimatedReadyDate) {
      const newReadyDateMs = new Date(order.estimatedReadyDate).getTime();
      const readyDateChanged = oldReadyDateMs !== newReadyDateMs;
      if (readyDateChanged) {
        const formattedDate = new Date(order.estimatedReadyDate).toLocaleString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        await createNotificationSafe({
          userId: order.userId,
          orderId: order.id,
          type: 'pickup-date',
          title: 'Pickup Date Updated',
          message: `Your order #${order.id} is scheduled for pickup on ${formattedDate}.`,
          meta: {
            estimatedReadyDate: order.estimatedReadyDate,
            orderStatus: order.orderStatus,
          },
        });
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await safeFindOrderByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

      // Do not allow cancelling an order that is already completed
      if (order.orderStatus === 'completed') {
        return res.status(400).json({ message: 'Cannot cancel an order that is already completed' });
      }

      await order.update({ orderStatus: 'cancelled' });
      await createNotificationSafe({
        userId: order.userId,
        orderId: order.id,
        type: 'order-cancelled',
        title: 'Order Cancelled',
        message: `Your order #${order.id} has been cancelled.`,
        meta: {
          orderStatus: 'cancelled',
        },
      });
      res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark order as received by the buyer
export const markOrderReceived = async (req, res) => {
  try {
    const order = await safeFindOrderByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only the buyer can mark as received
    if (order.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    // Only allow marking when status is shipped (avoid accidental marking)
    if (order.orderStatus !== 'shipped') return res.status(400).json({ message: 'Order must be shipped before marking as received' });

    await order.update({ orderStatus: 'completed', receivedAt: new Date() });
    await createNotificationSafe({
      userId: order.userId,
      orderId: order.id,
      type: 'order-completed',
      title: 'Order Completed',
      message: `Order #${order.id} was marked as received.`,
      meta: {
        orderStatus: 'completed',
      },
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Seller: delete order if it belongs only to this seller
export const deleteOrderBySeller = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const order = await safeFindOrderByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    if (!items.length) return res.status(400).json({ message: 'Order has no items' });

    // If any item is not owned by this seller, block deletion to avoid removing other's items
    const onlySellerItems = items.every(item => Number(item.sellerId) === Number(sellerId));
    if (!onlySellerItems) return res.status(403).json({ message: 'Order contains items from multiple sellers; cannot delete' });

    await order.destroy();
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
