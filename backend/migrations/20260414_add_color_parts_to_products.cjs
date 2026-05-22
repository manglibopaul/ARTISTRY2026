"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Products', 'colorableParts', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    })
    await queryInterface.addColumn('Products', 'colorExclusions', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    })
    await queryInterface.addColumn('Products', 'colorChangeable', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Products', 'colorChangeable')
    await queryInterface.removeColumn('Products', 'colorExclusions')
    await queryInterface.removeColumn('Products', 'colorableParts')
  }
};
