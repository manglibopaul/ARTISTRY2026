import Review from '../models/Review.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const toPublicUploadPath = (filePath, filename) => {
  if (!filePath) return filename ? `/uploads/images/${filename}` : null;
  const normalized = String(filePath).replace(/\\/g, '/');
  const marker = '/uploads/';
  const idx = normalized.lastIndexOf(marker);
  if (idx >= 0) return normalized.slice(idx);
  return filename ? `/uploads/images/${filename}` : null;
};

// Create a review — only if the user purchased and the order containing the product is completed
export const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.user.id;
    const imageUrl = req.file ? toPublicUploadPath(req.file.path, req.file.filename) : null;

    if (!productId || !rating || !comment) return res.status(400).json({ message: 'Missing required fields' });

    // Prevent duplicate reviews
    const existing = await Review.findOne({ where: { productId, userId } });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this product' });

    // Verify that the user has at least one completed order containing this product
    const orders = await Order.findAll({ where: { userId } });
    const hasCompleted = orders.some(o => {
      try {
        const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
        return (o.orderStatus === 'completed') && items.some(it => Number(it.productId || it.id || it._id) === Number(productId));
      } catch (e) {
        return false;
      }
    });

    if (!hasCompleted) return res.status(403).json({ message: 'You can only review products you have completed (received).' });

    const user = await User.findByPk(userId);
    const userName = user ? user.name : null;

    const review = await Review.create({ productId, userId, userName, rating, title, comment, imageUrl });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get reviews for a product
export const getReviewsForProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const reviews = await Review.findAll({ where: { productId }, order: [['createdAt', 'DESC']] });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Check if current user is eligible to review a product (has completed an order containing it)
export const checkReviewEligibility = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const orders = await Order.findAll({ where: { userId } });
    const eligible = orders.some(o => {
      try {
        const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
        return (o.orderStatus === 'completed') && items.some(it => Number(it.productId || it.id || it._id) === Number(productId));
      } catch (e) {
        return false;
      }
    });

    res.json({ eligible });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all reviews for products that belong to the authenticated seller
export const getReviewsForSeller = async (req, res) => {
  try {
    const sellerId = req.seller?.id;
    if (!sellerId) return res.status(401).json({ message: 'Not authenticated' });

    // find seller products
    const products = await Product.findAll({ where: { sellerId } });
    const productIds = products.map(p => p.id);

    if (!productIds.length) return res.json([]);

    const reviews = await Review.findAll({ where: { productId: productIds }, order: [['createdAt', 'DESC']] });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Seller replies to a review
export const replyToReview = async (req, res) => {
  try {
    const sellerId = req.seller?.id;
    if (!sellerId) return res.status(401).json({ message: 'Not authenticated' });

    const reviewId = req.params.id;
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Missing reply text' });

    const review = await Review.findByPk(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Verify seller owns the product for this review
    const product = await Product.findByPk(review.productId);
    if (!product || Number(product.sellerId) !== Number(sellerId)) return res.status(403).json({ message: 'Not authorized to reply to this review' });

    review.sellerReply = reply;
    review.sellerReplyAt = new Date();
    await review.save();

    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a review (customer can delete own review)
export const deleteReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const reviewId = req.params.id;
    const review = await Review.findByPk(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (Number(review.userId) !== Number(userId)) return res.status(403).json({ message: 'Not authorized to delete this review' });

    await review.destroy();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
