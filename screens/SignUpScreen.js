import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Button, Text, TextInput, Menu, Icon, useTheme } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

const SignUpScreen = ({ navigation, onSignUp }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handleSignUpPress = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all the required fields.");
      return;
    }

    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!passwordRegex.test(password)) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      return;
    }

    setLoading(true);

    try {
      await onSignUp(name.trim(), email.trim(), password, currency, "0");
      await AsyncStorage.setItem("userCurrency", currency);
    } catch (error) {
      Alert.alert("Error", "Something went wrong while signing up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Icon Badge */}
        <View style={styles.brandIconContainer}>
          <View style={styles.brandBadge}>
            <Icon source="account-plus-outline" size={32} color="#FFFFFF" />
          </View>
        </View>

        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
          Create Account
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Set up your personal expense tracker in seconds
        </Text>

        <TextInput
          label="Full Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          mode="outlined"
          outlineColor={theme.colors.outline}
          activeOutlineColor={brand.emerald}
          textColor={theme.colors.onSurface}
          left={<TextInput.Icon icon="account-outline" color={theme.colors.onSurfaceVariant} />}
        />

        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          outlineColor={theme.colors.outline}
          activeOutlineColor={brand.emerald}
          textColor={theme.colors.onSurface}
          left={<TextInput.Icon icon="email-outline" color={theme.colors.onSurfaceVariant} />}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          mode="outlined"
          secureTextEntry={!showPassword}
          outlineColor={theme.colors.outline}
          activeOutlineColor={brand.emerald}
          textColor={theme.colors.onSurface}
          left={<TextInput.Icon icon="lock-outline" color={theme.colors.onSurfaceVariant} />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off-outline" : "eye-outline"}
              color={theme.colors.onSurfaceVariant}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <TextInput
                label="Currency"
                value={`${currency} (${{ INR: "₹", USD: "$", EUR: "€", GBP: "£" }[currency] || ""})`}
                style={styles.input}
                mode="outlined"
                outlineColor={theme.colors.outline}
                activeOutlineColor={brand.emerald}
                textColor={theme.colors.onSurface}
                editable={false}
                left={<TextInput.Icon icon="currency-usd" color={theme.colors.onSurfaceVariant} />}
                right={
                  <TextInput.Icon
                    icon="menu-down"
                    color={theme.colors.onSurfaceVariant}
                    onPress={() => setMenuVisible(true)}
                  />
                }
              />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            title="INR (₹) - Indian Rupee"
            onPress={() => {
              setCurrency("INR");
              setMenuVisible(false);
            }}
          />
          <Menu.Item
            title="USD ($) - US Dollar"
            onPress={() => {
              setCurrency("USD");
              setMenuVisible(false);
            }}
          />
          <Menu.Item
            title="EUR (€) - Euro"
            onPress={() => {
              setCurrency("EUR");
              setMenuVisible(false);
            }}
          />
          <Menu.Item
            title="GBP (£) - British Pound"
            onPress={() => {
              setCurrency("GBP");
              setMenuVisible(false);
            }}
          />
        </Menu>

        <Button
          mode="contained"
          onPress={handleSignUpPress}
          loading={loading}
          style={styles.button}
          buttonColor={brand.emerald}
          textColor="#FFFFFF"
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          accessibilityLabel="Create Account"
          accessibilityRole="button"
        >
          Sign Up
        </Button>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={styles.linkContainer}
          accessibilityRole="button"
          accessibilityLabel="Already have an account? Login"
        >
          <Text style={[styles.linkText, { color: theme.colors.onSurfaceVariant }]}>
            Already have an account?{" "}
            <Text style={{ color: brand.emerald, fontWeight: "700" }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    justifyContent: "center",
  },
  brandIconContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brandBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brand.emerald,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: brand.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: "transparent",
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: 12,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  linkContainer: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
  },
});

export default SignUpScreen;
