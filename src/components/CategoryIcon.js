import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import AppIcon from './AppIcon';
import { brand, semantic } from '../theme/colors';

const CATEGORY_MAP = {
  food: { icon: 'silverware-fork-knife', color: '#F59E0B', bg: '#FEF3C7' },
  groceries: { icon: 'cart-outline', color: '#F59E0B', bg: '#FEF3C7' },
  shopping: { icon: 'shopping-outline', color: '#EC4899', bg: '#FCE7F3' },
  transport: { icon: 'car-outline', color: '#3B82F6', bg: '#DBEAFE' },
  travel: { icon: 'airplane', color: '#06B6D4', bg: '#CFFAFE' },
  entertainment: { icon: 'movie-open-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  bills: { icon: 'file-document-outline', color: '#EF4444', bg: '#FEE2E2' },
  utilities: { icon: 'flash-outline', color: '#EF4444', bg: '#FEE2E2' },
  rent: { icon: 'home-city-outline', color: '#6366F1', bg: '#E0E7FF' },
  health: { icon: 'heart-pulse', color: '#10B981', bg: '#D1FAE5' },
  education: { icon: 'school-outline', color: '#F97316', bg: '#FFEDD5' },
  salary: { icon: 'briefcase-outline', color: '#22C55E', bg: '#DCFCE7' },
  investment: { icon: 'trending-up', color: '#22C55E', bg: '#DCFCE7' },
  other: { icon: 'dots-horizontal', color: '#64748B', bg: '#F1F5F9' },
};

export default function CategoryIcon({
  category = 'other',
  size = 20,
  containerSize = 40,
  style,
}) {
  const theme = useTheme();
  const normalized = (category || 'other').trim().toLowerCase();
  const config = CATEGORY_MAP[normalized] || CATEGORY_MAP.other;

  // In dark mode, adjust container background for subtle visibility
  const containerBg = theme.dark ? '#1E293B' : config.bg;
  const iconColor = theme.dark && config.color === '#64748B' ? '#94A3B8' : config.color;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: containerBg,
        },
        style,
      ]}
      accessibilityLabel={`Category: ${category}`}
      accessibilityRole="image"
    >
      <AppIcon name={config.icon} size={size} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
