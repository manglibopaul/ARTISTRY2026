import Sequelize from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. SQLite fallback has been removed.');
}

const isNeonConnection = (url = '') => /neon\.tech|neon\.postgres\.azure\.com/i.test(url);
const shouldUseSsl = (url = '') => {
  if (!url) return false;
  if (isNeonConnection(url)) return true;
  if (url.includes('sslmode=')) return true;
  return process.env.DB_SSL === 'true';
};

const baseConfig = {
  logging: false,
  pool: {
    // Keep idle footprint low so managed Postgres (e.g., Neon) can scale to zero.
    max: Number(process.env.DB_POOL_MAX) || 5,
    min: Number(process.env.DB_POOL_MIN ?? 0),
    acquire: 30000,
    idle: Number(process.env.DB_POOL_IDLE_MS) || 10000,
    evict: Number(process.env.DB_POOL_EVICT_MS) || 10000
  }
};

const sequelize = new Sequelize(databaseUrl, {
  ...baseConfig,
  dialect: 'postgres',
  dialectOptions: shouldUseSsl(databaseUrl)
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

const ensureUsersBlockColumns = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Users');
  if (!table.isBlocked) {
    await qi.addColumn('Users', 'isBlocked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
  if (!table.blockedAt) {
    await qi.addColumn('Users', 'blockedAt', {
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

const ensureProductsColorColumns = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Products');
  if (!table.colorableParts) {
    await qi.addColumn('Products', 'colorableParts', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });
  }
  if (!table.colorExclusions) {
    await qi.addColumn('Products', 'colorExclusions', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });
  }
  if (!table.colorChangeable) {
    await qi.addColumn('Products', 'colorChangeable', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
  if (!table.colorPartNames) {
    await qi.addColumn('Products', 'colorPartNames', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {},
    });
  }
};

const ensureOrdersCompletedAtColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Orders');
  if (!table.completedAt) {
    await qi.addColumn('Orders', 'completedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
};

const ensureOrdersGcashReceiptColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Orders');
  if (!table.gcashReceipt) {
    await qi.addColumn('Orders', 'gcashReceipt', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};

const ensureSellersPaymentSettingsColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Sellers');
  if (!table.paymentSettings) {
    await qi.addColumn('Sellers', 'paymentSettings', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {
        acceptsCOD: true,
        acceptsGCash: true,
        gcashAccountName: '',
        gcashNumber: '',
        gcashQr: '',
      },
    });
  }
};

const ensureSellersPickupMapsColumn = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Sellers');
  if (!table.pickupMaps) {
    await qi.addColumn('Sellers', 'pickupMaps', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
    });
  }
};

const ensureProductsDimensionsColumns = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Products');
  if (!table.width) {
    await qi.addColumn('Products', 'width', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  }
  if (!table.height) {
    await qi.addColumn('Products', 'height', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  }
  if (!table.depth) {
    await qi.addColumn('Products', 'depth', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  }
};

const ensureProductsArMetadataColumns = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Products');
  
  if (!table.volume) {
    await qi.addColumn('Products', 'volume', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  }
  if (!table.sizeCategory) {
    await qi.addColumn('Products', 'sizeCategory', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Medium',
    });
  }
  if (!table.arMetadata) {
    await qi.addColumn('Products', 'arMetadata', {
      type: Sequelize.JSON,
      defaultValue: {
        modelFormat: 'glb',
        hasTextures: false,
        hasAnimations: false,
        optimized: false,
      },
    });
  }
  if (!table.boundingBox) {
    await qi.addColumn('Products', 'boundingBox', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  }
};

const ensureProductsMaterialsAndSizeChartColumns = async () => {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Products');
  
  if (!table.materials) {
    await qi.addColumn('Products', 'materials', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
  if (!table.sizeChart) {
    await qi.addColumn('Products', 'sizeChart', {
      type: Sequelize.JSON,
      defaultValue: [],
    });
  }
};

const connectDB = async () => {
  if (dbConnected) return;

  try {
    await sequelize.authenticate();

    const runtimeSchemaEnabled = !isProduction || process.env.ENABLE_RUNTIME_SCHEMA_CHECKS === 'true';
    if (runtimeSchemaEnabled) {
      // Runtime schema checks are useful for development, but they can consume
      // Neon compute in production. Use migrations or explicit schema updates
      // for production deployments whenever possible.
      await sequelize.sync({ force: false });
      await ensureUsersDeletedAtColumn();
      await ensureUsersBlockColumns();
      await ensureReviewsImageUrlColumn();
      await ensureReviewsOrderIdColumn();
      await ensureProductsSizesColumn();
      await ensureProductsColorColumns();
      await ensureOrdersCompletedAtColumn();
      await ensureOrdersGcashReceiptColumn();
      await ensureSellersPaymentSettingsColumn();
      await ensureProductsDimensionsColumns();
      await ensureProductsArMetadataColumns();
      await ensureProductsMaterialsAndSizeChartColumns();
      // pickupMaps support removed; no runtime schema-ensure needed
      console.log('✅ Database synchronized successfully');
    } else {
      console.log('ℹ️ Runtime schema checks disabled for production. Ensure migrations are applied before deployment.');
    }

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
