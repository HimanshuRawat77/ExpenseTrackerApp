const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const apiResponse = require('../utils/apiResponse');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORY_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#64748B', // Slate / Other
];

/**
 * Helper to get date boundaries based on period and timezone offset
 */
function getDateRange(period = 'this_month', customStart, customEnd) {
  const now = new Date();
  let rangeStart;
  let rangeEnd;

  switch (period) {
    case 'this_week': {
      // Exactly 7 calendar days (Monday to Sunday)
      const currentDay = now.getDay(); // 0 is Sunday
      const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      rangeEnd = new Date(rangeStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      rangeEnd.setHours(23, 59, 59, 999);
      break;
    }
    case 'this_month': {
      // Exactly 30 calendar days starting from day 1
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      rangeEnd = new Date(rangeStart.getTime() + 29 * 24 * 60 * 60 * 1000);
      rangeEnd.setHours(23, 59, 59, 999);
      break;
    }
    case 'last_month': {
      // The actual days in the previous calendar month
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'last_3_months': {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'last_6_months': {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'last_12_months': {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      rangeStart = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = customEnd ? new Date(customEnd) : now;
      break;
    }
    default: {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      rangeEnd = new Date(rangeStart.getTime() + 29 * 24 * 60 * 60 * 1000);
      rangeEnd.setHours(23, 59, 59, 999);
      break;
    }
  }

  return { rangeStart, rangeEnd };
}

/**
 * Helper to validate timezone string
 */
function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  if (/^[+-]\d{2}:\d{2}$/.test(tz) || tz === 'Z' || tz === 'UTC') return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Format Date to YYYY-MM-DD using timezone or offset
 */
function formatDateKey(date, tz) {
  if (tz && !/^[+-]/.test(tz)) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    } catch (e) {}
  }
  if (tz && /^[+-]\d{2}:\d{2}$/.test(tz)) {
    const sign = tz[0] === '+' ? 1 : -1;
    const hours = parseInt(tz.slice(1, 3), 10);
    const mins = parseInt(tz.slice(4, 6), 10);
    const offsetMs = sign * (hours * 60 + mins) * 60 * 1000;
    const target = new Date(date.getTime() + offsetMs);
    const y = target.getUTCFullYear();
    const m = String(target.getUTCMonth() + 1).padStart(2, '0');
    const d = String(target.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format Date to "Sep 1"
 */
function formatDateLabel(date, tz) {
  const key = formatDateKey(date, tz);
  const parts = key.split('-');
  const m = MONTH_NAMES[parseInt(parts[1], 10) - 1] || 'Jan';
  const d = parseInt(parts[2], 10) || 1;
  return `${m} ${d}`;
}

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { period = 'this_month', startDate, endDate, monthsCount = 6, timezone, timezoneOffset } = req.query;

    const clientTz = isValidTimezone(timezone)
      ? timezone
      : isValidTimezone(timezoneOffset)
      ? timezoneOffset
      : 'UTC';

    const { rangeStart, rangeEnd } = getDateRange(period, startDate, endDate);

    // 1. Summary Metrics Aggregation
    const summaryAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalSpent = 0;
    let totalIncome = 0;
    let transactionCount = 0;

    summaryAgg.forEach((item) => {
      if (item._id === 'expense') {
        totalSpent = item.total;
        transactionCount += item.count;
      } else if (item._id === 'income') {
        totalIncome = item.total;
        transactionCount += item.count;
      }
    });

    const savings = totalIncome - totalSpent;
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

    // 2. Daily Spending Aggregation (Zero-filled for every calendar day in range)
    const dailyExpensesAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: clientTz },
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyMap = {};
    dailyExpensesAgg.forEach((item) => {
      dailyMap[item._id] = item.amount;
    });

    const dailySpending = [];
    const currentDate = new Date(rangeStart);
    // Exact day cap based on selected period
    const maxDaysCap = period === 'this_week' ? 7 : period === 'this_month' ? 30 : 370;
    let daysCount = 0;
    while (currentDate <= rangeEnd && daysCount < maxDaysCap) {
      const key = formatDateKey(currentDate, clientTz);
      const label = formatDateLabel(currentDate, clientTz);
      const amount = dailyMap[key] || 0;

      dailySpending.push({
        date: key,
        label,
        day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        value: amount,
        amount,
      });

      currentDate.setDate(currentDate.getDate() + 1);
      daysCount++;
    }

    // 3. Income vs Expense Comparison (Grouped Side-by-Side Bars with Centered Current/Relevant Period)
    let incomeExpenseComparison = null;
    const now = new Date();

    if (period === 'this_week') {
      // Weekly aggregation: 4 past weeks, current week (index 4, centered), 2 newer weeks
      const currentDayOfWeek = now.getDay();
      const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday, 0, 0, 0, 0);

      const weekDefs = [];
      for (let w = -4; w <= 2; w++) {
        const wStart = new Date(currentMonday);
        wStart.setDate(currentMonday.getDate() + w * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        const isCurrent = w === 0;
        const isRelevant = w === 0;
        const label = formatDateLabel(wStart, clientTz);

        weekDefs.push({
          start: wStart,
          end: wEnd,
          label,
          key: formatDateKey(wStart, clientTz),
          isCurrent,
          isRelevant,
        });
      }

      const minWeekDate = weekDefs[0].start;
      const maxWeekDate = weekDefs[weekDefs.length - 1].end;

      const weeklyTxs = await Transaction.find({
        userId,
        date: { $gte: minWeekDate, $lte: maxWeekDate },
      }).select('type amount date').lean();

      const periods = weekDefs.map((def) => {
        let inc = 0;
        let exp = 0;
        const sMs = def.start.getTime();
        const eMs = def.end.getTime();

        weeklyTxs.forEach((t) => {
          const tMs = new Date(t.date).getTime();
          if (tMs >= sMs && tMs <= eMs) {
            if (t.type === 'income') inc += Number(t.amount) || 0;
            else if (t.type === 'expense') exp += Number(t.amount) || 0;
          }
        });

        return {
          key: def.key,
          label: def.label,
          income: Math.round(inc),
          expense: Math.round(exp),
          savings: Math.round(inc - exp),
          isCurrent: def.isCurrent,
          isRelevant: def.isRelevant,
        };
      });

      incomeExpenseComparison = {
        type: 'weekly',
        xAxisTitle: 'Week',
        currentIndex: 4, // index 4 = current week in the center
        periods,
      };
    } else {
      // Monthly aggregation
      let pastMonths = 4;
      let futureMonths = 2;
      let relevantMonthOffset = 0;

      if (period === 'last_month') {
        pastMonths = 4;
        futureMonths = 2;
        relevantMonthOffset = -1; // 1 month ago is relevant and centered
      } else if (period === 'last_3_months') {
        pastMonths = 3;
        futureMonths = 1;
        relevantMonthOffset = 0;
      } else if (period === 'last_6_months') {
        pastMonths = 6;
        futureMonths = 1;
        relevantMonthOffset = 0;
      } else if (period === 'last_12_months') {
        pastMonths = 11;
        futureMonths = 1;
        relevantMonthOffset = 0;
      }

      const monthDefs = [];
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let targetIndex = 0;
      let idx = 0;
      for (let offset = -pastMonths; offset <= futureMonths; offset++) {
        const d = new Date(currentYear, currentMonth + offset, 1, 0, 0, 0, 0);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const dEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

        const isCurrent = offset === 0;
        const isRelevant = offset === relevantMonthOffset;
        if (isRelevant) {
          targetIndex = idx;
        }

        monthDefs.push({
          start: d,
          end: dEnd,
          key,
          label: MONTH_NAMES[m],
          year: y,
          isCurrent,
          isRelevant,
        });
        idx++;
      }

      const minMonthDate = monthDefs[0].start;
      const maxMonthDate = monthDefs[monthDefs.length - 1].end;

      const monthlyAgg = await Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: minMonthDate, $lte: maxMonthDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { date: '$date', timezone: clientTz } },
              month: { $month: { date: '$date', timezone: clientTz } },
              type: '$type',
            },
            total: { $sum: '$amount' },
          },
        },
      ]);

      const monthlyMap = {};
      monthlyAgg.forEach((item) => {
        const y = item._id.year;
        const m = String(item._id.month).padStart(2, '0');
        const key = `${y}-${m}`;
        if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expense: 0 };
        if (item._id.type === 'income') monthlyMap[key].income = item.total;
        else if (item._id.type === 'expense') monthlyMap[key].expense = item.total;
      });

      const periods = monthDefs.map((def) => {
        const data = monthlyMap[def.key] || { income: 0, expense: 0 };
        return {
          month: def.key,
          label: def.label,
          year: def.year,
          income: Math.round(data.income),
          expense: Math.round(data.expense),
          savings: Math.round(data.income - data.expense),
          isCurrent: def.isCurrent,
          isRelevant: def.isRelevant,
        };
      });

      incomeExpenseComparison = {
        type: 'monthly',
        xAxisTitle: 'Month',
        currentIndex: targetIndex,
        periods,
      };
    }

    const monthlyComparison = incomeExpenseComparison.periods;

    // 4. Category-wise Spending (Donut Chart with small slices grouped into 'Other')
    const categoryAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const allCategories = categoryAgg.map((cat, idx) => ({
      name: cat._id || 'Other',
      category: cat._id || 'Other',
      amount: cat.amount,
      count: cat.count,
      percentage: totalSpent > 0 ? Math.round((cat.amount / totalSpent) * 100) : 0,
      rank: idx + 1,
    }));

    // Group small categories into 'Other' if more than 5 categories
    let donutCategories = [];
    if (allCategories.length <= 5) {
      donutCategories = allCategories.map((c, i) => ({
        ...c,
        value: c.amount,
        text: c.category,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
    } else {
      const topCategories = allCategories.slice(0, 4);
      const remaining = allCategories.slice(4);
      const otherAmount = remaining.reduce((sum, r) => sum + r.amount, 0);
      const otherCount = remaining.reduce((sum, r) => sum + r.count, 0);

      donutCategories = [
        ...topCategories.map((c, i) => ({
          ...c,
          value: c.amount,
          text: c.category,
          color: CATEGORY_COLORS[i],
        })),
        {
          name: 'Other',
          category: 'Other',
          text: 'Other',
          value: otherAmount,
          amount: otherAmount,
          count: otherCount,
          percentage: totalSpent > 0 ? Math.round((otherAmount / totalSpent) * 100) : 0,
          color: CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
          rank: 5,
        },
      ];
    }

    return apiResponse.success(res, 200, 'Analytics retrieved successfully', {
      period,
      dateRange: {
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      },
      summary: {
        totalSpent,
        totalExpenses: totalSpent,
        totalIncome,
        savings,
        netSavings: savings,
        savingsRate,
        transactionCount,
      },
      dailySpending,
      monthlyComparison,
      incomeExpenseComparison,
      donutCategories,
      categoryRanking: allCategories,
    });
  } catch (error) {
    next(error);
  }
};
