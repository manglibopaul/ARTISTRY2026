import Sequelize from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../aninaya.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
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

const connectDB = async () => {
  if (dbConnected) return;

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    await ensureUsersDeletedAtColumn();
    await ensureReviewsImageUrlColumn();
    console.log('✅ Database synchronized successfully');

    dbConnected = true;
    console.log('✅ SQLite database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

export { sequelize, connectDB, User };
