import { sequelize } from '../config/database.js';
import Seller from '../models/Seller.js';

(async () => {
  try {
    await sequelize.authenticate();
    const sellers = await Seller.findAll();
    console.log('All sellers in DB:', sellers.map(s => s.toJSON()));
  } catch (err) {
    console.error('Error listing sellers:', err);
  } finally {
    await sequelize.close();
  }
})();