import { sequelize, connectDB, registerModels } from '../config/database.js';

const syncDatabase = async () => {
  try {
    await connectDB();
    console.log('Using database file:', sequelize.options.storage);
    registerModels();
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};

syncDatabase();