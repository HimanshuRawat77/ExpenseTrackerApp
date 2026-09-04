import React from 'react';
import { StyleSheet } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export default function AppBackButton({ onPress, iconColor, style }) {
  const navigation = useNavigation();
  const theme = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <IconButton
      icon="arrow-left"
      size={24}
      iconColor={iconColor || theme.colors.onSurface}
      onPress={handlePress}
      accessibilityLabel="Go back"
      accessibilityRole="button"
      style={[styles.button, style]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    margin: 0,
  },
});
