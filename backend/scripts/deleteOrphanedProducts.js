
import { connectDB } from '../config/database.js';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';

const deleteOrphanedProducts = async () => {
  try {
    await connectDB();
    // Get all seller IDs
    const sellers = await Seller.findAll({ attributes: ['id'] });
    const sellerIds = sellers.map(s => s.id);
    let orphanedProducts = [];
    if (sellerIds.length === 0) {
      // No sellers at all, delete all products
      orphanedProducts = await Product.findAll();
    } else {
      // Find products whose sellerId is not in sellerIds
      orphanedProducts = await Product.findAll({
        where: {
          sellerId: { notIn: sellerIds }
        }
      });
    }
    if (orphanedProducts.length === 0) {
      console.log('No orphaned products found.');
      process.exit(0);
    }
    for (const product of orphanedProducts) {
      await product.destroy();
      console.log(`Deleted product: ${product.name} (id: ${product.id})`);
    }
    console.log('✅ Orphaned products deleted.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

deleteOrphanedProducts();
