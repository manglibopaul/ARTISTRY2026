"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Users", "address", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Users", "address");
  },
};
