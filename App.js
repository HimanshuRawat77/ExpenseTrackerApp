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
import {
  paperLightTheme,
  paperDarkTheme,
  navLightTheme,
  navDarkTheme,
} from "./src/theme";
import { AppIcon } from "./src/components";

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
      } catch (err) {
        console.warn("Error loading preferences:", err);
      } finally {
        setTimeout(() => setIsLoading(false), 1200);
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
    const data = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (!data) return alert("User not found. Please sign up.");

    const userData = JSON.parse(data);
    if (userData.password !== password) return alert("Incorrect password");

    await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);
  };

  const handleSignUp = async (name, email, password, currency = "INR", budget = "0") => {
    const check = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (check) return alert("Email already exists");

    const newUser = {
      name,
      email: email.toLowerCase(),
      password,
      currency,
      budget,
    };

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
