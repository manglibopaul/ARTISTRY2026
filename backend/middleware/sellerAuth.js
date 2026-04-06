import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

// Middleware to verify seller token and ensure seller account still exists.
export const verifySeller = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const seller = await Seller.findByPk(decoded.id);
    if (!seller) {
      return res.status(401).json({ message: 'Seller session is no longer valid' });
    }

    req.seller = { id: seller.id, isVerified: !!seller.isVerified };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Require seller account verification for sensitive seller actions
export const requireVerifiedSeller = async (req, res, next) => {
  try {
    const sellerId = req.seller?.id;
    if (!sellerId) {
      return res.status(401).json({ message: 'Unauthorized seller session' });
    }

    const seller = await Seller.findByPk(sellerId);
    if (!seller) {
      return res.status(401).json({ message: 'Seller session is no longer valid' });
    }

    if (!seller.isVerified) {
      return res.status(403).json({ message: 'Your seller account is pending admin verification' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify seller status' });
  }
};

// Generate JWT token
export const generateSellerToken = (sellerId) => {
  return jwt.sign({ id: sellerId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};
