'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add index on Product name for getProductByName query optimization
      await queryInterface.addIndex('Products', ['name'], {
        name: 'idx_products_name',
        unique: false,
      });

      console.log('Product name index created successfully');
    } catch (error) {
      console.error('Error creating product name index:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Drop name index
      await queryInterface.removeIndex('Products', 'idx_products_name');

      console.log('Product name index dropped successfully');
    } catch (error) {
      console.error('Error dropping product name index:', error);
      throw error;
    }
  },
};
