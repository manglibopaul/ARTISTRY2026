"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Sellers", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storeName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        defaultValue: '',
      },
      phone: {
        type: Sequelize.STRING,
      },
      address: {
        type: Sequelize.TEXT,
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      artisanType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      expertise: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      certifications: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      bio: {
        type: Sequelize.TEXT,
        defaultValue: '',
      },
      avatar: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      portfolioImages: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      pickupLocations: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      proofOfArtisan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      resetToken: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      resetTokenExpiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      shippingSettings: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      returnPolicy: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Sellers");
  },
};
