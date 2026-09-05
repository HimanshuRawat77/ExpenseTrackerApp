/**
 * Local Deterministic SMS Parser for Financial Transactions
 * 
 * Extracts structured financial transaction data from Indian bank & UPI SMS messages.
 * Uses deterministic regexes and dictionaries first to avoid unnecessary AI calls.
 */

// Common Indian Merchant Directory with standard categories
const MERCHANT_DIRECTORY = [
  // Food & Dining
  { key: 'swiggy', name: 'Swiggy', category: 'Food' },
  { key: 'zomato', name: 'Zomato', category: 'Food' },
  { key: 'starbucks', name: 'Starbucks', category: 'Food' },
  { key: 'mcdonald', name: 'McDonald\'s', category: 'Food' },
  { key: 'domino', name: 'Domino\'s', category: 'Food' },
  { key: 'pizza hut', name: 'Pizza Hut', category: 'Food' },
  { key: 'kfc', name: 'KFC', category: 'Food' },
  { key: 'burger king', name: 'Burger King', category: 'Food' },
  { key: 'chaayos', name: 'Chaayos', category: 'Food' },
  { key: 'chai point', name: 'Chai Point', category: 'Food' },
  { key: 'eatclub', name: 'EatClub', category: 'Food' },

  // Groceries & Quick Commerce
  { key: 'blinkit', name: 'Blinkit', category: 'Groceries' },
  { key: 'grofers', name: 'Blinkit', category: 'Groceries' },
  { key: 'zepto', name: 'Zepto', category: 'Groceries' },
  { key: 'instamart', name: 'Instamart', category: 'Groceries' },
  { key: 'bigbasket', name: 'BigBasket', category: 'Groceries' },
  { key: 'bbdaily', name: 'BBDaily', category: 'Groceries' },
  { key: 'dunzo', name: 'Dunzo', category: 'Groceries' },

  // Shopping & E-Commerce
  { key: 'amazon', name: 'Amazon', category: 'Shopping' },
  { key: 'flipkart', name: 'Flipkart', category: 'Shopping' },
  { key: 'myntra', name: 'Myntra', category: 'Shopping' },
  { key: 'ajio', name: 'Ajio', category: 'Shopping' },
  { key: 'nykaa', name: 'Nykaa', category: 'Shopping' },
  { key: 'tata cliq', name: 'Tata CLiQ', category: 'Shopping' },
  { key: 'meesho', name: 'Meesho', category: 'Shopping' },
  { key: 'decathlon', name: 'Decathlon', category: 'Shopping' },

  // Travel & Transport
  { key: 'uber', name: 'Uber', category: 'Transport' },
  { key: 'ola', name: 'Ola', category: 'Transport' },
  { key: 'rapido', name: 'Rapido', category: 'Transport' },
  { key: 'makemytrip', name: 'MakeMyTrip', category: 'Transport' },
  { key: 'goibibo', name: 'Goibibo', category: 'Transport' },
  { key: 'irctc', name: 'IRCTC', category: 'Transport' },
  { key: 'redbus', name: 'RedBus', category: 'Transport' },

  // Entertainment & Subscriptions
  { key: 'netflix', name: 'Netflix', category: 'Entertainment' },
  { key: 'spotify', name: 'Spotify', category: 'Entertainment' },
  { key: 'bookmyshow', name: 'BookMyShow', category: 'Entertainment' },
  { key: 'hotstar', name: 'Disney+ Hotstar', category: 'Entertainment' },
  { key: 'pvr', name: 'PVR Cinemas', category: 'Entertainment' },
  { key: 'inox', name: 'INOX', category: 'Entertainment' },

  // Utilities & Bills
  { key: 'airtel', name: 'Airtel', category: 'Bills' },
  { key: 'jio', name: 'Jio', category: 'Bills' },
  { key: 'vodafone', name: 'Vi', category: 'Bills' },
  { key: 'bescom', name: 'BESCOM', category: 'Bills' },

  // Health
  { key: 'apollo', name: 'Apollo Pharmacy', category: 'Health' },
  { key: 'pharmeasy', name: 'PharmEasy', category: 'Health' },
  { key: '1mg', name: '1mg', category: 'Health' },
  { key: 'netmeds', name: 'Netmeds', category: 'Health' },
];

/**
 * Checks whether an SMS string is likely an eligible financial transaction SMS.
 * Filters out OTPs, promotions, marketing, and non-financial messages.
 */
