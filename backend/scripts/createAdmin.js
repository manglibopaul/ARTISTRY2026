import dotenv from 'dotenv';
import User from '../models/User.js';
import { connectDB, sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@artistry.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dS96n3ura6Xb7yzcAZTOf5IP';

const createAdmin = async () => {
  try {
    await connectDB();

    console.log('Using database file:', sequelize.options.storage);

    // Debugging: Log available methods on the User model
    console.log('Available methods on User model:', Object.keys(User));

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const existing = await User.findOne({ where: { email: ADMIN_EMAIL }, paranoid: false });

    if (existing) {
      if (existing.deletedAt) await existing.restore();
      await existing.update({
        name: ADMIN_NAME,
        password: hashedPassword,
        isAdmin: true,
      });
      console.log('✅ Admin account reset:', ADMIN_EMAIL);
    } else {
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        isAdmin: true,
      });
      console.log('✅ Admin account created:', ADMIN_EMAIL);
    }

    console.log('ℹ️ Admin login email:', ADMIN_EMAIL);
    console.log('ℹ️ Admin login password:', ADMIN_PASSWORD);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  }
};

createAdmin();
