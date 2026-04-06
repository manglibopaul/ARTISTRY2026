import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Optional auth: if Authorization header present, verify and set req.user, otherwise continue without error
export const verifyUserOptional = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    // If token is invalid, ignore and continue as guest
    return next();
  }
};

// Optional helper to generate tokens if needed elsewhere
export const generateUserToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Verify admin user
export const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Resolve as a normal user and require isAdmin
    const user = await User.findByPk(decoded.id);
    if (user && user.isAdmin) {
      req.user = { id: user.id, isAdmin: true };
      return next();
    }

    return res.status(403).json({ message: 'Admin access required' });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
