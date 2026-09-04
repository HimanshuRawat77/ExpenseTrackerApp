import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import AppIcon from "./AppIcon";
import { brand, semantic } from "../theme/colors";
import { spacing } from "../theme";

const INSIGHT_TYPE_ICONS = {
  spending_trend: "chart-timeline-variant",
  budget_warning: "alert-circle-outline",
  saving_progress: "piggy-bank-outline",
  category_spending: "chart-pie",
  recurring_expense: "calendar-sync-outline",
  safe_to_spend: "shield-check-outline",
  default: "auto-fix",
};

const INSIGHT_TYPE_LABELS = {
  spending_trend: "Spending Trend",
  budget_warning: "Budget Alert",
  saving_progress: "Savings Growth",
  category_spending: "Category Analysis",
  recurring_expense: "Recurring Bills",
  safe_to_spend: "Daily Allowance",
  default: "Smart Analysis",
};

export default function AIInsightCard({
  title,
  message,
  insight, // backwards compatibility
  recommendation,
  type = "default",
  severity = "info",
  loading = false,
  error = false,
  style,
}) {
  const theme = useTheme();

  const iconName = INSIGHT_TYPE_ICONS[type] || INSIGHT_TYPE_ICONS.default;
  const badgeLabel = INSIGHT_TYPE_LABELS[type] || INSIGHT_TYPE_LABELS.default;
  const aiColor = semantic.ai; // #6366F1

  const displayTitle = title || "AI Insight";
  const displayMessage = message || insight;

  const getSeverityColor = () => {
    switch (severity) {
      case "warning":
        return semantic.warning;
      case "positive":
        return semantic.income;
      default:
        return aiColor;
    }
  };

  const severityColor = getSeverityColor();

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.dark ? "#0F172A" : "#FFFFFF",
            borderColor: theme.dark ? "#334155" : "#E2E8F0",
          },
          style,
        ]}
        accessibilityLabel="Loading AI financial insight"
        accessibilityRole="progressbar"
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
              <AppIcon name="auto-fix" size={16} color={aiColor} />
            </View>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              AI Insight
            </Text>
          </View>
        </View>
        <View style={styles.skeletonContainer}>
          <View
            style={[
              styles.skeletonLine,
              { backgroundColor: theme.dark ? "#1E293B" : "#E2E8F0", width: "90%" },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              { backgroundColor: theme.dark ? "#1E293B" : "#E2E8F0", width: "70%" },
            ]}
          />
        </View>
      </View>
    );
  }

  if (error || !displayMessage) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
          style,
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
              <AppIcon name="auto-fix" size={16} color={aiColor} />
            </View>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              AI Insight
            </Text>
          </View>
        </View>
        <Text style={[styles.fallbackText, { color: theme.colors.onSurfaceVariant }]}>
          Your latest financial insight isn't available right now. Keep logging transactions to see updates.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.dark ? "#0F172A" : "#FFFFFF",
          borderColor: theme.dark ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.25)",
        },
        style,
      ]}
      accessibilityLabel={`AI financial insight: ${displayTitle}. ${displayMessage}`}
      accessibilityRole="summary"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
            <AppIcon name="auto-fix" size={16} color={aiColor} />
          </View>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            {displayTitle}
          </Text>
        </View>
        <View style={styles.badge}>
          <AppIcon name={iconName} size={13} color={severityColor} />
          <Text style={[styles.badgeText, { color: severityColor }]}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      <Text style={[styles.insightText, { color: theme.colors.onSurface }]}>
        {displayMessage}
      </Text>

      {recommendation ? (
        <View
          style={[
            styles.tipContainer,
            {
              backgroundColor: theme.dark ? "rgba(99, 102, 241, 0.1)" : "#F8FAFC",
              borderColor: theme.dark ? "rgba(99, 102, 241, 0.2)" : "#E2E8F0",
            },
          ]}
        >
          <AppIcon
            name="lightbulb-on-outline"
            size={16}
            color={severityColor}
            style={styles.tipIcon}
          />
          <Text style={[styles.tipText, { color: theme.colors.onSurfaceVariant }]}>
            {recommendation}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md + 2,
    marginBottom: spacing.xl,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.xs + 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  insightText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.sm + 2,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  tipIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  fallbackText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  skeletonContainer: {
    paddingVertical: spacing.xs,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
});
