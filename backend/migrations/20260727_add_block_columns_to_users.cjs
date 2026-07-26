"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('Users');

    if (!table.isBlocked) {
      await queryInterface.addColumn('Users', 'isBlocked', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Marks users that were administratively deleted and should not be re-registered',
      });
    }

    if (!table.blockedAt) {
      await queryInterface.addColumn('Users', 'blockedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when the account was blocked after admin deletion',
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('Users');

    if (table.isBlocked) {
      await queryInterface.removeColumn('Users', 'isBlocked');
    }

    if (table.blockedAt) {
      await queryInterface.removeColumn('Users', 'blockedAt');
    }
  },
};
