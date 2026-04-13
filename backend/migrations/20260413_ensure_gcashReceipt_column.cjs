"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const tableDesc = await queryInterface.describeTable('Orders');
      if (!tableDesc.gcashReceipt) {
        await queryInterface.addColumn('Orders', 'gcashReceipt', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }
    } catch (e) {
      // Fallback: attempt raw ALTER TABLE for DBs that may not support describeTable in this environment
      try {
        await queryInterface.sequelize.query('ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "gcashReceipt" TEXT;');
      } catch (err) {
        // Last resort: try SQLite-friendly ALTER TABLE without IF NOT EXISTS, ignore errors
        try {
          await queryInterface.sequelize.query('ALTER TABLE Orders ADD COLUMN gcashReceipt TEXT;');
        } catch (ignore) {
          console.warn('Could not add gcashReceipt column via migration:', ignore.message || ignore);
        }
      }
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('Orders', 'gcashReceipt');
    } catch (e) {
      // ignore
    }
  }
};
