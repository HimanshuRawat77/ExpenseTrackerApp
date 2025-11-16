import React, { useState, useEffect } from "react";
import { StatusBar } from "react-native";
import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
} from "react-native-paper";
import {
  NavigationContainer,
  DefaultTheme as NavLightTheme,
  DarkTheme as NavDarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import LoadingScreen from "./screens/LoadingScreen";
import TransactionScreen from "./screens/TransactionScreen";
import AddTransactionScreen from "./screens/AddTransactionScreen";
import CurrencyConverterScreen from "./screens/CurrencyConverterScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);

  // Load user and theme
  useEffect(() => {
    const loadInitialData = async () => {
      const storedUser = await AsyncStorage.getItem("currentUser");
      const storedTheme = await AsyncStorage.getItem("isDarkMode");
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedTheme === "true") setIsDarkMode(true);

      setTimeout(() => setIsLoading(false), 2000);
    };

    loadInitialData();
  }, []);

  // Toggle theme
  const handleSetIsDarkMode = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    await AsyncStorage.setItem("isDarkMode", JSON.stringify(newTheme));
  };

  // Login
  const handleLogin = async (email, password) => {
    if (!email || !password) return alert("Enter email & password");

    const data = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (!data) return alert("User not found. Please Sign Up.");

    const userData = JSON.parse(data);
    if (userData.password !== password) return alert("Incorrect Password");

    await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);
  };

  // Sign up
  const handleSignUp = async (name, email, password) => {
    if (!name || !email || !password) return alert("Fill all fields");

    const exists = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (exists) return alert("Email already exists");

    const newUser = { name, email: email.toLowerCase(), password };
    await AsyncStorage.setItem(
      `user_${email.toLowerCase()}`,
      JSON.stringify(newUser)
    );
    await AsyncStorage.setItem("currentUser", JSON.stringify(newUser));
    setUser(newUser);
  };

  // Logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem("currentUser");
    setUser(null);
  };

  // Add expense
  const handleAddExpense = (data) => {
    setExpenses((prev) => [...prev, data]);
    console.log("Expense Added:", data);
  };

  // Add income
  const handleAddIncome = (data) => {
    setIncome((prev) => [...prev, data]);
    console.log("Income Added:", data);
  };

  if (isLoading) return <LoadingScreen />;

  const paperTheme = isDarkMode ? MD3DarkTheme : MD3LightTheme;
  const navTheme = isDarkMode ? NavDarkTheme : NavLightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={paperTheme.colors.background}
        />

        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              {/* DASHBOARD */}
              <Stack.Screen name="Dashboard">
                {(props) => (
                  <DashboardScreen
                    {...props}
                    income={income}
                    expenses={expenses}
                    onLogout={handleLogout}
                  />
                )}
              </Stack.Screen>

              {/* TRANSACTIONS */}
              <Stack.Screen name="Transactions">
                {(props) => (
                  <TransactionScreen
                    {...props}
                    income={income}
                    expenses={expenses}
                    onDeleteExpense={(id) =>
                      setExpenses((prev) => prev.filter((e) => e.id !== id))
                    }
                    onDeleteIncome={(id) =>
                      setIncome((prev) => prev.filter((i) => i.id !== id))
                    }
                  />
                )}
              </Stack.Screen>

              {/* ADD TRANSACTION */}
              <Stack.Screen name="AddTransaction">
                {(props) => (
                  <AddTransactionScreen
                    {...props}
                    onAddExpense={handleAddExpense}
                    onAddIncome={handleAddIncome}
                  />
                )}
              </Stack.Screen>

              {/* CURRENCY CONVERTER */}
              <Stack.Screen
                name="CurrencyConverter"
                component={CurrencyConverterScreen}
              />

              {/* SETTINGS */}
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
            </>
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
