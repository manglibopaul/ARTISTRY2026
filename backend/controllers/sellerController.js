import Seller from '../models/Seller.js';
import { generateSellerToken } from '../middleware/sellerAuth.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { ARTISAN_TYPES_ARRAY } from '../utils/artisanTypes.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/email.js';
import { Op } from 'sequelize';
import { uploadImage } from '../utils/media.js';

const SUPPORT_SELLER_EMAIL = 'admin.support@artistry.local';

const normalizePickupLocations = (raw) => {
  let parsed = raw;

  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = trimmed.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(parsed)) {
    parsed = parsed ? [parsed] : [];
  }

  return parsed
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') return entry.trim();
      if (typeof entry === 'object') {
        return String(
          entry.label || entry.address || entry.name || ''
        ).trim();
      }
      return String(entry).trim();
    })
    .filter(Boolean);
};

const normalizeSellerPayload = (seller) => {
  const plain = typeof seller?.toJSON === 'function' ? seller.toJSON() : { ...seller };
  plain.pickupLocations = normalizePickupLocations(plain.pickupLocations);
  return plain;
};

// Register seller
export const registerSeller = async (req, res) => {
  try {
    const { name, email, password, storeName, artisanType, phone, address } = req.body;
    const pickupLocations = normalizePickupLocations(req.body.pickupLocations);

    let proofOfArtisan = null;
    if (req.file) {
      const uploaded = await uploadImage(req.file, 'artistry/seller-proof');
      proofOfArtisan = uploaded?.url || null;
    }

    if (!name || !email || !password || !storeName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check both active and soft-deleted sellers to avoid unique-constraint 500s.
    const existingSeller = await Seller.findOne({ where: { email }, paranoid: false });
    let seller;
    let responseMessage = 'Seller registered successfully';

    if (existingSeller) {
      if (existingSeller.deletedAt) {
        await existingSeller.restore();
        await existingSeller.update({
          name,
          password,
          storeName,
          artisanType: artisanType || null,
          phone,
          address,
          pickupLocations,
          proofOfArtisan: proofOfArtisan || existingSeller.proofOfArtisan,
          isVerified: false,
        });
        seller = existingSeller;
        responseMessage = 'Deleted seller account restored and updated successfully';
      } else {
        return res.status(400).json({ message: 'Email already registered' });
      }
    } else {
      seller = await Seller.create({
        name,
        email,
        password,
        storeName,
        artisanType: artisanType || null,
        phone,
        address,
        pickupLocations,
        proofOfArtisan,
      });
    }

    const token = generateSellerToken(seller.id);

    res.status(201).json({
      message: responseMessage,
      token,
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        storeName: seller.storeName,
        isVerified: !!seller.isVerified,
        artisanType: seller.artisanType,
        pickupLocations: normalizePickupLocations(seller.pickupLocations),
        proofOfArtisan: seller.proofOfArtisan,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Error registering seller', error: error.message });
  }
};

// Login seller
export const loginSeller = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    console.log('🔍 Looking up seller with email:', email);
    const startTime = Date.now();
    
    const seller = await Seller.findOne({ where: { email } });
    const lookupTime = Date.now() - startTime;
    console.log(`⏱️ Seller lookup took ${lookupTime}ms`);
    
    if (!seller) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('🔐 Comparing passwords...');
    const isPasswordValid = await seller.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ Password valid, generating token...');
    const token = generateSellerToken(seller.id);

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        storeName: seller.storeName,
        isVerified: !!seller.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Get seller profile
export const getSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.seller.id, {
      attributes: { exclude: ['password'] },
    });

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.status(200).json(normalizeSellerPayload(seller));
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Find seller by store name (public helper)
export const findSellerByName = async (req, res) => {
  try {
    const { name } = req.params
    if (!name) return res.status(400).json({ message: 'Name required' })
    const seller = await Seller.findOne({ where: { storeName: name } })
    if (!seller) return res.status(404).json({ message: 'Seller not found' })
    return res.json({ id: seller.id, storeName: seller.storeName, name: seller.name })
  } catch (error) {
    console.error('findSellerByName', error)
    return res.status(500).json({ message: 'Failed to find seller' })
  }
}

// Update seller profile
export const updateSellerProfile = async (req, res) => {
  try {
    const { name, storeName, description, phone, address, artisanType, expertise, bio, certifications, pickupLocations } = req.body;

    const seller = await Seller.findByPk(req.seller.id);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const hasPickupLocationsField = Object.prototype.hasOwnProperty.call(req.body, 'pickupLocations');
    const normalizedPickupLocations = normalizePickupLocations(pickupLocations);

    await seller.update({
      name: name || seller.name,
      storeName: storeName || seller.storeName,
      description: description || seller.description,
      phone: phone || seller.phone,
      address: address || seller.address,
      artisanType: artisanType || seller.artisanType,
      expertise: Array.isArray(expertise) ? expertise : (seller.expertise || []),
      bio: bio || seller.bio,
      certifications: Array.isArray(certifications) ? certifications : (seller.certifications || []),
      pickupLocations: hasPickupLocationsField ? normalizedPickupLocations : normalizePickupLocations(seller.pickupLocations),
    });

    // Also update shippingSettings and returnPolicy if provided
    const { shippingSettings, returnPolicy } = req.body;
    if (shippingSettings && typeof shippingSettings === 'object') {
      await seller.update({ shippingSettings });
    }
    if (returnPolicy && typeof returnPolicy === 'object') {
      await seller.update({ returnPolicy });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        storeName: seller.storeName,
        isVerified: !!seller.isVerified,
        artisanType: seller.artisanType,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Update seller avatar
export const updateSellerAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const seller = await Seller.findByPk(req.seller.id);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const uploaded = await uploadImage(req.file, 'artistry/seller-avatar');
    const avatarPath = uploaded?.url || null;
    await seller.update({ avatar: avatarPath });

    return res.status(200).json({
      message: 'Avatar updated successfully',
      avatar: avatarPath,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return res.status(500).json({ message: 'Error updating avatar', error: error.message });
  }
};

// Get orders that include this seller's products
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.seller.id;

    // find seller's products
    const sellerProducts = await Product.findAll({ where: { sellerId } });
    const sellerProductIds = sellerProducts.map((p) => p.id);

    // fetch recent orders
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });

    const sellerOrders = orders.reduce((acc, order) => {
      let items = order.items || [];
      // items stored as JSON (Sequelize JSON) — ensure it's an array
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }

      const sellerItems = items.filter((it) => {
        const pid = it.productId ?? it.id ?? it._id ?? it.product_id;
        return pid && sellerProductIds.includes(Number(pid));
      });

      if (sellerItems.length) {
        acc.push({ ...order.toJSON(), sellerItems });
      }

      return acc;
    }, []);

    res.json(sellerOrders);
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: get all sellers

// Get all non-deleted sellers
export const getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.findAll({
      where: {
        deletedAt: null,
        email: { [Op.ne]: SUPPORT_SELLER_EMAIL },
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    res.json(sellers.map(normalizeSellerPayload));
  } catch (error) {
    console.error('getAllSellers', error);
    res.status(500).json({ message: 'Failed to load sellers' });
  }
};

// Get only soft-deleted sellers (bin)
export const getDeletedSellers = async (req, res) => {
  try {
    const sellers = await Seller.findAll({
      where: {
        deletedAt: { [Op.ne]: null },
        email: { [Op.ne]: SUPPORT_SELLER_EMAIL },
      },
      paranoid: false,
      attributes: { exclude: ['password'] },
      order: [['deletedAt', 'DESC']],
    });
    res.json(sellers);
  } catch (error) {
    console.error('getDeletedSellers', error);
    res.status(500).json({ message: 'Failed to load deleted sellers' });
  }
};
// Permanently delete seller (hard delete)
export const hardDeleteSeller = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.params.id, { paranoid: false });
    if (!seller || !seller.deletedAt) return res.status(404).json({ message: 'Seller not found in bin' });
    await seller.destroy({ force: true });
    res.json({ message: 'Seller permanently deleted' });
  } catch (error) {
    console.error('hardDeleteSeller', error);
    res.status(500).json({ message: 'Failed to permanently delete seller' });
  }
};

