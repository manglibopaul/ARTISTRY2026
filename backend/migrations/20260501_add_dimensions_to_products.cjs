'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = 'Products';
    const columns = await queryInterface.describeTable(table);
    
    // Only add columns if they don't exist
    if (!columns.width) {
      await queryInterface.addColumn(table, 'width', {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Width in centimeters',
      });
    }
    
    if (!columns.height) {
      await queryInterface.addColumn(table, 'height', {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Height in centimeters',
      });
    }
    
    if (!columns.depth) {
      await queryInterface.addColumn(table, 'depth', {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Depth in centimeters',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = 'Products';
    await queryInterface.removeColumn(table, 'width');
    await queryInterface.removeColumn(table, 'height');
    await queryInterface.removeColumn(table, 'depth');
  },
};
