import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
// import LottieView from "lottie-react-native"; // npm install lottie-react-native

const LoginScreen = ({ navigation, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleLoginPress = async () => {
    setLoading(true);
    await onLogin(email, password);
    setLoading(false); // Only reached if login fails
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* <LottieView
        source={require("./money-animation.json")} // You need to add a lottie file
        autoPlay
        loop
        style={styles.lottie}
      /> */}
      <Text variant="headlineMedium" style={styles.title}>
        Welcome Back!
      </Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button
        mode="contained"
        onPress={handleLoginPress}
        loading={loading}
        style={styles.button}
      >
        Login
      </Button>
      <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
        <Text style={[styles.link, { color: theme.colors.primary }]}>
          Don't have an account? Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  //   lottie: { width: 200, height: 200, alignSelf: "center" },
  title: { textAlign: "center", marginBottom: 20, fontWeight: "bold" },
  input: { marginBottom: 10 },
  button: { marginTop: 10, paddingVertical: 5 },
  link: { textAlign: "center", marginTop: 20 },
});

export default LoginScreen;
