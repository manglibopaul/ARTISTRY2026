import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from './User.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  email: DataTypes.STRING,
  street: DataTypes.STRING,
  city: DataTypes.STRING,
  state: DataTypes.STRING,
  zipcode: DataTypes.STRING,
  country: DataTypes.STRING,
  phone: DataTypes.STRING,
  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  shippingFee: {
    type: DataTypes.FLOAT,
    defaultValue: 40,
  },
  commission: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  discount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  couponCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pickupLocation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reservationDateTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reservationNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // NOTE: `gcashReceipt` intentionally omitted from model as an emergency
  // runtime fix to avoid production DB schema mismatch errors. The field
  // is only required when paymentMethod === 'gcash'. A proper migration
  // and schema normalization should be applied later.
  workingDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of working days needed to prepare the product for pickup',
  },
  estimatedReadyDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Estimated date when the product will be ready for pickup',
  },
  paymentStatus: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
  orderStatus: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
  trackingNumber: DataTypes.STRING,
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Order;
