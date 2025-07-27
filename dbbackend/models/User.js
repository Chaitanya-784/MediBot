const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  email: { type: String, unique: true },
  phone: String,
  passwordHash: String,
  verified: { type: Boolean, default: false },
  otp: String
});

module.exports = mongoose.model('User', userSchema);
