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
  Icon,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "../src/components";
import { brand, semantic } from "../src/theme/colors";
import { spacing } from "../src/theme";

const CurrencyConverterScreen = ({ navigation }) => {
  const theme = useTheme();
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchConversion = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError("Please enter a valid positive number");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await fetch(
        `https://open.er-api.com/v6/latest/${fromCurrency.toUpperCase()}`
      );
      const data = await response.json();
      if (data.result === "success" && data.rates[toCurrency.toUpperCase()]) {
        const rate = data.rates[toCurrency.toUpperCase()];
        setResult((parseFloat(amount) * rate).toFixed(2));
      } else {
        setError("Unable to fetch exchange rate for this pair");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversion();
  }, [fromCurrency, toCurrency]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <AppHeader
        title="Currency Converter"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header Badge */}
          <View style={styles.badgeContainer}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Icon source="swap-horizontal" size={28} color={brand.emerald} />
            </View>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Real-time foreign exchange rates
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <TextInput
              label="Amount"
              mode="outlined"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              outlineColor={theme.colors.outline}
              activeOutlineColor={brand.emerald}
              textColor={theme.colors.onSurface}
              left={<TextInput.Icon icon="cash" color={theme.colors.onSurfaceVariant} />}
            />

            <View style={styles.row}>
              <TextInput
                label="From"
                mode="outlined"
                value={fromCurrency}
                onChangeText={(val) => setFromCurrency(val.toUpperCase())}
                style={[styles.input, styles.currencyInput, { marginRight: spacing.xs }]}
                outlineColor={theme.colors.outline}
                activeOutlineColor={brand.emerald}
                textColor={theme.colors.onSurface}
                autoCapitalize="characters"
                maxLength={4}
              />
              <TextInput
                label="To"
                mode="outlined"
                value={toCurrency}
                onChangeText={(val) => setToCurrency(val.toUpperCase())}
                style={[styles.input, styles.currencyInput, { marginLeft: spacing.xs }]}
                outlineColor={theme.colors.outline}
                activeOutlineColor={brand.emerald}
                textColor={theme.colors.onSurface}
                autoCapitalize="characters"
                maxLength={4}
              />
            </View>

            {error ? (
              <HelperText type="error" visible={true} style={styles.errorText}>
                {error}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              style={styles.button}
              buttonColor={brand.emerald}
              textColor="#FFFFFF"
              loading={loading}
              contentStyle={styles.buttonContent}
              onPress={fetchConversion}
              accessibilityLabel="Convert currency"
              accessibilityRole="button"
            >
              Convert
            </Button>

            {result && (
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: theme.dark ? "#1E293B" : "#F1F5F9",
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {amount} {fromCurrency} =
                </Text>
                <Text style={[styles.resultValue, { color: brand.emerald }]}>
                  {result} {toCurrency}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: spacing.lg,
  },
  badgeContainer: {
    alignItems: "center",
    marginVertical: spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
  },
  currencyInput: {
    flex: 1,
  },
  errorText: {
    marginTop: -8,
    marginBottom: spacing.xs,
  },
  button: {
    marginTop: spacing.xs,
    borderRadius: 12,
  },
  buttonContent: {
    height: 48,
  },
  resultBox: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: "700",
  },
});

export default CurrencyConverterScreen;
