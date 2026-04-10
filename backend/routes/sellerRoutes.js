import express from 'express';
import {
  registerSeller,
  loginSeller,
  getSellerProfile,
  updateSellerProfile,
  updateSellerAvatar,
  getSellerOrders,
  findSellerByName,
  getAllSellers,
  getDeletedSellers,
  restoreDeletedSeller,
  deleteSeller,
  hardDeleteSeller,
  verifySellerByAdmin,
  getSeller,
  getAllSellersPublic,
  forgotSellerPassword,
  resetSellerPassword,
  getShippingSettings,
  updateShippingSettings,
  getPaymentSettings,
  updatePaymentSettings,
  uploadPaymentQr,
  getReturnPolicy,
  updateReturnPolicy,
} from '../controllers/sellerController.js';
import { verifySeller } from '../middleware/sellerAuth.js';
import { verifyAdmin } from '../middleware/auth.js';
import { ARTISAN_TYPES_ARRAY, EXPERTISE_TAGS } from '../utils/artisanTypes.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.post('/register', upload.single('proofOfArtisan'), registerSeller);
router.post('/login', loginSeller);
router.post('/forgot-password', forgotSellerPassword);
router.post('/reset-password', resetSellerPassword);
router.get('/types', (req, res) => {
  res.json({ artisanTypes: ARTISAN_TYPES_ARRAY, expertiseTags: EXPERTISE_TAGS });
});
router.get('/all', getAllSellersPublic); // Public: all sellers for directory/listings
// Public: find seller by store name
router.get('/by-name/:name', findSellerByName);

// Protected routes
router.get('/profile', verifySeller, getSellerProfile);
router.put('/profile', verifySeller, updateSellerProfile);
router.put('/profile/avatar', verifySeller, upload.single('image'), updateSellerAvatar);
// Seller's orders (orders that include their products)
router.get('/orders', verifySeller, getSellerOrders);

// Shipping settings
router.get('/shipping-settings', verifySeller, getShippingSettings);
router.put('/shipping-settings', verifySeller, updateShippingSettings);

// Payment settings
router.get('/payment-settings', verifySeller, getPaymentSettings);
router.put('/payment-settings', verifySeller, updatePaymentSettings);
router.put('/payment-settings/qr', verifySeller, upload.single('image'), uploadPaymentQr);

// Return policy
router.get('/return-policy', verifySeller, getReturnPolicy);
router.put('/return-policy', verifySeller, updateReturnPolicy);

// Admin routes
router.get('/', verifyAdmin, getAllSellers);
router.get('/bin', verifyAdmin, getDeletedSellers);
router.put('/bin/:id/restore', verifyAdmin, restoreDeletedSeller);
router.delete('/:id', verifyAdmin, deleteSeller); // soft delete
router.delete('/bin/:id', verifyAdmin, hardDeleteSeller); // hard delete
router.patch('/:id/verify', verifyAdmin, verifySellerByAdmin);

// Public: get single seller by ID
router.get('/:id', getSeller);

export default router;
