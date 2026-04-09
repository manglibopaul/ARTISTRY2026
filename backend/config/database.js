import Sequelize from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. SQLite fallback has been removed.');
}

const baseConfig = {
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const sequelize = new Sequelize(databaseUrl, {
  ...baseConfig,
  dialect: 'postgres',
  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
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

let dbConnected = false;

const ensureUsersDeletedAtColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Users');
  if (!table.deletedAt) {
    await qi.addColumn('Users', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
};

const ensureReviewsImageUrlColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Reviews');
  if (!table.imageUrl) {
    await qi.addColumn('Reviews', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};

const ensureReviewsOrderIdColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Reviews');
  if (!table.orderId) {
    await qi.addColumn('Reviews', 'orderId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }
};

const ensureProductsSizesColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Products');
  if (!table.sizes) {
    await qi.addColumn('Products', 'sizes', {
      type: Sequelize.JSON,
      defaultValue: [],
      allowNull: false,
    });
  }
};

const connectDB = async () => {
  if (dbConnected) return;

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    await ensureUsersDeletedAtColumn();
    await ensureReviewsImageUrlColumn();
    await ensureReviewsOrderIdColumn();
    await ensureProductsSizesColumn();
    console.log('✅ Database synchronized successfully');

    dbConnected = true;
    const dialect = sequelize.getDialect();
    console.log(`✅ ${dialect} database connected successfully (DATABASE_URL)`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

export { sequelize, connectDB, User };
