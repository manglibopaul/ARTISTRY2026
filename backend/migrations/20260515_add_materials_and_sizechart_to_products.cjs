"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Products', 'materials', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Materials description for the product',
    });

    await queryInterface.addColumn('Products', 'sizeChart', {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Size chart with size, chest, length measurements',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Products', 'materials');
    await queryInterface.removeColumn('Products', 'sizeChart');
  }
};
