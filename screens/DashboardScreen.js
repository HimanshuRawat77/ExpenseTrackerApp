import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Card, Text, IconButton, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [currency, setCurrency] = useState("INR");

  const currencySymbol = { INR: "₹", USD: "$", EUR: "€", GBP: "£" }[currency];
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

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.headerMain, { color: theme.colors.onPrimary }]}>
          Dashboard
        </Text>
        <IconButton
          icon="cog-outline"
          size={26}
          iconColor={theme.colors.onPrimary}
          onPress={() => navigation.navigate("Settings")}
        />
      </View>

      {/* Blc Crd */}
      <View
        style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]}
      >
        <Text
          style={[
            styles.balanceLabel,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Available Balance
        </Text>
        <Text style={[styles.balanceValue, { color: theme.colors.onSurface }]}>
          {currencySymbol}
          {balance.toFixed(2)}
        </Text>

        <View style={styles.balanceRow}>
          <View
            style={[
              styles.balanceBox,
              { backgroundColor: theme.dark ? "#1F1F1F" : "#F3F4F8" },
            ]}
          >
            <Text
              style={[
                styles.miniLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Income
            </Text>
            <Text style={[styles.miniValue, { color: "#27AE60" }]}>
              {currencySymbol}
              {totalIncome.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.balanceBox,
              { backgroundColor: theme.dark ? "#1F1F1F" : "#F3F4F8" },
            ]}
          >
            <Text
              style={[
                styles.miniLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Expenses
            </Text>
            <Text style={[styles.miniValue, { color: "#E74C3C" }]}>
              {currencySymbol}
              {totalExpense.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* CAT.Heading */}
      <Text
        style={[styles.categoryHeading, { color: theme.colors.onBackground }]}
      >
        Spending by Category
      </Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            {categoryData.length > 0 ? (
              categoryData.map((item) => (
                <View key={item.name} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryName,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryAmount,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {currencySymbol}
                    {item.amount.toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No expenses added yet.
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <TouchableOpacity
        style={[styles.floatingBtn, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("AddTransaction")}
      >
        <IconButton icon="plus" size={28} iconColor={theme.colors.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    padding: 20,
    paddingTop: 35,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerMain: { fontSize: 24, fontWeight: "700" },
  balanceCard: {
    marginHorizontal: 20,
    marginTop: -25,
    padding: 18,
    borderRadius: 16,
    elevation: 6,
  },
  balanceLabel: { fontSize: 14 },
  balanceValue: { fontSize: 30, fontWeight: "700", marginTop: 5 },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  balanceBox: {
    width: "48%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  miniLabel: { fontSize: 14 },
  miniValue: { fontSize: 18, fontWeight: "700", marginTop: 3 },
  categoryHeading: {
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { borderRadius: 16, paddingBottom: 10, elevation: 3 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryLeft: { flexDirection: "row", alignItems: "center" },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { fontSize: 16, fontWeight: "500" },
  categoryAmount: { fontSize: 16, fontWeight: "700" },
  emptyText: { textAlign: "center", padding: 10 },
  floatingBtn: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
});

export default DashboardScreen;