// Restore soft-deleted seller from bin
export const restoreDeletedSeller = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.params.id, { paranoid: false });
    if (!seller || !seller.deletedAt) {
      return res.status(404).json({ message: 'Seller not found in bin' });
    }

    await seller.restore();

    // Restore corresponding user account if soft-deleted as part of seller deletion
    const { default: User } = await import('../models/User.js');
    const user = await User.findOne({ where: { email: seller.email }, paranoid: false });
    if (user && user.deletedAt) {
      await user.restore();
    }

    res.json({ message: 'Seller restored successfully' });
  } catch (error) {
    console.error('restoreDeletedSeller', error);
    res.status(500).json({ message: 'Failed to restore seller' });
  }
};

// Admin: delete seller
export const deleteSeller = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    if (seller.email === SUPPORT_SELLER_EMAIL) {
      return res.status(403).json({ message: 'Cannot delete system support account' });
    }
    // Delete all products for this seller
    await Product.destroy({ where: { sellerId: seller.id } });
    // Soft-delete seller via paranoid model behavior
    await seller.destroy();

    // Also soft-delete the corresponding user (by email)
    const { default: User } = await import('../models/User.js');
    const user = await User.findOne({ where: { email: seller.email } });
    if (user) {
      await user.destroy();
    }

    res.json({ message: 'Seller, their products, and corresponding user deleted' });
  } catch (error) {
    console.error('deleteSeller', error);
    res.status(500).json({ message: 'Failed to delete seller' });
  }
};

