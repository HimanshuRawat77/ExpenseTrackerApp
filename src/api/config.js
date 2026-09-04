import { Platform, NativeModules } from "react-native";

let cachedBaseUrl = null;

/**
 * Discovers and returns the working backend URL based on device environment
 * Supports Web, Expo Go on physical phones, Android Emulator, iOS Simulator
 */
export const getWorkingBaseUrl = async () => {
  if (cachedBaseUrl) return cachedBaseUrl;

  const candidates = [];

  // 1. Explicit env override if specified
  if (process.env.EXPO_PUBLIC_API_URL) {
    candidates.push(process.env.EXPO_PUBLIC_API_URL);
  }

  // 2. Web browser
  if (Platform.OS === "web") {
    const host =
      typeof window !== "undefined" && window.location?.hostname
        ? window.location.hostname
        : "localhost";
    candidates.push(`http://${host}:5001`);
  }

  // 3. React Native Metro bundle scriptURL (automatically detects Mac LAN IP on Expo Go)
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
    if (match && match[1]) {
      const host = match[1];
      if (host !== "localhost" && host !== "127.0.0.1") {
        candidates.push(`http://${host}:5001`);
      }
    }
  }

  // 4. Current known LAN IP for this machine (for phone connected via Wi-Fi)
  candidates.push("http://10.7.17.207:5001");

  // 5. Android Emulator host loopback
  if (Platform.OS === "android") {
    candidates.push("http://10.0.2.2:5001");
  }

  // 6. Localhost (iOS simulator / desktop)
  candidates.push("http://localhost:5001");

  const uniqueCandidates = [...new Set(candidates)];

  // Probe candidates with a quick 1.5s timeout to find the reachable server
  for (const url of uniqueCandidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${url}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        cachedBaseUrl = url;
        console.log(`📡 Backend connected successfully at: ${url}`);
        return url;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  // If probing failed (e.g. offline), return first candidate
  return uniqueCandidates[0];
};

export const getBackendBaseUrl = () => {
  if (cachedBaseUrl) return cachedBaseUrl;
  return "http://10.7.17.207:5001";
};
