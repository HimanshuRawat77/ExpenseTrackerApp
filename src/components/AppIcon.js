import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';

/**
 * Reusable AppIcon abstraction component
 * Wraps @expo/vector-icons/MaterialCommunityIcons with theme integration
 * and accessibility props.
 */
export default function AppIcon({
  name,
  size = 24,
  color,
  style,
  accessibilityLabel,
  ...rest
}) {
  const theme = useTheme();
  const iconColor = color || theme?.colors?.onSurface || '#0F172A';

  if (!name) return null;

  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={iconColor}
      style={style}
      accessibilityLabel={accessibilityLabel || name}
      accessibilityRole="image"
      {...rest}
    />
  );
}
