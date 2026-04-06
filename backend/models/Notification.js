import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  meta: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
}, {
  timestamps: true,
})

export default Notification
