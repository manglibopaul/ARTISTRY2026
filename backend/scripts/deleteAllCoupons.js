import Coupon from '../models/Coupon.js';
import { sequelize, connectDB } from '../config/database.js';

(async () => {
  try {
    await connectDB();
    await Coupon.destroy({ where: {} });
    console.log('All coupons deleted');
  } catch (err) {
    console.error('Error deleting coupons:', err);
  } finally {
    await sequelize.close();
  }
})();
