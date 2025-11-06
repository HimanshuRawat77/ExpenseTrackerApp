import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Card, Text, IconButton, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const DashboardScreen = ({ navigation, expenses = [], income = [] }) => {
  const theme = useTheme();

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Dashboard</Text>
        <IconButton
          icon="cog"
          size={24}
          onPress={() => navigation.navigate("Settings")}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  container: {
    padding: 15,
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
