import express from 'express';
import {
  createReturnRequest,
  getMyReturnRequests,
  getSellerReturnRequests,
  updateReturnRequestStatus,
} from '../controllers/returnController.js';
import { verifyUser } from '../middleware/auth.js';
import { verifySeller } from '../middleware/sellerAuth.js';

const router = express.Router();

// Buyer routes (authenticated user)
router.post('/', verifyUser, createReturnRequest);
router.get('/my-requests', verifyUser, getMyReturnRequests);

// Seller routes
router.get('/seller', verifySeller, getSellerReturnRequests);
router.put('/seller/:id', verifySeller, updateReturnRequestStatus);

export default router;
