import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import AppBackButton from './AppBackButton';
import { spacing } from '../theme';

export default function AppHeader({
  title,
  showBack = true,
  onBack,
  rightAction = null,
  style,
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outline,
        },
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack ? <AppBackButton onPress={onBack} /> : <View style={styles.placeholder} />}
        <Text
          variant="titleMedium"
          style={[styles.title, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <View style={styles.rightContainer}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: 18,
    marginLeft: spacing.xs,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholder: {
    width: 8,
  },
});
