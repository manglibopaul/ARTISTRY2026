import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';

const checkDatabaseContents = async () => {
  try {
    await connectDB();

    const users = await User.findAll();
    const products = await Product.findAll();
    const sellers = await Seller.findAll();

    console.log(`Users: ${users.length}`);
    console.log(users);

    console.log(`Products: ${products.length}`);
    console.log(products);

    console.log(`Sellers: ${sellers.length}`);
    console.log(sellers);

    process.exit(0);
  } catch (error) {
    console.error('Error checking database contents:', error.message);
    process.exit(1);
  }
};

checkDatabaseContents();