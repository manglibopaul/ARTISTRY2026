import Order from '../models/Order.js';

export const safeFindOrderByPk = async (id, opts = {}) => {
  try {
    return await Order.findByPk(id, opts);
  } catch (err) {
    const msg = String(err.message || '');
    if (msg.includes('gcashReceipt') || msg.includes('does not exist')) {
      // Retry excluding the gcashReceipt attribute to tolerate missing DB column
      const currentAttrs = opts.attributes;
      let attributes = {};

      if (Array.isArray(currentAttrs)) {
        const filtered = currentAttrs.filter(a => a !== 'gcashReceipt');
        attributes = { exclude: [...filtered, 'gcashReceipt'] };
      } else if (currentAttrs && typeof currentAttrs === 'object' && currentAttrs.exclude) {
        const filtered = (currentAttrs.exclude || []).filter(a => a !== 'gcashReceipt');
        attributes = { exclude: [...new Set([...filtered, 'gcashReceipt'])] };
      } else {
        attributes = { exclude: ['gcashReceipt'] };
      }

      const fallback = { ...opts, attributes };
      return await Order.findByPk(id, fallback);
    }

    throw err;
  }
};

export default safeFindOrderByPk;
