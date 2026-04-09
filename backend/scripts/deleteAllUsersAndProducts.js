import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const deleteAllUsersAndProducts = async () => {
  try {
    await connectDB();
    const deletedUsers = await User.destroy({ where: {} });
    const deletedProducts = await Product.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedUsers} user(s) and ${deletedProducts} product(s)!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

deleteAllUsersAndProducts();
