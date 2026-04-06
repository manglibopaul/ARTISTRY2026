import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './aninaya.db',
  logging: false,
});

const User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  isAdmin: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    await sequelize.sync({ force: true });
    console.log('✅ Database synchronized successfully');

    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      isAdmin: true,
    });

    console.log('✅ User created:', user.toJSON());
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
})();