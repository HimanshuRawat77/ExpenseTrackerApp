import { Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseSms, generateFingerprint } from "./smsParser";
import { syncSmsTransactionsToBackend } from "../api/transactionApi";

const STORAGE_KEYS = {
  TRACKING_ENABLED: "@expense_tracker_sms_tracking_enabled",
  PENDING_CONFIRMATIONS: "@expense_tracker_pending_sms_confirmations",
  OFFLINE_QUEUE: "@expense_tracker_pending_offline_sms_transactions",
  IGNORED_FINGERPRINTS: "@expense_tracker_ignored_sms_fingerprints",
};

// Registered listeners for real-time UI updates
const listeners = new Set();

export const addSmsListener = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = (event, data) => {
  listeners.forEach((callback) => {
    try {
      callback(event, data);
    } catch (err) {
      // Handled silently
    }
  });
};

/**
 * Checks whether automatic SMS tracking is enabled
 */
export const isSmsTrackingEnabled = async () => {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.TRACKING_ENABLED);
    return val === "true";
  } catch (error) {
    return false;
  }
};

/**
 * Checks Android SMS permissions
 */
export const checkSmsPermission = async () => {
  if (Platform.OS !== "android") {
    return { granted: false, reason: "Android-only feature" };
  }

  try {
    const receiveGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
    );
    const readGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );

    return {
      granted: receiveGranted && readGranted,
      receiveGranted,
      readGranted,
    };
  } catch (error) {
    return { granted: false, error: error.message };
  }
};

/**
 * Requests Android SMS permissions with user explanation
 */
export const requestSmsPermission = async () => {
  if (Platform.OS !== "android") {
    return false;
  }

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);

    const granted =
      results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      results[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;

    return granted;
  } catch (error) {
    return false;
  }
};

/**
 * Toggles automatic tracking state
 */
export const setSmsTrackingEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRACKING_ENABLED, enabled ? "true" : "false");
    notifyListeners("tracking_toggled", { enabled });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Gets all pending SMS transactions waiting for user confirmation
 */
export const getPendingSmsConfirmations = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CONFIRMATIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

/**
 * Processes incoming raw SMS text
 * 1. Checks if tracking enabled
 * 2. Parses SMS with deterministic local rules
 * 3. Checks for duplicates & ignored list
 * 4. Queues into pending confirmations
 */
