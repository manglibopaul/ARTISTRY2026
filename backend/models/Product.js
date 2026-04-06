import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

import Seller from './Seller.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subCategory: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  colors: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  modelUrl: {
    type: DataTypes.STRING,
  },
  iosModel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bestseller: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Sellers',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  artisanType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., Crochet, Woodwork, Painting, Jewelry, Weaving, Pottery',
  },

}, {
  timestamps: true,
});

// Association: When a seller is deleted, delete their products
Product.belongsTo(Seller, { foreignKey: 'sellerId', onDelete: 'CASCADE' });
Seller.hasMany(Product, { foreignKey: 'sellerId', onDelete: 'CASCADE' });

export default Product;
