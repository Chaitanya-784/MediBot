// authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Check if username is taken
router.post('/check-username', async (req, res) => {
  const username = (req.body.name || '').trim();
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const user = await User.findOne({ name: username });
    res.json({ available: !user }); // true = available
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Server error during username check' });
  }
});

router.post('/username-exists', async (req, res) => {
  const username = (req.body.name || '').trim();
  if (!username) return res.status(400).json({ error: '❌ Invalid Username !!' });

  try {
    const user = await User.findOne({ name: username });
    res.json({ exists: !!user }); // true = user exists
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Server error during username check' });
  }
});


router.post('/check-email', async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const user = await User.findOne({ email });
    res.json({ available: !user }); // true = email is available
  } catch (err) {
    console.error('Email check error:', err);
    res.status(500).json({ error: 'Server error during email check' });
  }
});


// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    console.log('Received registration data:', { name, email, phone });

    if (!/^\d{10}$/.test(phone)) {
  return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });

}
const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const domain = email.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      return res.status(400).json({ error: 'Only valid personal email domains are allowed (e.g., Gmail, Yahoo)' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { name}] });
    if (existingUser) {
      console.warn('User already exists:', existingUser);
      
      return res.status(409).json({ error: 'Email or Username already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    console.log("Password hash: ", passwordHash);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = new User({ name, email, phone, passwordHash, otp });
    await newUser.save();
    console.log('User saved successfully:', newUser);

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your MediBot Account',
text: `Hello,\n\nYour OTP to verify your MediBot account is: ${otp}\n\nDo not share it with anyone.\n\n- MediBot Team`

    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending OTP email:', error);
        return res.status(500).json({ error: 'OTP email failed' });
      }
      console.log('OTP email sent:', info.response);
      res.json({ message: 'OTP sent successfully' });
    });

  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});


// Verify OTP
router.post('/verify', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

  user.verified = true;
  user.otp = null;
  await user.save();
  res.json({ message: 'Verified successfully', userId: user._id });
});

// Login
router.post('/login', async (req, res) => {
  const { name: username, password } = req.body;

  // Step 1: Check if both username and password are provided
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Step 2: Find user by username
  const user = await User.findOne({ name: username });
  if (!user) return res.status(401).json({ error: 'Invalid username' });

  // Step 3: Log the password comparison for debugging
  console.log("Password entered:", password);
  console.log("Stored hash:", user.passwordHash);

  // Step 4: Compare entered password with stored password hash
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  // Step 5: Return successful login response
  res.json({ userId: user._id, name: user.name, email: user.email });
});


// Get profile
router.get('/profile/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ name: user.name, email: user.email });
});

module.exports = router;
