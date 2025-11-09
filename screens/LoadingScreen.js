import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme, Text } from "react-native-paper";
import LottieView from "lottie-react-native";

const LoadingScreen = ({ onFinish }) => {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish(); // optional callback
    }, 5000); // 5 seconds

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
      <Text style={[styles.text, { color: theme.colors.primary }]}></Text>
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
    width: 200,
    height: 200,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default LoadingScreen;
