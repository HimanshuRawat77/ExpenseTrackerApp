const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const apiResponse = require('../utils/apiResponse');

exports.getSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const userId = new mongoose.Types.ObjectId(req.userId);

    // Current month totals
    const currentTotals = await Transaction.aggregate([
      { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    currentTotals.forEach(t => {
      if (t._id === 'income') totalIncome = t.total;
      if (t._id === 'expense') totalExpenses = t.total;
    });

    const balance = totalIncome - totalExpenses;

    // Previous month totals
    const prevTotals = await Transaction.aggregate([
      { $match: { userId, date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);
    
    let prevIncome = 0;
    let prevExpenses = 0;
    prevTotals.forEach(t => {
      if (t._id === 'income') prevIncome = t.total;
      if (t._id === 'expense') prevExpenses = t.total;
    });

    // Category breakdown (expenses)
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$category", amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } }
    ]);

    // Top merchants (expenses)
    const topMerchants = await Transaction.aggregate([
      { $match: { userId, type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth }, merchant: { $ne: null } } },
      { $group: { _id: "$merchant", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Recent 5 transactions
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(5);

    // Average daily spending
    const daysElapsed = Math.max(1, now.getDate());
    const avgDailySpending = totalExpenses / daysElapsed;

    // Savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    return apiResponse.success(res, 200, 'Dashboard summary retrieved', {
      totalIncome,
      totalExpenses,
      balance,
      categoryBreakdown,
      recentTransactions,
      avgDailySpending,
      topMerchants,
      monthlyComparison: {
        currentMonth: { income: totalIncome, expenses: totalExpenses },
        previousMonth: { income: prevIncome, expenses: prevExpenses }
      },
      savingsRate
    });
  } catch (error) {
    next(error);
  }
};

exports.getSafeToSpend = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const userId = new mongoose.Types.ObjectId(req.userId);

    const totals = await Transaction.aggregate([
      { $match: { userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);

    let income = 0;
    let currentExpenses = 0;
    totals.forEach(t => {
      if (t._id === 'income') income = t.total;
      if (t._id === 'expense') currentExpenses = t.total;
    });

    const user = await User.findById(req.userId);
    let monthlyBudget = 0;
    if (user && user.monthlyBudget) {
      monthlyBudget = user.monthlyBudget;
    }

    const subscriptions = await Subscription.find({ userId, active: true });
    const upcomingFixed = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

    const savingsTarget = monthlyBudget > 0 ? monthlyBudget : income * 0.2;
    
    const discretionary = income - currentExpenses - upcomingFixed - savingsTarget;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
    
    const safeToSpendToday = Math.max(0, discretionary / daysRemaining);

    return apiResponse.success(res, 200, 'Safe to spend calculated', {
      income,
      currentExpenses,
      upcomingFixed,
      savingsTarget,
      discretionary,
      daysRemaining,
      safeToSpendToday
    });
  } catch (error) {
    next(error);
  }
};

exports.getTrends = async (req, res, next) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const trends = await Transaction.aggregate([
      { $match: { userId, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          expenses: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          income: 1,
          expenses: 1,
          balance: { $subtract: ["$income", "$expenses"] }
        }
      }
    ]);

    return apiResponse.success(res, 200, 'Trends retrieved', trends);
  } catch (error) {
    next(error);
  }
};
