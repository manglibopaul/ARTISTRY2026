import { connectDB, User } from '../config/database.js';

const checkAdmins = async () => {
  try {
    await connectDB();

    const admins = await User.findAll({ where: { isAdmin: true } });
    console.log('Admins:', admins);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fetching admins:', error.message);
    process.exit(1);
  }
};

checkAdmins();