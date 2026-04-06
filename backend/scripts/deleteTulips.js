import { connectDB, sequelize } from '../config/database.js';
import Product from '../models/Product.js';

const deleteProduct = async () => {
  try {
    await connectDB();
    const deleted = await Product.destroy({
      where: {
        name: 'Tulips'
      }
    });
    console.log(`✅ ${deleted} product(s) deleted!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

deleteProduct();
