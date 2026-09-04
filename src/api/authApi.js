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
