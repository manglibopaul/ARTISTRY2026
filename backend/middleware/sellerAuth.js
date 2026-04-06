import jwt from 'jsonwebtoken';

// Middleware to verify seller token
export const verifySeller = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.seller = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Generate JWT token
export const generateSellerToken = (sellerId) => {
  return jwt.sign({ id: sellerId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};
