import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Button, Text, TextInput, Menu, useTheme } from "react-native-paper";

const SignUpScreen = ({ navigation, onSignUp }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handleSignUpPress = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !budget.trim()) {
      Alert.alert("Error", "Please fill all the fields.");
      return;
    }

    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!passwordRegex.test(password)) {
      Alert.alert(
        "Weak Password",
        "Password must include uppercase, lowercase, number, and special character."
      );
      return;
    }

    setLoading(true);

    try {
      await onSignUp(name, email, password, currency, budget);
    } catch (error) {
      console.error("SignUp error:", error);
      Alert.alert("Error", "Something went wrong while signing up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Create Account
      </Text>

      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry={!showPassword}
        right={
          <TextInput.Icon
            icon={showPassword ? "eye-off" : "eye"}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TextInput
            label="Currency Type"
            value={currency}
            style={styles.input}
            right={
              <TextInput.Icon
                icon="menu-down"
                onPress={() => setMenuVisible(true)}
              />
            }
            editable={false}
          />
        }
      >
        <Menu.Item
          onPress={() => {
            setCurrency("INR");
            setMenuVisible(false);
          }}
          title="INR (₹)"
        />
        <Menu.Item
          onPress={() => {
            setCurrency("USD");
            setMenuVisible(false);
          }}
          title="USD ($)"
        />
        <Menu.Item
          onPress={() => {
            setCurrency("EUR");
            setMenuVisible(false);
          }}
          title="EUR (€)"
        />
        <Menu.Item
          onPress={() => {
            setCurrency("GBP");
            setMenuVisible(false);
          }}
          title="GBP (£)"
        />
      </Menu>

      <TextInput
        label="Monthly Budget"
        value={budget}
        onChangeText={setBudget}
        style={styles.input}
        keyboardType="numeric"
      />

      <Button
        mode="contained"
        onPress={handleSignUpPress}
        loading={loading}
        style={styles.button}
      >
        Sign Up
      </Button>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={[styles.link, { color: theme.colors.primary }]}>
          Already have an account? Login
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

export default SignUpScreen;
