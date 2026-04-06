import Coupon from '../models/Coupon.js';

// Validate a coupon code (public — used during checkout)
export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code is required' });

    const coupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });

    if (!coupon.isActive) return res.status(400).json({ message: 'This coupon is no longer active' });

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit' });
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (orderSubtotal < coupon.minOrderAmount) {
      return res.status(400).json({ message: `Minimum order of ₱${coupon.minOrderAmount} required for this coupon` });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((orderSubtotal * coupon.discountValue / 100) * 100) / 100;
    } else {
      discount = Math.min(coupon.discountValue, orderSubtotal);
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      message: coupon.discountType === 'percentage'
        ? `${coupon.discountValue}% off applied!`
        : `₱${coupon.discountValue} off applied!`,
    });
  } catch (error) {
    console.error('validateCoupon error:', error);
    res.status(500).json({ message: 'Failed to validate coupon' });
  }
};

// Increment usage count (called after successful order)
export const useCoupon = async (code) => {
  if (!code) return;
  try {
    const coupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });
    if (coupon) {
      await coupon.update({ usedCount: coupon.usedCount + 1 });
    }
  } catch (err) {
    console.error('useCoupon error:', err);
  }
};

// ---- Admin endpoints ----

// Get all coupons
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load coupons' });
  }
};

// Create coupon
export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
    if (!code || !discountValue) return res.status(400).json({ message: 'Code and discount value are required' });

    const existing = await Coupon.findOne({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(400).json({ message: 'Coupon code already exists' });

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType: discountType || 'percentage',
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('createCoupon error:', error);
    res.status(500).json({ message: 'Failed to create coupon' });
  }
};

// Delete coupon
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    await coupon.destroy();
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
};

// Toggle coupon active status
export const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    await coupon.update({ isActive: !coupon.isActive });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update coupon' });
  }
};
