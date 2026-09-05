import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from "react-native";
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
import { AppHeader, AppIcon } from "../src/components";
import { invalidateAIInsightCache, scanReceiptImage } from "../src/api/aiApi";
import {
  createTransactionInBackend,
  getTransactionsFromBackend,
} from "../src/api/transactionApi";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

const AddTransactionScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const [balance, setBalance] = useState(route?.params?.balance ?? null);
  const [isBalanceLoaded, setIsBalanceLoaded] = useState(
    route?.params?.balance !== undefined
  );
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const checkBalance = async () => {
      try {
        let savedExpenses = await AsyncStorage.getItem("expenses");
        let savedIncome = await AsyncStorage.getItem("income");
        let parsedExpenses = savedExpenses ? JSON.parse(savedExpenses) : [];
        let parsedIncome = savedIncome ? JSON.parse(savedIncome) : [];

        // If a positive balance was explicitly passed from route params, honor it
        if (
          route?.params?.balance !== undefined &&
          Number(route.params.balance) > 0
        ) {
          setBalance(Number(route.params.balance));
          setIsBalanceLoaded(true);
          return;
        }

        // Otherwise, sync fresh transactions from MongoDB backend
        try {
          const backendTx = await getTransactionsFromBackend();
          if (backendTx && Array.isArray(backendTx) && backendTx.length > 0) {
            parsedExpenses = backendTx.filter((t) => t.type === "expense");
            parsedIncome = backendTx.filter((t) => t.type === "income");
            await AsyncStorage.setItem("expenses", JSON.stringify(parsedExpenses));
            await AsyncStorage.setItem("income", JSON.stringify(parsedIncome));
          }
        } catch (err) {
          // Handled silently, fallback to local storage
        }

        const totalInc = parsedIncome.reduce(
          (sum, i) => sum + (Number(i.amount) || 0),
          0
        );
        const totalExp = parsedExpenses.reduce(
          (sum, e) => sum + (Number(e.amount) || 0),
          0
        );
        const currentBal = Math.max(0, totalInc - totalExp);

        setBalance(currentBal);
        setIsBalanceLoaded(true);

        if (currentBal > 0) {
          // Balance > 0: Expense is enabled
          setType("expense");
        } else {
          // Balance <= 0: Disable expense and switch to income
          setType("income");
          Alert.alert("Insufficient Balance", "You does not have enough money.");
        }
      } catch (err) {
        setIsBalanceLoaded(true);
      }
    };

    checkBalance();
  }, [route?.params?.balance]);

  // Expense option is enabled IF balance > 0, else disabled
  const isExpenseDisabled = isBalanceLoaded && balance !== null ? balance <= 0 : false;


  const promptReceiptSource = () => {
    if (isExpenseDisabled) {
      Alert.alert("Insufficient Balance", "You does not have enough money.");
      return;
    }

    Alert.alert(
      "Scan Receipt",
      "Choose an option to scan your physical receipt:",
      [
        {
          text: "Take Photo",
          onPress: () => handleCaptureReceipt("camera"),
        },
        {
          text: "Choose from Gallery",
          onPress: () => handleCaptureReceipt("gallery"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleCaptureReceipt = async (source) => {
    try {
      let result;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Camera Permission Denied",
            "Camera permission is required to photograph your receipt."
          );
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Gallery Permission Denied",
            "Permission to access your photo gallery is required to choose a receipt."
          );
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        Alert.alert(
          "Image Too Large",
          "Please select an image smaller than 10MB."
        );
        return;
      }

      setIsScanning(true);

      const extracted = await scanReceiptImage({
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
      });

      setIsScanning(false);

      navigation.navigate("ReviewReceipt", {
        extractedData: extracted,
        onRetake: promptReceiptSource,
      });
    } catch (err) {
      setIsScanning(false);
      Alert.alert(
        "Receipt Scanning",
        (err.message || "We couldn't read this receipt clearly.") +
          "\n\nWould you like to review and enter the receipt details manually?",
        [
          {
            text: "Enter Manually",
            onPress: () => {
              navigation.navigate("ReviewReceipt", {
                extractedData: {
                  merchant: "",
                  amount: "",
                  date: new Date().toISOString().split("T")[0],
                  category: "Food",
                  paymentMethod: "upi",
                  description: "Scanned Receipt",
                },
                onRetake: promptReceiptSource,
              });
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    }
  };


  const saveToStorage = async (key, newItem) => {
    try {
      const existing = await AsyncStorage.getItem(key);
      const parsed = existing ? JSON.parse(existing) : [];
      const updated = [...parsed, newItem];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      // Handled silently
    }
  };

  const handleSubmit = async () => {
    if (type === "expense" && isExpenseDisabled) {
      Alert.alert("Insufficient Balance", "You does not have enough money.");
      return;
    }

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
      type,
    };

    // 1. Persist directly to MongoDB Atlas backend
    try {
      const savedMongo = await createTransactionInBackend({
        type,
        amount: numericAmount,
        category: category.trim(),
        notes: notes.trim(),
        date: data.date,
      });

      if (savedMongo && savedMongo._id) {
        data._id = savedMongo._id;
        data.syncedToMongo = true;
      }
    } catch (e) {
      // Handled silently, fallback to local storage
    }

    // 2. Persist locally for instant offline rendering
    if (type === "expense") await saveToStorage("expenses", data);
    else await saveToStorage("income", data);

    await invalidateAIInsightCache();

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
          onValueChange={(val) => {
            if (val === "expense" && isExpenseDisabled) {
              Alert.alert("Insufficient Balance", "You does not have enough money.");
              return;
            }
            setType(val);
          }}
          buttons={[
            {
              value: "expense",
              label: "Expense",
              icon: "arrow-down-circle-outline",
              disabled: isExpenseDisabled,
              checkedColor: "#FFFFFF",
              style: isExpenseDisabled
                ? { opacity: 0.35 }
                : type === "expense"
                ? { backgroundColor: semantic.expense }
                : undefined,
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

        {/* Zero Balance Notification Banner */}
        {isExpenseDisabled && (
          <View
            style={[
              styles.noticeBanner,
              {
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                borderColor: semantic.expense,
              },
            ]}
          >
            <AppIcon name="alert-circle" size={20} color={semantic.expense} />
            <Text style={[styles.noticeText, { color: semantic.expense }]}>
              You does not have enough money.
            </Text>
          </View>
        )}

        {/* Dedicated AI Receipt Scanner Card */}
        <TouchableOpacity
          style={[
            styles.scanReceiptCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isExpenseDisabled ? theme.colors.outline : brand.emerald,
              opacity: isExpenseDisabled ? 0.45 : 1,
            },
          ]}
          onPress={promptReceiptSource}
          disabled={isScanning || isExpenseDisabled}
          accessibilityRole="button"
          accessibilityLabel="Scan receipt with AI"
        >
          <View style={[styles.scanIconWrapper, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
            <AppIcon name="receipt" size={22} color={brand.emerald} />
          </View>
          <View style={styles.scanTextWrapper}>
            <View style={styles.scanTitleRow}>
              <Text style={[styles.scanCardTitle, { color: theme.colors.onSurface }]}>
                Scan Physical Receipt
              </Text>
              <View style={[styles.aiChip, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
                <AppIcon name="auto-fix" size={12} color={semantic.ai} />
                <Text style={[styles.aiChipText, { color: semantic.ai }]}>AI Vision</Text>
              </View>
            </View>
            <Text style={[styles.scanCardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Auto-extracts merchant, amount, date & category
            </Text>
          </View>
          <AppIcon name="camera-outline" size={20} color={brand.emerald} />
        </TouchableOpacity>

        {/* Polished Scanning Modal */}
        <Modal
          visible={isScanning}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsScanning(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.loadingCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <ActivityIndicator animating={true} size="large" color={brand.emerald} />
              <Text style={[styles.loadingTitle, { color: theme.colors.onSurface }]}>
                Analyzing receipt...
              </Text>
              <Text style={[styles.loadingSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Extracting transaction details with Gemini Vision:
              </Text>

              <View style={styles.loadingSteps}>
                <View style={styles.stepItem}>
                  <AppIcon name="check-circle" size={18} color={brand.emerald} />
                  <Text style={[styles.stepText, { color: theme.colors.onSurface }]}>Merchant</Text>
                </View>
                <View style={styles.stepItem}>
                  <AppIcon name="check-circle" size={18} color={brand.emerald} />
                  <Text style={[styles.stepText, { color: theme.colors.onSurface }]}>Amount</Text>
                </View>
                <View style={styles.stepItem}>
                  <AppIcon name="check-circle" size={18} color={brand.emerald} />
                  <Text style={[styles.stepText, { color: theme.colors.onSurface }]}>Date</Text>
                </View>
                <View style={styles.stepItem}>
                  <AppIcon name="check-circle" size={18} color={brand.emerald} />
                  <Text style={[styles.stepText, { color: theme.colors.onSurface }]}>Category</Text>
                </View>
              </View>

              <Button
                mode="text"
                onPress={() => setIsScanning(false)}
                textColor={semantic.expense}
                style={styles.cancelScanBtn}
              >
                Cancel
              </Button>
            </View>
          </View>
        </Modal>

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
    marginBottom: spacing.md,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  noticeText: {
    marginLeft: spacing.sm,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  scanReceiptCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  scanIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  scanTextWrapper: {
    flex: 1,
  },
  scanTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    gap: 8,
  },
  scanCardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  scanCardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  aiChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: "center",
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  loadingSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  loadingSteps: {
    width: "100%",
    backgroundColor: "rgba(16, 185, 129, 0.06)",
    borderRadius: 12,
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.lg,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelScanBtn: {
    marginTop: spacing.xs,
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
