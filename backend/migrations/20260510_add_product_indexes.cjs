'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add indexes to Products table for query performance
      await queryInterface.addIndex('Products', ['createdAt'], {
        name: 'idx_products_createdAt',
      });
      
      await queryInterface.addIndex('Products', ['sellerId'], {
        name: 'idx_products_sellerId',
      });
      
      await queryInterface.addIndex('Products', ['category'], {
        name: 'idx_products_category',
      });
      
      await queryInterface.addIndex('Products', ['stock'], {
        name: 'idx_products_stock',
      });
      
      await queryInterface.addIndex('Products', ['bestseller'], {
        name: 'idx_products_bestseller',
      });

      console.log('Product indexes created successfully');
    } catch (error) {
      console.error('Error creating product indexes:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Drop indexes
      await queryInterface.removeIndex('Products', 'idx_products_createdAt');
      await queryInterface.removeIndex('Products', 'idx_products_sellerId');
      await queryInterface.removeIndex('Products', 'idx_products_category');
      await queryInterface.removeIndex('Products', 'idx_products_stock');
      await queryInterface.removeIndex('Products', 'idx_products_bestseller');

      console.log('Product indexes dropped successfully');
    } catch (error) {
      console.error('Error dropping product indexes:', error);
      throw error;
    }
  },
};
