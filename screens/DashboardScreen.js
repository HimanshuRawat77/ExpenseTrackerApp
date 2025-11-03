import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const DashboardScreen = ({ expenses, income }) => {
  const theme = useTheme();

  let totalExpense = 0;
  let totalIncome = 0;

  expenses.forEach((ex) => (totalExpense += ex.amount));
  income.forEach((inc) => (totalIncome += inc.amount));

  const balance = totalIncome - totalExpense;

  const categoryData = [];
  const categoryTotals = {};

  expenses.forEach((ex) => {
    categoryTotals[ex.category] =
      (categoryTotals[ex.category] || 0) + ex.amount;
  });

  for (const key in categoryTotals) {
    categoryData.push({ name: key, amount: categoryTotals[key] });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          Dashboard
        </Text>

        <Card style={styles.card}>
          <Card.Title title="Financial Summary" />
          <Card.Content>
            <Text style={styles.summaryText}>
              Total Income:
              <Text style={styles.incomeText}> ${totalIncome.toFixed(2)}</Text>
            </Text>
            <Text style={styles.summaryText}>
              Total Expenses:
              <Text style={styles.expenseText}>
                {" "}
                ${totalExpense.toFixed(2)}
              </Text>
            </Text>
            <Text
              style={[
                styles.balance,
                { color: balance >= 0 ? "green" : theme.colors.error },
              ]}
            >
              Balance: ${balance.toFixed(2)}
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
                  <Text>${item.amount.toFixed(2)}</Text>
                </View>
              ))
            ) : (
              <Text>No expenses logged yet.</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 15,
  },
  title: {
    marginBottom: 15,
    textAlign: "center",
  },
  card: {
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 5,
  },
  incomeText: {
    color: "green",
    fontWeight: "bold",
  },
  expenseText: {
    color: "red",
    fontWeight: "bold",
  },
  balance: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});

export default DashboardScreen;
