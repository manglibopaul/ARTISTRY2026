import { connectDB } from '../config/database.js';
import Product from '../models/Product.js';

const products = [];

const seedDatabase = async () => {
  try {
    await connectDB();
    await Product.truncate();
    console.log('✅ 0 products seeded!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
