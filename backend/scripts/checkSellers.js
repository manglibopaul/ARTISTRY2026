import { connectDB } from '../config/database.js';
import Seller from '../models/Seller.js';

const checkSellers = async () => {
  try {
    await connectDB();

    const sellers = await Seller.findAll();
    console.log('Sellers:', sellers);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fetching sellers:', error.message);
    process.exit(1);
  }
};

checkSellers();