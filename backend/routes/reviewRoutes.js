import express from 'express';
import { createReview, getReviewsForProduct, checkReviewEligibility, getReviewsForSeller, replyToReview, deleteReview } from '../controllers/reviewController.js';
import { verifyUser } from '../middleware/auth.js';
import { verifySeller } from '../middleware/sellerAuth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public: get reviews for a product
router.get('/product/:id', getReviewsForProduct);

// Protected: check eligibility for current user to review a product
router.get('/product/:id/eligible', verifyUser, checkReviewEligibility);

// Protected: create a review
router.post('/', verifyUser, upload.single('image'), createReview);

// Seller: get reviews for seller's products
router.get('/seller', verifySeller, getReviewsForSeller);

// Seller: reply to a review
router.post('/:id/reply', verifySeller, replyToReview);

// Delete a review (customer)
router.delete('/:id', verifyUser, deleteReview);

export default router;
