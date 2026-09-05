import AsyncStorage from "@react-native-async-storage/async-storage";
import { getWorkingBaseUrl } from "./config";
import { invalidateAnalyticsCache } from "./analyticsApi";
import { authenticatedFetch } from "./authApi";

/**
 * Synchronize local cached currentUser in AsyncStorage with authoritative MongoDB financialProfile.
 * If offline, applies local ledger delta to keep the UI seamless until online sync.
 */
export const syncLocalCachedBalance = async (authoritativeProfile, fallbackDelta = 0) => {
  try {
    const raw = await AsyncStorage.getItem("currentUser");
    if (!raw) return null;
    const userObj = JSON.parse(raw);
    if (!userObj.financialProfile) {
      userObj.financialProfile = {
        openingBalance: 0,
        currentBalance: 0,
        balanceUpdatedAt: new Date().toISOString(),
      };
    }

    if (authoritativeProfile && typeof authoritativeProfile.currentBalance === "number") {
      // Authoritative profile from MongoDB
      userObj.financialProfile = authoritativeProfile;
    } else if (typeof fallbackDelta === "number" && fallbackDelta !== 0) {
      // Optimistic offline delta
      userObj.financialProfile.currentBalance =
        (Number(userObj.financialProfile.currentBalance) || 0) + fallbackDelta;
      userObj.financialProfile.balanceUpdatedAt = new Date().toISOString();
    }

    await AsyncStorage.setItem("currentUser", JSON.stringify(userObj));
    return userObj.financialProfile;
  } catch (err) {
    return null;
  }
};

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
  const numericAmount = Number(amount) || 0;
  const delta = type === "expense" ? -numericAmount : numericAmount;

  try {
    const payload = {
      type, // 'expense' or 'income'
      amount: numericAmount,
      category: category.trim(),
      description: (description || notes || "").trim(),
      date: date || new Date().toISOString(),
      merchant: merchant ? merchant.trim() : null,
      paymentMethod: paymentMethod || null,
      source: source || "manual",
      aiCategorized: Boolean(aiCategorized),
    };

    const response = await authenticatedFetch('/api/transactions', {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data?.data) {
      const created = data.data.transaction || data.data;
      const authoritativeProfile = data.data.financialProfile;

      // Synchronize authoritative MongoDB balance into local cache
      await syncLocalCachedBalance(authoritativeProfile, delta);
      await invalidateAnalyticsCache();

      console.log("💾 Transaction saved to MongoDB Atlas:", created._id || created.id);
      return created;
    } else {
      // Offline fallback: keep local cache in sync with optimistic delta
      await syncLocalCachedBalance(null, delta);
      await invalidateAnalyticsCache();
      return null;
    }
  } catch (error) {
    // Offline fallback: keep local cache in sync with optimistic delta
    await syncLocalCachedBalance(null, delta);
    await invalidateAnalyticsCache();
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

    const response = await authenticatedFetch('/api/transactions/bulk', {
      method: "POST",
      body: JSON.stringify({ transactions: allToSync }),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data?.transactions) {
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
  try {
    const response = await authenticatedFetch('/api/transactions?limit=100');

    if (response.ok) {
      const data = await response.json().catch(() => null);
      return data?.data?.transactions || data?.transactions || [];
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Delete a transaction by ID from MongoDB Atlas
 */
export const deleteTransactionInBackend = async (transactionId, item = null) => {
  if (!transactionId) return false;

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(transactionId);
  const restoreDelta = item
    ? item.type === "expense"
      ? Number(item.amount) || 0
      : -(Number(item.amount) || 0)
    : 0;

  if (!isValidObjectId) {
    if (restoreDelta !== 0) {
      await syncLocalCachedBalance(null, restoreDelta);
    }
    await invalidateAnalyticsCache();
    return true;
  }

  try {
    const response = await authenticatedFetch(`/api/transactions/${transactionId}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => null);
    if (response.ok) {
      const authoritativeProfile = data?.data?.financialProfile;
      await syncLocalCachedBalance(authoritativeProfile, restoreDelta);
      await invalidateAnalyticsCache();
      console.log(`🗑️ Transaction deleted from MongoDB Atlas: ${transactionId}`);
      return true;
    } else {
      if (restoreDelta !== 0) {
        await syncLocalCachedBalance(null, restoreDelta);
      }
      await invalidateAnalyticsCache();
      return false;
    }
  } catch (error) {
    if (restoreDelta !== 0) {
      await syncLocalCachedBalance(null, restoreDelta);
    }
    await invalidateAnalyticsCache();
    return false;
  }
};

/**
 * Update an existing transaction in MongoDB Atlas
 */
export const updateTransactionInBackend = async (transactionId, updateData, oldTx = null) => {
  if (!transactionId) return null;

  try {
    const response = await authenticatedFetch(`/api/transactions/${transactionId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data?.data) {
      const updated = data.data.transaction || data.data;
      const authoritativeProfile = data.data.financialProfile;
      await syncLocalCachedBalance(authoritativeProfile);
      await invalidateAnalyticsCache();
      return updated;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Sync parsed SMS transaction(s) to MongoDB Atlas via POST /api/transactions/sms
 */
export const syncSmsTransactionsToBackend = async (transactions) => {
  if (!transactions || (Array.isArray(transactions) && transactions.length === 0)) {
    return { success: false, created: [], duplicates: [], failed: [] };
  }

  try {
    const list = Array.isArray(transactions) ? transactions : [transactions];
    const response = await authenticatedFetch('/api/transactions/sms', {
      method: "POST",
      body: JSON.stringify({ transactions: list }),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data?.data) {
      return {
        success: true,
        created: data.data.created || [],
        duplicates: data.data.duplicates || [],
        failed: data.data.failed || [],
      };
    }
    return {
      success: false,
      error: data?.message || "Failed to sync SMS transactions",
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

