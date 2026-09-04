import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";

import DashboardScreen from "../screens/DashboardScreen";
import TransactionScreen from "../screens/TransactionScreen";
import CurrencyConverterScreen from "../screens/CurrencyConverterScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { AppIcon } from "../src/components";
import { brand } from "../src/theme/colors";

const Tab = createBottomTabNavigator();

// Empty component for the central Add tab because we intercept the press
function EmptyScreen() {
  return null;
}

export default function BottomTabs({
  income,
  expenses,
  onAddIncome,
  onAddExpense,
  onLogout,
  isDarkMode,
  onSetIsDarkMode,
  user,
}) {
  const theme = useTheme();
  const activeColor = brand.emerald; // #10B981
  const inactiveColor = theme.dark ? "#94A3B8" : "#64748B";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {/* 1. HOME */}
      <Tab.Screen
        name="Dashboard"
        children={(props) => (
          <DashboardScreen
            {...props}
            user={user}
            income={income}
            expenses={expenses}
            onLogout={onLogout}
          />
        )}
        options={{
          tabBarLabel: "Home",
          tabBarAccessibilityLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* 2. TRANSACTIONS */}
      <Tab.Screen
        name="Transactions"
        children={(props) => (
          <TransactionScreen {...props} income={income} expenses={expenses} />
        )}
        options={{
          tabBarLabel: "History",
          tabBarAccessibilityLabel: "Transactions",
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              name={focused ? "format-list-bulleted" : "receipt-text-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* 3. ADD BUTTON (Central Emerald Icon Button) */}
      <Tab.Screen
        name="AddTab"
        component={EmptyScreen}
        options={({ navigation }) => ({
          tabBarLabel: "",
          tabBarAccessibilityLabel: "Add transaction",
          tabBarIcon: () => (
            <View style={styles.addBtnContainer}>
              <View style={styles.addBtnInner}>
                <AppIcon name="plus" size={26} color="#FFFFFF" />
              </View>
            </View>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              activeOpacity={0.8}
              accessibilityLabel="Add transaction"
              accessibilityRole="button"
              onPress={() => {
                const totalInc = (income || []).reduce(
                  (sum, i) => sum + (Number(i.amount) || 0),
                  0
                );
                const totalExp = (expenses || []).reduce(
                  (sum, e) => sum + (Number(e.amount) || 0),
                  0
                );
                const bal = totalInc - totalExp;
                navigation.navigate("AddTransaction", { balance: bal });
              }}
            />
          ),
        })}
      />

      {/* 4. ANALYTICS / CONVERTER */}
      <Tab.Screen
        name="Converter"
        component={CurrencyConverterScreen}
        options={{
          tabBarLabel: "Converter",
          tabBarAccessibilityLabel: "Currency converter",
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              name={focused ? "chart-line" : "currency-usd"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* 5. PROFILE / SETTINGS */}
      <Tab.Screen
        name="Profile"
        children={(props) => (
          <SettingsScreen
            {...props}
            user={user}
            onLogout={onLogout}
            isDarkMode={isDarkMode}
            onSetIsDarkMode={onSetIsDarkMode}
          />
        )}
        options={{
          tabBarLabel: "Profile",
          tabBarAccessibilityLabel: "Profile and Settings",
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              name={focused ? "account" : "account-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  addBtnContainer: {
    top: -12,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brand.emerald, // #10B981
    justifyContent: "center",
    alignItems: "center",
    shadowColor: brand.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});
