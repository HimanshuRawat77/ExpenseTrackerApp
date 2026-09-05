import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateFinancialProfileInBackend } from '../src/api/authApi';
import { brand, semantic } from '../src/theme/colors';
import { spacing } from '../src/theme';

export default function BalanceOnboardingScreen({ route, navigation, onComplete }) {
  const theme = useTheme();
  const currency = route?.params?.currency || 'INR';
  const currencySymbol = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[currency] || '₹';

  const [rawAmount, setRawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const parseAndValidate = (input) => {
    if (!input || !input.trim()) {
      return { isValid: false, error: 'Please enter your current balance or tap "I\'ll add this later".' };
    }
    const sanitized = input.replace(/,/g, '').trim();
    const num = Number(sanitized);

    if (isNaN(num) || !isFinite(num)) {
      return { isValid: false, error: 'Please enter a valid numeric balance amount.' };
    }
    if (num < 0) {
      return { isValid: false, error: 'Opening balance cannot be negative.' };
    }
    if (num > 1000000000) {
      return { isValid: false, error: 'Amount is too large. Please verify your starting balance.' };
    }
    return { isValid: true, amount: num };
  };

  const handleContinue = async () => {
    setErrorMessage('');
    const validation = parseAndValidate(rawAmount);
    if (!validation.isValid) {
      setErrorMessage(validation.error);
      return;
    }

    setLoading(true);
    try {
      const res = await updateFinancialProfileInBackend(validation.amount);
      await AsyncStorage.setItem('@balance_onboarding_completed', 'true');

      if (onComplete) {
        onComplete(res.financialProfile || { openingBalance: validation.amount, currentBalance: validation.amount });
      } else if (navigation?.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Home');
      }
    } catch (e) {
      Alert.alert('Connection Error', 'Unable to save balance to server. Continuing offline.');
      await AsyncStorage.setItem('@balance_onboarding_completed', 'true');
      if (onComplete) onComplete({ openingBalance: validation.amount, currentBalance: validation.amount });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await updateFinancialProfileInBackend(0);
      await AsyncStorage.setItem('@balance_onboarding_completed', 'true');
      Alert.alert(
        'Balance Skipped',
        'You can add your starting balance later from Settings.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onComplete) onComplete({ openingBalance: 0, currentBalance: 0 });
              else navigation.replace('Home');
            },
          },
        ]
      );
    } catch (e) {
      await AsyncStorage.setItem('@balance_onboarding_completed', 'true');
      if (onComplete) onComplete({ openingBalance: 0, currentBalance: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo & Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/app-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
              Let's set up your balance
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              What is your current bank balance?
            </Text>
          </View>

          {/* Amount Input Card */}
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: errorMessage ? semantic.expense : theme.colors.outline,
              },
            ]}
          >
            <View style={styles.inputRow}>
              <Text style={[styles.currencyPrefix, { color: brand.emerald }]}>
                {currencySymbol}
              </Text>
              <TextInput
                value={rawAmount}
                onChangeText={(text) => {
                  setRawAmount(text);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="25,000"
                placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                keyboardType="decimal-pad"
                autoFocus={true}
                style={styles.amountInput}
                textColor={theme.colors.onSurface}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                accessibilityLabel="Enter your current bank balance"
              />
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : (
              <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                This is the amount currently available in your bank account. We'll use it as your starting balance.
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleContinue}
              disabled={loading}
              style={styles.continueBtn}
              buttonColor={brand.emerald}
              textColor="#FFFFFF"
              contentStyle={styles.btnContent}
              labelStyle={styles.btnLabel}
              accessibilityLabel="Continue with entered balance"
            >
              {loading ? <ActivityIndicator size={20} color="#FFFFFF" /> : 'Continue'}
            </Button>

            <TouchableOpacity
              onPress={handleSkip}
              disabled={loading}
              style={styles.skipBtn}
              accessibilityLabel="I will add this later"
              accessibilityRole="button"
            >
              <Text style={[styles.skipText, { color: theme.colors.onSurfaceVariant }]}>
                I'll add this later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputCard: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  currencyPrefix: {
    fontSize: 34,
    fontWeight: '800',
    marginRight: spacing.xs,
  },
  amountInput: {
    fontSize: 34,
    fontWeight: '800',
    minWidth: 160,
    backgroundColor: 'transparent',
    textAlign: 'left',
    paddingHorizontal: 0,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: semantic.expense,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  footer: {
    gap: spacing.md,
  },
  continueBtn: {
    borderRadius: 14,
  },
  btnContent: {
    height: 50,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
