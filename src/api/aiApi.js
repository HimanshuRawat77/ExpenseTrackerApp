import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkingBaseUrl } from './config';

const CACHE_KEY = 'ai_insight_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

/**
 * In-memory cache for snappy renders
 */
let memoryCache = null;

/**
 * Invalidate AI insight cache (e.g. called when transaction is created/deleted)
 */
export const invalidateAIInsightCache = async () => {
  memoryCache = null;
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (err) {
    // Handled silently
  }
};

/**
 * Deterministic fallback generator for client-side offline or unauthenticated mode
 */
const generateLocalStructuredInsight = (expenses = [], income = [], currencySymbol = '₹') => {
  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalIncome = income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  const categoryTotals = {};
  expenses.forEach((ex) => {
    const cat = ex.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(ex.amount) || 0);
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      category: name,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (expenses.length === 0 && income.length === 0) {
    return {
      type: 'spending_trend',
      title: 'Welcome to Expense Tracker',
      message: 'Start logging your daily expenses to see personalized financial insights.',
      recommendation: 'Tap the + button to record your first transaction.',
      severity: 'info',
    };
  }

  if (totalExpense > 0 && sortedCategories.length > 0) {
    const top = sortedCategories[0];

    if (totalIncome > 0 && totalExpense > totalIncome) {
      return {
        type: 'budget_warning',
        title: 'Spending Exceeds Income',
        message: `Your total spending of ${currencySymbol}${totalExpense.toLocaleString('en-IN')} exceeds your recorded income.`,
        recommendation: `${top.category} is your highest expense (${top.percentage}%). Consider reviewing non-essential purchases.`,
        severity: 'warning',
      };
    }

    if (top.percentage >= 35) {
      return {
        type: 'category_spending',
        title: `${top.category} Spending`,
        message: `${top.category} accounts for ${top.percentage}% of your total expenses this month (${currencySymbol}${top.amount.toLocaleString('en-IN')}).`,
        recommendation: 'Keeping single-category spending balanced will help you save more consistently.',
        severity: 'info',
      };
    }

    if (totalIncome > 0 && balance > 0) {
      const savingsRate = Math.round((balance / totalIncome) * 100);
      return {
        type: 'saving_progress',
        title: 'On Track to Save',
        message: `You are currently saving ${savingsRate}% of your income this month.`,
        recommendation: 'Keep maintaining your daily pace to finish the month ahead.',
        severity: 'positive',
      };
    }

    return {
      type: 'spending_trend',
      title: 'Balanced Expenses',
      message: `Your spending is distributed across ${sortedCategories.length} categories. Top: ${top.category}.`,
      recommendation: 'Log daily transactions to keep your insights accurate.',
      severity: 'info',
    };
  }

  if (totalIncome > 0 && totalExpense === 0) {
    return {
      type: 'saving_progress',
      title: 'Income Recorded',
      message: `You've recorded ${currencySymbol}${totalIncome.toLocaleString('en-IN')} with zero expenses so far.`,
      recommendation: 'Plan ahead for upcoming fixed bills this month.',
      severity: 'positive',
    };
  }

  return {
    type: 'spending_trend',
    title: 'Financial Ledger Active',
    message: 'Your transactions are tracked and up to date.',
    recommendation: 'Continue recording purchases to discover smart spending trends.',
    severity: 'info',
  };
};

/**
 * Fetch AI Insight with caching and automatic fallback
 */
export const getAIInsight = async ({ forceRefresh = false, localExpenses = [], localIncome = [], currencySymbol = '₹' } = {}) => {
  const now = Date.now();

  // 1. Check in-memory cache
  if (!forceRefresh && memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  // 2. Check AsyncStorage cache
  if (!forceRefresh) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache = parsed;
          return parsed.data;
        }
      }
    } catch (err) {
      // Handled silently
    }
  }

  // 3. Try fetching from authenticated backend endpoint
  try {
    const savedUser = await AsyncStorage.getItem('currentUser');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const token = (await AsyncStorage.getItem('authToken')) || user?.accessToken || user?.token;

    if (token) {
      const baseUrl = await getWorkingBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${baseUrl}/api/ai/insights`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const cacheEntry = { data: json.data, timestamp: now };
          memoryCache = cacheEntry;
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
          return json.data;
        }
      }
    }
  } catch (err) {
    // Network or server unreachable, proceed to local deterministic calculation
  }

  // 4. Fallback to client-side real-data calculation
  const fallbackInsight = generateLocalStructuredInsight(localExpenses, localIncome, currencySymbol);
  const cacheEntry = { data: fallbackInsight, timestamp: now };
  memoryCache = cacheEntry;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  return fallbackInsight;
};

/**
 * Scan receipt image via backend Gemini Vision endpoint
 *
 * @param {Object} params
 * @param {string} params.uri - Image local file URI
 * @param {string} [params.base64] - Base64 encoded image
 * @param {string} [params.mimeType] - MIME type
 */
export const scanReceiptImage = async ({ uri, base64, mimeType = 'image/jpeg' }) => {
  const savedUser = await AsyncStorage.getItem('currentUser');
  const user = savedUser ? JSON.parse(savedUser) : null;
  const token = (await AsyncStorage.getItem('authToken')) || user?.accessToken || user?.token;

  if (!token) {
    throw new Error('Please log in to scan receipts.');
  }

  const baseUrl = await getWorkingBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for AI vision

  try {
    let response;
    if (base64) {
      response = await fetch(`${baseUrl}/api/ai/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: mimeType || 'image/jpeg',
        }),
        signal: controller.signal,
      });
    } else {
      const formData = new FormData();
      formData.append('receipt', {
        uri,
        name: 'receipt.jpg',
        type: mimeType || 'image/jpeg',
      });
      response = await fetch(`${baseUrl}/api/ai/receipt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    const json = await response.json();
    if (response.ok && json.success && json.data) {
      return json.data;
    } else {
      throw new Error(json.message || "We couldn't read this receipt clearly. Try taking a clearer photo.");
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Scanning timed out. Please check your internet connection.');
    }
    throw err;
  }
};

