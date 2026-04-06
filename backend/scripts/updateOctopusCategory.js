import { sequelize } from '../config/database.js';
import Product from '../models/Product.js';

async function updateOctopusCategory() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Find the Octopus Keychain product
    const product = await Product.findOne({
      where: { name: 'Octopus Keychain' }
    });

    if (product) {
      console.log('Found product:', product.name);
      console.log('Current category:', product.category);
      console.log('Current subCategory:', product.subCategory);

      // Update to Keychains
      await product.update({
        category: 'Keychains',
        subCategory: 'Keychains'
      });

      console.log('✓ Updated successfully!');
      console.log('New category:', product.category);
      console.log('New subCategory:', product.subCategory);
    } else {
      console.log('Product not found');
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateOctopusCategory();
