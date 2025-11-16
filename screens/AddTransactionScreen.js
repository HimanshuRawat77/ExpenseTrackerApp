import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Button, Text, TextInput, SegmentedButtons } from "react-native-paper";

const AddTransactionScreen = ({ navigation, onAddExpense, onAddIncome }) => {
  const [type, setType] = useState("expense"); // 'expense' or 'income'
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!amount || !category) {
      alert("Please enter an amount and category.");
      return;
    }

    const data = {
      id: new Date().toISOString() + Math.random().toString(), // Unique ID
      amount: parseFloat(amount),
      category: category,
      notes: notes,
      date: new Date().toISOString(),
    };

    if (type === "expense") {
      onAddExpense(data);
    } else {
      onAddIncome(data);
    }

    // Reset form and navigate away
    setAmount("");
    setCategory("");
    setNotes("");
    alert(`${type === "expense" ? "Expense" : "Income"} added!`);
    navigation.navigate("Dashboard");
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Add Transaction
      </Text>

      <SegmentedButtons
        value={type}
        onValueChange={setType}
        buttons={[
          { value: "expense", label: "Expense", icon: "arrow-down" },
          { value: "income", label: "Income", icon: "arrow-up" },
        ]}
        style={styles.segmented}
      />

      <TextInput
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
        keyboardType="numeric"
      />
      <TextInput
        label={
          type === "expense" ? "Category (e.g., Food)" : "Source (e.g., Salary)"
        }
        value={category}
        onChangeText={setCategory}
        style={styles.input}
      />
      <TextInput
        label="Notes (Optional)"
        value={notes}
        onChangeText={setNotes}
        style={styles.input}
      />

      <Button mode="contained" onPress={handleSubmit} style={styles.button}>
        Add {type === "expense" ? "Expense" : "Income"}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { textAlign: "center", marginBottom: 20 },
  segmented: { marginBottom: 20 },
  input: { marginBottom: 15 },
  button: { marginTop: 10, paddingVertical: 5 },
});

export default AddTransactionScreen;
