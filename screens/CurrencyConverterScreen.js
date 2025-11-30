import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Card,
  HelperText,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const CurrencyConverterScreen = () => {
  const theme = useTheme();
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  //  List of supported currencies
  const currencyList = [
    "USD",
    "INR",
    "EUR",
    "GBP",
    "JPY",
    "CAD",
    "AUD",
    "CHF",
    "CNY",
    "NZD",
  ];

  // Fetch latest conversion rate
  const fetchConversion = async () => {
    if (!amount || isNaN(amount)) {
      setError("Please enter a valid amount");
      return;
    }

    setError("");
    try {
      const response = await fetch(
        `https://open.er-api.com/v6/latest/${fromCurrency}`
      );
      const data = await response.json();
      if (data.result === "success" && data.rates[toCurrency]) {
        const rate = data.rates[toCurrency];
        setResult((parseFloat(amount) * rate).toFixed(2));
      } else {
        setError("Unable to fetch currency rate");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Try again later.");
    }
  };

  useEffect(() => {
    fetchConversion();
  }, [fromCurrency, toCurrency]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            🌍 Currency Converter
          </Text>

          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Amount"
                mode="outlined"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
              />

              <View style={styles.row}>
                <TextInput
                  label="From"
                  mode="outlined"
                  value={fromCurrency}
                  onChangeText={setFromCurrency}
                  style={[styles.input, { flex: 1, marginRight: 5 }]}
                />
                <TextInput
                  label="To"
                  mode="outlined"
                  value={toCurrency}
                  onChangeText={setToCurrency}
                  style={[styles.input, { flex: 1, marginLeft: 5 }]}
                />
              </View>

              {error ? (
                <HelperText type="error" visible={true}>
                  {error}
                </HelperText>
              ) : null}

              <Button
                mode="contained"
                style={styles.button}
                onPress={fetchConversion}
              >
                Convert
              </Button>

              {result && (
                <Text style={styles.result}>
                  {amount} {fromCurrency} ={" "}
                  <Text style={{ fontWeight: "bold", color: "green" }}>
                    {result} {toCurrency}
                  </Text>
                </Text>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    padding: 10,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  result: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 18,
  },
});

export default CurrencyConverterScreen;
