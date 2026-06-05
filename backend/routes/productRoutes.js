import express from 'express';
import {
  getAllProducts,
  getProduct,
  getProductByName,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getSellerProducts,
} from '../controllers/productController.js';
import { verifySeller, requireVerifiedSeller } from '../middleware/sellerAuth.js';
import { verifyAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Middleware to handle Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof Error && err.name === 'MulterError') {
    console.error('Multer error:', err);
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  } else if (err instanceof Error && err.message.includes('Only')) {
    console.error('File filter error:', err);
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

// Public routes
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/by-name/:name', getProductByName);
router.get('/:id', getProduct);

// Seller routes (protected)
router.get('/seller/my-products', verifySeller, getSellerProducts);
router.post('/', verifySeller, requireVerifiedSeller, upload.any(), handleMulterError, createProduct);
router.put('/:id', verifySeller, requireVerifiedSeller, upload.any(), handleMulterError, updateProduct);
router.delete('/:id', verifySeller, deleteProduct);

// Admin delete any product
router.delete('/admin/:id', verifyAdmin, deleteProduct);

export default router;
