import React, { useState, useEffect, useMemo } from "react";
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { Text, useTheme, IconButton, Button, Icon } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppHeader, CategoryIcon } from "../src/components";
import {
  deleteTransactionInBackend,
  getTransactionsFromBackend,
} from "../src/api/transactionApi";
import { invalidateAIInsightCache } from "../src/api/aiApi";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

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

const isSameDay = (d1, d2) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

const TransactionsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [currency, setCurrency] = useState("INR");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const currencySymbol = { INR: "₹", USD: "$", EUR: "€", GBP: "£" }[currency] || "₹";

  const loadTransactions = async () => {
    try {
      const e = await AsyncStorage.getItem("expenses");
      const i = await AsyncStorage.getItem("income");
      const c = await AsyncStorage.getItem("userCurrency");

      let currentExpenses = e ? JSON.parse(e) : [];
      let currentIncome = i ? JSON.parse(i) : [];

      try {
        const mongoTransactions = await getTransactionsFromBackend();
        if (mongoTransactions && Array.isArray(mongoTransactions) && mongoTransactions.length > 0) {
          currentExpenses = mongoTransactions.filter((t) => t.type === "expense");
          currentIncome = mongoTransactions.filter((t) => t.type === "income");
          await AsyncStorage.setItem("expenses", JSON.stringify(currentExpenses));
          await AsyncStorage.setItem("income", JSON.stringify(currentIncome));
        }
      } catch (err) {
        // Handled silently
      }

      setExpenses(currentExpenses);
      setIncome(currentIncome);
      if (c) setCurrency(c);
    } catch (err) {
      // Handled silently
    }
  };

  useEffect(() => {
    loadTransactions();
    const unsub = navigation.addListener("focus", loadTransactions);
    return unsub;
  }, [navigation]);

  const deleteItem = async (item) => {
    const mongoId = item._id || (item.id && item.id.length === 24 ? item.id : null);

    // 1. Delete from MongoDB Atlas if it exists remotely
    if (mongoId) {
      deleteTransactionInBackend(mongoId);
    }

    // 2. Delete from local React state and AsyncStorage
    const targetId = item._id || item.id;
    if (item.type === "expense") {
      const updated = expenses.filter(
        (x) =>
          x.id !== targetId &&
          x._id !== targetId &&
          (!mongoId || (x._id !== mongoId && x.id !== mongoId))
      );
      setExpenses(updated);
      await AsyncStorage.setItem("expenses", JSON.stringify(updated));
    } else {
      const updated = income.filter(
        (x) =>
          x.id !== targetId &&
          x._id !== targetId &&
          (!mongoId || (x._id !== mongoId && x.id !== mongoId))
      );
      setIncome(updated);
      await AsyncStorage.setItem("income", JSON.stringify(updated));
    }

    // 3. Recalculate AI insight
    invalidateAIInsightCache();
  };

  const handleDelete = (item) =>
    Alert.alert(
      "Delete Transaction",
      `Are you sure you want to remove this ${item.type}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteItem(item) },
      ]
    );

  const allTransactions = useMemo(() => {
    const combined = [
      ...expenses.map((e) => ({ ...e, type: "expense" })),
      ...income.map((i) => ({ ...i, type: "income" })),
    ].sort((a, b) => parseDate(b.date) - parseDate(a.date));

    if (!selectedDate) return combined;
    return combined.filter((item) =>
      isSameDay(parseDate(item.date), selectedDate)
    );
  }, [expenses, income, selectedDate]);

  const groupedData = useMemo(() => {
    const grouped = {};
    allTransactions.forEach((t) => {
      const d = formatDate(t.date);
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });
    return Object.keys(grouped).map((date) => ({
      title: date,
      data: grouped[date],
    }));
  }, [allTransactions]);

  const renderItem = (item, index = 0) => {
    const isIncome = item.type === "income";
    const amountColor = isIncome ? semantic.income : semantic.expense;
    const sign = isIncome ? "+" : "-";
    const itemKey =
      item._id || item.id || `tx_${index}_${item.date || ""}_${item.amount || ""}`;

    return (
      <View
        key={itemKey}
        style={[
          styles.transactionItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <CategoryIcon category={item.category} size={20} containerSize={44} />

        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {item.category || "General"}
          </Text>
          <Text style={[styles.itemNotes, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
            {item.notes || (isIncome ? "Income" : "Expense")}
          </Text>
        </View>

        <View style={styles.itemRight}>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {sign}
            {currencySymbol}
            {Number(item.amount || 0).toFixed(2)}
          </Text>
          <IconButton
            icon="trash-can-outline"
            size={18}
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => handleDelete(item)}
            accessibilityLabel="Delete transaction"
            accessibilityRole="button"
            style={styles.deleteButton}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        title="Transaction History"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
        rightAction={
          <IconButton
            icon="calendar-month-outline"
            size={22}
            iconColor={selectedDate ? brand.emerald : theme.colors.onSurface}
            onPress={() => setShowPicker(true)}
            accessibilityLabel="Filter transactions by date"
            accessibilityRole="button"
          />
        }
      />

      {/* Date Filter Active Banner */}
      {selectedDate && (
        <View style={[styles.filterBanner, { backgroundColor: theme.dark ? "#1E293B" : "#E2E8F0" }]}>
          <View style={styles.filterBannerLeft}>
            <Icon source="filter-variant" size={16} color={brand.emerald} />
            <Text style={[styles.filterBannerText, { color: theme.colors.onSurface }]}>
              Filtered: {formatDate(selectedDate)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            accessibilityRole="button"
            accessibilityLabel="Clear date filter"
          >
            <Text style={[styles.clearFilterText, { color: semantic.expense }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      <FlatList
        data={groupedData}
        keyExtractor={(item, index) => `${item.title || "sec"}_${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index: secIndex }) => (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionDateText, { color: theme.colors.onSurfaceVariant }]}>
                {item.title}
              </Text>
            </View>
            {item.data.map((t, tIndex) => renderItem(t, `${secIndex}_${tIndex}`))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="receipt-text-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              No Transactions Found
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>
              {selectedDate
                ? "No transactions recorded for this date."
                : "Add an expense or income to start tracking."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  filterBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filterBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterBannerText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    paddingTop: spacing.sm,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionDateText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemNotes: {
    fontSize: 12,
    marginTop: 2,
  },
  itemRight: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
    marginRight: 4,
  },
  deleteButton: {
    margin: 0,
    padding: 0,
    width: 28,
    height: 28,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs,
    maxWidth: 240,
  },
});

export default TransactionsScreen;
