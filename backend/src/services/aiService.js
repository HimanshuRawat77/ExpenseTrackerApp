const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const config = require('../config/env');

/**
 * Initialize Gemini Model
 */
const getGeminiModel = () => {
  const key = config.GEMINI_API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 15 && !key.includes('your_') && !key.includes('dummy')) {
    const genAI = new GoogleGenerativeAI(key.trim());
    return genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });
  }
  return null;
};

/**
 * Initialize OpenAI Client
 */
const getOpenAIClient = () => {
  const key = config.OPENAI_API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 15 && !key.includes('your_') && !key.includes('dummy')) {
    return new OpenAI({ apiKey: key.trim() });
  }
  return null;
};

/**
 * Deterministic fallback generator based on verified calculations
 */
const generateDeterministicInsight = (data) => {
  const {
    income = 0,
    expenses = 0,
    balance = 0,
    prevExpenses = 0,
    momChange = null,
    categories = [],
    safeToSpendToday = 0,
    daysRemaining = 1,
    currency = 'INR',
  } = data;

  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';

  // No transactions logged yet
  if (expenses === 0 && income === 0) {
    return {
      type: 'spending_trend',
      title: 'Welcome to Expense Tracker',
      message: 'Start logging your daily expenses to see personalized financial insights.',
      recommendation: 'Record your first transaction to unlock smart spending observations.',
      severity: 'info',
    };
  }

  // Income recorded, no expenses
  if (income > 0 && expenses === 0) {
    return {
      type: 'saving_progress',
      title: 'Healthy Start',
      message: `You've recorded ${symbol}${income.toLocaleString('en-IN')} in income with zero expenses so far.`,
      recommendation: 'Maintain your budget room by planning upcoming essential expenses.',
      severity: 'positive',
    };
  }

  // Expenses exceed income
  if (income > 0 && expenses > income) {
    const topCat = categories[0] || { category: 'Discretionary', percentage: 0 };
    return {
      type: 'budget_warning',
      title: 'Expenses Exceed Income',
      message: `Your current spending of ${symbol}${expenses.toLocaleString('en-IN')} is higher than your income by ${symbol}${(expenses - income).toLocaleString('en-IN')}.`,
      recommendation: `${topCat.category} represents ${topCat.percentage}% of spending. Consider slowing down discretionary purchases.`,
      severity: 'warning',
    };
  }

  // Significant month-over-month increase
  if (momChange !== null && momChange > 15) {
    const topCat = categories[0] || { category: 'General', percentage: 0 };
    return {
      type: 'spending_trend',
      title: 'Spending Increased',
      message: `Your spending is currently ${momChange}% higher than this time last month.`,
      recommendation: `${topCat.category} is your largest expense. Keep daily spending under ${symbol}${safeToSpendToday.toFixed(0)} to preserve savings.`,
      severity: 'warning',
    };
  }

  // Significant month-over-month decrease
  if (momChange !== null && momChange < -10) {
    return {
      type: 'saving_progress',
      title: 'Lower Spending Rate',
      message: `Your expenses are currently ${Math.abs(momChange)}% lower than last month.`,
      recommendation: `You are on track to finish the month with strong savings. Your safe-to-spend limit is ${symbol}${safeToSpendToday.toFixed(0)}/day.`,
      severity: 'positive',
    };
  }

  // Single category concentration (>35%)
  if (categories.length > 0 && categories[0].percentage >= 35) {
    const topCat = categories[0];
    return {
      type: 'category_spending',
      title: `${topCat.category} Concentration`,
      message: `${topCat.category} accounts for ${topCat.percentage}% of your total expenses this month (${symbol}${topCat.amount.toLocaleString('en-IN')}).`,
      recommendation: `Spreading your expenses across categories helps maintain balanced cash flow.`,
      severity: 'info',
    };
  }

  // Safe to spend & steady savings
  if (income > 0 && balance > 0) {
    const savingsRate = Math.round((balance / income) * 100);
    return {
      type: 'safe_to_spend',
      title: 'Balanced Cash Flow',
      message: `You're currently saving ${savingsRate}% of your income with a safe-to-spend allowance of ${symbol}${safeToSpendToday.toFixed(0)}/day.`,
      recommendation: `Stick within ${symbol}${safeToSpendToday.toFixed(0)} daily over the next ${daysRemaining} days to lock in these savings.`,
      severity: 'positive',
    };
  }

  return {
    type: 'spending_trend',
    title: 'Financial Tracking Active',
    message: `Total spent this month: ${symbol}${expenses.toLocaleString('en-IN')} across ${categories.length} categories.`,
    recommendation: 'Log daily transactions to keep your insights accurate and actionable.',
    severity: 'info',
  };
};

/**
 * Validate and sanitize structured response
 */
const sanitizeInsight = (raw) => {
  const validTypes = [
    'spending_trend',
    'budget_warning',
    'saving_progress',
    'category_spending',
    'recurring_expense',
    'safe_to_spend',
  ];
  const validSeverities = ['info', 'warning', 'positive'];

  return {
    type: validTypes.includes(raw.type) ? raw.type : 'spending_trend',
    title: String(raw.title || 'Financial Insight').slice(0, 50),
    message: String(raw.message || '').slice(0, 180),
    recommendation: String(raw.recommendation || '').slice(0, 180),
    severity: validSeverities.includes(raw.severity) ? raw.severity : 'info',
  };
};

/**
 * Generate structured financial insight using Gemini or OpenAI if configured,
 * falling back gracefully to deterministic rule calculation.
 */
exports.generateInsight = async (financialSummary) => {
  const prompt = `You are a financial analyst. Analyze the following verified financial facts for a user and return ONE concise, actionable insight.
Do NOT calculate or invent numbers. Use only the provided data.

Financial Facts:
${JSON.stringify(financialSummary, null, 2)}

Return a JSON object adhering strictly to this schema:
{
  "type": "spending_trend" | "budget_warning" | "saving_progress" | "category_spending" | "recurring_expense" | "safe_to_spend",
  "title": "Short title (max 5 words)",
  "message": "Clear 1-sentence observation based on facts",
  "recommendation": "1-sentence actionable tip",
  "severity": "info" | "warning" | "positive"
}`;

  // 1. Try Google Gemini first
  const geminiModel = getGeminiModel();
  if (geminiModel) {
    try {
      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      return sanitizeInsight(parsed);
    } catch (err) {
      console.warn('Gemini API call error. Falling back:', err.message);
    }
  }

  // 2. Try OpenAI second
  const openAIClient = getOpenAIClient();
  if (openAIClient) {
    try {
      const completion = await openAIClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial assistant. You strictly output valid JSON matching the requested schema. Never invent numbers.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200,
      });

      const parsed = JSON.parse(completion.choices[0].message.content);
      return sanitizeInsight(parsed);
    } catch (err) {
      console.warn('OpenAI API call error. Falling back:', err.message);
    }
  }

  // 3. Deterministic rule fallback
  return generateDeterministicInsight(financialSummary);
};
