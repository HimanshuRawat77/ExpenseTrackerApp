import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import AppIcon from "./AppIcon";
import { brand, semantic } from "../theme/colors";
import { spacing } from "../theme";

export default function SafeToSpendCard({
  amount = 0,
  currencySymbol = "₹",
  daysRemaining = 1,
  style,
}) {
  const theme = useTheme();

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
      accessibilityLabel={`Safe to spend today: ${currencySymbol}${amount.toFixed(2)}`}
      accessibilityRole="summary"
    >
      <View style={styles.headerRow}>
        <View style={styles.leftRow}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: "rgba(16, 185, 129, 0.12)" },
            ]}
          >
            <AppIcon name="shield-check-outline" size={18} color={brand.emerald} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Safe to Spend Today
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining this month
            </Text>
          </View>
        </View>

        <Text style={[styles.amount, { color: brand.emerald }]}>
          {currencySymbol}
          {amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  amount: {
    fontSize: 17,
    fontWeight: "700",
    marginLeft: spacing.sm,
  },
});
