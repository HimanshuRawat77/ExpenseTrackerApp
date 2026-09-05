import AsyncStorage from "@react-native-async-storage/async-storage";
import { getWorkingBaseUrl } from "./config";

/**
 * Save a new transaction (income or expense) to MongoDB
 */
export const createTransactionInBackend = async ({
  type,
  amount,
  category,
  notes,
  description,
  date,
  merchant = null,
  paymentMethod = null,
  source = "manual",
  aiCategorized = false,
}) => {
  const token = await AsyncStorage.getItem("authToken");
  if (!token) {
    return null;
  }

  const baseUrl = await getWorkingBaseUrl();
  try {
    const payload = {
      type, // 'expense' or 'income'
      amount: Number(amount),
      category: category.trim(),
      description: (description || notes || "").trim(),
      date: date || new Date().toISOString(),
      merchant: merchant ? merchant.trim() : null,
      paymentMethod: paymentMethod || null,
      source: source || "manual",
      aiCategorized: Boolean(aiCategorized),
    };

    const response = await fetch(`${baseUrl}/api/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok && (data.transaction || data.data)) {
      const created = data.transaction || data.data;
      console.log("💾 Transaction saved to MongoDB Atlas:", created._id);
      return created;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

/**
 * Sync offline local transactions (expenses & income) to MongoDB
 */
export const syncLocalTransactionsToBackend = async () => {
  const token = await AsyncStorage.getItem("authToken");
  if (!token) return;

  const baseUrl = await getWorkingBaseUrl();

  try {
    const savedExpenses = await AsyncStorage.getItem("expenses");
    const savedIncome = await AsyncStorage.getItem("income");

    const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
    const income = savedIncome ? JSON.parse(savedIncome) : [];

    // Filter items that don't have a MongoDB _id yet
    const unSyncedExpenses = expenses
      .filter((e) => !e._id && !e.syncedToMongo)
      .map((e) => ({
        type: "expense",
        amount: Number(e.amount),
        category: e.category || "General",
        description: e.notes || "",
        date: e.date || new Date().toISOString(),
      }));

    const unSyncedIncome = income
      .filter((i) => !i._id && !i.syncedToMongo)
      .map((i) => ({
        type: "income",
        amount: Number(i.amount),
        category: i.category || "Income",
        description: i.notes || "",
        date: i.date || new Date().toISOString(),
      }));

    const allToSync = [...unSyncedExpenses, ...unSyncedIncome];

    if (allToSync.length === 0) return;

    console.log(`🔄 Syncing ${allToSync.length} local transactions to MongoDB Atlas...`);

    const response = await fetch(`${baseUrl}/api/transactions/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactions: allToSync }),
    });

    const data = await response.json();
    if (response.ok && data.transactions) {
      console.log(`✅ Synced ${data.count || data.transactions.length} transactions to MongoDB!`);
      // Mark local items as synced
      const updatedExpenses = expenses.map((e) => ({ ...e, syncedToMongo: true }));
      const updatedIncome = income.map((i) => ({ ...i, syncedToMongo: true }));
      await AsyncStorage.setItem("expenses", JSON.stringify(updatedExpenses));
      await AsyncStorage.setItem("income", JSON.stringify(updatedIncome));
    }
  } catch (error) {
    // Handled silently
  }
};

/**
 * Fetch all transactions from MongoDB
 */
export const getTransactionsFromBackend = async () => {
  const token = await AsyncStorage.getItem("authToken");
  if (!token) return null;

  const baseUrl = await getWorkingBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/transactions?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.data?.transactions || data.transactions || [];
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Delete a transaction by ID from MongoDB Atlas
 */
export const deleteTransactionInBackend = async (transactionId) => {
  if (!transactionId) return false;

  const token = await AsyncStorage.getItem("authToken");
  if (!token) return false;

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(transactionId);
  if (!isValidObjectId) return false;

  const baseUrl = await getWorkingBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/transactions/${transactionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log(`🗑️ Transaction deleted from MongoDB Atlas: ${transactionId}`);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Sync parsed SMS transaction(s) to MongoDB Atlas via POST /api/transactions/sms
 */
export const syncSmsTransactionsToBackend = async (transactions) => {
  if (!transactions || (Array.isArray(transactions) && transactions.length === 0)) {
    return { success: false, created: [], duplicates: [], failed: [] };
  }

  const token = await AsyncStorage.getItem("authToken");
  if (!token) {
    return { success: false, created: [], duplicates: [], failed: [], offline: true };
  }

  const baseUrl = await getWorkingBaseUrl();
  try {
    const list = Array.isArray(transactions) ? transactions : [transactions];
    const response = await fetch(`${baseUrl}/api/transactions/sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactions: list }),
    });

    const data = await response.json();
    if (response.ok && data.data) {
      return {
        success: true,
        created: data.data.created || [],
        duplicates: data.data.duplicates || [],
        failed: data.data.failed || [],
      };
    }
    return {
      success: false,
      error: data.message || "Failed to sync SMS transactions",
      created: [],
      duplicates: [],
      failed: list,
    };
  } catch (error) {
    return {
      success: false,
      offline: true,
      error: error.message,
      created: [],
      duplicates: [],
      failed: Array.isArray(transactions) ? transactions : [transactions],
    };
  }
};