// Public: get seller by ID for product pages
export const getSeller = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json(normalizeSellerPayload(seller));
  } catch (error) {
    console.error('getSeller', error);
    res.status(500).json({ message: 'Failed to load seller' });
  }
};

// Admin: get all sellers
// NOTE: This is replaced - getAllSellers is the admin version
// Public: get all sellers (public directory)
export const getAllSellersPublic = async (req, res) => {
  try {
    const sellers = await Seller.findAll({
      where: {
        email: { [Op.ne]: SUPPORT_SELLER_EMAIL },
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    res.json(sellers.map(normalizeSellerPayload));
  } catch (error) {
    console.error('getAllSellersPublic', error);
    res.status(500).json({ message: 'Failed to load sellers' });
  }
};

// Admin: verify or unverify seller
export const verifySellerByAdmin = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    const { isVerified } = req.body;
    const nextValue = typeof isVerified === 'boolean' ? isVerified : !seller.isVerified;
    await seller.update({ isVerified: nextValue });

    res.json({
      id: seller.id,
      isVerified: seller.isVerified,
    });
  } catch (error) {
    console.error('verifySellerByAdmin', error);
    res.status(500).json({ message: 'Failed to update seller verification' });
  }
};

// Seller forgot password
export const forgotSellerPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const seller = await Seller.findOne({ where: { email } });
    if (!seller) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await seller.update({ resetToken: token, resetTokenExpiry: expiry });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/seller/reset-password?token=${token}`;

    await sendEmail({
      to: seller.email,
      subject: 'Aninaya — Seller Password Reset',
      text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
      html: `<p>Click the link below to reset your seller password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
    });

    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (error) {
    console.error('forgotSellerPassword error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
};

// Seller reset password
export const resetSellerPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });

    const seller = await Seller.findOne({ where: { resetToken: token } });
    if (!seller || !seller.resetTokenExpiry || new Date(seller.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    await seller.update({ password, resetToken: null, resetTokenExpiry: null });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('resetSellerPassword error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// Get seller shipping settings
export const getShippingSettings = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.seller.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json(seller.shippingSettings || {});
  } catch (error) {
    console.error('getShippingSettings', error);
    res.status(500).json({ message: 'Failed to load shipping settings' });
  }
};

// Update seller shipping settings
export const updateShippingSettings = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.seller.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    const { shippingRates, freeShippingMinimum, processingTime, shipsFrom } = req.body;
    const settings = {
      shippingRates: Array.isArray(shippingRates) ? shippingRates : (seller.shippingSettings?.shippingRates || []),
      freeShippingMinimum: freeShippingMinimum !== undefined ? Number(freeShippingMinimum) : (seller.shippingSettings?.freeShippingMinimum || 0),
      processingTime: processingTime || seller.shippingSettings?.processingTime || '',
      shipsFrom: shipsFrom || seller.shippingSettings?.shipsFrom || '',
    };

    await seller.update({ shippingSettings: settings });
    res.json({ message: 'Shipping settings updated', shippingSettings: settings });
  } catch (error) {
    console.error('updateShippingSettings', error);
    res.status(500).json({ message: 'Failed to update shipping settings' });
  }
};

// Get seller return policy
export const getReturnPolicy = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.seller.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });
    res.json(seller.returnPolicy || {});
  } catch (error) {
    console.error('getReturnPolicy', error);
    res.status(500).json({ message: 'Failed to load return policy' });
  }
};

// Update seller return policy
export const updateReturnPolicy = async (req, res) => {
  try {
    const seller = await Seller.findByPk(req.seller.id);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    const { acceptsReturns, returnWindow, conditions, refundMethod } = req.body;
    const policy = {
      acceptsReturns: acceptsReturns !== undefined ? Boolean(acceptsReturns) : true,
      returnWindow: returnWindow !== undefined ? Number(returnWindow) : 7,
      conditions: conditions || '',
      refundMethod: refundMethod || 'Original payment method',
    };

    await seller.update({ returnPolicy: policy });
    res.json({ message: 'Return policy updated', returnPolicy: policy });
  } catch (error) {
    console.error('updateReturnPolicy', error);
    res.status(500).json({ message: 'Failed to update return policy' });
  }
};
