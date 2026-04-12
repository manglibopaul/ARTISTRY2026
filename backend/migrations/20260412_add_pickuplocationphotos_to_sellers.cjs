"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Sellers', 'pickupLocationPhotos', {
      type: Sequelize.JSON,
      defaultValue: {},
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Sellers', 'pickupLocationPhotos');
  }
};
