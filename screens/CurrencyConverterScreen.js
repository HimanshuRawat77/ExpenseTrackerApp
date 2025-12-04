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
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const CurrencyConverterScreen = ({ navigation }) => {
  const theme = useTheme();
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f2f5fa" }}>
      <View style={styles.headerRow}>
        <IconButton
          icon="arrow-left"
          size={28}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Currency Converter</Text>
        <View style={{ width: 40 }} />
      </View>
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
                outlineColor="#ccc"
                activeOutlineColor={theme.colors.primary}
              />

              <View style={styles.row}>
                <TextInput
                  label="From"
                  mode="outlined"
                  value={fromCurrency}
                  onChangeText={setFromCurrency}
                  style={[styles.input, { flex: 1, marginRight: 5 }]}
                  outlineColor="#ccc"
                  activeOutlineColor={theme.colors.primary}
                />
                <TextInput
                  label="To"
                  mode="outlined"
                  value={toCurrency}
                  onChangeText={setToCurrency}
                  style={[styles.input, { flex: 1, marginLeft: 5 }]}
                  outlineColor="#ccc"
                  activeOutlineColor={theme.colors.primary}
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
                contentStyle={{ paddingVertical: 8 }}
              >
                Convert
              </Button>

              {result && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultText}>
                    {amount} {fromCurrency} =
                  </Text>
                  <Text style={styles.resultValue}>
                    {result} {toCurrency}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#3F51B5",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  container: {
    padding: 20,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 25,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 10,
    elevation: 6,
    backgroundColor: "#fff",
  },
  input: {
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  row: {
    flexDirection: "row",
  },
  button: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#3F51B5",
  },
  resultBox: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#eaf5ea",
    alignItems: "center",
  },
  resultText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#27AE60",
  },
});

export default CurrencyConverterScreen;
