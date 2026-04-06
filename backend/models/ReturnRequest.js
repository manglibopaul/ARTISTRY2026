import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ReturnRequest = sequelize.define('ReturnRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of items being returned with productId, name, quantity, price',
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. defective, wrong-item, changed-mind, not-as-described, other',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed description from buyer',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    comment: 'pending | approved | rejected | refunded | completed',
  },
  refundAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  sellerNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Seller response/note to buyer',
  },
  buyerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  buyerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default ReturnRequest;
