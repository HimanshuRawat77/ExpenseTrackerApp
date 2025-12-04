import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Share } from "react-native";
import {
  Button,
  List,
  Switch,
  Text,
  useTheme,
  Avatar,
  IconButton,
  Menu,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
      Alert.alert("Success", "Currency updated.");
    } catch (err) {
      console.log("Error saving currency:", err);
    }
  };
  const parseDate = (value) => {
    if (!value) return new Date();
    let d = new Date(value);
    if (!isNaN(d)) return d;

    if (value.includes("/")) {
      const [dd, mm, yyyy] = value.split("/");
      return new Date(`${yyyy}-${mm}-${dd}`);
    }

    if (value.includes("-")) {
      const [dd, mm, yyyy] = value.split("-");
      return new Date(`${yyyy}-${mm}-${dd}`);
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
    return amount.toLocaleString("en-IN", {
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
        Alert.alert("No Data", "You don't have any transactions to export.");
        setExporting(false);
        return;
      }

      let totalIncome = 0;
      let totalExpense = 0;
      allTransactions.forEach((t) => {
        if (t.type === "Income") {
          totalIncome += t.amount || 0;
        } else {
          totalExpense += t.amount || 0;
        }
      });

      const now = new Date();
      const reportTitle = `TRANSACTION REPORT - ${now.getDate()} ${now.toLocaleString(
        "default",
        { month: "short" }
      )} ${now.getFullYear()}`;

      let report = reportTitle + "\n";
      report += "=".repeat(60) + "\n\n";

      report += "SUMMARY\n";
      report += "-".repeat(60) + "\n";
      report += `Total Income:      Rs. ${formatAmount(totalIncome)}\n`;
      report += `Total Expenses:    Rs. ${formatAmount(totalExpense)}\n`;
      report += `Net Balance:       Rs. ${formatAmount(
        totalIncome - totalExpense
      )}\n`;
      report += `Total Transactions: ${allTransactions.length}\n\n`;
      report += "=".repeat(60) + "\n\n";

      const grouped = {};
      allTransactions.forEach((t) => {
        const date = formatDate(t.date);
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(t);
      });

      // transactions by date
      Object.keys(grouped).forEach((date) => {
        report += `DATE: ${date}\n`;
        report += "-".repeat(60) + "\n";

        let dayIncome = 0;
        let dayExpense = 0;

        grouped[date].forEach((transaction) => {
          const isIncome = transaction.type === "Income";
          const symbol = isIncome ? "+" : "-";

          report += `  ${
            isIncome ? "INCOME" : "EXPENSE"
          }  ${symbol} Rs. ${formatAmount(transaction.amount)}\n`;
          report += `  Category: ${transaction.category}\n`;

          if (transaction.notes && transaction.notes.trim()) {
            report += `  Notes: ${transaction.notes}\n`;
          }
          report += "\n";

          if (isIncome) {
            dayIncome += transaction.amount;
          } else {
            dayExpense += transaction.amount;
          }
        });

        report += `  Day Income:  Rs. ${formatAmount(dayIncome)}\n`;
        report += `  Day Expense: Rs. ${formatAmount(dayExpense)}\n`;
        report += `  Day Balance: Rs. ${formatAmount(
          dayIncome - dayExpense
        )}\n\n`;
      });

      report += "=".repeat(60) + "\n";
      report += "END OF REPORT\n";

      try {
        const result = await Share.share({
          message: report,
          title: reportTitle,
        });

        if (result.action === Share.sharedAction) {
          Alert.alert("Success", "Report exported successfully!");
        }
      } catch (error) {
        console.error("Share error:", error);
        Alert.alert(
          "Export Ready",
          `Report is ready to share:\n\n${report.substring(0, 150)}...`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error exporting:", error);
      Alert.alert("Error", `Failed to export: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
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
    >
      <View style={styles.headerRow}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.profileHeader}>
        <Avatar.Text
          size={64}
          label={user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.name}
        </Text>
        <Text variant="titleMedium" style={styles.email}>
          {user?.email}
        </Text>
      </View>

      <List.Section>
        <List.Subheader>Preferences</List.Subheader>
        <List.Item
          title="Dark Mode"
          left={() => <List.Icon icon="theme-light-dark" />}
          right={() => (
            <Switch value={isDarkMode} onValueChange={onSetIsDarkMode} />
          )}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <List.Item
              title="Currency"
              description={currency}
              left={() => <List.Icon icon="currency-usd" />}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item title="INR (₹)" onPress={() => changeCurrency("INR")} />
          <Menu.Item title="USD ($)" onPress={() => changeCurrency("USD")} />
          <Menu.Item title="EUR (€)" onPress={() => changeCurrency("EUR")} />
          <Menu.Item title="GBP (£)" onPress={() => changeCurrency("GBP")} />
        </Menu>
      </List.Section>

      {/* Account */}
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Export Data"
          description="Get a CSV of your transactions"
          left={() => <List.Icon icon="file-document-outline" />}
          onPress={exportData}
          disabled={exporting}
        />
      </List.Section>

      {/* Logout Button */}
      <Button
        mode="contained"
        onPress={confirmLogout}
        style={styles.button}
        buttonColor={theme.colors.error}
      >
        Logout
      </Button>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 5,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    marginBottom: 10,
  },
  name: {
    fontWeight: "bold",
  },
  email: {
    color: "#888",
  },
  button: {
    margin: 20,
    marginTop: 40,
  },
});

export default SettingsScreen;
