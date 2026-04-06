import express from 'express';
import { getCart, saveCart, clearCart } from '../controllers/cartController.js';
import { verifyUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyUser, getCart);
router.post('/', verifyUser, saveCart);
router.delete('/', verifyUser, clearCart);

export default router;
