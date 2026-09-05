import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from "react-native";
import { Button, Text, TextInput, Icon, useTheme } from "react-native-paper";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

const LoginScreen = ({ navigation, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleLoginPress = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    setLoading(true);

    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Unable to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {/* Brand App Logo */}
        <View style={styles.brandIconContainer}>
          <Image
            source={require("../assets/app-logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel="Expense Tracker App Logo"
          />
        </View>

        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Sign in to access your financial dashboard
        </Text>

        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
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

        <Button
          mode="contained"
          onPress={handleLoginPress}
          loading={loading}
          style={styles.button}
          buttonColor={brand.emerald}
          textColor="#FFFFFF"
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          accessibilityLabel="Log in"
          accessibilityRole="button"
        >
          Sign In
        </Button>

        <TouchableOpacity
          onPress={() => navigation.navigate("SignUp")}
          style={styles.linkContainer}
          accessibilityRole="button"
          accessibilityLabel="Don't have an account? Sign Up"
        >
          <Text style={[styles.linkText, { color: theme.colors.onSurfaceVariant }]}>
            Don't have an account?{" "}
            <Text style={{ color: brand.emerald, fontWeight: "700" }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: "center",
  },
  brandIconContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brandLogo: {
    width: 84,
    height: 84,
    borderRadius: 20,
    shadowColor: brand.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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

export default LoginScreen;
