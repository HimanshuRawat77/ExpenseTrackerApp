import React, { useState, useEffect } from "react";
import { StatusBar } from "react-native";
import { Provider as PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import LoadingScreen from "./screens/LoadingScreen";
import BottomTabs from "./navigation/BottomTabs";
import SettingsScreen from "./screens/SettingsScreen";
import AddTransactionScreen from "./screens/AddTransactionScreen";
import ReviewReceiptScreen from "./screens/ReviewReceiptScreen";
import BalanceOnboardingScreen from "./screens/BalanceOnboardingScreen";
import {
  paperLightTheme,
  paperDarkTheme,
  navLightTheme,
  navDarkTheme,
} from "./src/theme";
import { AppIcon } from "./src/components";
import { loginToBackend, registerToBackend } from "./src/api/authApi";
import { syncLocalTransactionsToBackend } from "./src/api/transactionApi";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("isDarkMode");
        if (savedTheme === "true") setIsDarkMode(true);

        const savedUser = await AsyncStorage.getItem("currentUser");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        }
      } catch (err) {
        // Silently handled
      } finally {
        setTimeout(() => setIsLoading(false), 900);
      }
    };

    loadData();
  }, []);

  const handleSetIsDarkMode = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    await AsyncStorage.setItem("isDarkMode", JSON.stringify(newTheme));
  };

  const handleLogin = async (email, password) => {
    // 1. Authenticate with MongoDB backend
    const backendResult = await loginToBackend(email, password);

    if (backendResult.success && backendResult.user) {
      const mongoUser = backendResult.user;
      console.log("=========================================");
      console.log("🔥 USER FROM MONGODB (ATLAS):", mongoUser);
      console.log("=========================================");

      const userData = {
        ...mongoUser,
        id: mongoUser._id || mongoUser.id,
        name: mongoUser.name,
        email: mongoUser.email,
        currency: mongoUser.preferredCurrency || "INR",
        budget: String(mongoUser.monthlyBudget || "0"),
      };

      await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
      if (userData.currency) {
        await AsyncStorage.setItem("userCurrency", userData.currency);
      }
      setUser(userData);

      // Auto-sync any unsynced local transactions to MongoDB
      syncLocalTransactionsToBackend();
      return;
    }

    // 2. If user exists in local storage, migrate/register them to MongoDB
    const localData = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (localData) {
      const localUser = JSON.parse(localData);
      if (localUser.password === password) {
        console.log("🔄 Found local account. Registering user into MongoDB Atlas...");
        const registerResult = await registerToBackend({
          name: localUser.name || "User",
          email: localUser.email,
          password: localUser.password,
          preferredCurrency: localUser.currency || "INR",
          monthlyBudget: localUser.budget || 0,
        });

        if (registerResult.success && registerResult.user) {
          const mongoUser = registerResult.user;
          console.log("=========================================");
          console.log("🔥 USER FROM MONGODB (ATLAS):", mongoUser);
          console.log("=========================================");

          const userData = {
            ...mongoUser,
            id: mongoUser._id || mongoUser.id,
            name: mongoUser.name,
            email: mongoUser.email,
            currency: mongoUser.preferredCurrency || "INR",
            budget: String(mongoUser.monthlyBudget || "0"),
          };

          await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
          if (userData.currency) {
            await AsyncStorage.setItem("userCurrency", userData.currency);
          }
          setUser(userData);

          // Auto-sync any local transactions to MongoDB
          syncLocalTransactionsToBackend();
          return;
        }

        // If backend was unreachable, fallback to local storage
        console.log("📦 Loaded offline user from local storage:", localUser);
        await AsyncStorage.setItem("currentUser", JSON.stringify(localUser));
        setUser(localUser);
        return;
      } else {
        return alert("Incorrect password");
      }
    }

    // 3. User not found anywhere
    alert(backendResult.error || "User not found. Please sign up.");
  };

  const handleSignUp = async (name, email, password, currency = "INR", budget = "0") => {
    // 1. Register with MongoDB backend
    const backendResult = await registerToBackend({
      name,
      email,
      password,
      preferredCurrency: currency,
      monthlyBudget: budget,
    });

    if (backendResult.success && backendResult.user) {
      const mongoUser = backendResult.user;
      console.log("=========================================");
      console.log("🔥 REGISTERED USER IN MONGODB (ATLAS):", mongoUser);
      console.log("=========================================");

      const userData = {
        ...mongoUser,
        id: mongoUser._id || mongoUser.id,
        name: mongoUser.name,
        email: mongoUser.email,
        currency: mongoUser.preferredCurrency || currency,
        budget: String(mongoUser.monthlyBudget || budget),
        needsBalanceOnboarding: true,
      };

      await AsyncStorage.setItem(`user_${email.toLowerCase()}`, JSON.stringify({ ...userData, password }));
      await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
      await AsyncStorage.setItem("userCurrency", userData.currency);
      setUser(userData);
      return;
    }

    // 2. If network error, fallback to local storage
    if (backendResult.isNetworkError) {
      console.warn("Backend unavailable during registration. Saving locally.");
      const check = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
      if (check) return alert("Email already exists locally");

      const newUser = {
        name,
        email: email.toLowerCase(),
        password,
        currency,
        budget,
        needsBalanceOnboarding: true,
      };

      await AsyncStorage.setItem(
        `user_${email.toLowerCase()}`,
        JSON.stringify(newUser)
      );
      await AsyncStorage.setItem("currentUser", JSON.stringify(newUser));
      setUser(newUser);
      return;
    }

    // 3. Backend returned error (e.g. email exists or validation failed)
    alert(backendResult.error || "Sign up failed. Please try again.");
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("currentUser");
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("refreshToken");
    setUser(null);
  };

  const handleAddExpense = (data) => setExpenses((prev) => [...prev, data]);
  const handleAddIncome = (data) => setIncome((prev) => [...prev, data]);

  if (isLoading) return <LoadingScreen />;

  const paperTheme = isDarkMode ? paperDarkTheme : paperLightTheme;
  const navTheme = isDarkMode ? navDarkTheme : navLightTheme;

  return (
    <PaperProvider
      theme={paperTheme}
      settings={{
        icon: (props) => <AppIcon {...props} />,
      }}
    >
      <NavigationContainer theme={navTheme}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={paperTheme.colors.background}
        />

        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            user.needsBalanceOnboarding ? (
              <Stack.Screen name="BalanceOnboarding">
                {(props) => (
                  <BalanceOnboardingScreen
                    {...props}
                    route={{ params: { currency: user.currency || "INR" } }}
                    onComplete={(financialProfile) => {
                      const updated = {
                        ...user,
                        financialProfile,
                        needsBalanceOnboarding: false,
                      };
                      setUser(updated);
                      AsyncStorage.setItem("currentUser", JSON.stringify(updated));
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="Home">
                  {(props) => (
                    <BottomTabs
                      {...props}
                      user={user}
                      income={income}
                      expenses={expenses}
                      onLogout={handleLogout}
                      onAddExpense={handleAddExpense}
                      onAddIncome={handleAddIncome}
                      isDarkMode={isDarkMode}
                      onSetIsDarkMode={handleSetIsDarkMode}
                    />
                  )}
                </Stack.Screen>

                <Stack.Screen
                  name="AddTransaction"
                  component={AddTransactionScreen}
                />

                <Stack.Screen
                  name="ReviewReceipt"
                  component={ReviewReceiptScreen}
                />

                <Stack.Screen name="Settings">
                  {(props) => (
                    <SettingsScreen
                      {...props}
                      user={user}
                      onLogout={handleLogout}
                      isDarkMode={isDarkMode}
                      onSetIsDarkMode={handleSetIsDarkMode}
                    />
                  )}
                </Stack.Screen>

                <Stack.Screen
                  name="BalanceOnboarding"
                  component={BalanceOnboardingScreen}
                />
              </>
            )
          ) : (
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>

              <Stack.Screen name="SignUp">
                {(props) => <SignUpScreen {...props} onSignUp={handleSignUp} />}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
