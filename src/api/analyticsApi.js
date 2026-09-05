import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedFetch } from './authApi';

const ANALYTICS_CACHE_KEY_PREFIX = '@expense_tracker_analytics_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

const CATEGORY_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#EC4899', '#06B6D4', '#F97316', '#64748B'
];

/**
 * Convert any date object or ISO string to the device's local calendar 'YYYY-MM-DD'
 */
export const toLocalCalendarDateKey = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get device's current timezone offset as '+HH:MM' or '-HH:MM'
 */
export const getDeviceTimezoneOffset = () => {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return `${sign}${pad(offsetMinutes / 60)}:${pad(offsetMinutes % 60)}`;
};

/**
 * Get device's named timezone (e.g. 'Asia/Kolkata', 'America/New_York')
 */
export const getDeviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
};

/**
 * Invalidate all cached analytics data (called on transaction create/edit/delete/sync)
 */
export const invalidateAnalyticsCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const analyticsKeys = keys.filter((k) => k.startsWith(ANALYTICS_CACHE_KEY_PREFIX));
    if (analyticsKeys.length > 0) {
      await AsyncStorage.multiRemove(analyticsKeys);
    }
  } catch (err) {
    // Handled silently
  }
};

/**
 * Compute analytics locally from AsyncStorage transactions (offline fallback)
 */
