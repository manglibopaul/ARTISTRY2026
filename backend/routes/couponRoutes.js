import express from 'express';
import {
  validateCoupon,
  getAllCoupons,
  createCoupon,
  deleteCoupon,
  toggleCoupon,
} from '../controllers/couponController.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public: validate coupon during checkout
router.post('/validate', validateCoupon);

// Admin routes
router.get('/', verifyAdmin, getAllCoupons);
router.post('/', verifyAdmin, createCoupon);
router.delete('/:id', verifyAdmin, deleteCoupon);
router.patch('/:id/toggle', verifyAdmin, toggleCoupon);

export default router;
