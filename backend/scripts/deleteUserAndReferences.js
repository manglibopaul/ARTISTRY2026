import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import ChatMessage from '../models/ChatMessage.js';
import Order from '../models/Order.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Review from '../models/Review.js';

const userId = 2; // Paul Manglibo's userId

const deleteUserAndReferences = async () => {
  try {
    await connectDB();
    await Cart.destroy({ where: { userId } });
    await ChatMessage.destroy({ where: { userId } });
    await Order.destroy({ where: { userId } });
    await ReturnRequest.destroy({ where: { userId } });
    await Review.destroy({ where: { userId } });
    const user = await User.findByPk(userId);
    if (user) {
      await user.destroy();
      console.log('Deleted user and all related records.');
    } else {
      console.log('User not found.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error deleting user and references:', err);
    process.exit(1);
  }
};

deleteUserAndReferences();
