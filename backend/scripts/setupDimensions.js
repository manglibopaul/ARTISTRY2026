import { sequelize } from '../config/database.js';

async function addDimensionsColumns() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');

    // Add columns using raw SQL (works across different databases)
    const queries = [
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS width FLOAT`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS height FLOAT`,
      `ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS depth FLOAT`,
    ];

    for (const query of queries) {
      try {
        await sequelize.query(query);
        console.log(`✓ Executed: ${query.substring(0, 50)}...`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`  Column already exists (skipped)`);
        } else {
          console.log(`  Error: ${err.message}`);
        }
      }
    }

    console.log('\n✓ Done! Dimensions columns are now ready.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Fatal error:', error.message);
    process.exit(1);
  }
}

addDimensionsColumns();
