import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Text, Avatar, IconButton, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppIcon,
  CategoryIcon,
  StatCard,
  SafeToSpendCard,
  AIInsightCard,
} from "../src/components";
import { getAIInsight, invalidateAIInsightCache } from "../src/api/aiApi";
import {
  getTransactionsFromBackend,
  deleteTransactionInBackend,
} from "../src/api/transactionApi";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

/**
 * Returns a time-appropriate greeting based on device local time
 */
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
};

const DashboardScreen = ({ navigation, user }) => {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(user || null);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [currency, setCurrency] = useState("INR");
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  const currencySymbol =
    { INR: "₹", USD: "$", EUR: "€", GBP: "£" }[currency] || "₹";

  const loadData = async (forceRefreshInsight = false) => {
    try {
      const savedUser = await AsyncStorage.getItem("currentUser");
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const savedIncome = await AsyncStorage.getItem("income");
      const savedCurrency = await AsyncStorage.getItem("userCurrency");

      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      else if (user) setCurrentUser(user);

      let currentExpenses = savedExpenses ? JSON.parse(savedExpenses) : [];
      let currentIncome = savedIncome ? JSON.parse(savedIncome) : [];

      // Try fetching latest transactions from MongoDB Atlas
      try {
        const mongoTransactions = await getTransactionsFromBackend();
        if (mongoTransactions && Array.isArray(mongoTransactions) && mongoTransactions.length > 0) {
          currentExpenses = mongoTransactions.filter((t) => t.type === "expense");
          currentIncome = mongoTransactions.filter((t) => t.type === "income");
          await AsyncStorage.setItem("expenses", JSON.stringify(currentExpenses));
          await AsyncStorage.setItem("income", JSON.stringify(currentIncome));
        }
      } catch (err) {
        // Handled silently to avoid terminal spam; uses local storage
      }

      setExpenses(currentExpenses);
      setIncome(currentIncome);
      if (savedCurrency) setCurrency(savedCurrency);

      const activeSymbol =
        { INR: "₹", USD: "$", EUR: "€", GBP: "£" }[savedCurrency || currency] || "₹";

      // Fetch AI insight in background without blocking screen render
      setAiLoading(true);
      getAIInsight({
        forceRefresh: forceRefreshInsight,
        localExpenses: parsedExpenses,
        localIncome: parsedIncome,
        currencySymbol: activeSymbol,
      })
        .then((result) => {
          if (result) setAiInsight(result);
        })
        .catch(() => {
          // Handled silently
        })
        .finally(() => {
          setAiLoading(false);
        });
    } catch (err) {
      // Handled silently
    }
  };

  useEffect(() => {
    loadData();
    const unsub = navigation.addListener("focus", () => loadData(false));
    return unsub;
  }, [navigation, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Financial calculations
  const totalExpense = expenses.reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0
  );
  const totalIncome = income.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const balance = totalIncome - totalExpense;
  const totalBalance = balance;

  // Safe to spend calculation
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);

  const monthlyBudget = Number(currentUser?.budget || 0);
  const savingsTarget =
    monthlyBudget > 0 ? monthlyBudget : totalIncome > 0 ? totalIncome * 0.2 : 0;
  const discretionary = totalIncome - totalExpense - savingsTarget;
  const safeToSpendToday = Math.max(
    0,
    discretionary > 0 ? discretionary / daysRemaining : balance > 0 ? balance / daysRemaining : 0
  );

  // Real-data AI insight calculation
  const aiInsightData = useMemo(() => {
    const categoryTotals = {};
    expenses.forEach((ex) => {
      const cat = ex.category || "Other";
      categoryTotals[cat] =
        (categoryTotals[cat] || 0) + (Number(ex.amount) || 0);
    });

    const sortedCategories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    if (expenses.length === 0 && income.length === 0) {
      return {
        insight:
          "Start logging your daily expenses to receive intelligent spending insights.",
        recommendation:
          "Tap the Emerald + button below to record your first transaction.",
        type: "spending_trend",
        severity: "info",
      };
    }

    if (totalExpense > 0 && sortedCategories.length > 0) {
      const topCategory = sortedCategories[0];
      const categoryShare = Math.round((topCategory.amount / totalExpense) * 100);

      if (totalIncome > 0 && totalExpense > totalIncome) {
        return {
          insight: `Your expenses exceed your recorded income by ${currencySymbol}${(
            totalExpense - totalIncome
          ).toFixed(0)}.`,
          recommendation: `${topCategory.name} is your highest expense category at ${categoryShare}%. Consider reviewing non-essential purchases.`,
          type: "budget_warning",
          severity: "warning",
        };
      }

      if (categoryShare >= 40) {
        return {
          insight: `${topCategory.name} accounts for ${categoryShare}% of your total expenses this month.`,
          recommendation: `You've spent ${currencySymbol}${topCategory.amount.toFixed(
            2
          )} on ${topCategory.name}. Keeping daily spending under ${currencySymbol}${safeToSpendToday.toFixed(
            0
          )} will protect your savings.`,
          type: "category_spending",
          severity: "info",
        };
      }

      if (totalIncome > 0 && balance > 0) {
        const savingsRate = Math.round((balance / totalIncome) * 100);
        return {
          insight: `You are currently saving ${savingsRate}% of your income this month.`,
          recommendation: `Your safe-to-spend limit is ${currencySymbol}${safeToSpendToday.toFixed(
            2
          )}/day for the remaining ${daysRemaining} days.`,
          type: "saving_progress",
          severity: "success",
        };
      }

      return {
        insight: `Your spending is distributed across ${sortedCategories.length} categories.`,
        recommendation: `Top expense: ${topCategory.name} (${currencySymbol}${topCategory.amount.toFixed(
          2
        )}).`,
        type: "spending_trend",
        severity: "info",
      };
    }

    if (totalIncome > 0 && totalExpense === 0) {
      return {
        insight: `You have recorded ${currencySymbol}${totalIncome.toFixed(
          2
        )} in income with zero expenses so far.`,
        recommendation:
          "Great start! You have full discretionary room for the rest of the month.",
        type: "saving_progress",
        severity: "success",
      };
    }

    return {
      insight: "Your financial ledger is up to date.",
      recommendation: "Continue tracking transactions to monitor your cash flow.",
      type: "spending_trend",
      severity: "info",
    };
  }, [expenses, income, totalExpense, totalIncome, balance, safeToSpendToday, daysRemaining, currencySymbol]);

  // Recent transactions (last 4 items sorted by date)
  const recentTransactions = useMemo(() => {
    const combined = [
      ...expenses.map((e) => ({ ...e, type: "expense" })),
      ...income.map((i) => ({ ...i, type: "income" })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return combined.slice(0, 4);
  }, [expenses, income]);

  // Today's incoming and spent calculation
  const isToday = (dateValue) => {
    if (!dateValue) return false;
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const todaysIncome = useMemo(
    () =>
      income
        .filter((item) => isToday(item.date))
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [income]
  );

  const todaysSpent = useMemo(
    () =>
      expenses
        .filter((item) => isToday(item.date))
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [expenses]
  );

  const handleDeleteTransaction = (item) => {
    Alert.alert(
      "Delete Transaction",
      `Are you sure you want to delete this ${item.type || "transaction"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const mongoId =
              item._id || (item.id && item.id.length === 24 ? item.id : null);
            if (mongoId) {
              deleteTransactionInBackend(mongoId);
            }

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

            invalidateAIInsightCache();
          },
        },
      ]
    );
  };

  // Personalized Greeting Name
  const greetingPrefix = getTimeBasedGreeting();
  const rawName = currentUser?.name?.trim();
  const firstName = rawName ? rawName.split(" ")[0] : null;
  const greetingText = firstName
    ? `${greetingPrefix}, ${firstName} 👋`
    : `${greetingPrefix} 👋`;
  const avatarLetter = firstName ? firstName.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[brand.emerald]}
            tintColor={brand.emerald}
          />
        }
      >
        {/* ================================================== */}
        {/* 1. PERSONALIZED GREETING & PROFILE AVATAR          */}
        {/* ================================================== */}
        <View style={styles.topGreetingRow}>
          <View style={styles.greetingTextContainer}>
            <Text
              style={[
                styles.greetingHeadline,
                { color: theme.colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {greetingText}
            </Text>
            <Text
              style={[
                styles.greetingSubline,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Here's how your money is looking today.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View profile and settings"
          >
            <Avatar.Text
              size={44}
              label={avatarLetter}
              style={[styles.avatar, { backgroundColor: brand.emerald }]}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* 2. TOTAL BALANCE CARD (Midnight Navy Foundation)   */}
        {/* ================================================== */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: brand.primary, // #0F172A
              borderColor: theme.dark ? "#334155" : "#1E293B",
            },
          ]}
          accessibilityRole="summary"
          accessibilityLabel={`Total balance: ${currencySymbol}${balance.toFixed(2)}`}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <View style={styles.statusBadge}>
              <AppIcon name="shield-check" size={13} color="#10B981" />
              <Text style={styles.statusBadgeText}>Real-Time</Text>
            </View>
          </View>

          <Text style={styles.balanceValue}>
            {currencySymbol}
            {balance.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          <View style={styles.balanceFooter}>
            <Text style={styles.balanceFooterText}>
              {currency} Account Ledger
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* TODAY'S OVERVIEW (Incoming & Spent)               */}
        {/* ================================================== */}
        <View style={styles.todaySection}>
          <View style={styles.todayHeaderRow}>
            <View style={styles.todayHeaderLeft}>
              <AppIcon name="calendar-today" size={15} color={brand.emerald} />
              <Text
                style={[
                  styles.todayTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                Today's Overview
              </Text>
            </View>
            <Text
              style={[
                styles.todayDateText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>

          <View style={styles.todayCardsRow}>
            {/* Today's Incoming Card */}
            <View
              style={[
                styles.todayCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <View style={styles.todayCardTop}>
                <View
                  style={[
                    styles.todayIconWrapper,
                    { backgroundColor: "rgba(34, 197, 94, 0.14)" },
                  ]}
                >
                  <AppIcon
                    name="arrow-bottom-left"
                    size={16}
                    color={semantic.income}
                  />
                </View>
                <Text
                  style={[
                    styles.todayCardLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Today's In
                </Text>
              </View>
              <Text style={[styles.todayCardAmount, { color: semantic.income }]}>
                +{currencySymbol}
                {todaysIncome.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* Today's Spent Card */}
            <View
              style={[
                styles.todayCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <View style={styles.todayCardTop}>
                <View
                  style={[
                    styles.todayIconWrapper,
                    { backgroundColor: "rgba(239, 68, 68, 0.14)" },
                  ]}
                >
                  <AppIcon
                    name="arrow-top-right"
                    size={16}
                    color={semantic.expense}
                  />
                </View>
                <Text
                  style={[
                    styles.todayCardLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Today's Spent
                </Text>
              </View>
              <Text style={[styles.todayCardAmount, { color: semantic.expense }]}>
                -{currencySymbol}
                {todaysSpent.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================== */}
        {/* 3. INCOME & EXPENSES CARDS                         */}
        {/* ================================================== */}
        <View style={styles.incomeExpenseRow}>
          <StatCard
            label="Income"
            amount={totalIncome}
            currencySymbol={currencySymbol}
            type="income"
            style={{ marginRight: spacing.xs + 2 }}
          />
          <StatCard
            label="Expenses"
            amount={totalExpense}
            currencySymbol={currencySymbol}
            type="expense"
            style={{ marginLeft: spacing.xs + 2 }}
          />
        </View>

        {/* ================================================== */}
        {/* 4. SAFE TO SPEND CARD                              */}
        {/* ================================================== */}
        <SafeToSpendCard
          amount={safeToSpendToday}
          currencySymbol={currencySymbol}
          daysRemaining={daysRemaining}
        />

        {/* ================================================== */}
        {/* 5. AI INSIGHTS CARD                                */}
        {/* ================================================== */}
        <AIInsightCard
          title={aiInsight?.title}
          message={aiInsight?.message}
          recommendation={aiInsight?.recommendation}
          type={aiInsight?.type}
          severity={aiInsight?.severity}
          loading={aiLoading && !aiInsight}
        />

        {/* ================================================== */}
        {/* 6. RECENT TRANSACTIONS                             */}
        {/* ================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Recent Transactions
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Transactions")}
            accessibilityRole="button"
            accessibilityLabel="View all transactions"
          >
            <Text style={[styles.viewAllText, { color: brand.emerald }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.recentCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          {recentTransactions.length > 0 ? (
            recentTransactions.map((item, index) => {
              const isIncome = item.type === "income";
              const amountColor = isIncome ? semantic.income : semantic.expense;
              const sign = isIncome ? "+" : "-";

              return (
                <View
                  key={item._id || item.id || `recent_${index}`}
                  style={[
                    styles.transactionRow,
                    index < recentTransactions.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.outline,
                    },
                  ]}
                >
                  <View style={styles.txLeft}>
                    <CategoryIcon
                      category={item.category}
                      size={18}
                      containerSize={38}
                    />
                    <View style={styles.txInfo}>
                      <Text
                        style={[
                          styles.txTitle,
                          { color: theme.colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {item.category || "General"}
                      </Text>
                      <Text
                        style={[
                          styles.txSub,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                      >
                        {item.notes || (isIncome ? "Income" : "Expense")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: amountColor }]}>
                      {sign}
                      {currencySymbol}
                      {Number(item.amount || 0).toFixed(2)}
                    </Text>
                    <IconButton
                      icon="trash-can-outline"
                      size={17}
                      iconColor={theme.colors.onSurfaceVariant}
                      onPress={() => handleDeleteTransaction(item)}
                      accessibilityLabel="Delete transaction"
                      accessibilityRole="button"
                      style={styles.recentDeleteBtn}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyRecentContainer}>
              <AppIcon
                name="receipt-text-outline"
                size={36}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.emptyRecentText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No transactions yet. Tap + to add one.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.floatingBtn, { backgroundColor: brand.emerald }]}
        onPress={() =>
          navigation.navigate("AddTransaction", { balance })
        }
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
      >
        <AppIcon name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 110,
  },
  topGreetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  greetingTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  greetingHeadline: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  greetingSubline: {
    fontSize: 13,
    marginTop: 3,
  },
  avatar: {
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  balanceCard: {
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: spacing.lg,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  balanceValue: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "700",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  balanceFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: spacing.xs + 2,
  },
  balanceFooterText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  todaySection: {
    marginBottom: spacing.lg,
  },
  todayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  todayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
  todayDateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  todayCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  todayCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 3,
  },
  todayCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  todayIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  todayCardLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  todayCardAmount: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  incomeExpenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  recentCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  txSub: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: spacing.sm,
  },
  txRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentDeleteBtn: {
    margin: 0,
    marginLeft: 2,
    width: 28,
    height: 28,
  },
  emptyRecentContainer: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyRecentText: {
    marginTop: spacing.sm,
    fontSize: 13,
    textAlign: "center",
  },
  floatingBtn: {
    position: "absolute",
    right: spacing.xl,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: brand.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default DashboardScreen;
