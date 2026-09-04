import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import { spacing } from '../theme';

export default function StatCard({
  label,
  amount,
  currencySymbol = '₹',
  type = 'neutral', // 'income', 'expense', 'neutral', 'balance'
  icon = null,
  style,
}) {
  const theme = useTheme();

  const getColor = () => {
    switch (type) {
      case 'income':
        return '#22C55E';
      case 'expense':
        return '#F43F5E';
      case 'balance':
        return theme.dark ? '#34D399' : '#10B981';
      default:
        return theme.colors.onSurface;
    }
  };

  const getIcon = () => {
    if (icon) return icon;
    if (type === 'income') return 'arrow-up-circle-outline';
    if (type === 'expense') return 'arrow-down-circle-outline';
    return null;
  };

  const valueColor = getColor();
  const iconName = getIcon();

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
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
        {iconName && <Icon source={iconName} size={18} color={valueColor} />}
      </View>
      <Text style={[styles.amount, { color: valueColor }]}>
        {currencySymbol}
        {typeof amount === 'number' ? amount.toFixed(2) : amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
});
