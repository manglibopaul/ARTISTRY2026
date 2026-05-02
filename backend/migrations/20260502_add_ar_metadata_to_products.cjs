'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = 'Products';
    const columns = await queryInterface.describeTable(table);

    // Add AR-specific metadata columns
    if (!columns.arMetadata) {
      await queryInterface.addColumn(table, 'arMetadata', {
        type: Sequelize.JSON,
        defaultValue: {
          modelFormat: 'glb', // glb, usdz, obj, fbx
          hasTextures: false,
          hasAnimations: false,
          optimized: false,
        },
        comment: 'AR model metadata (format, features, optimization status)',
      });
    }

    if (!columns.boundingBox) {
      await queryInterface.addColumn(table, 'boundingBox', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Bounding box dimensions for collision detection',
      });
    }

    if (!columns.volume) {
      await queryInterface.addColumn(table, 'volume', {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'Calculated volume in cm³',
      });
    }

    if (!columns.sizeCategory) {
      await queryInterface.addColumn(table, 'sizeCategory', {
        type: Sequelize.ENUM('Tiny', 'Small', 'Medium', 'Large', 'Extra Large'),
        allowNull: true,
        comment: 'Size classification based on volume',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = 'Products';
    try {
      await queryInterface.removeColumn(table, 'arMetadata');
      await queryInterface.removeColumn(table, 'boundingBox');
      await queryInterface.removeColumn(table, 'volume');
      await queryInterface.removeColumn(table, 'sizeCategory');
    } catch (err) {
      // Columns may not exist
    }
  },
};
