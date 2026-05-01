import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

const Seller = sequelize.define('Seller', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  storeName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING,
  },
  address: {
    type: DataTypes.TEXT,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  artisanType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., Crochet, Woodwork, Painting, Jewelry, Weaving, Pottery, etc.',
  },
  expertise: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of expertise tags (e.g., ["hand-dyed", "eco-friendly", "custom-orders"])',
  },
  certifications: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of certification objects with name, issuer, date',
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: '',
    comment: 'Detailed artisan bio/story',
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Profile photo URL',
  },
  portfolioImages: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of portfolio/gallery image URLs',
  },
  socialLinks: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Object of social/profile links, e.g. { website, instagram, facebook, tiktok }',
  },
  pickupLocations: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Array of pickup location strings set by the seller',
  },
  proofOfArtisan: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL of uploaded proof of artisan image (shop photo, etc.)',
  },
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  shippingSettings: {
    type: DataTypes.JSON,
    defaultValue: {
      freeShippingMinimum: 0,
      shippingRates: [
        { name: 'Standard Shipping', price: 40, estimatedDays: '5-7 business days' },
      ],
      processingTime: '1-3 business days',
      shipsFrom: '',
    },
    comment: 'Seller shipping configuration: rates, free shipping threshold, processing time',
  },
  paymentSettings: {
    type: DataTypes.JSON,
    defaultValue: {
      acceptsCOD: true,
      acceptsGCash: true,
      gcashAccountName: '',
      gcashNumber: '',
      gcashQr: '',
    },
    comment: 'Seller payment preferences and GCash information',
  },
  returnPolicy: {
    type: DataTypes.JSON,
    defaultValue: {
      acceptsReturns: true,
      returnWindow: 7,
      conditions: 'Item must be unused and in original packaging.',
      refundMethod: 'Original payment method',
    },
    comment: 'Seller return/refund policy settings',
  },
}, {
  timestamps: true,
  paranoid: true, // enables soft delete (deletedAt)
  deletedAt: 'deletedAt',
  hooks: {
    beforeCreate: async (seller) => {
      if (seller.password) {
        const salt = await bcrypt.genSalt(10);
        seller.password = await bcrypt.hash(seller.password, salt);
      }
    },
    beforeUpdate: async (seller) => {
      if (seller.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        seller.password = await bcrypt.hash(seller.password, salt);
      }
    },
  },
});

// Method to compare passwords
Seller.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default Seller;
