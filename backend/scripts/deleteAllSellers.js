import { connectDB } from '../config/database.js';
import Seller from '../models/Seller.js';

const deleteAllSellers = async () => {
  try {
    await connectDB();

    const deletedCount = await Seller.destroy({ where: {}, truncate: true });
    console.log(`✅ Deleted ${deletedCount} seller(s) from the database.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting sellers:', error.message);
    process.exit(1);
  }
};

deleteAllSellers();
