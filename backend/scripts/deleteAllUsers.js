import { connectDB } from '../config/database.js';
import User from '../models/User.js';

const deleteAllUsers = async () => {
  try {
    await connectDB();

    const deletedUsers = await User.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedUsers} user(s) from the database.`);

    process.exit(0);
  } catch (error) {
    console.error('Error deleting users:', error.message);
    process.exit(1);
  }
};

deleteAllUsers();