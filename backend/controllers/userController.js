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
import { normalizePhoneNumber, sendSms } from '../utils/sms.js';
import { Op } from 'sequelize';

const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

const signupOtpStore = new Map();
const signupPhoneOtpStore = new Map();
const SIGNUP_OTP_EXPIRY_MS = 10 * 60 * 1000;
const SIGNUP_OTP_MAX_ATTEMPTS = 5;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const buildSignupOtpHash = (email, otp) => {
  return crypto.createHash('sha256').update(`${normalizeEmail(email)}:${String(otp || '').trim()}`).digest('hex');
};

const buildPhoneOtpHash = (phone, otp) => {
  return crypto.createHash('sha256').update(`${normalizePhoneNumber(phone)}:${String(otp || '').trim()}`).digest('hex');
};

const validateSignupOtp = (email, otp) => {
  const key = normalizeEmail(email);
  const record = signupOtpStore.get(key);

  if (!record) {
    return { valid: false, message: 'OTP not found. Please request a new OTP.' };
  }

  if (record.expiresAt <= Date.now()) {
    signupOtpStore.delete(key);
    return { valid: false, message: 'OTP expired. Please request a new OTP.' };
  }

  if (record.attempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
    signupOtpStore.delete(key);
    return { valid: false, message: 'Too many invalid OTP attempts. Please request a new OTP.' };
  }

  if (record.hash !== buildSignupOtpHash(email, otp)) {
    record.attempts += 1;
    signupOtpStore.set(key, record);
    return { valid: false, message: 'Invalid OTP code.' };
  }

  return { valid: true };
};

const validatePhoneSignupOtp = (phone, otp) => {
  const key = normalizePhoneNumber(phone);
  const record = signupPhoneOtpStore.get(key);

  if (!record) {
    return { valid: false, message: 'Phone OTP not found. Please request a new OTP.' };
  }

  if (record.expiresAt <= Date.now()) {
    signupPhoneOtpStore.delete(key);
    return { valid: false, message: 'Phone OTP expired. Please request a new OTP.' };
  }

  if (record.attempts >= SIGNUP_OTP_MAX_ATTEMPTS) {
    signupPhoneOtpStore.delete(key);
    return { valid: false, message: 'Too many invalid phone OTP attempts. Please request a new OTP.' };
  }

  if (record.hash !== buildPhoneOtpHash(phone, otp)) {
    record.attempts += 1;
    signupPhoneOtpStore.set(key, record);
    return { valid: false, message: 'Invalid phone OTP code.' };
  }

  return { valid: true };
};

