import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Button, Text, TextInput, Menu, useTheme } from "react-native-paper";

const SignUpScreen = ({ navigation, onSignUp }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const theme = useTheme();

  const handleSignUpPress = async () => {
    setLoading(true);
    await onSignUp(name, email, password, currency, budget);
    setLoading(false);
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
        autoCapitalize="words"
      />

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

      {/* Currency Dropdown */}
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

      {/* Monthly Budget */}
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
