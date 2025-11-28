import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import {
  Button,
  List,
  Switch,
  Text,
  useTheme,
  Avatar,
  IconButton,
  Menu,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SettingsScreen = ({
  navigation,
  user,
  onLogout,
  isDarkMode,
  onSetIsDarkMode,
}) => {
  const theme = useTheme();
  const [currency, setCurrency] = useState("INR");
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("userCurrency");
        if (savedCurrency) setCurrency(savedCurrency);
      } catch (error) {
        console.log("Error loading currency:", error);
      }
    };

    loadCurrency();
  }, []);
  const changeCurrency = async (newCurrency) => {
    try {
      setCurrency(newCurrency);
      await AsyncStorage.setItem("userCurrency", newCurrency);
      setMenuVisible(false);
      Alert.alert("Success", "Currency updated.");
    } catch (err) {
      console.log("Error saving currency:", err);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await onLogout();
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.headerRow}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.profileHeader}>
        <Avatar.Text
          size={64}
          label={user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.name}
        </Text>
        <Text variant="titleMedium" style={styles.email}>
          {user?.email}
        </Text>
      </View>

      {/* Preferences */}
      <List.Section>
        <List.Subheader>Preferences</List.Subheader>
        <List.Item
          title="Dark Mode"
          left={() => <List.Icon icon="theme-light-dark" />}
          right={() => (
            <Switch value={isDarkMode} onValueChange={onSetIsDarkMode} />
          )}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <List.Item
              title="Currency"
              description={currency}
              left={() => <List.Icon icon="currency-usd" />}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item title="INR (₹)" onPress={() => changeCurrency("INR")} />
          <Menu.Item title="USD ($)" onPress={() => changeCurrency("USD")} />
          <Menu.Item title="EUR (€)" onPress={() => changeCurrency("EUR")} />
          <Menu.Item title="GBP (£)" onPress={() => changeCurrency("GBP")} />
        </Menu>
      </List.Section>

      {/* Account */}
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Export Data"
          description="Get a CSV of your transactions"
          left={() => <List.Icon icon="file-document-outline" />}
          onPress={() => alert("Export coming soon!")}
        />
      </List.Section>

      {/* Logout Button */}
      <Button
        mode="contained"
        onPress={confirmLogout}
        style={styles.button}
        buttonColor={theme.colors.error}
      >
        Logout
      </Button>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 5,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    marginBottom: 10,
  },
  name: {
    fontWeight: "bold",
  },
  email: {
    color: "#888",
  },
  button: {
    margin: 20,
    marginTop: 40,
  },
});

export default SettingsScreen;
