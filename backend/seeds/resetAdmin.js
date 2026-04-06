// Commented out the code to prevent the creation or update of the admin user.
// const FORCE_EMAIL = 'admin@aninaya.co';
// const FORCE_PASSWORD = 'admin123';

// const resetAdmin = async () => {
//   try {
//     await connectDB();

//     const hashed = await bcryptjs.hash(FORCE_PASSWORD, 10);

//     const user = await User.findOne({ where: { email: FORCE_EMAIL } });
//     if (user) {
//       await user.update({ password: hashed, isAdmin: true, name: 'Admin' });
//       console.log('✅ Admin updated:', FORCE_EMAIL);
//     } else {
//       await User.create({ name: 'Admin', email: FORCE_EMAIL, password: FORCE_PASSWORD, isAdmin: true });
//       console.log('✅ Admin created:', FORCE_EMAIL);
//     }

//     console.log('ℹ️  Use password:', FORCE_PASSWORD);
//     process.exit(0);
//   } catch (err) {
//     console.error('❌ resetAdmin error:', err.message);
//     process.exit(1);
//   }
// };

// resetAdmin();