import dotenv from 'dotenv';
import User from '../models/User.js';
import { connectDB, sequelize } from '../config/database.js';
import bcryptjs from 'bcryptjs';
import bcrypt from 'bcryptjs';

dotenv.config();

const ADMIN_NAME = 'Artistry Admin';
const ADMIN_EMAIL = 'admin@artistry.local';
const ADMIN_PASSWORD = 'ArtistrySecure2026!';

const createAdmin = async () => {
  try {
    await connectDB();

    console.log('Using database file:', sequelize.options.storage);

    // Debugging: Log available methods on the User model
    console.log('Available methods on User model:', Object.keys(User));

    const email = 'admin@artistry.local';
    const password = 'dS96n3ura6Xb7yzcAZTOf5IP';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [admin, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        name: 'Admin',
        email,
        password: hashedPassword,
        isAdmin: true,
      },
    });

    if (created) {
      console.log('✅ Admin account created:', email);
    } else {
      console.log('ℹ️ Admin account already exists:', email);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  }
};

createAdmin();
