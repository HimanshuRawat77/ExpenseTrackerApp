import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";

const LoginScreen = ({ navigation, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleLoginPress = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Welcome Back!
      </Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button
        mode="contained"
        onPress={handleLoginPress}
        loading={loading}
        style={styles.button}
      >
        Login
      </Button>
      <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
        <Text style={[styles.link, { color: theme.colors.primary }]}>
          Don’t have an account? Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },

  title: { textAlign: "center", marginBottom: 20, fontWeight: "bold" },
  input: { marginBottom: 10 },
  button: { marginTop: 10, paddingVertical: 5 },
  link: { textAlign: "center", marginTop: 20 },
});

export default LoginScreen;
