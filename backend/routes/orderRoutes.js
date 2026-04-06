import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  getAllOrders,
  cancelOrder,
  getSellerOrders,
  updateOrderStatusBySeller,
  deleteOrderBySeller,
  markOrderReceived,
} from '../controllers/orderController.js';
import { verifyUser, verifyAdmin } from '../middleware/auth.js';
import { verifySeller } from '../middleware/sellerAuth.js';

const router = express.Router();

// Protected routes
router.post('/', verifyUser, createOrder);
router.get('/my-orders', verifyUser, getUserOrders);

// Seller routes (place before '/:id' to avoid route shadowing)
router.get('/seller/my-orders', verifySeller, getSellerOrders);
router.put('/:id/status-seller', verifySeller, updateOrderStatusBySeller);
router.delete('/seller/:id', verifySeller, deleteOrderBySeller);

router.get('/:id', verifyUser, getOrder);
router.put('/:id/cancel', verifyUser, cancelOrder);
router.put('/:id/received', verifyUser, markOrderReceived);

// Admin routes (protected)
router.get('/', verifyAdmin, getAllOrders);
router.put('/:id/status', verifyAdmin, updateOrderStatus);

export default router;
