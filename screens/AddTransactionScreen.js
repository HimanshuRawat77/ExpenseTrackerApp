import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Button,
  Text,
  TextInput,
  SegmentedButtons,
  IconButton,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

const AddTransactionScreen = ({ navigation }) => {
  const theme = useTheme();
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const scanReceipt = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setIsScanning(true);
      // Mock OCR Processing Delay
      setTimeout(() => {
        setType("expense");
        setAmount("45.50");
        setCategory("Groceries");
        setNotes("Scanned from receipt");
        setIsScanning(false);
        alert("Receipt scanned successfully! Data extracted.");
      }, 2000);
    }
  };

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

    if (type === "expense") await saveToStorage("expenses", data);
    else await saveToStorage("income", data);

    setAmount("");
    setCategory("");
    setNotes("");
    alert(`${type === "expense" ? "Expense" : "Income"} added!`);
    navigation.navigate("Home", { screen: "Dashboard" });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.headerRow,
          {
            borderBottomColor: theme.colors.outline,
            backgroundColor: theme.colors.elevation.level2,
          },
        ]}
      >
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />

        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Add Transaction
        </Text>
        <IconButton
          icon="camera"
          size={24}
          onPress={scanReceipt}
          iconColor={theme.colors.primary}
          disabled={isScanning}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <SegmentedButtons
          value={type}
          onValueChange={setType}
          buttons={[
            { value: "expense", label: "Expense", icon: "arrow-down" },
            { value: "income", label: "Income", icon: "arrow-up" },
          ]}
          style={styles.segmented}
        />

        {isScanning ? (
          <View style={styles.scanningContainer}>
            <ActivityIndicator animating={true} size="large" />
            <Text style={styles.scanningText}>Analyzing receipt...</Text>
          </View>
        ) : null}

        <TextInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          mode="outlined"
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
          mode="outlined"
        />
        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          style={styles.input}
          mode="outlined"
          multiline
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
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  container: {
    padding: 20,
    paddingBottom: 50,
  },
  segmented: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  scanningContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  scanningText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddTransactionScreen;