export const processIncomingSms = async (smsText) => {
  try {
    const enabled = await isSmsTrackingEnabled();
    if (!enabled) {
      return { success: false, reason: "Tracking disabled" };
    }

    const candidate = parseSms(smsText);
    if (!candidate) {
      return { success: false, reason: "Non-financial or unrecognized format" };
    }

    // Check ignored fingerprints
    const ignoredRaw = await AsyncStorage.getItem(STORAGE_KEYS.IGNORED_FINGERPRINTS);
    const ignoredList = ignoredRaw ? JSON.parse(ignoredRaw) : [];
    if (ignoredList.includes(candidate.fingerprint)) {
      return { success: false, reason: "Previously ignored" };
    }

    // Check current pending confirmations
    const pending = await getPendingSmsConfirmations();
    const isAlreadyPending = pending.some(
      (item) =>
        item.fingerprint === candidate.fingerprint ||
        (candidate.externalId && item.externalId === candidate.externalId)
    );

    if (isAlreadyPending) {
      return { success: false, reason: "Already pending confirmation" };
    }

    // Add unique candidate to pending confirmations
    const updated = [candidate, ...pending];
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CONFIRMATIONS, JSON.stringify(updated));

    notifyListeners("new_candidate_detected", candidate);

    return {
      success: true,
      transaction: candidate,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Confirms a pending SMS transaction
 * Saves to MongoDB Atlas (or offline queue if disconnected) and updates local ledger
 */
export const confirmSmsTransaction = async (transaction) => {
  try {
    if (!transaction) return false;

    // 1. Remove from pending confirmations
    const pending = await getPendingSmsConfirmations();
    const updatedPending = pending.filter(
      (item) => item.fingerprint !== transaction.fingerprint
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.PENDING_CONFIRMATIONS,
      JSON.stringify(updatedPending)
    );

    // 2. Prepare payload
    const payload = {
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency || "INR",
      category: transaction.category || (transaction.type === "income" ? "Income" : "Other"),
      merchant: transaction.merchant || null,
      description: transaction.rawSnippet || `SMS: ${transaction.merchant || "Transaction"}`,
      date: transaction.date || new Date().toISOString(),
      paymentMethod: transaction.paymentMethod || "other",
      source: "sms",
      externalId: transaction.externalId || null,
      fingerprint: transaction.fingerprint || null,
      aiCategorized: Boolean(transaction.aiCategorized),
    };

    // 3. Attempt sync with backend
    const syncRes = await syncSmsTransactionsToBackend([payload]);

    let createdTx = null;
    let isOffline = false;

    if (syncRes.success && syncRes.created.length > 0) {
      createdTx = syncRes.created[0];
    } else if (syncRes.offline) {
      isOffline = true;
      // Queue into offline storage
      const offlineRaw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      const offlineQueue = offlineRaw ? JSON.parse(offlineRaw) : [];
      offlineQueue.push(payload);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
    }

    // 4. Update local transaction storage immediately so user sees it right away
    const storageKey = transaction.type === "income" ? "income" : "expenses";
    const localRaw = await AsyncStorage.getItem(storageKey);
    const localItems = localRaw ? JSON.parse(localRaw) : [];

    const localItem = {
      _id: createdTx?._id || `local_sms_${Date.now()}`,
      type: payload.type,
      amount: payload.amount,
      category: payload.category,
      merchant: payload.merchant,
      notes: payload.description,
      description: payload.description,
      date: payload.date,
      paymentMethod: payload.paymentMethod,
      source: "sms",
      externalId: payload.externalId,
      fingerprint: payload.fingerprint,
      syncedToMongo: !isOffline,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify([localItem, ...localItems]));

    notifyListeners("transaction_confirmed", localItem);

    return { success: true, item: localItem, isOffline };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Ignores a pending SMS transaction
 */
export const ignoreSmsTransaction = async (fingerprint) => {
  try {
    // 1. Remove from pending
    const pending = await getPendingSmsConfirmations();
    const updated = pending.filter((item) => item.fingerprint !== fingerprint);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CONFIRMATIONS, JSON.stringify(updated));

    // 2. Mark fingerprint as ignored
    const ignoredRaw = await AsyncStorage.getItem(STORAGE_KEYS.IGNORED_FINGERPRINTS);
    const ignoredList = ignoredRaw ? JSON.parse(ignoredRaw) : [];
    if (!ignoredList.includes(fingerprint)) {
      ignoredList.push(fingerprint);
      await AsyncStorage.setItem(
        STORAGE_KEYS.IGNORED_FINGERPRINTS,
        JSON.stringify(ignoredList.slice(-200)) // Keep last 200 ignored
      );
    }

    notifyListeners("transaction_ignored", { fingerprint });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Syncs any pending offline SMS transactions to MongoDB Atlas
 */
export const syncOfflineSmsQueue = async () => {
  try {
    const offlineRaw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (!offlineRaw) return { count: 0 };

    const offlineQueue = JSON.parse(offlineRaw);
    if (!Array.isArray(offlineQueue) || offlineQueue.length === 0) {
      return { count: 0 };
    }

    const res = await syncSmsTransactionsToBackend(offlineQueue);
    if (res.success) {
      // Clear synced queue
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
      notifyListeners("offline_synced", res);
      return { count: res.created.length + res.duplicates.length, res };
    }

    return { count: 0, error: res.error };
  } catch (error) {
    return { count: 0, error: error.message };
  }
};
