import { Sequelize } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

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
  street: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: '',
  },
  city: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: '',
  },
  state: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: '',
  },
  zipcode: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: '',
  },
  country: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: '',
  },
  phone: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: '',
  },
  isAdmin: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
}, {
  paranoid: true,
  deletedAt: 'deletedAt',
});

User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default User;
