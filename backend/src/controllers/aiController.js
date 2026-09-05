const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const aiService = require('../services/aiService');
const apiResponse = require('../utils/apiResponse');

exports.getInsights = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Current month totals
    const currentTotals = await Transaction.aggregate([
      { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);

    let income = 0;
    let expenses = 0;
    currentTotals.forEach(t => {
      if (t._id === 'income') income = t.total;
      if (t._id === 'expense') expenses = t.total;
    });

    const balance = income - expenses;

    // 2. Previous month totals
    const prevTotals = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const prevExpenses = prevTotals.length > 0 ? prevTotals[0].total : 0;

    // 3. Month-over-month change percentage
    const momChange = prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : null;

    // 4. Category breakdown
    const rawCategories = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$category", amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } }
    ]);

    const categories = rawCategories.map(c => ({
      category: c._id,
      amount: c.amount,
      percentage: expenses > 0 ? Math.round((c.amount / expenses) * 100) : 0,
    }));

    // 5. User details & budget
    const user = await User.findById(req.userId).select('preferredCurrency monthlyBudget');
    const currency = user?.preferredCurrency || 'INR';
    const monthlyBudget = user?.monthlyBudget || 0;

    // 6. Safe to spend calculation
    const subscriptions = await Subscription.find({ userId, active: true });
    const upcomingFixed = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

    const savingsTarget = monthlyBudget > 0 ? monthlyBudget : income * 0.2;
    const discretionary = income - expenses - upcomingFixed - savingsTarget;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
    const safeToSpendToday = Math.max(0, discretionary / daysRemaining);

    // 7. Average daily spending
    const daysElapsed = Math.max(1, now.getDate());
    const avgDailySpending = expenses / daysElapsed;

    // 8. Package deterministic financial summary (no raw transactions)
    const financialSummary = {
      income,
      expenses,
      balance,
      prevExpenses,
      momChange,
      categories: categories.slice(0, 5), // top 5 only
      safeToSpendToday,
      daysRemaining,
      avgDailySpending,
      currency,
    };

    // 9. Generate structured insight
    const insightResult = await aiService.generateInsight(financialSummary);

    return apiResponse.success(res, 200, 'AI insight generated successfully', insightResult);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ai/receipt
 * Scan receipt image and return extracted transaction suggestion
 */
exports.scanReceipt = async (req, res, next) => {
  try {
    let buffer = null;
    let mimeType = 'image/jpeg';
    let base64 = null;

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body && req.body.imageBase64) {
      base64 = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    }

    if (!buffer && !base64) {
      return apiResponse.error(res, 400, 'Please upload or provide a valid receipt image.');
    }

    const extracted = await aiService.extractReceiptData({ buffer, mimeType, base64 });

    return apiResponse.success(res, 200, 'Receipt details extracted successfully', extracted);
  } catch (error) {
    console.warn('AI Receipt scan error:', error.message);
    const userMessage =
      error.message && !error.message.includes('GoogleGenerativeAI') && !error.message.includes('JSON')
        ? error.message
        : "We couldn't read this receipt clearly. Try taking a clearer photo.";
    return apiResponse.error(res, 422, userMessage);
  }
};

