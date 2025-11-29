import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Button, Text, TextInput, SegmentedButtons } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

const AddTransactionScreen = ({ navigation }) => {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const saveToStorage = async (key, newItem) => {
    try {
      const existing = await AsyncStorage.getItem(key);
      const parsed = existing ? JSON.parse(existing) : [];
      const updated = [...parsed, newItem];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.log("Storage error:", error);
    }
  };

  const handleSubmit = async () => {
    if (!amount || !category) {
      alert("Please enter an amount and category.");
      return;
    }

    const data = {
      id: new Date().toISOString() + Math.random().toString(),
      amount: parseFloat(amount),
      category,
      notes,
      date: new Date().toISOString(),
    };

    if (type === "expense") {
      await saveToStorage("expenses", data);
    } else {
      await saveToStorage("income", data);
    }

    setAmount("");
    setCategory("");
    setNotes("");
    alert(`${type === "expense" ? "Expense" : "Income"} added!`);
    navigation.navigate("Dashboard");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
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
            type === "expense"
              ? "Category (e.g., Food)"
              : "Source (e.g., Salary)"
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
  },
  segmented: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
});

export default AddTransactionScreen;
