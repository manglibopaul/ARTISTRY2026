import { sequelize } from '../config/database.js';

const checkTables = async () => {
  try {
    const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('Tables in database:', results);
    process.exit(0);
  } catch (error) {
    console.error('Error checking tables:', error.message);
    process.exit(1);
  }
};

checkTables();