import { sequelize } from '../config/database.js';
import Product from '../models/Product.js';

async function addTestDimensions() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');

    // First, ensure the columns exist
    try {
      await sequelize.query(`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS width FLOAT`);
      await sequelize.query(`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS height FLOAT`);
      await sequelize.query(`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS depth FLOAT`);
      console.log('✓ Dimensions columns verified/created');
    } catch (err) {
      console.log('  (Columns may already exist)');
    }

    // Find products with modelUrl and add test dimensions if they don't have any
    const products = await Product.findAll({
      where: { modelUrl: { [sequelize.Sequelize.Op.ne]: null } },
      limit: 10,
    });

    console.log(`\n✓ Found ${products.length} products with 3D models`);

    let updated = 0;
    for (const product of products) {
      if (!product.width && !product.height && !product.depth) {
        await product.update({
          width: 15,  // cm
          height: 20, // cm
          depth: 10,  // cm
        });
        console.log(`  ✓ "${product.name}" → 15×20×10 cm`);
        updated++;
      }
    }

    console.log(`\n✓ Updated ${updated} products with test dimensions.`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Fatal error:', error.message);
    process.exit(1);
  }
}

addTestDimensions();
