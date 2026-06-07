"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Sellers', 'proofOfArtisanImages', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of uploaded proof of artisan image URLs',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Sellers', 'proofOfArtisanImages');
  },
};
