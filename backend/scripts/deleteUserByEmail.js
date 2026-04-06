import { connectDB } from '../config/database.js';
import User from '../models/User.js';

const emailToDelete = 'manglibopaul@gmail.com';

const deleteUser = async () => {
  try {
    await connectDB();
    const user = await User.findOne({ where: { email: emailToDelete } });
    if (!user) {
      console.log('User not found.');
      process.exit(0);
    }
    await user.destroy();
    console.log(`Deleted user: ${user.name} (${user.email})`);
    process.exit(0);
  } catch (err) {
    console.error('Error deleting user:', err);
    process.exit(1);
  }
};

deleteUser();
