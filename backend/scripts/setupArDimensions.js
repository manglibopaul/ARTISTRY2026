import { sequelize } from '../config/database.js';
import Product from '../models/Product.js';

// Realistic 3D dimensions for different artisan types (in centimeters)
const dimensionsByArtisanType = {
  'Crochet': [
    { name: 'Small Amigurumi', width: 8, height: 10, depth: 6 },
    { name: 'Medium Blanket', width: 120, height: 150, depth: 3 },
    { name: 'Scarf', width: 20, height: 180, depth: 2 },
    { name: 'Hat', width: 22, height: 18, depth: 15 },
    { name: 'Cushion', width: 40, height: 40, depth: 15 },
  ],
  'Woodwork': [
    { name: 'Small Box', width: 15, height: 12, depth: 10 },
    { name: 'Medium Shelf', width: 60, height: 30, depth: 20 },
    { name: 'Large Frame', width: 50, height: 70, depth: 3 },
    { name: 'Decorative Stand', width: 25, height: 35, depth: 25 },
    { name: 'Cabinet', width: 80, height: 100, depth: 40 },
  ],
  'Painting': [
    { name: 'Small Canvas', width: 20, height: 25, depth: 2 },
    { name: 'Medium Canvas', width: 40, height: 50, depth: 2 },
    { name: 'Large Canvas', width: 60, height: 90, depth: 3 },
    { name: 'Portrait', width: 35, height: 45, depth: 2 },
    { name: 'Landscape', width: 80, height: 60, depth: 3 },
  ],
  'Jewelry': [
    { name: 'Ring', width: 2, height: 1.5, depth: 1.5 },
    { name: 'Necklace', width: 2, height: 45, depth: 1 },
    { name: 'Earrings', width: 3, height: 4, depth: 2 },
    { name: 'Bracelet', width: 2, height: 8, depth: 1.5 },
    { name: 'Pendant', width: 4, height: 6, depth: 2 },
  ],
  'Weaving': [
    { name: 'Small Tapestry', width: 40, height: 60, depth: 2 },
    { name: 'Medium Wall Hanging', width: 60, height: 80, depth: 2 },
    { name: 'Large Textile', width: 100, height: 120, depth: 2 },
    { name: 'Table Runner', width: 40, height: 180, depth: 1 },
    { name: 'Rug', width: 120, height: 180, depth: 2 },
  ],
  'Pottery': [
    { name: 'Small Mug', width: 8, height: 10, depth: 8 },
    { name: 'Bowl', width: 20, height: 12, depth: 20 },
    { name: 'Vase', width: 15, height: 30, depth: 15 },
    { name: 'Large Pot', width: 30, height: 35, depth: 30 },
    { name: 'Decorative Plate', width: 30, height: 3, depth: 30 },
  ],
  'Sculpture': [
    { name: 'Small Figurine', width: 10, height: 15, depth: 8 },
    { name: 'Medium Statue', width: 20, height: 40, depth: 20 },
    { name: 'Large Installation', width: 50, height: 80, depth: 50 },
    { name: 'Abstract Art', width: 30, height: 50, depth: 30 },
  ],
};

function getRealisticDimensions(artisanType) {
  if (!artisanType || !dimensionsByArtisanType[artisanType]) {
    // Default dimensions for unknown types
    return {
      width: 30,
      height: 30,
      depth: 20,
    };
  }

  const options = dimensionsByArtisanType[artisanType];
  const randomDimensions = options[Math.floor(Math.random() * options.length)];
  
  return {
    width: randomDimensions.width,
    height: randomDimensions.height,
    depth: randomDimensions.depth,
  };
}

async function setupArDimensions() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');

    // Ensure columns exist
    try {
      await sequelize.query(`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS width FLOAT`);
      await sequelize.query(`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS height FLOAT`);
      await sequelize.query(`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS depth FLOAT`);
      console.log('✓ Dimension columns verified');
    } catch (err) {
      console.log('  (Columns may already exist)');
    }

    // Get all products
    const products = await Product.findAll();
    console.log(`\n✓ Found ${products.length} total products\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      // Only update if no dimensions are set
      if (!product.width && !product.height && !product.depth) {
        const dimensions = getRealisticDimensions(product.artisanType);
        
        await product.update({
          width: dimensions.width,
          height: dimensions.height,
          depth: dimensions.depth,
        });

        const type = product.artisanType || 'Generic';
        console.log(
          `  ✓ "${product.name}" (${type})\n    → ${dimensions.width}×${dimensions.height}×${dimensions.depth} cm`
        );
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n✓ Setup complete!`);
    console.log(`  Updated: ${updated} products`);
    console.log(`  Skipped: ${skipped} products (already have dimensions)`);
    console.log(`  Total: ${products.length} products\n`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Fatal error:', error.message);
    process.exit(1);
  }
}

setupArDimensions();