export const isFinancialSms = (text) => {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 8) return false;

  // 1. Check for OTP / verification codes -> ALWAYS REJECT
  const otpPatterns = [
    /\b(?:otp|one\s*time\s*password)\b/i,
    /\b(?:verification\s*code|security\s*code|secret\s*code|login\s*code|passcode|auth\s*code)\b/i,
    /\bis\s+your\s+(?:verification|security|login|secret)?\s*otp\b/i,
    /\bdo\s+not\s+share\s+this\s+(?:otp|code|password)\b/i,
    /\bvalid\s+for\s+\d+\s+(?:mins|minutes|seconds)\b/i,
    /\buse\s+\d{4,6}\s+as\s+your\b/i,
  ];

  for (const pattern of otpPatterns) {
    if (pattern.test(clean)) {
      return false;
    }
  }

  // 2. Check for Promotional / Marketing / Spam -> ALWAYS REJECT
  const promoPatterns = [
    /\b(?:apply\s*now|pre-approved|congratulations|claim\s*your|hurry|win\s*up\s*to|lucky\s*winner)\b/i,
    /\b(?:flat\s*\d+%\s*off|use\s*coupon|discount\s*code|promo\s*code|limited\s*period\s*offer)\b/i,
    /\b(?:personal\s*loan\s*of|instant\s*loan|credit\s*card\s*offer|zero\s*annual\s*fee)\b/i,
    /\b(?:sale\s*is\s*live|click\s*here\s*to|call\s*now|missed\s*call\s*service)\b/i,
  ];

  for (const pattern of promoPatterns) {
    if (pattern.test(clean)) {
      return false;
    }
  }

  // 3. Must have an amount or currency indicator (handles INR, Rs, Re, ₹, dr, cr)
  const hasCurrency = /(?:INR|Rs\.?|Re\.?|₹|\bdr\b|\bcr\b)/i.test(clean);

  // 4. Must have a transaction verb / keyword
  const hasTransactionVerb = /\b(?:debited|debit|credited|credit|spent|paid|withdrawn|deposited|received|recd|transferred|txn|transaction|purchase)\b/i.test(clean);

  // 5. Must have account / VPA / bank context OR both currency and verb
  const hasBankingContext = /\b(?:a\/c|acct|account|vpa|upi|bank|card|ending|xx\d{2,4}|\*\d{2,4})\b/i.test(clean);

  return (hasCurrency && hasTransactionVerb) || (hasBankingContext && hasTransactionVerb);
};

/**
 * Extracts numeric transaction amount from SMS text.
 * Handles Rs., Re., INR, ₹, commas, and decimals.
 */
