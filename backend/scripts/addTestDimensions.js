import { sequelize } from '../config/database.js';
import Product from '../models/Product.js';

async function addTestDimensions() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful');

    // Find products with modelUrl and add test dimensions if they don't have any
    const products = await Product.findAll({
      where: { modelUrl: { [sequelize.Sequelize.Op.ne]: null } },
      limit: 5,
    });

    console.log(`Found ${products.length} products with 3D models`);

    for (const product of products) {
      if (!product.width && !product.height && !product.depth) {
        await product.update({
          width: 15,  // cm
          height: 20, // cm
          depth: 10,  // cm
        });
        console.log(`✓ Updated "${product.name}" with test dimensions: 15x20x10 cm`);
      } else {
        console.log(`  "${product.name}" already has dimensions`);
      }
    }

    console.log('\nDone! Dimensions added to products.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addTestDimensions();
