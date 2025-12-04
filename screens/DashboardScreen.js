import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  Card,
  Text,
  IconButton,
  useTheme,
  BottomNavigation,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const [index, setIndex] = useState(0);

  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [currency, setCurrency] = useState("INR");

  const currencySymbol = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  }[currency];
  useEffect(() => {
    const loadData = async () => {
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const savedIncome = await AsyncStorage.getItem("income");
      const savedCurrency = await AsyncStorage.getItem("userCurrency");

      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      if (savedIncome) setIncome(JSON.parse(savedIncome));
      if (savedCurrency) setCurrency(savedCurrency);
    };

    loadData();
  }, []);

  const routes = [
    {
      key: "transactions",
      title: "Transactions",
      focusedIcon: "swap-horizontal",
    },
    { key: "add", title: "Add", focusedIcon: "plus-circle" },
    { key: "converter", title: "Converter", focusedIcon: "currency-usd" },
  ];

  const totalExpense = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryTotals = {};
  expenses.forEach((ex) => {
    categoryTotals[ex.category] =
      (categoryTotals[ex.category] || 0) + ex.amount;
  });

  const categoryData = Object.entries(categoryTotals).map(([name, amount]) => ({
    name,
    amount,
  }));

  const handleTabChange = (newIndex) => {
    setIndex(newIndex);
    const key = routes[newIndex].key;

    if (key === "transactions") navigation.navigate("Transactions");
    if (key === "add") navigation.navigate("AddTransaction");
    if (key === "converter") navigation.navigate("CurrencyConverter");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Dashboard</Text>
        <IconButton
          icon="cog"
          size={24}
          onPress={() => navigation.navigate("Settings")}
        />
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Title title="Financial Summary" />
          <Card.Content>
            <Text style={styles.summaryText}>
              Total Income:
              <Text style={styles.incomeText}>
                {" "}
                {currencySymbol}
                {totalIncome.toFixed(2)}
              </Text>
            </Text>

            <Text style={styles.summaryText}>
              Total Expenses:
              <Text style={styles.expenseText}>
                {" "}
                {currencySymbol}
                {totalExpense.toFixed(2)}
              </Text>
            </Text>

            <Text
              style={[
                styles.balance,
                { color: balance >= 0 ? "green" : theme.colors.error },
              ]}
            >
              Balance: {currencySymbol}
              {balance.toFixed(2)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Spending by Category" />
          <Card.Content>
            {categoryData.length > 0 ? (
              categoryData.map((item) => (
                <View key={item.name} style={styles.categoryRow}>
                  <Text>{item.name}</Text>
                  <Text>
                    {currencySymbol}
                    {item.amount.toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text>No expenses logged yet.</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={handleTabChange}
        renderScene={() => null}
        barStyle={{
          backgroundColor: theme.dark ? "#1e1e1e" : "#ffffff",
          borderTopWidth: 1,
          borderTopColor: theme.dark ? "#333" : "#ddd",
        }}
        activeColor={theme.colors.primary}
        inactiveColor={theme.dark ? "#aaa" : "#888"}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  container: { padding: 15, paddingBottom: 90 },
  card: { marginBottom: 15 },
  summaryText: { fontSize: 16, marginBottom: 5 },
  incomeText: { color: "green", fontWeight: "bold" },
  expenseText: { color: "red", fontWeight: "bold" },
  balance: { fontSize: 18, fontWeight: "bold", marginTop: 10 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});

export default DashboardScreen;