export const extractAmount = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Patterns ordered by specificity
  const patterns = [
    // "INR 1,250.00", "Rs 15000.00", "Re 1.00", "Re. 1", "Rs. 749.50", "₹500"
    /(?:INR|Rs\.?|Re\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "500.00 INR", "749 Rs", "1 Re", "1 Re.", "500 ₹"
    /([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|Re\.?|₹)/i,
    // "debited by/with/for INR/Rs/Re/₹ 500" or "credited with INR 35,000.00"
    /(?:debited|credited|spent|paid|withdrawn|deposited|received|recd|transferred)(?:\s+(?:by|with|for|of))?\s*(?:INR|Rs\.?|Re\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "credited with/by 1.00" without currency symbol
    /(?:debited|credited|spent|paid|withdrawn|deposited|received|recd)(?:\s+(?:by|with|for|of))\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanStr = match[1].replace(/,/g, '').replace(/\.$/, '');
      const num = parseFloat(cleanStr);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return null;
};

/**
 * Detects whether the SMS represents an expense (debit) or income (credit).
 */
export const detectType = (text) => {
  if (!text || typeof text !== 'string') return 'expense';
  const lower = text.toLowerCase();

  const creditMatches = [
    /\b(?:is\s+)?credited(?:\s+(?:by|with|to))?\b/,
    /\bdeposited\b/,
    /\breceived\b/,
    /\brefund(?:ed)?\b/,
    /\bcashback\s*received\b/,
    /\badded\s+to\b/,
    /\bcr\b/,
  ];

  const debitMatches = [
    /\b(?:is\s+)?debited(?:\s+(?:by|from|for))?\b/,
    /\bspent\b/,
    /\bpaid\b/,
    /\bwithdrawn\b/,
    /\bdeducted\b/,
    /\bsent\s+to\b/,
    /\bpurchase\b/,
    /\bdr\b/,
  ];

  // Check specific phrase patterns
  if (/debited\s+from\s+a\/c/i.test(lower) || /debited\s+for/i.test(lower)) return 'expense';
  if (/credited\s+with/i.test(lower) || /credited\s+to\s+(?:your\s+)?(?:a\/c|account)/i.test(lower)) return 'income';
  if (/is\s+credited/i.test(lower) || /has\s+been\s+credited/i.test(lower)) return 'income';

  for (const p of creditMatches) {
    if (p.test(lower)) return 'income';
  }

  for (const p of debitMatches) {
    if (p.test(lower)) return 'expense';
  }

  return 'expense';
};

/**
 * Detects payment method: upi, card, bank_transfer, wallet, or other.
 */
export const detectPaymentMethod = (text) => {
  if (!text || typeof text !== 'string') return 'other';
  const lower = text.toLowerCase();

  if (
    /\b(?:upi|vpa|gpay|google\s*pay|phonepe|paytm\s*upi|bhim)\b/.test(lower) ||
    /[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+/.test(text)
  ) {
    return 'upi';
  }

  if (/\b(?:card|credit\s*card|debit\s*card|pos|atm|visa|mastercard|rupay)\b/.test(lower)) {
    return 'card';
  }

  if (/\b(?:wallet|paytm\s*wallet|amazon\s*pay\s*balance)\b/.test(lower)) {
    return 'wallet';
  }

  if (/\b(?:neft|imps|rtgs|netbanking|bank\s*transfer|a\/c|acct|account)\b/.test(lower)) {
    return 'bank_transfer';
  }

  return 'other';
};

/**
 * Extracts bank / UPI / IMPS / NEFT reference number or transaction ID.
 */
export const extractExternalId = (text) => {
  if (!text || typeof text !== 'string') return null;

  const patterns = [
    /(?:UPI\s*Ref(?:\s*no)?|RRN)[:\s]+([0-9]{8,16})/i,
    /(?:Ref(?:\s*no|\s*id)?|Txn(?:\s*id)?|UTR|Reference)[:\s]+([a-zA-Z0-9]{6,20})/i,
    /Ref\s+([0-9]{8,16})/i,
    /Txn\s+([a-zA-Z0-9]{6,20})/i,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

/**
 * Normalizes date from SMS if present, or returns ISO string for today.
 */
export const extractDate = (text) => {
  if (!text || typeof text !== 'string') return new Date().toISOString();

  // 1. DD-MM-YY or DD-MM-YYYY or DD/MM/YY or DD/MM/YYYY
  const numDateMatch = text.match(/\b([0-3]?[0-9])[-/]([0-1]?[0-9])[-/]([0-9]{2,4})\b/);
  if (numDateMatch) {
    const day = parseInt(numDateMatch[1], 10);
    const month = parseInt(numDateMatch[2], 10) - 1;
    let year = parseInt(numDateMatch[3], 10);
    if (year < 100) year += 2000;

    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  // 2. DD-Mon-YY or DD-Mon-YYYY (e.g., 04-Sep-26)
  const monDateMatch = text.match(/\b([0-3]?[0-9])[-/ ]([A-Za-z]{3})[-/ ]([0-9]{2,4})\b/);
  if (monDateMatch) {
    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const day = parseInt(monDateMatch[1], 10);
    const mStr = monDateMatch[2].toLowerCase();
    let year = parseInt(monDateMatch[3], 10);
    if (year < 100) year += 2000;

    if (months[mStr] !== undefined) {
      const d = new Date(year, months[mStr], day);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
  }

  return new Date().toISOString();
};

/**
 * Extracts merchant/payee and determines the transaction category.
 */
export const extractMerchantAndCategory = (text, type = 'expense') => {
  if (!text || typeof text !== 'string') {
    return {
      merchant: null,
      category: type === 'income' ? 'Income' : 'Other',
    };
  }

  const lower = text.toLowerCase();

  // 1. First check against known merchant directory
  for (const item of MERCHANT_DIRECTORY) {
    const regex = new RegExp(`\\b${item.key}\\b`, 'i');
    if (regex.test(lower)) {
      return {
        merchant: item.name,
        category: item.category,
      };
    }
  }

  // 2. Payee from VPA handle (e.g. to VPA name@upi)
  const vpaMatch = text.match(/(?:to\s+VPA|VPA)\s+([a-zA-Z0-9.\-_]+)@[a-zA-Z0-9]+/i);
  if (vpaMatch && vpaMatch[1]) {
    const rawVpa = vpaMatch[1].replace(/[._-]/g, ' ').trim();
    // Check if known merchant inside VPA
    for (const item of MERCHANT_DIRECTORY) {
      if (rawVpa.toLowerCase().includes(item.key)) {
        return { merchant: item.name, category: item.category };
      }
    }
    // Clean formatted merchant name
    const formatted = rawVpa.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return {
      merchant: formatted,
      category: type === 'income' ? 'Income' : 'Other',
    };
  }

  // 3. Patterns like "for UPI payment to AMAZON.", "to SWIGGY on", "at STARBUCKS"
  const payeePatterns = [
    /(?:payment\s+to|paid\s+to|transferred\s+to|txn\s+to|to)\s+([A-Za-z0-9\s&'-]{3,25}?)(?:\s+on|\s+for|\s+ref|\s+via|\s+using|\.|\n|$)/i,
    /(?:at|info:)\s+([A-Za-z0-9\s&'-]{3,25}?)(?:\s+on|\s+for|\s+ref|\s+via|\s+using|\.|\n|$)/i,
  ];

  for (const pattern of payeePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().replace(/[.,]$/, '');
      // Exclude generic words
      const blacklisted = ['a/c', 'account', 'vpa', 'upi', 'inr', 'rs', 'bank', 'card'];
      if (!blacklisted.includes(candidate.toLowerCase()) && candidate.length > 2) {
        // Check if matching dictionary
        for (const item of MERCHANT_DIRECTORY) {
          if (candidate.toLowerCase().includes(item.key)) {
            return { merchant: item.name, category: item.category };
          }
        }
        // Capitalize candidate
        const cleanMerchant = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return {
          merchant: cleanMerchant,
          category: type === 'income' ? 'Income' : 'Other',
        };
      }
    }
  }

  // 4. Income specific categorization
  if (type === 'income') {
    if (/\b(?:salary|stipend|payroll)\b/i.test(lower)) {
      return { merchant: null, category: 'Salary' };
    }
    if (/\b(?:dividend|interest)\b/i.test(lower)) {
      return { merchant: null, category: 'Investments' };
    }

    const fromMatch = text.match(/(?:received\s+from|from)\s+([A-Za-z0-9\s&'-]{2,25}?)(?:\s+on|\s+via|\s+ref|\.|\n|$)/i);
    if (fromMatch && fromMatch[1]) {
      const candidate = fromMatch[1].trim().replace(/[.,]$/, '');
      const blacklisted = ['a/c', 'account', 'vpa', 'upi', 'bank', 'your', 'neft', 'imps', 'rtgs'];
      if (!blacklisted.includes(candidate.toLowerCase()) && candidate.length > 1) {
        const cleanSender = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return { merchant: cleanSender, category: 'Income' };
      }
    }

    return { merchant: null, category: 'Income' };
  }

  return {
    merchant: null,
    category: 'Other',
  };
};

/**
 * Creates a unique transaction fingerprint to guarantee zero duplicates.
 */
export const generateFingerprint = ({ amount, type, merchant, date, externalId }) => {
  const normAmount = Number(amount || 0).toFixed(2);
  const normType = (type || 'expense').toLowerCase();
  const normMerchant = (merchant || 'none').toLowerCase().trim();
  const normDate = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const normExt = externalId ? externalId.trim().toLowerCase() : 'noid';

  return `sms_${normAmount}_${normType}_${normMerchant}_${normDate}_${normExt}`;
};

/**
 * Main parser entry point: processes an SMS string into a structured transaction candidate.
 * Returns null if not a financial SMS or amount cannot be extracted.
 */
export const parseSms = (text, options = {}) => {
  if (!isFinancialSms(text)) {
    return null;
  }

  const amount = extractAmount(text);
  if (!amount || amount <= 0) {
    return null;
  }

  const type = detectType(text);
  const paymentMethod = detectPaymentMethod(text);
  const externalId = extractExternalId(text);
  const date = extractDate(text);
  const { merchant, category } = extractMerchantAndCategory(text, type);

  const fingerprint = generateFingerprint({
    amount,
    type,
    merchant,
    date,
    externalId,
  });

  const confidence = merchant && externalId ? 'high' : (merchant ? 'medium' : 'low');

  return {
    type,
    amount,
    currency: 'INR',
    merchant,
    category,
    paymentMethod,
    date,
    source: 'sms',
    externalId,
    fingerprint,
    confidence,
    aiCategorized: false,
    rawSnippet: `${type === 'expense' ? 'Debit' : 'Credit'} of ₹${amount}${merchant ? ` at ${merchant}` : ''}`,
  };
};