export const sendUserSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalized = normalizeEmail(email);

    if (!normalized) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Only send OTP to Gmail addresses to reduce abuse and ensure provider consistency
    const isGmail = normalized.endsWith('@gmail.com') || normalized.endsWith('@googlemail.com');
    if (!isGmail) {
      return res.status(400).json({ message: 'OTP can only be sent to Gmail addresses. Please provide a Gmail account.' });
    }

    const existing = await User.findOne({ where: { email: normalized }, paranoid: false });
    if (existing && !existing.deletedAt) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    signupOtpStore.set(normalized, {
      hash: buildSignupOtpHash(normalized, otp),
      expiresAt: Date.now() + SIGNUP_OTP_EXPIRY_MS,
      attempts: 0,
    });

    try {
      await sendEmail({
        to: normalized,
        subject: 'Aninaya — Your Sign-up OTP',
        text: `Your sign-up OTP is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your sign-up OTP is <strong style="font-size: 20px; letter-spacing: 2px;">${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      });
    } catch (mailErr) {
      signupOtpStore.delete(normalized);
      console.error('sendUserSignupOtp mail error:', mailErr && mailErr.message ? mailErr.message : mailErr);
      return res.status(500).json({ message: 'Failed to send OTP', error: String(mailErr && mailErr.message ? mailErr.message : mailErr) });
    }

    return res.json({ message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('sendUserSignupOtp error:', error);
    return res.status(500).json({ message: 'Failed to send OTP.' });
  }
};

export const sendUserSignupPhoneOtp = async (req, res) => {
  try {
    const normalizedPhone = normalizePhoneNumber(req.body.phone);

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Valid phone number is required.' });
    }

    const existing = await User.findOne({ where: { phone: normalizedPhone }, paranoid: false });
    if (existing && !existing.deletedAt) {
      return res.status(400).json({ message: 'Phone number is already registered.' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    signupPhoneOtpStore.set(normalizedPhone, {
      hash: buildPhoneOtpHash(normalizedPhone, otp),
      expiresAt: Date.now() + SIGNUP_OTP_EXPIRY_MS,
      attempts: 0,
    });

    try {
      await sendSms({
        to: normalizedPhone,
        body: `Your Artistry phone OTP is ${otp}. It expires in 10 minutes.`,
      });
    } catch (smsErr) {
      signupPhoneOtpStore.delete(normalizedPhone);
      console.error('sendUserSignupPhoneOtp sms error:', smsErr && smsErr.message ? smsErr.message : smsErr);
      return res.status(500).json({ message: 'Failed to send phone OTP', error: String(smsErr && smsErr.message ? smsErr.message : smsErr) });
    }

    return res.json({ message: 'Phone OTP sent successfully.' });
  } catch (error) {
    console.error('sendUserSignupPhoneOtp error:', error);
    return res.status(500).json({ message: 'Failed to send phone OTP.' });
  }
};

// Register user
export const register = async (req, res) => {
  try {
    const { name, email, password, street, city, state, zipcode, country, phone, otp, phoneOtp } = req.body;
    const normalized = normalizeEmail(email);
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!name || !normalized || !password || !street || !city || !state || !zipcode || !country || !normalizedPhone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required for sign up.' });
    }

    if (!phoneOtp) {
      return res.status(400).json({ message: 'Phone OTP is required for sign up.' });
    }

    let user = await User.findOne({ where: { email: normalized }, paranoid: false });
    if (user) {
      if (!user.deletedAt) {
        return res.status(400).json({ message: 'User already exists' });
      }
    }

    const otpValidation = validateSignupOtp(normalized, otp);
    if (!otpValidation.valid) {
      return res.status(400).json({ message: otpValidation.message });
    }

    const phoneOtpValidation = validatePhoneSignupOtp(normalizedPhone, phoneOtp);
    if (!phoneOtpValidation.valid) {
      return res.status(400).json({ message: phoneOtpValidation.message });
    }

    if (user && user.deletedAt) {
      await user.restore();
      await user.update({
        name,
        email: normalized,
        password,
        street,
        city,
        state,
        zipcode,
        country,
        phone: normalizedPhone,
      });

      signupOtpStore.delete(normalized);
      signupPhoneOtpStore.delete(normalizedPhone);

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

    user = await User.create({
      name,
      email: normalized,
      password,
      street,
      city,
      state,
      zipcode,
      country,
      phone: normalizedPhone,
    });

    signupOtpStore.delete(normalized);
    signupPhoneOtpStore.delete(normalizedPhone);

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

    const adminEmail = 'admin@artistry.local';
    const adminPassword = 'dS96n3ura6Xb7yzcAZTOf5IP';
    const adminName = process.env.ADMIN_NAME || 'Admin';

    // Deterministic recovery path for fresh/misaligned databases in deployment.
    if (String(email).toLowerCase() === adminEmail && password === adminPassword) {
      let admin = await User.findOne({ where: { email: adminEmail }, paranoid: false });
      if (!admin) {
        admin = await User.create({ name: adminName, email: adminEmail, password: adminPassword, isAdmin: true });
      } else {
        if (admin.deletedAt) await admin.restore();
        await admin.update({ name: adminName, password: adminPassword, isAdmin: true });
      }

      const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          isAdmin: true,
        },
      });
    }

    let user = await User.findOne({ where: { email } });

    // Auto-bootstrap admin account for freshly provisioned databases.
    if (!user && String(email).toLowerCase() === String(adminEmail).toLowerCase() && password === adminPassword) {
      user = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        isAdmin: true,
      });
    }

    // If admin account exists but was soft-deleted, restore it automatically.
    if (!user && String(email).toLowerCase() === String(adminEmail).toLowerCase()) {
      const deletedAdmin = await User.findOne({ where: { email: adminEmail }, paranoid: false });
      if (deletedAdmin?.deletedAt) {
        await deletedAdmin.restore();
        await deletedAdmin.update({ name: adminName, password: adminPassword, isAdmin: true });
        user = await User.findOne({ where: { email: adminEmail } });
      }
    }

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
    if (!user) {
      return res.status(404).json({ message: 'Email is not registered.' });
    }

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

    res.json({ message: 'Reset link sent to your registered email.' });
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
