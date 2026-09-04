const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const apiResponse = require('../utils/apiResponse');

// Helper function
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE });
  const refreshToken = jwt.sign({ userId }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRE });
  return { accessToken, refreshToken };
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, preferredCurrency, monthlyBudget } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      passwordHash: password, // Pre-save hook will hash it
      preferredCurrency,
      monthlyBudget
    });

    const tokens = generateTokens(user._id);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(201).json({ user, ...tokens });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash +refreshTokens');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user._id);
    
    user.refreshTokens.push(tokens.refreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift(); // Keep only the last 5 tokens
    }
    await user.save();

    res.status(200).json({ user, ...tokens });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, preferredCurrency, monthlyBudget, profileImage } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (preferredCurrency !== undefined) updates.preferredCurrency = preferredCurrency;
    if (monthlyBudget !== undefined) updates.monthlyBudget = monthlyBudget;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      // Token reuse detection
      user.refreshTokens = [];
      await user.save();
      return res.status(401).json({ error: 'Security alert: Token reuse detected. All sessions terminated.' });
    }

    // Remove old token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    
    // Generate new pair
    const tokens = generateTokens(user._id);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.userId).select('+refreshTokens');
    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+passwordHash +refreshTokens');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    user.passwordHash = newPassword;
    user.refreshTokens = []; // Force re-login on all devices
    await user.save();

    const tokens = generateTokens(user._id);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save(); // Need to save the new refresh token

    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.userId).select('+passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Delete related data (assumed imports or mongoose pre-remove hooks)
    const Transaction = require('../models/Transaction');
    const Budget = require('../models/Budget');
    const Goal = require('../models/Goal');
    const Subscription = require('../models/Subscription');

    await Promise.all([
      Transaction.deleteMany({ userId: req.userId }),
      Budget.deleteMany({ userId: req.userId }),
      Goal.deleteMany({ userId: req.userId }),
      Subscription.deleteMany({ userId: req.userId })
    ]);

    await user.deleteOne();

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};
