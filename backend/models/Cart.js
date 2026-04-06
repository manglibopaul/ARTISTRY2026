import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import User from './User.js';

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id',
    },
  },
  items: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

export default Cart;
