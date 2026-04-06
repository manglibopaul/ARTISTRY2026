import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false,
    defaultValue: 'percentage',
    comment: 'percentage = % off, fixed = flat ₱ amount off',
  },
  discountValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'e.g. 10 for 10% or ₱10',
  },
  minOrderAmount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Minimum order subtotal required to use this coupon',
  },
  maxUses: {
    type: DataTypes.INTEGER,
    defaultValue: null,
    allowNull: true,
    comment: 'Maximum total redemptions (null = unlimited)',
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Coupon;
