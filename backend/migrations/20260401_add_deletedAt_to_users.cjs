"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("Users");
    if (!table.deletedAt) {
      await queryInterface.addColumn("Users", "deletedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("Users");
    if (table.deletedAt) {
      await queryInterface.removeColumn("Users", "deletedAt");
    }
  },
};
