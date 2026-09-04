import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Card, Text, IconButton, Icon, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CategoryIcon, StatCard } from "../src/components";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [currency, setCurrency] = useState("INR");

  const currencySymbol = { INR: "₹", USD: "$", EUR: "€", GBP: "£" }[currency] || "₹";

  const loadData = async () => {
    try {
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const savedIncome = await AsyncStorage.getItem("income");
      const savedCurrency = await AsyncStorage.getItem("userCurrency");

      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      if (savedIncome) setIncome(JSON.parse(savedIncome));
      if (savedCurrency) setCurrency(savedCurrency);
    } catch (err) {
      console.warn("Failed to load dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = navigation.addListener("focus", loadData);
    return unsub;
  }, [navigation]);

  const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalIncome = income.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  const categoryTotals = {};
  expenses.forEach((ex) => {
    const cat = ex.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(ex.amount) || 0);
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View>
          <Text style={[styles.headerGreeting, { color: theme.colors.onSurfaceVariant }]}>
            Overview
          </Text>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Dashboard
          </Text>
        </View>
        <IconButton
          icon="cog-outline"
          size={24}
          iconColor={theme.colors.onSurface}
          onPress={() => navigation.navigate("Settings")}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          style={styles.headerIconButton}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Balance Card (Midnight Navy Foundation) */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: brand.primary, // #0F172A
              borderColor: theme.dark ? "#334155" : "#1E293B",
            },
          ]}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <View style={styles.emeraldBadge}>
              <Icon source="shield-check" size={14} color="#10B981" />
              <Text style={styles.emeraldBadgeText}>Active</Text>
            </View>
          </View>
          <Text style={styles.balanceValue}>
            {currencySymbol}
            {balance.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          {/* Income & Expense Breakdown Row */}
          <View style={styles.statRow}>
            <View style={styles.miniStatBox}>
              <View style={styles.miniStatLabelRow}>
                <Icon source="arrow-down-circle" size={16} color="#22C55E" />
                <Text style={styles.miniStatLabel}>Income</Text>
              </View>
              <Text style={[styles.miniStatValue, { color: "#22C55E" }]}>
                +{currencySymbol}
                {totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.miniStatBox}>
              <View style={styles.miniStatLabelRow}>
                <Icon source="arrow-up-circle" size={16} color="#F43F5E" />
                <Text style={styles.miniStatLabel}>Expenses</Text>
              </View>
              <Text style={[styles.miniStatValue, { color: "#F43F5E" }]}>
                -{currencySymbol}
                {totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Spending by Category
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

        {/* Categories Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          {categoryData.length > 0 ? (
            categoryData.map((item, index) => (
              <View
                key={item.name}
                style={[
                  styles.categoryRow,
                  index < categoryData.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.outline,
                  },
                ]}
              >
                <View style={styles.categoryLeft}>
                  <CategoryIcon category={item.name} size={18} containerSize={38} />
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: theme.colors.onSurface }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.categoryPercent, { color: theme.colors.onSurfaceVariant }]}>
                      {totalExpense > 0
                        ? `${((item.amount / totalExpense) * 100).toFixed(0)}% of expenses`
                        : "0%"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.categoryAmount, { color: theme.colors.onSurface }]}>
                  {currencySymbol}
                  {item.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Icon source="clipboard-text-outline" size={36} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                No expenses recorded yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button (Emerald Primary Action) */}
      <TouchableOpacity
        style={[styles.floatingBtn, { backgroundColor: brand.emerald }]}
        onPress={() => navigation.navigate("AddTransaction")}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
      >
        <Icon source="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerGreeting: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerIconButton: {
    margin: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  balanceCard: {
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: spacing.xxl,
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
  emeraldBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  emeraldBadgeText: {
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
    marginBottom: spacing.xl,
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: spacing.md,
  },
  miniStatBox: {
    flex: 1,
  },
  miniStatLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  miniStatLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryInfo: {
    marginLeft: spacing.md,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
  },
  categoryPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 14,
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
