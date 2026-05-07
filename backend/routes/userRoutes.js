import express from 'express';
import {
  register,
  sendUserSignupOtp,
  login,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deleteUser,
  updateUserByAdmin,
  getDeletedUsers,
  restoreUser,
  hardDeleteUser,
  forgotPassword,
  resetPassword,
} from '../controllers/userController.js';
import { verifyUser, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register/send-otp', sendUserSignupOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (auth required)
router.get('/profile', verifyUser, getUserProfile);
router.put('/profile', verifyUser, updateUserProfile);

// Admin routes
router.get('/', verifyAdmin, getAllUsers);
router.get('/bin', verifyAdmin, getDeletedUsers);
router.put('/bin/:id/restore', verifyAdmin, restoreUser);
router.delete('/bin/:id', verifyAdmin, hardDeleteUser);
router.delete('/:id', verifyAdmin, deleteUser);
router.put('/:id', verifyAdmin, updateUserByAdmin);

export default router;
