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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[styles.headerRow, { backgroundColor: theme.colors.primary }]}
      >
        <IconButton
          icon="arrow-left"
          size={28}
          iconColor={theme.colors.onPrimary}
          onPress={() => navigation.goBack()}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>
          Currency Converter
        </Text>
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

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <TextInput
                label="Amount"
                mode="outlined"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.surface },
                ]}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
              />

              <View style={styles.row}>
                <TextInput
                  label="From"
                  mode="outlined"
                  value={fromCurrency}
                  onChangeText={setFromCurrency}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      marginRight: 5,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  textColor={theme.colors.onSurface}
                />
                <TextInput
                  label="To"
                  mode="outlined"
                  value={toCurrency}
                  onChangeText={setToCurrency}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      marginLeft: 5,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  textColor={theme.colors.onSurface}
                />
              </View>

              {error ? (
                <HelperText type="error" visible={true}>
                  {error}
                </HelperText>
              ) : null}

              <Button
                mode="contained"
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                ]}
                contentStyle={{ paddingVertical: 8 }}
                onPress={fetchConversion}
              >
                Convert
              </Button>

              {result && (
                <View
                  style={[
                    styles.resultBox,
                    { backgroundColor: theme.dark ? "#1F1F1F" : "#eaf5ea" },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {amount} {fromCurrency} =
                  </Text>
                  <Text style={[styles.resultValue, { color: "#27AE60" }]}>
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
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
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
  },
  input: {
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
  },
  button: {
    marginTop: 10,
    borderRadius: 12,
  },
  resultBox: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
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
  },
});

export default CurrencyConverterScreen;
