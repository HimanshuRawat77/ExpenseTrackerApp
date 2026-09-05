import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  Chip,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppHeader, AppIcon } from "../src/components";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";
import { createTransactionInBackend } from "../src/api/transactionApi";
import { invalidateAIInsightCache } from "../src/api/aiApi";

const CATEGORIES = [
  "Food",
  "Groceries",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Other",
];

const PAYMENT_METHODS = [
  { label: "UPI", value: "upi" },
  { label: "Card", value: "card" },
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank_transfer" },
  { label: "Wallet", value: "wallet" },
  { label: "Other", value: "other" },
];

const ReviewReceiptScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const initialData = route?.params?.extractedData || {};
  const onRetake = route?.params?.onRetake;

  const [merchant, setMerchant] = useState(initialData.merchant || "");
  const [amount, setAmount] = useState(
    initialData.amount ? String(initialData.amount) : ""
  );
  const [currency] = useState(initialData.currency || "INR");
  const [date, setDate] = useState(
    initialData.date || new Date().toISOString().split("T")[0]
  );
  const [category, setCategory] = useState(initialData.category || "Food");
  const [paymentMethod, setPaymentMethod] = useState(
    initialData.paymentMethod || "upi"
  );
  const [description, setDescription] = useState(initialData.description || "");
  const [isSaving, setIsSaving] = useState(false);

  // Check if critical fields were missing from extraction
  const hasMissingCriticalFields = !initialData.amount || !initialData.merchant;

  const handleConfirm = async () => {
    if (!amount.trim()) {
      Alert.alert("Missing Amount", "Please enter the transaction amount.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
      return;
    }

    if (!category.trim()) {
      Alert.alert("Missing Category", "Please select or enter a category.");
      return;
    }

    setIsSaving(true);

    try {
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const savedIncome = await AsyncStorage.getItem("income");
      const parsedExpenses = savedExpenses ? JSON.parse(savedExpenses) : [];
      const parsedIncome = savedIncome ? JSON.parse(savedIncome) : [];
      const totalInc = parsedIncome.reduce(
        (sum, i) => sum + (Number(i.amount) || 0),
        0
      );
      const totalExp = parsedExpenses.reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0
      );
      const currentBal = totalInc - totalExp;

      if (currentBal <= 0) {
        setIsSaving(false);
        Alert.alert("Insufficient Balance", "You does not have enough money.");
        return;
      }

      const transactionDate = date ? new Date(date).toISOString() : new Date().toISOString();

      const payload = {
        type: "expense",
        amount: numericAmount,
        currency,
        category: category.trim(),
        merchant: merchant.trim() || null,
        description: description.trim(),
        date: transactionDate,
        paymentMethod: paymentMethod || "other",
        source: "receipt",
        aiCategorized: true,
      };

      // 1. Save directly to MongoDB Atlas backend
      const savedMongo = await createTransactionInBackend(payload);

      // 2. Persist locally for instant offline rendering
      const localItem = {
        id: (savedMongo && savedMongo._id) ? savedMongo._id : new Date().toISOString() + Math.random().toString(),
        _id: savedMongo ? savedMongo._id : undefined,
        syncedToMongo: Boolean(savedMongo && savedMongo._id),
        ...payload,
        notes: description.trim(),
      };

      const existingRaw = await AsyncStorage.getItem("expenses");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      await AsyncStorage.setItem("expenses", JSON.stringify([...existing, localItem]));

      // 3. Invalidate AI insights cache
      await invalidateAIInsightCache();

      setIsSaving(false);
      Alert.alert("Success", "Receipt expense confirmed and recorded!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("Home", { screen: "Dashboard" });
          },
        },
      ]);
    } catch (error) {
      setIsSaving(false);
      Alert.alert("Error", "Could not save transaction. Please try again.");
    }
  };

  const handleRetakePress = () => {
    if (onRetake) {
      navigation.goBack();
      onRetake();
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        title="Review Expense"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* AI Extraction Banner */}
          <View style={[styles.aiBadge, { backgroundColor: "rgba(99, 102, 241, 0.1)", borderColor: semantic.ai }]}>
            <AppIcon name="auto-fix" size={18} color={semantic.ai} />
            <Text style={[styles.aiBadgeText, { color: semantic.ai }]}>
              Scanned with Gemini Vision
            </Text>
          </View>

          {/* Missing Fields Notice */}
          {hasMissingCriticalFields && (
            <View style={[styles.warningBanner, { backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: semantic.warning }]}>
              <AppIcon name="alert-circle-outline" size={18} color={semantic.warning} />
              <Text style={[styles.warningText, { color: semantic.warning }]}>
                Some details could not be detected with full certainty. Please review and edit the fields below.
              </Text>
            </View>
          )}

          {/* Merchant */}
          <TextInput
            label="Merchant / Store"
            value={merchant}
            onChangeText={setMerchant}
            mode="outlined"
            placeholder="e.g. Domino's, Starbucks, Walmart"
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={brand.emerald}
            textColor={theme.colors.onSurface}
            left={<TextInput.Icon icon="storefront-outline" color={theme.colors.onSurfaceVariant} />}
          />

          {/* Amount */}
          <TextInput
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            placeholder="0.00"
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={brand.emerald}
            textColor={theme.colors.onSurface}
            left={<TextInput.Icon icon="currency-inr" color={theme.colors.onSurfaceVariant} />}
          />

          {/* Date */}
          <TextInput
            label="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            mode="outlined"
            placeholder="YYYY-MM-DD"
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={brand.emerald}
            textColor={theme.colors.onSurface}
            left={<TextInput.Icon icon="calendar-month-outline" color={theme.colors.onSurfaceVariant} />}
          />

          {/* Category Chips Selection */}
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Category</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((cat) => {
              const isSelected = category.toLowerCase() === cat.toLowerCase();
              return (
                <Chip
                  key={cat}
                  selected={isSelected}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: brand.emerald },
                  ]}
                  textStyle={[
                    styles.chipText,
                    isSelected && { color: "#FFFFFF", fontWeight: "700" },
                  ]}
                  showSelectedOverlay={false}
                >
                  {cat}
                </Chip>
              );
            })}
          </View>

          {/* Payment Method Chips */}
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Payment Method</Text>
          <View style={styles.chipsContainer}>
            {PAYMENT_METHODS.map((pm) => {
              const isSelected = paymentMethod.toLowerCase() === pm.value.toLowerCase();
              return (
                <Chip
                  key={pm.value}
                  selected={isSelected}
                  onPress={() => setPaymentMethod(pm.value)}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: brand.primarySurface, borderColor: brand.emerald, borderWidth: 1.5 },
                  ]}
                  textStyle={[
                    styles.chipText,
                    isSelected && { color: brand.emerald, fontWeight: "700" },
                  ]}
                  showSelectedOverlay={false}
                >
                  {pm.label}
                </Chip>
              );
            })}
          </View>

          {/* Description */}
          <TextInput
            label="Description / Items"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            placeholder="e.g. Pizza, Groceries, Dinner with team"
            multiline
            numberOfLines={2}
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={brand.emerald}
            textColor={theme.colors.onSurface}
            left={<TextInput.Icon icon="text-box-outline" color={theme.colors.onSurfaceVariant} />}
          />

          {/* Actions Row: Retake and Confirm */}
          <View style={styles.actionRow}>
            <Button
              mode="outlined"
              onPress={handleRetakePress}
              disabled={isSaving}
              style={[styles.actionBtn, styles.retakeBtn, { borderColor: theme.colors.outline }]}
              textColor={theme.colors.onSurface}
              icon="camera-outline"
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              Retake
            </Button>

            <Button
              mode="contained"
              onPress={handleConfirm}
              loading={isSaving}
              disabled={isSaving}
              style={[styles.actionBtn, styles.confirmBtn, { backgroundColor: brand.emerald }]}
              textColor="#FFFFFF"
              icon="check"
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
            >
              Confirm
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  aiBadgeText: {
    marginLeft: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  warningText: {
    marginLeft: spacing.sm,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
    gap: 8,
  },
  chip: {
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
  },
  retakeBtn: {},
  confirmBtn: {},
  btnContent: {
    height: 48,
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ReviewReceiptScreen;
