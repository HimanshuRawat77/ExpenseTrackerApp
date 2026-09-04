import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Share, ScrollView } from "react-native";
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
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppHeader } from "../src/components";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

const SettingsScreen = ({
  navigation,
  user,
  onLogout,
  isDarkMode,
  onSetIsDarkMode,
}) => {
  const theme = useTheme();
  const [currency, setCurrency] = useState("INR");
  const [menuVisible, setMenuVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("userCurrency");
        if (savedCurrency) setCurrency(savedCurrency);
      } catch (error) {
        console.log("Error loading currency:", error);
      }
    };

    loadCurrency();
  }, []);

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
      report += `Net Balance:        ${currency} ${formatAmount(totalIncome - totalExpense)}\n`;
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
      </ScrollView>
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
});

export default SettingsScreen;