export const computeLocalAnalytics = async (period = 'this_month', monthsCount = 6) => {
  try {
    const savedExpenses = await AsyncStorage.getItem('expenses');
    const savedIncome = await AsyncStorage.getItem('income');

    const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
    const income = savedIncome ? JSON.parse(savedIncome) : [];

    const now = new Date();
    let rangeStart;
    let rangeEnd;

    switch (period) {
      case 'this_week': {
        // Exactly 7 calendar days (Monday to Sunday)
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
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
      default: {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        rangeEnd = new Date(rangeStart.getTime() + 29 * 24 * 60 * 60 * 1000);
        rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
    }

    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();

    // Filter by date range
    const periodExpenses = expenses.filter((e) => {
      const t = new Date(e.date || Date.now()).getTime();
      return t >= startMs && t <= endMs;
    });

    const periodIncome = income.filter((i) => {
      const t = new Date(i.date || Date.now()).getTime();
      return t >= startMs && t <= endMs;
    });

    const totalSpent = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalIncome = periodIncome.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const savings = totalIncome - totalSpent;
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;
    const transactionCount = periodExpenses.length + periodIncome.length;

    // Daily spending zero-filled map using device's actual local calendar day
    const dailyMap = {};
    periodExpenses.forEach((e) => {
      const key = toLocalCalendarDateKey(e.date || Date.now());
      dailyMap[key] = (dailyMap[key] || 0) + (Number(e.amount) || 0);
    });

    const dailySpending = [];
    const curr = new Date(rangeStart);
    const maxDaysCap = period === 'this_week' ? 7 : period === 'this_month' ? 30 : 370;
    let count = 0;
    while (curr <= rangeEnd && count < maxDaysCap) {
      const key = toLocalCalendarDateKey(curr);
      const amount = dailyMap[key] || 0;
      dailySpending.push({
        date: key,
        label: curr.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        day: curr.toLocaleDateString('en-US', { weekday: 'short' }),
        value: amount,
        amount,
      });
      curr.setDate(curr.getDate() + 1);
      count++;
    }

    // Category aggregation
    const catMap = {};
    periodExpenses.forEach((e) => {
      const cat = e.category || 'Other';
      if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 };
      catMap[cat].amount += Number(e.amount) || 0;
      catMap[cat].count += 1;
    });

    const allCategories = Object.entries(catMap)
      .map(([name, val], idx) => ({
        name,
        category: name,
        amount: val.amount,
        count: val.count,
        percentage: totalSpent > 0 ? Math.round((val.amount / totalSpent) * 100) : 0,
        rank: idx + 1,
      }))
      .sort((a, b) => b.amount - a.amount)
      .map((c, idx) => ({ ...c, rank: idx + 1 }));

    // Donut top 4 + Other
    let donutCategories = [];
    if (allCategories.length <= 5) {
      donutCategories = allCategories.map((c, i) => ({
        ...c,
        value: c.amount,
        text: `${c.percentage}%`,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
    } else {
      const top4 = allCategories.slice(0, 4);
      const rest = allCategories.slice(4);
      const otherAmount = rest.reduce((s, r) => s + r.amount, 0);
      const otherCount = rest.reduce((s, r) => s + r.count, 0);

      donutCategories = [
        ...top4.map((c, i) => ({
          ...c,
          value: c.amount,
          text: `${c.percentage}%`,
          color: CATEGORY_COLORS[i],
        })),
        {
          name: 'Other',
          category: 'Other',
          text: `${totalSpent > 0 ? Math.round((otherAmount / totalSpent) * 100) : 0}%`,
          value: otherAmount,
          amount: otherAmount,
          count: otherCount,
          percentage: totalSpent > 0 ? Math.round((otherAmount / totalSpent) * 100) : 0,
          color: CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
          rank: 5,
        },
      ];
    }

    // Income vs Expense Comparison (Grouped Side-by-Side with Centered Current/Relevant Period)
    let incomeExpenseComparison = null;

    if (period === 'this_week') {
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
        const label = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        weekDefs.push({
          start: wStart,
          end: wEnd,
          label,
          key: toLocalCalendarDateKey(wStart),
          isCurrent,
          isRelevant,
        });
      }

      const periods = weekDefs.map((def) => {
        const sMs = def.start.getTime();
        const eMs = def.end.getTime();

        const inc = income
          .filter((item) => {
            const t = new Date(item.date || Date.now()).getTime();
            return t >= sMs && t <= eMs;
          })
          .reduce((s, item) => s + (Number(item.amount) || 0), 0);

        const exp = expenses
          .filter((item) => {
            const t = new Date(item.date || Date.now()).getTime();
            return t >= sMs && t <= eMs;
          })
          .reduce((s, item) => s + (Number(item.amount) || 0), 0);

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
        currentIndex: 4,
        periods,
      };
    } else {
      let pastMonths = 4;
      let futureMonths = 2;
      let relevantMonthOffset = 0;

      if (period === 'last_month') {
        pastMonths = 4;
        futureMonths = 2;
        relevantMonthOffset = -1;
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
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          year: y,
          month: m + 1,
          isCurrent,
          isRelevant,
        });
        idx++;
      }

      const periods = monthDefs.map((def) => {
        const sMs = def.start.getTime();
        const eMs = def.end.getTime();

        const inc = income
          .filter((item) => {
            const t = new Date(item.date || Date.now()).getTime();
            return t >= sMs && t <= eMs;
          })
          .reduce((s, item) => s + (Number(item.amount) || 0), 0);

        const exp = expenses
          .filter((item) => {
            const t = new Date(item.date || Date.now()).getTime();
            return t >= sMs && t <= eMs;
          })
          .reduce((s, item) => s + (Number(item.amount) || 0), 0);

        return {
          month: def.key,
          label: def.label,
          year: def.year,
          income: Math.round(inc),
          expense: Math.round(exp),
          savings: Math.round(inc - exp),
          net: Math.round(inc - exp),
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

    return {
      period,
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
    };
  } catch (err) {
    return null;
  }
};

/**
 * Fetch detailed financial analytics from backend MongoDB aggregation
 * with automatic silent token refreshing and local offline fallback
 */
export const fetchAnalyticsFromBackend = async ({
  period = 'this_month',
  startDate,
  endDate,
  monthsCount = 6,
  forceRefresh = false,
} = {}) => {
  const cacheKey = `${ANALYTICS_CACHE_KEY_PREFIX}${period}_${startDate || ''}_${endDate || ''}_${monthsCount}`;

  // 1. Check local cache unless forceRefresh
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          return { success: true, data, isCached: true };
        }
      }
    } catch (e) {
      // Proceed to network
    }
  }

  // 2. Fetch from backend using authenticatedFetch (auto refreshes expired tokens)
  try {
    const deviceTimezone = getDeviceTimezone();
    const deviceOffset = getDeviceTimezoneOffset();

    const params = new URLSearchParams({
      period,
      monthsCount: String(monthsCount),
      timezone: deviceTimezone,
      timezoneOffset: deviceOffset,
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await authenticatedFetch(`/api/analytics?${params.toString()}`);
    const result = await response.json().catch(() => null);

    if (response.ok && result?.data) {
      // Cache response
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ timestamp: Date.now(), data: result.data })
      );
      return { success: true, data: result.data };
    }
  } catch (error) {
    // Handled below with local fallback
  }

  // 3. Robust local calculation fallback
  const localData = await computeLocalAnalytics(period, monthsCount);
  if (localData) {
    return { success: true, data: localData, isLocalFallback: true };
  }

  return {
    success: false,
    error: 'Unable to load analytics',
  };
};
