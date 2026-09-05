import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Share,
  ScrollView,
  Platform,
  Linking,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Button,
  List,
  Switch,
  Text,
  useTheme,
  Avatar,
  IconButton,
  Menu,
  Icon,
  Chip,
  TextInput as PaperTextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppHeader } from "../src/components";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";
import { updateFinancialProfileInBackend } from "../src/api/authApi";
import {
  isSmsTrackingEnabled,
  setSmsTrackingEnabled,
  checkSmsPermission,
  requestSmsPermission,
  processIncomingSms,
} from "../src/services/smsService";
import { parseSms } from "../src/services/smsParser";

const SettingsScreen = ({
  navigation,
  user,
  onLogout,
  isDarkMode,
  onSetIsDarkMode,
}) => {
  const theme = useTheme();
  const [currency, setCurrency] = useState("INR");
  const [currentUserState, setCurrentUserState] = useState(user || null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [newBalanceInput, setNewBalanceInput] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isSmsEnabled, setIsSmsEnabled] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorText, setSimulatorText] = useState(
    "INR 500.00 debited from A/c XX1234 to VPA swiggy@upi on 05-09-26"
  );
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("userCurrency");
        if (savedCurrency) setCurrency(savedCurrency);
      } catch (error) {
        console.log("Error loading currency:", error);
      }
    };

    const loadSmsSettings = async () => {
      try {
        const enabled = await isSmsTrackingEnabled();
        setIsSmsEnabled(enabled);
      } catch (error) {
        console.log("Error loading SMS settings:", error);
      }
    };

    const loadUserData = async () => {
      try {
        const saved = await AsyncStorage.getItem("currentUser");
        if (saved) setCurrentUserState(JSON.parse(saved));
      } catch (e) {}
    };

    loadUserData();
    loadCurrency();
    loadSmsSettings();
  }, [user]);

  const handleSaveStartingBalance = async () => {
    const cleanAmount = Number(newBalanceInput.replace(/,/g, "").trim());
    if (isNaN(cleanAmount) || !isFinite(cleanAmount) || cleanAmount < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid, positive balance amount.");
      return;
    }

    setSavingBalance(true);
    try {
      const res = await updateFinancialProfileInBackend(cleanAmount);
      if (res.success) {
        setShowBalanceModal(false);
        setNewBalanceInput("");
        const updatedUser = {
          ...(currentUserState || {}),
          financialProfile: res.financialProfile,
        };
        setCurrentUserState(updatedUser);
        await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));
        Alert.alert(
          "Balance Updated",
          `Starting opening balance set to ${currency} ${formatAmount(res.financialProfile.openingBalance)}. Current balance is ${currency} ${formatAmount(res.financialProfile.currentBalance)}.`
        );
      } else {
        Alert.alert("Error", res.error || "Failed to update starting balance.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not connect to server to update balance.");
    } finally {
      setSavingBalance(false);
    }
  };

  const handleToggleSmsTracking = async (val) => {
    if (val) {
      Alert.alert(
        "Automatically track transactions",
        "Expense Tracker can detect eligible bank and UPI SMS messages to automatically record your expenses and income.",
        [
          {
            text: "Not Now",
            style: "cancel",
            onPress: () => setIsSmsEnabled(false),
          },
          {
            text: "Enable Automatic Tracking",
            onPress: async () => {
              // Always enable tracking state so features are unlocked
              await setSmsTrackingEnabled(true);
              setIsSmsEnabled(true);

              if (Platform.OS === "android") {
                try {
                  const granted = await requestSmsPermission();
                  if (granted) {
                    Alert.alert(
                      "Tracking Active",
                      "Automatic transaction tracking is now active with Android SMS permissions."
                    );
                  } else {
                    Alert.alert(
                      "Tracking Enabled",
                      "Automatic tracking is now ON!\n\nNote: If you are running in Expo Go, Android restricts background SMS reading in the universal runner. You can detect any bank transaction instantly using the Quick SMS button on your Dashboard or the SMS Simulator below."
                    );
                  }
                } catch (e) {
                  Alert.alert("Tracking Enabled", "Automatic transaction tracking is now active.");
                }
              } else {
                Alert.alert(
                  "Tracking Mode Enabled",
                  "Automatic transaction tracking is now ON. You can test and detect transactions using the SMS Simulator below or the Quick SMS button on your Dashboard."
                );
              }
            },
          },
        ]
      );
    } else {
      await setSmsTrackingEnabled(false);
      setIsSmsEnabled(false);
    }
  };

  const handleTestParse = () => {
    const parsed = parseSms(simulatorText);
    setTestResult(parsed || { error: "Non-financial message or unrecognized format (Ignored)" });
  };

  const handleSimulateIncomingSms = async () => {
    if (!isSmsEnabled) {
      Alert.alert("Tracking Disabled", "Please enable SMS Transaction Tracking above before simulating incoming messages.");
      return;
    }
    const res = await processIncomingSms(simulatorText);
    if (res.success) {
      setShowSimulator(false);
      Alert.alert(
        "Transaction Detected!",
        `Extracted ₹${res.transaction.amount} (${res.transaction.merchant || res.transaction.category}).\n\nIt is now waiting on your Home Dashboard for confirmation!`,
        [
          { text: "Go to Dashboard", onPress: () => navigation.navigate("Dashboard") },
          { text: "OK" }
        ]
      );
    } else {
      Alert.alert("Ignored", `Message was not queued: ${res.reason || res.error || "Non-financial format"}`);
    }
  };

  const changeCurrency = async (newCurrency) => {
    try {
      setCurrency(newCurrency);
      await AsyncStorage.setItem("userCurrency", newCurrency);
      setMenuVisible(false);
      Alert.alert("Success", `Currency updated to ${newCurrency}.`);
    } catch (err) {
      console.log("Error saving currency:", err);
    }
  };

  const parseDate = (value) => {
    if (!value) return new Date();
    let d = new Date(value);
    if (!isNaN(d)) return d;

    if (typeof value === "string") {
      if (value.includes("/")) {
        const [dd, mm, yyyy] = value.split("/");
        return new Date(`${yyyy}-${mm}-${dd}`);
      }

      if (value.includes("-")) {
        const [dd, mm, yyyy] = value.split("-");
        return new Date(`${yyyy}-${mm}-${dd}`);
      }
    }

    return new Date();
  };

  const formatDate = (dateValue) => {
    const d = parseDate(dateValue);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const exportData = async () => {
    try {
      setExporting(true);

      const expensesData = await AsyncStorage.getItem("expenses");
      const incomeData = await AsyncStorage.getItem("income");

      const expenses = expensesData ? JSON.parse(expensesData) : [];
      const income = incomeData ? JSON.parse(incomeData) : [];

      const allTransactions = [
        ...expenses.map((e) => ({ ...e, type: "Expense" })),
        ...income.map((i) => ({ ...i, type: "Income" })),
      ].sort((a, b) => parseDate(b.date) - parseDate(a.date));

      if (allTransactions.length === 0) {
        Alert.alert("No Data", "You don't have any transactions to export yet.");
        setExporting(false);
        return;
      }

      let totalIncome = 0;
      let totalExpense = 0;
      allTransactions.forEach((t) => {
        if (t.type === "Income") {
          totalIncome += Number(t.amount || 0);
        } else {
          totalExpense += Number(t.amount || 0);
        }
      });

      const now = new Date();
      const reportTitle = `EXPENSE TRACKER LEDGER - ${now.getDate()} ${now.toLocaleString(
        "default",
        { month: "short" }
      )} ${now.getFullYear()}`;

      let report = reportTitle + "\n";
      report += "=".repeat(60) + "\n\n";
      report += "EXECUTIVE SUMMARY\n";
      report += "-".repeat(60) + "\n";
      report += `Total Income:       ${currency} ${formatAmount(totalIncome)}\n`;
      report += `Total Expenses:     ${currency} ${formatAmount(totalExpense)}\n`;
      report += `Net Balance:        ${currency} ${formatAmount(Math.max(0, totalIncome - totalExpense))}\n`;
      report += `Total Transactions: ${allTransactions.length}\n\n`;
      report += "=".repeat(60) + "\n\n";

      const grouped = {};
      allTransactions.forEach((t) => {
        const date = formatDate(t.date);
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(t);
      });

      Object.keys(grouped).forEach((date) => {
        report += `DATE: ${date}\n`;
        report += "-".repeat(60) + "\n";

        grouped[date].forEach((transaction) => {
          const isIncome = transaction.type === "Income";
          const symbol = isIncome ? "+" : "-";

          report += `  ${isIncome ? "INCOME " : "EXPENSE"} ${symbol} ${currency} ${formatAmount(
            transaction.amount
          )}\n`;
          report += `  Category: ${transaction.category}\n`;

          if (transaction.notes && transaction.notes.trim()) {
            report += `  Notes: ${transaction.notes}\n`;
          }
          report += "\n";
        });
      });

      report += "=".repeat(60) + "\n";
      report += "END OF LEDGER\n";

      await Share.share({
        message: report,
        title: reportTitle,
      });
    } catch (error) {
      console.error("Error exporting:", error);
      Alert.alert("Error", "Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("currentUser");
          if (onLogout) onLogout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        title="Profile & Settings"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Avatar.Text
            size={64}
            label={user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            style={[styles.avatar, { backgroundColor: brand.emerald }]}
            color="#FFFFFF"
          />
          <Text variant="titleLarge" style={[styles.name, { color: theme.colors.onSurface }]}>
            {user?.name || "Expense User"}
          </Text>
          <Text variant="bodyMedium" style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
            {user?.email || "user@expensetracker.local"}
          </Text>
        </View>

        {/* Financial Ledger Settings Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Financial Settings
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <List.Item
            title="Current Balance"
            description="Authoritative ledger bank balance"
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "600" }}
            left={() => (
              <View style={styles.listIconContainer}>
                <Icon source="wallet-outline" size={22} color={brand.emerald} />
              </View>
            )}
            right={() => (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: brand.emerald,
                  alignSelf: "center",
                  marginRight: 8,
                }}
              >
                {currency} {formatAmount(currentUserState?.financialProfile?.currentBalance ?? 0)}
              </Text>
            )}
            style={styles.listItem}
          />
          <List.Item
            title="Opening Starting Balance"
            description={`Base: ${currency} ${formatAmount(currentUserState?.financialProfile?.openingBalance ?? 0)}`}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "500" }}
            left={() => (
              <View style={styles.listIconContainer}>
                <Icon source="bank-outline" size={22} color={brand.emerald} />
              </View>
            )}
            right={() => (
              <Button
                mode="text"
                textColor={brand.emerald}
                compact
                onPress={() => {
                  setNewBalanceInput(
                    String(currentUserState?.financialProfile?.openingBalance ?? 0)
                  );
                  setShowBalanceModal(true);
                }}
              >
                Update
              </Button>
            )}
            style={styles.listItem}
          />
          {currentUserState?.financialProfile?.balanceUpdatedAt && (
            <List.Item
              title="Balance Last Updated"
              description={new Date(
                currentUserState.financialProfile.balanceUpdatedAt
              ).toLocaleString()}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              titleStyle={{ color: theme.colors.onSurface, fontWeight: "500" }}
              left={() => (
                <View style={styles.listIconContainer}>
                  <Icon source="clock-outline" size={22} color={theme.colors.onSurfaceVariant} />
                </View>
              )}
              style={styles.listItem}
            />
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Preferences
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <List.Item
            title="Dark Mode"
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "500" }}
            left={() => (
              <View style={styles.listIconContainer}>
                <Icon source="theme-light-dark" size={22} color={brand.emerald} />
              </View>
            )}
            right={() => (
              <Switch
                value={isDarkMode}
                onValueChange={onSetIsDarkMode}
                color={brand.emerald}
              />
            )}
            style={styles.listItem}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <List.Item
                title="Primary Currency"
                description={currency}
                descriptionStyle={{ color: brand.emerald, fontWeight: "600" }}
                titleStyle={{ color: theme.colors.onSurface, fontWeight: "500" }}
                left={() => (
                  <View style={styles.listIconContainer}>
                    <Icon source="currency-usd" size={22} color={brand.emerald} />
                  </View>
                )}
                right={() => (
                  <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                )}
                onPress={() => setMenuVisible(true)}
                style={styles.listItem}
              />
            }
          >
            <Menu.Item title="INR (₹) - Indian Rupee" onPress={() => changeCurrency("INR")} />
            <Menu.Item title="USD ($) - US Dollar" onPress={() => changeCurrency("USD")} />
            <Menu.Item title="EUR (€) - Euro" onPress={() => changeCurrency("EUR")} />
            <Menu.Item title="GBP (£) - British Pound" onPress={() => changeCurrency("GBP")} />
          </Menu>
        </View>

        {/* Automatic Tracking Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Automatic Tracking
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <List.Item
            title="Automatic Transaction Tracking"
            description={
              isSmsEnabled
                ? "Listening for eligible bank/UPI SMS"
                : "Automatic transaction tracking is off."
            }
            descriptionStyle={{
              color: isSmsEnabled ? brand.emerald : theme.colors.onSurfaceVariant,
              fontWeight: isSmsEnabled ? "600" : "400",
            }}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "500" }}
            left={() => (
              <View style={styles.listIconContainer}>
                <Icon source="message-badge-outline" size={22} color={brand.emerald} />
              </View>
            )}
            right={() => (
              <Switch
                value={isSmsEnabled}
                onValueChange={handleToggleSmsTracking}
                color={brand.emerald}
              />
            )}
            style={styles.listItem}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

          <List.Item
            title="SMS Detection Simulator"
            description="Test with real bank/UPI SMS messages"
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "500" }}
            left={() => (
              <View style={styles.listIconContainer}>
                <Icon source="cellphone-wireless" size={22} color={brand.emerald} />
              </View>
            )}
            right={() => (
              <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            )}
            onPress={() => {
              setShowSimulator(true);
              setTestResult(parseSms(simulatorText));
            }}
            style={styles.listItem}
          />
        </View>

        {/* Data & Storage Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
            Data & Privacy
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <List.Item
            title="Export Ledger"
            description="Share or backup your transactions"
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            titleStyle={{ color: theme.colors.onSurface, fontWeight: "500" }}
            left={() => (
              <View style={styles.listIconContainer}>
                <Icon source="file-document-outline" size={22} color={brand.emerald} />
              </View>
            )}
            right={() => (
              <Icon source="share-variant-outline" size={20} color={theme.colors.onSurfaceVariant} />
            )}
            onPress={exportData}
            disabled={exporting}
            style={styles.listItem}
          />
        </View>

        {/* Sign Out Button (Semantic Expense Color) */}
        <Button
          mode="contained"
          onPress={confirmLogout}
          style={styles.logoutBtn}
          buttonColor={semantic.expense}
          textColor="#FFFFFF"
          icon="logout"
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
          accessibilityLabel="Sign out of account"
          accessibilityRole="button"
        >
          Sign Out
        </Button>

        {/* App Version & Logo Footer */}
        <View style={styles.brandFooter}>
          <Image
            source={require("../assets/app-logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
            accessibilityLabel="Expense Tracker Logo"
          />
          <Text style={[styles.footerAppName, { color: theme.colors.onSurface }]}>
            Expense Tracker
          </Text>
          <Text style={[styles.footerVersion, { color: theme.colors.onSurfaceVariant }]}>
            Version 1.0.0 • Track • Plan • Save
          </Text>
        </View>
      </ScrollView>

      {/* SMS Detection Simulator Modal */}
      <Modal
        visible={showSimulator}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSimulator(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Icon source="cellphone-wireless" size={24} color={brand.emerald} />
                <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                  SMS Detection Simulator
                </Text>
              </View>
              <IconButton
                icon="close"
                size={22}
                onPress={() => setShowSimulator(false)}
                iconColor={theme.colors.onSurfaceVariant}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text variant="bodySmall" style={[styles.modalHint, { color: theme.colors.onSurfaceVariant }]}>
                Select a preset or paste any real Indian bank / UPI SMS to verify deterministic parsing and safe confirmation.
              </Text>

              {/* Quick Presets */}
              <Text style={[styles.presetLabel, { color: theme.colors.onSurfaceVariant }]}>
                Quick Presets:
              </Text>
              <View style={styles.presetsWrapper}>
                <Chip
                  compact
                  mode="outlined"
                  style={styles.presetChip}
                  onPress={() => {
                    const txt = "INR 500.00 debited from A/c XX1234 to VPA swiggy@upi on 05-09-26. Ref 123456789012";
                    setSimulatorText(txt);
                    setTestResult(parseSms(txt));
                  }}
                >
                  Swiggy UPI
                </Chip>
                <Chip
                  compact
                  mode="outlined"
                  style={styles.presetChip}
                  onPress={() => {
                    const txt = "Your A/c XX1234 is credited with INR 35,000.00 on 01-09-2026. Ref 987654321098";
                    setSimulatorText(txt);
                    setTestResult(parseSms(txt));
                  }}
                >
                  Salary Credit
                </Chip>
                <Chip
                  compact
                  mode="outlined"
                  style={styles.presetChip}
                  onPress={() => {
                    const txt = "₹450 spent on card ending 9876 at STARBUCKS on 03-09-2026";
                    setSimulatorText(txt);
                    setTestResult(parseSms(txt));
                  }}
                >
                  Starbucks Card
                </Chip>
                <Chip
                  compact
                  mode="outlined"
                  style={styles.presetChip}
                  onPress={() => {
                    const txt = "Your OTP for transaction of INR 500 at Amazon is 482910. Do not share this OTP.";
                    setSimulatorText(txt);
                    setTestResult(parseSms(txt));
                  }}
                >
                  OTP (Ignored)
                </Chip>
                <Chip
                  compact
                  mode="outlined"
                  style={styles.presetChip}
                  onPress={() => {
                    const txt = "Congratulations! You are eligible for a pre-approved personal loan of Rs 5,00,000. Apply now.";
                    setSimulatorText(txt);
                    setTestResult(parseSms(txt));
                  }}
                >
                  Loan Spam (Ignored)
                </Chip>
              </View>

              {/* SMS Input */}
              <TextInput
                value={simulatorText}
                onChangeText={(t) => {
                  setSimulatorText(t);
                  setTestResult(parseSms(t));
                }}
                placeholder="Paste bank/UPI SMS message here..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
                numberOfLines={3}
                style={[
                  styles.smsInput,
                  {
                    color: theme.colors.onSurface,
                    backgroundColor: theme.dark ? "#1E293B" : "#F8FAFC",
                    borderColor: theme.colors.outline,
                  },
                ]}
              />

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <Button
                  mode="outlined"
                  onPress={handleTestParse}
                  style={styles.inspectBtn}
                  textColor={brand.emerald}
                >
                  Inspect Parser
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSimulateIncomingSms}
                  style={styles.simulateBtn}
                  buttonColor={brand.emerald}
                  textColor="#FFFFFF"
                  icon="tray-arrow-down"
                >
                  Simulate Arrival
                </Button>
              </View>

              {/* Parsed Result Box */}
              {testResult && (
                <View
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: testResult.error
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(16, 185, 129, 0.08)",
                      borderColor: testResult.error
                        ? semantic.expense
                        : brand.emerald,
                    },
                  ]}
                >
                  <View style={styles.resultTitleRow}>
                    <Icon
                      source={testResult.error ? "alert-circle" : "check-circle"}
                      size={18}
                      color={testResult.error ? semantic.expense : brand.emerald}
                    />
                    <Text
                      style={[
                        styles.resultHeading,
                        { color: testResult.error ? semantic.expense : brand.emerald },
                      ]}
                    >
                      {testResult.error ? "Non-Financial / Ignored" : "Eligible Transaction Candidate"}
                    </Text>
                  </View>

                  {testResult.error ? (
                    <Text style={[styles.resultText, { color: theme.colors.onSurfaceVariant }]}>
                      {testResult.error}
                    </Text>
                  ) : (
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Type:</Text>
                        <Text style={[styles.detailValue, { color: testResult.type === 'expense' ? semantic.expense : brand.emerald, fontWeight: "700" }]}>
                          {testResult.type.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount:</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.onSurface, fontWeight: "700" }]}>
                          ₹{testResult.amount}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Merchant:</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                          {testResult.merchant || "Unknown (Safe fallback)"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Category:</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                          {testResult.category}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Method:</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                          {testResult.paymentMethod}
                        </Text>
                      </View>
                      {testResult.externalId && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Reference ID:</Text>
                          <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                            {testResult.externalId}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Fingerprint:</Text>
                        <Text numberOfLines={1} style={[styles.detailValue, { color: theme.colors.onSurfaceVariant, fontSize: 11 }]}>
                          {testResult.fingerprint}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Update Starting Balance Modal */}
      <Modal
        visible={showBalanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBalanceModal(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View
            style={[
              styles.balanceModalContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={styles.modalTitleRow}>
              <Icon source="bank-outline" size={24} color={brand.emerald} />
              <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                Update Starting Balance
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant, marginTop: 8, marginBottom: 16 }}>
              Adjust your opening bank balance. Your current ledger balance will be automatically recalculated based on your existing transactions.
            </Text>

            <PaperTextInput
              mode="outlined"
              label={`Starting Balance (${currency})`}
              value={newBalanceInput}
              onChangeText={setNewBalanceInput}
              keyboardType="decimal-pad"
              activeOutlineColor={brand.emerald}
              textColor={theme.colors.onSurface}
              style={{ backgroundColor: theme.colors.surface, marginBottom: 20 }}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <Button
                mode="outlined"
                textColor={theme.colors.onSurfaceVariant}
                onPress={() => setShowBalanceModal(false)}
                disabled={savingBalance}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor={brand.emerald}
                textColor="#FFFFFF"
                loading={savingBalance}
                disabled={savingBalance}
                onPress={handleSaveStartingBalance}
              >
                Save Balance
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    paddingTop: spacing.md,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  avatar: {
    marginBottom: spacing.sm,
  },
  name: {
    fontWeight: "700",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  listItem: {
    paddingVertical: 6,
  },
  listIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 36,
    height: 36,
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  logoutBtn: {
    marginTop: spacing.md,
    borderRadius: 12,
  },
  btnContent: {
    height: 48,
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  balanceModalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.xl,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalContainer: {
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontWeight: "700",
  },
  modalScroll: {
    paddingBottom: 20,
  },
  modalHint: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  presetsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.md,
  },
  presetChip: {
    marginRight: 2,
    marginBottom: 4,
  },
  smsInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inspectBtn: {
    flex: 1,
    borderRadius: 10,
  },
  simulateBtn: {
    flex: 1.3,
    borderRadius: 10,
  },
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  resultHeading: {
    fontWeight: "700",
    fontSize: 13,
  },
  resultText: {
    fontSize: 13,
    marginTop: 4,
  },
  detailsGrid: {
    marginTop: spacing.xs,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
  },
  brandFooter: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    paddingVertical: spacing.md,
  },
  footerLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginBottom: spacing.xs,
  },
  footerAppName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footerVersion: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default SettingsScreen;
