import { sequelize, User } from '../config/database.js';

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    const users = await User.findAll();
    console.log('All users in DB:', users.map(u => u.toJSON()));
  } catch (err) {
    console.error('Error listing users:', err);
  } finally {
    await sequelize.close();
  }
})();
