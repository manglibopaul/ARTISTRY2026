"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Users", "street", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    });
    await queryInterface.addColumn("Users", "city", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    });
    await queryInterface.addColumn("Users", "state", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    });
    await queryInterface.addColumn("Users", "zipcode", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    });
    await queryInterface.addColumn("Users", "country", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    });
    await queryInterface.addColumn("Users", "phone", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    });
    await queryInterface.removeColumn("Users", "address");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Users", "address", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    });
    await queryInterface.removeColumn("Users", "street");
    await queryInterface.removeColumn("Users", "city");
    await queryInterface.removeColumn("Users", "state");
    await queryInterface.removeColumn("Users", "zipcode");
    await queryInterface.removeColumn("Users", "country");
    await queryInterface.removeColumn("Users", "phone");
  },
};
