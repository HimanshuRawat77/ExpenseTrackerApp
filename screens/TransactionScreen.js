import React from "react";
import { View, FlatList, StyleSheet, Alert } from "react-native";
import { Text, List, useTheme, IconButton } from "react-native-paper";

const TransactionsScreen = ({
  expenses,
  income,
  onDeleteExpense,
  onDeleteIncome,
}) => {
  const theme = useTheme();

  const allTransactions = [
    ...expenses.map((e) => ({ ...e, type: "expense" })),
    ...income.map((i) => ({ ...i, type: "income" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

  const handleDelete = (item) => {
    Alert.alert(
      `Delete ${item.type}`,
      `Are you sure you want to delete this ${item.type}: $${item.amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (item.type === "expense") {
              onDeleteExpense(item.id);
            } else {
              onDeleteIncome(item.id);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isExpense = item.type === "expense";
    const color = isExpense ? theme.colors.error : "green";

    return (
      <List.Item
        title={item.category}
        description={item.notes || new Date(item.date).toLocaleDateString()}
        left={() => (
          <List.Icon
            icon={isExpense ? "arrow-down-circle" : "arrow-up-circle"}
            color={color}
          />
        )}
        right={() => (
          <View style={styles.row}>
            <Text style={[styles.amount, { color: color }]}>
              {isExpense ? "-" : "+"}${item.amount.toFixed(2)}
            </Text>
            <IconButton
              icon="trash-can-outline"
              size={20}
              iconColor={theme.colors.onSurfaceDisabled}
              onPress={() => handleDelete(item)}
            />
          </View>
        )}
      />
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={allTransactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={
          <Text variant="headlineLarge" style={styles.title}>
            All Transactions
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions found.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  emptyText: { textAlign: "center", marginTop: 50 },
  row: { flexDirection: "row", alignItems: "center" },
  amount: { fontSize: 16, fontWeight: "bold" },
});

export default TransactionsScreen;
