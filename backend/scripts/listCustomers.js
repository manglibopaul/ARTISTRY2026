import { sequelize, User } from '../config/database.js';

(async () => {
  try {
    await sequelize.authenticate();
    const customers = await User.findAll({ where: { isAdmin: false } });
    console.log('All customers in DB:', customers.map(u => u.toJSON()));
  } catch (err) {
    console.error('Error listing customers:', err);
  } finally {
    await sequelize.close();
  }
})();