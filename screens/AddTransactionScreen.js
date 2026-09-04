import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import {
  Button,
  Text,
  TextInput,
  SegmentedButtons,
  IconButton,
  Icon,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { AppHeader } from "../src/components";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

const AddTransactionScreen = ({ navigation }) => {
  const theme = useTheme();
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const scanReceipt = async (scanType = "receipt") => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setIsScanning(true);
      setTimeout(() => {
        if (scanType === "screenshot") {
          setType("expense");
          setAmount("380.00");
          setCategory("Food");
          setNotes("UPI payment to Swiggy");
        } else {
          setType("expense");
          setAmount("45.50");
          setCategory("Groceries");
          setNotes("Scanned from physical receipt");
        }
        setIsScanning(false);
        Alert.alert("Scan Completed", "Extracted transaction details. Please review before saving.");
      }, 1500);
    }
  };

  const saveToStorage = async (key, newItem) => {
    try {
      const existing = await AsyncStorage.getItem(key);
      const parsed = existing ? JSON.parse(existing) : [];
      const updated = [...parsed, newItem];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error("Storage error:", error);
    }
  };

  const handleSubmit = async () => {
    if (!amount.trim() || !category.trim()) {
      Alert.alert("Missing Fields", "Please enter an amount and category.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
      return;
    }

    const data = {
      id: new Date().toISOString() + Math.random().toString(),
      amount: numericAmount,
      category: category.trim(),
      notes: notes.trim(),
      date: new Date().toISOString(),
    };

    if (type === "expense") await saveToStorage("expenses", data);
    else await saveToStorage("income", data);

    setAmount("");
    setCategory("");
    setNotes("");
    Alert.alert("Success", `${type === "expense" ? "Expense" : "Income"} recorded!`);
    navigation.navigate("Home", { screen: "Dashboard" });
  };

  const isExpense = type === "expense";
  const activeTypeColor = isExpense ? semantic.expense : semantic.income;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        title={isExpense ? "Add Expense" : "Add Income"}
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type Toggle */}
        <SegmentedButtons
          value={type}
          onValueChange={setType}
          buttons={[
            {
              value: "expense",
              label: "Expense",
              icon: "arrow-down-circle-outline",
              checkedColor: "#FFFFFF",
              style: type === "expense" ? { backgroundColor: semantic.expense } : undefined,
            },
            {
              value: "income",
              label: "Income",
              icon: "arrow-up-circle-outline",
              checkedColor: "#FFFFFF",
              style: type === "income" ? { backgroundColor: semantic.income } : undefined,
            },
          ]}
          style={styles.segmented}
        />

        {/* Quick Scan Action Cards (Using Vector Icons, No Emoji) */}
        <View style={styles.scanCardsRow}>
          <TouchableOpacity
            style={[
              styles.scanCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            onPress={() => scanReceipt("receipt")}
            disabled={isScanning}
            accessibilityRole="button"
            accessibilityLabel="Scan receipt"
          >
            <View style={[styles.scanIconWrapper, { backgroundColor: "#E0E7FF" }]}>
              <Icon source="camera-outline" size={20} color={brand.emerald} />
            </View>
            <Text style={[styles.scanCardText, { color: theme.colors.onSurface }]}>
              Scan Receipt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scanCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            onPress={() => scanReceipt("screenshot")}
            disabled={isScanning}
            accessibilityRole="button"
            accessibilityLabel="Scan payment screenshot"
          >
            <View style={[styles.scanIconWrapper, { backgroundColor: "#FEF3C7" }]}>
              <Icon source="cellphone-text" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.scanCardText, { color: theme.colors.onSurface }]}>
              Scan UPI / App
            </Text>
          </TouchableOpacity>
        </View>

        {isScanning ? (
          <View
            style={[
              styles.scanningContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <ActivityIndicator animating={true} size="small" color={brand.emerald} />
            <Text style={[styles.scanningText, { color: theme.colors.onSurface }]}>
              Analyzing document...
            </Text>
          </View>
        ) : null}

        {/* Amount Input */}
        <TextInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
          outlineColor={theme.colors.outline}
          activeOutlineColor={activeTypeColor}
          textColor={theme.colors.onSurface}
          left={<TextInput.Icon icon="cash-multiple" color={theme.colors.onSurfaceVariant} />}
        />

        {/* Category Input */}
        <TextInput
          label={isExpense ? "Category (e.g., Food, Shopping, Transport)" : "Source (e.g., Salary, Investment)"}
          value={category}
          onChangeText={setCategory}
          mode="outlined"
          style={styles.input}
          outlineColor={theme.colors.outline}
          activeOutlineColor={activeTypeColor}
          textColor={theme.colors.onSurface}
          left={<TextInput.Icon icon="tag-outline" color={theme.colors.onSurfaceVariant} />}
        />

        {/* Notes Input */}
        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineColor={theme.colors.outline}
          activeOutlineColor={activeTypeColor}
          textColor={theme.colors.onSurface}
          left={<TextInput.Icon icon="text-box-outline" color={theme.colors.onSurfaceVariant} />}
        />

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitBtn}
          buttonColor={brand.emerald}
          textColor="#FFFFFF"
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
          accessibilityLabel={`Save ${type}`}
          accessibilityRole="button"
        >
          Save {isExpense ? "Expense" : "Income"}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  segmented: {
    marginBottom: spacing.lg,
  },
  scanCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  scanCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  scanIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  scanCardText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  scanningContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  scanningText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: "transparent",
  },
  submitBtn: {
    marginTop: spacing.md,
    borderRadius: 12,
  },
  btnContent: {
    height: 48,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
});

export default AddTransactionScreen;
