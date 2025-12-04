import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { IconButton } from "react-native-paper";

import DashboardScreen from "../screens/DashboardScreen";
import TransactionScreen from "../screens/TransactionScreen";
import CurrencyConverterScreen from "../screens/CurrencyConverterScreen";

const Tab = createBottomTabNavigator();

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        children={(props) => (
          <DashboardScreen
            {...props}
            income={income}
            expenses={expenses}
            onLogout={onLogout}
          />
        )}
        options={{
          tabBarIcon: () => <IconButton icon="view-dashboard" size={22} />,
        }}
      />

      <Tab.Screen
        name="Transactions"
        children={(props) => (
          <TransactionScreen {...props} income={income} expenses={expenses} />
        )}
        options={{
          tabBarIcon: () => <IconButton icon="swap-horizontal" size={22} />,
        }}
      />

      <Tab.Screen
        name="Converter"
        component={CurrencyConverterScreen}
        options={{
          tabBarIcon: () => <IconButton icon="currency-usd" size={22} />,
        }}
      />
    </Tab.Navigator>
  );
}
