import User from '../models/User.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Review from '../models/Review.js';
import ChatMessage from '../models/ChatMessage.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/email.js';
import { Op } from 'sequelize';

const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

// Register user
export const register = async (req, res) => {
  try {
    const { name, email, password, street, city, state, zipcode, country, phone } = req.body;

    if (!name || !email || !password || !street || !city || !state || !zipcode || !country || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let user = await User.findOne({ where: { email }, paranoid: false });
    if (user) {
      if (user.deletedAt) {
        await user.restore();
        await user.update({
          name,
          email,
          password,
          street,
          city,
          state,
          zipcode,
          country,
          phone,
        });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: '7d',
        });

        return res.status(200).json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            street: user.street,
            city: user.city,
            state: user.state,
            zipcode: user.zipcode,
            country: user.country,
            phone: user.phone,
            isAdmin: user.isAdmin,
          },
        });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    user = await User.create({
      name,
      email,
      password,
      street,
      city,
      state,
      zipcode,
      country,
      phone,
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        street: user.street,
        city: user.city,
        state: user.state,
        zipcode: user.zipcode,
        country: user.country,
        phone: user.phone,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email is already registered' });
    }
    if (error?.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: error.errors?.[0]?.message || 'Please check all required fields',
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let isMatch = false;
    if (isBcryptHash(user.password)) {
      isMatch = await user.comparePassword(password);
    } else {
      // Legacy fallback for records created before password hashing was enforced.
      isMatch = user.password === password;
      if (isMatch) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await user.update({ password: hashedPassword });
      }
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      const deletedUser = await User.findByPk(req.user.id, { paranoid: false });
      if (deletedUser && deletedUser.deletedAt) {
        return res.status(403).json({ message: 'Account is deleted' });
      }
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Only allow safe fields — prevent privilege escalation (e.g. isAdmin)
    const allowed = ['name', 'email', 'phone', 'street', 'city', 'state', 'zipcode', 'country'];
    const updateData = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updateData[key] = req.body[key];
    }

    await user.update(updateData);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users (admin)
export const getAllUsers = async (req, res) => {
  try {
    // Explicitly filter out soft-deleted users to avoid model option mismatches.
    const users = await User.findAll({
      where: {
        isAdmin: false,
        deletedAt: null,
      },
      paranoid: false,
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user (admin)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { paranoid: false });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot delete admin user' });
    if (user.deletedAt) return res.status(400).json({ message: 'User is already in bin' });

    // Soft delete to bin
    await user.destroy();
    res.json({ message: 'User moved to bin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get soft-deleted users (admin bin)
export const getDeletedUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        isAdmin: false,
        deletedAt: { [Op.ne]: null },
      },
      paranoid: false,
      order: [['deletedAt', 'DESC']],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Restore soft-deleted user
export const restoreUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { paranoid: false });
    if (!user || !user.deletedAt) return res.status(404).json({ message: 'User not found in bin' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot restore admin user via bin' });
    await user.restore();
    res.json({ message: 'User restored' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Permanently delete soft-deleted user
export const hardDeleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { paranoid: false });
    if (!user || !user.deletedAt) return res.status(404).json({ message: 'User not found in bin' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot hard delete admin user' });

    const userOrders = await Order.findAll({ where: { userId: user.id }, attributes: ['id'] });
    const orderIds = userOrders.map((o) => o.id);

    // Remove dependents first to satisfy FK constraints.
    await ReturnRequest.destroy({
      where: {
        [Op.or]: [
          { userId: user.id },
          ...(orderIds.length ? [{ orderId: { [Op.in]: orderIds } }] : []),
        ],
      },
    });
    await Notification.destroy({
      where: {
        [Op.or]: [
          { userId: user.id },
          ...(orderIds.length ? [{ orderId: { [Op.in]: orderIds } }] : []),
        ],
      },
    });
    await ChatMessage.destroy({ where: { userId: user.id } });
    await Review.destroy({ where: { userId: user.id } });
    await Cart.destroy({ where: { userId: user.id } });
    await Order.destroy({ where: { userId: user.id } });

    await user.destroy({ force: true });
    res.json({ message: 'User permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user by admin (toggle isAdmin or update fields)
export const updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot update admin user via this endpoint' });
    const allowed = ['name', 'email', 'phone', 'street', 'city', 'state', 'zipcode', 'country', 'isAdmin'];
    const updateData = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updateData[key] = req.body[key];
    }
    await user.update(updateData);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot password — generate reset token and send email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    // Always respond success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({ resetToken: token, resetTokenExpiry: expiry });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Aninaya — Password Reset',
      text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
      html: `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
    });

    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
};

// Reset password — validate token and update password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });

    const user = await User.findOne({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    await user.update({ password, resetToken: null, resetTokenExpiry: null });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};
