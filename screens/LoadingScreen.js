import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme, Text } from "react-native-paper";
import LottieView from "lottie-react-native";
import { brand } from "../src/theme/colors";
import { spacing } from "../src/theme";

const LoadingScreen = ({ onFinish }) => {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <LottieView
        source={require("../assets/money.json")}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={[styles.text, { color: brand.emerald }]}>
        EXPENSE TRACKER
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  animation: {
    width: 180,
    height: 180,
  },
  text: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
  },
});

export default LoadingScreen;
