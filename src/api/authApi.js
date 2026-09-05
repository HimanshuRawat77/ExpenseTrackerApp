import AsyncStorage from "@react-native-async-storage/async-storage";
import { getWorkingBaseUrl } from "./config";

/**
 * Login user against MongoDB Atlas backend
 */
export const loginToBackend = async (email, password) => {
  const baseUrl = await getWorkingBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (response.ok && data?.user) {
      // Log the exact MongoDB user document as requested by the user
      console.log("=========================================");
      console.log("🔥 USER FROM MONGODB (ATLAS):", JSON.stringify(data.user, null, 2));
      console.log("=========================================");

      if (data.accessToken) {
        await AsyncStorage.setItem("authToken", data.accessToken);
      }
      if (data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
      }

      return { success: true, user: data.user, data };
    } else {
      return {
        success: false,
        error: data?.error || (data?.errors ? data.errors[0]?.msg : "Invalid email or password"),
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Backend auth request error:", error.message || error);
    return {
      success: false,
      isNetworkError: true,
      error: "Unable to connect to authentication server.",
    };
  }
};

/**
 * Register user against MongoDB Atlas backend
 */
export const registerToBackend = async ({
  name,
  email,
  password,
  preferredCurrency = "INR",
  monthlyBudget = 0,
}) => {
  const baseUrl = await getWorkingBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        preferredCurrency,
        monthlyBudget: Number(monthlyBudget) || 0,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (response.status === 201 && data?.user) {
      console.log("=========================================");
      console.log("🔥 REGISTERED USER IN MONGODB (ATLAS):", JSON.stringify(data.user, null, 2));
      console.log("=========================================");

      if (data.accessToken) {
        await AsyncStorage.setItem("authToken", data.accessToken);
      }
      if (data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.refreshToken);
      }

      return { success: true, user: data.user, data };
    } else {
      const errMsg =
        data?.error ||
        (data?.errors && data.errors.length > 0 ? data.errors[0].msg : "Registration failed");
      return { success: false, error: errMsg };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Backend registration error:", error.message || error);
    return {
      success: false,
      isNetworkError: true,
      error: "Unable to connect to registration server.",
    };
  }
};

/**
 * Attempt to refresh the access token using refreshToken
 */
export const refreshAuthToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    const baseUrl = await getWorkingBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data?.accessToken) {
        await AsyncStorage.setItem("authToken", data.accessToken);
        if (data.refreshToken) {
          await AsyncStorage.setItem("refreshToken", data.refreshToken);
        }
        return data.accessToken;
      }
    }
  } catch (err) {
    console.warn("Silent token refresh error:", err.message);
  }
  return null;
};

/**
 * Universal authenticated fetch with automatic token refresh on 401
 */
export const authenticatedFetch = async (endpoint, options = {}, timeoutMs = 8000) => {
  const baseUrl = await getWorkingBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  let token = await AsyncStorage.getItem("authToken");

  const execute = async (bearerToken) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (bearerToken) {
      headers["Authorization"] = `Bearer ${bearerToken}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  let response;
  try {
    response = await execute(token);
  } catch (err) {
    throw err;
  }

  // If 401 Unauthorized (e.g. Token expired), silently refresh and retry once!
  if (response.status === 401) {
    console.log("🔄 Token expired (401). Refreshing token and retrying request...");
    const newToken = await refreshAuthToken();
    if (newToken) {
      try {
        response = await execute(newToken);
      } catch (retryErr) {
        throw retryErr;
      }
    }
  }

  return response;
};

/**
 * Update user's opening bank balance & financial profile in MongoDB Atlas
 */
export const updateFinancialProfileInBackend = async (openingBalance) => {
  try {
    const cleanAmount = Number(String(openingBalance).replace(/,/g, "").trim());

    const response = await authenticatedFetch('/api/auth/financial-profile', {
      method: "PATCH",
      body: JSON.stringify({ openingBalance: cleanAmount }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.data?.financialProfile) {
      // Also update local cached currentUser document
      const cachedUser = await AsyncStorage.getItem("currentUser");
      if (cachedUser) {
        const userObj = JSON.parse(cachedUser);
        userObj.financialProfile = data.data.financialProfile;
        await AsyncStorage.setItem("currentUser", JSON.stringify(userObj));
      }
      return { success: true, financialProfile: data.data.financialProfile, user: data.data.user };
    } else {
      return {
        success: false,
        error: data?.message || data?.error || "Failed to update financial profile",
      };
    }
  } catch (error) {
    return {
      success: false,
      isNetworkError: true,
      error: "Unable to connect to server.",
    };
  }
};

/**
 * Fetch current user profile including financialProfile from backend
 */
export const getMeFromBackend = async () => {
  try {
    const response = await authenticatedFetch('/api/auth/me');

    if (response.ok) {
      const data = await response.json().catch(() => null);
      return data?.user || null;
    }
    return null;
  } catch (error) {
    return null;
  }
};

