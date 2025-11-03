import React, { useState, useEffect } from "react";
import { StatusBar } from "react-native";
import {
  Provider as PaperProvider,
  DefaultTheme,
  DarkTheme,
} from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import Screens
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = isDarkMode ? DarkTheme : DefaultTheme;

  useEffect(() => {
    const checkUser = async () => {
      const stored = await AsyncStorage.getItem("currentUser");
      if (stored) setUser(JSON.parse(stored));
      setIsLoading(false);
    };
    checkUser();
  }, []);

  const handleLogin = async (email, password) => {
    if (!email || !password) {
      alert("Enter email & password");
      return;
    }

    const data = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (!data) {
      alert("User not found. Please Sign Up.");
      return;
    }

    const userData = JSON.parse(data);
    if (userData.password !== password) {
      alert("Incorrect Password");
      return;
    }

    await AsyncStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);
  };

  const handleSignUp = async (name, email, password) => {
    if (!name || !email || !password) {
      alert("Fill all fields");
      return;
    }

    const exists = await AsyncStorage.getItem(`user_${email.toLowerCase()}`);
    if (exists) {
      alert("Email already exists");
      return;
    }

    const newUser = { name, email: email.toLowerCase(), password };
    await AsyncStorage.setItem(
      `user_${email.toLowerCase()}`,
      JSON.stringify(newUser)
    );
    await AsyncStorage.setItem("currentUser", JSON.stringify(newUser));
    setUser(newUser);
  };

  if (isLoading) return null;

  // If user is logged in we can simply print welcome message
  if (user) {
    return (
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        </NavigationContainer>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={theme}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>

          <Stack.Screen name="SignUp">
            {(props) => <SignUpScreen {...props} onSignUp={handleSignUp} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
