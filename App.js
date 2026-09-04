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
import LoadingScreen from "./screens/LoadingScreen";
import BottomTabs from "./navigation/BottomTabs";
import SettingsScreen from "./screens/SettingsScreen"; // FIXED IMPORT
import AddTransactionScreen from "./screens/AddTransactionScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const savedUser = await AsyncStorage.getItem("currentUser");
      const savedTheme = await AsyncStorage.getItem("isDarkMode");
      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedTheme === "true") setIsDarkMode(true);

      setTimeout(() => setIsLoading(false), 1500);
    };

    loadData();
  }, []);

  const handleSetIsDarkMode = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    await AsyncStorage.setItem("isDarkMode", JSON.stringify(newTheme));
  };

  const handleLogin = async (email, password) => {
    const data = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (!data) return alert("User not found. Please sign up.");

    const userData = JSON.parse(data);
    if (userData.password !== password) return alert("Incorrect password");

    await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);
  };

  const handleSignUp = async (name, email, password) => {
    const check = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (check) return alert("Email already exists");

    const newUser = { name, email: email.toLowerCase(), password };
    await AsyncStorage.setItem(
      `user_${email.toLowerCase()}`,
      JSON.stringify(newUser)
    );
    await AsyncStorage.setItem("currentUser", JSON.stringify(newUser));
    setUser(newUser);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("currentUser");
    setUser(null);
  };

  const handleAddExpense = (data) => setExpenses((prev) => [...prev, data]);
  const handleAddIncome = (data) => setIncome((prev) => [...prev, data]);

  if (isLoading) return <LoadingScreen />;

  const customLightTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#1E88E5', // Vibrant Blue
      onPrimary: '#FFFFFF',
      primaryContainer: '#BBDEFB',
      onPrimaryContainer: '#001E36',
      secondary: '#E53935', // Vibrant Red
      onSecondary: '#FFFFFF',
      secondaryContainer: '#FFCDD2',
      onSecondaryContainer: '#410002',
      error: '#B3261E',
      background: '#F8F9FA',
      surface: '#FFFFFF',
      elevation: {
        level1: '#F1F5F9',
        level2: '#E2E8F0',
        level3: '#CBD5E1',
      }
    },
  };

  const customDarkTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: '#64B5F6', // Lighter Blue for Dark Mode
      onPrimary: '#003258',
      primaryContainer: '#00497D',
      onPrimaryContainer: '#D1E4FF',
      secondary: '#EF5350', // Lighter Red for Dark Mode
      onSecondary: '#680005',
      secondaryContainer: '#93000A',
      onSecondaryContainer: '#FFDAD6',
      error: '#F2B8B5',
      background: '#121212',
      surface: '#1E1E1E',
    },
  };

  const paperTheme = isDarkMode ? customDarkTheme : customLightTheme;
  
  // Create a matching React Navigation theme
  const customNavLightTheme = {
    ...NavLightTheme,
    colors: {
      ...NavLightTheme.colors,
      primary: customLightTheme.colors.primary,
      background: customLightTheme.colors.background,
      card: customLightTheme.colors.surface,
      text: customLightTheme.colors.onSurface,
      border: customLightTheme.colors.outline,
    },
  };
  
  const customNavDarkTheme = {
    ...NavDarkTheme,
    colors: {
      ...NavDarkTheme.colors,
      primary: customDarkTheme.colors.primary,
      background: customDarkTheme.colors.background,
      card: customDarkTheme.colors.surface,
      text: customDarkTheme.colors.onSurface,
      border: customDarkTheme.colors.outline,
    },
  };

  const navTheme = isDarkMode ? customNavDarkTheme : customNavLightTheme;

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
