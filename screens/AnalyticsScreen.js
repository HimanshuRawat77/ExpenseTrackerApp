import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, useTheme, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, AppIcon, CategoryIcon } from '../src/components';
import { fetchAnalyticsFromBackend } from '../src/api/analyticsApi';
import { brand, semantic } from '../src/theme/colors';
import { spacing } from '../src/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 16;
const CARD_INNER_WIDTH = Math.max(SCREEN_WIDTH - 64, 260);
const Y_AXIS_LABEL_WIDTH = 48;
const VISIBLE_CHART_WIDTH = CARD_INNER_WIDTH - Y_AXIS_LABEL_WIDTH;

const PERIOD_OPTIONS = [
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
  { id: 'last_6_months', label: 'Last 6 Months' },
  { id: 'last_12_months', label: 'Last 12 Months' },
];

export default function AnalyticsScreen({ navigation }) {
  const theme = useTheme();
  const [period, setPeriod] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [currency, setCurrency] = useState('INR');

  const currencySymbol = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[currency] || '₹';

  const loadAnalytics = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const savedCurrency = await AsyncStorage.getItem('userCurrency');
        if (savedCurrency) setCurrency(savedCurrency);

        const res = await fetchAnalyticsFromBackend({
          period,
          monthsCount: period === 'last_12_months' ? 12 : period === 'last_3_months' ? 3 : 6,
          forceRefresh: isRefresh,
        });

        if (res.success && res.data) {
          setAnalyticsData(res.data);
        } else {
          setError(res.error || 'Failed to load analytics');
        }
      } catch (err) {
        setError('Unable to load analytics. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period]
  );

  useFocusEffect(
    useCallback(() => {
      loadAnalytics(false);
    }, [loadAnalytics])
  );

  // Timezone-safe concise date formatter: "Sep 3"
  const parseDateToShort = useCallback((dateStr) => {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.slice(0, 10).split('-');
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[month]} ${day}`;
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }, []);

  // Transform daily spending for LineChart
  const lineData = useMemo(() => {
    const raw = analyticsData?.dailySpending;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    // Strictly enforce period limits:
    // This Week = exactly 7 calendar days
    // This Month = exactly 30 calendar days
    let dataToMap = raw;
    if (period === 'this_week' && dataToMap.length > 7) {
      dataToMap = dataToMap.slice(0, 7);
    } else if (period === 'this_month' && dataToMap.length > 30) {
      dataToMap = dataToMap.slice(0, 30);
    }

    const totalPoints = dataToMap.length;
    // Determine label skip interval to keep X-axis clean, uncrowded, and legible
    let labelInterval = 1;
    if (totalPoints > 90) labelInterval = 15;
    else if (totalPoints > 35) labelInterval = 5;
    else if (totalPoints > 15) labelInterval = 2; // For ~30 days, every 2nd day (e.g. Sep 1, Sep 3, Sep 5)
    else labelInterval = 1; // For <= 15 days (including 7 days), every day gets a label

    return dataToMap.map((item, idx) => {
      const numAmount = Number(item?.amount ?? item?.value ?? 0);
      const safeValue = !isNaN(numAmount) && isFinite(numAmount) ? Math.max(0, numAmount) : 0;
      const formattedDate = parseDateToShort(item?.date) || item?.label || `Day ${idx + 1}`;

      const shouldShowLabel =
        idx === 0 ||
        idx === totalPoints - 1 ||
        idx % labelInterval === 0;

      return {
        value: safeValue,
        label: shouldShowLabel ? formattedDate : '',
        labelTextStyle: {
          color: theme.dark ? '#94A3B8' : '#64748B',
          fontSize: 9.5,
          fontWeight: '500',
          textAlign: 'center',
        },
        fullDate: formattedDate,
        date: item?.date || '',
        dataPointText: '',
      };
    });
  }, [analyticsData, period, parseDateToShort, theme.dark]);

  const maxLineValue = useMemo(() => {
    if (!lineData || lineData.length === 0) return 400;
    const validValues = lineData.map((d) => Number(d.value)).filter((v) => !isNaN(v) && isFinite(v) && v >= 0);
    const maxVal = validValues.length > 0 ? Math.max(...validValues) : 0;
    if (maxVal <= 0) return 400; // Safe positive fallback when all daily spending is 0
    const sections = 4;
    const targetStep = maxVal / sections;
    let step;
    if (targetStep <= 25) step = Math.max(Math.ceil(targetStep / 5) * 5, 5);
    else if (targetStep <= 100) step = Math.ceil(targetStep / 25) * 25;
    else if (targetStep <= 500) step = Math.ceil(targetStep / 50) * 50;
    else if (targetStep <= 2000) step = Math.ceil(targetStep / 250) * 250;
    else step = Math.ceil(targetStep / 500) * 500;

    step = Math.max(step, 5);
    const calculated = Math.max(step * sections, maxVal);
    return isFinite(calculated) && calculated > 0 ? calculated : 400;
  }, [lineData]);

  const barScrollRef = useRef(null);

  const BAR_WIDTH = 14;
  const INNER_SPACING = 4;
  const PAIR_SPACING = 22;
  const INITIAL_SPACING = 20;
  const PAIR_WIDTH = BAR_WIDTH + INNER_SPACING + BAR_WIDTH + PAIR_SPACING;

  const comparisonData = useMemo(() => {
    return (
      analyticsData?.incomeExpenseComparison || {
        type: period === 'this_week' ? 'weekly' : 'monthly',
        xAxisTitle: period === 'this_week' ? 'Week' : 'Month',
        currentIndex: 0,
        periods: analyticsData?.monthlyComparison || [],
      }
    );
  }, [analyticsData, period]);

  // Transform monthly / weekly comparison for side-by-side BarChart
  const barData = useMemo(() => {
    const raw = comparisonData?.periods || [];
    if (raw.length === 0) return [];

    const result = [];
    const pairCount = raw.length;

    raw.forEach((item, idx) => {
      const isCurrent = !!item.isCurrent;
      const isRelevant = !!item.isRelevant;
      const isHighlighted = isCurrent || isRelevant;

      // Income Bar (Green)
      result.push({
        value: Math.max(0, Number(item.income) || 0),
        label: isHighlighted ? `• ${item.label}` : item.label,
        spacing: INNER_SPACING,
        labelWidth: 38,
        labelTextStyle: {
          color: isHighlighted ? brand.emerald : theme.dark ? '#94A3B8' : '#64748B',
          fontSize: 10,
          fontWeight: isHighlighted ? '800' : '500',
          textAlign: 'center',
        },
        frontColor: isHighlighted ? brand.emerald : semantic.income,
      });

      // Expense Bar (Red)
      result.push({
        value: Math.max(0, Number(item.expense) || 0),
        frontColor: semantic.expense,
        spacing: idx === pairCount - 1 ? 20 : PAIR_SPACING,
      });
    });

    return result;
  }, [comparisonData, theme.dark]);

  const targetScrollX = useMemo(() => {
    const periods = comparisonData?.periods;
    if (!periods || periods.length === 0) return 0;
    const currentIndex = comparisonData.currentIndex ?? 0;
    const pairCenter = INITIAL_SPACING + currentIndex * PAIR_WIDTH + (BAR_WIDTH * 2 + INNER_SPACING) / 2;
    const offset = pairCenter - VISIBLE_CHART_WIDTH / 2;
    return Math.max(0, offset);
  }, [comparisonData]);

  const scrollToCurrentPeriod = useCallback((animated = false) => {
    if (barScrollRef.current && typeof barScrollRef.current.scrollTo === 'function') {
      barScrollRef.current.scrollTo({ x: targetScrollX, y: 0, animated });
    }
  }, [targetScrollX]);

  useEffect(() => {
    const t1 = setTimeout(() => scrollToCurrentPeriod(false), 120);
    const t2 = setTimeout(() => scrollToCurrentPeriod(false), 380);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [scrollToCurrentPeriod, barData, period]);

  const maxBarValue = useMemo(() => {
    if (!barData || barData.length === 0) return 500;
    const validValues = barData
      .map((d) => Number(d.value))
      .filter((v) => !isNaN(v) && isFinite(v) && v >= 0);
    const maxVal = validValues.length > 0 ? Math.max(...validValues) : 0;
    if (maxVal <= 0) return 500;
    const sections = 4;
    const targetStep = maxVal / sections;
    let step;
    if (targetStep <= 25) step = Math.max(Math.ceil(targetStep / 5) * 5, 5);
    else if (targetStep <= 100) step = Math.ceil(targetStep / 25) * 25;
    else if (targetStep <= 500) step = Math.ceil(targetStep / 50) * 50;
    else if (targetStep <= 2000) step = Math.ceil(targetStep / 250) * 250;
    else step = Math.ceil(targetStep / 500) * 500;

    const calculated = Math.max(step * sections, maxVal);
    return isFinite(calculated) && calculated > 0 ? calculated : 500;
  }, [barData]);

  // Transform category spending for Pie/Donut Chart
  const pieData = useMemo(() => {
    const raw = analyticsData?.donutCategories || [];
    if (raw.length === 0) return [];

    return raw.map((cat) => ({
      value: Number(cat.amount) || 0,
      color: cat.color || brand.emerald,
      text: `${cat.percentage}%`,
      category: cat.category,
    }));
  }, [analyticsData]);

  const summary = analyticsData?.summary || { totalSpent: 0, totalIncome: 0, savings: 0, savingsRate: 0 };
  const hasTransactions =
    summary.totalSpent > 0 ||
    summary.totalIncome > 0 ||
    (analyticsData?.dailySpending && analyticsData.dailySpending.length > 0);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <AppHeader title="Financial Analytics" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAnalytics(true)}
            tintColor={brand.emerald}
            colors={[brand.emerald]}
          />
        }
      >
        {/* Period Filter Chips */}
        <View style={styles.periodRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
            {PERIOD_OPTIONS.map((opt) => {
              const isSelected = period === opt.id;
              return (
                <Chip
                  key={opt.id}
                  selected={isSelected}
                  onPress={() => setPeriod(opt.id)}
                  style={[
                    styles.periodChip,
                    isSelected
                      ? { backgroundColor: brand.emerald }
                      : { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                  ]}
                  textStyle={{
                    color: isSelected ? '#FFFFFF' : theme.colors.onSurface,
                    fontSize: 12,
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  {opt.label}
                </Chip>
              );
            })}
          </ScrollView>
        </View>

        {/* Loading Skeleton State */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={brand.emerald} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              Aggregating financial analytics...
            </Text>
          </View>
        ) : error ? (
          /* Error State */
          <View
            style={[
              styles.errorCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
          >
            <AppIcon name="alert-circle-outline" size={36} color={semantic.expense} />
            <Text style={[styles.errorTitle, { color: theme.colors.onSurface }]}>Unable to load analytics</Text>
            <Text style={[styles.errorDesc, { color: theme.colors.onSurfaceVariant }]}>{error}</Text>
            <Button
              mode="contained"
              buttonColor={brand.emerald}
              textColor="#FFFFFF"
              onPress={() => loadAnalytics(true)}
              style={styles.retryBtn}
            >
              Retry
            </Button>
          </View>
        ) : !hasTransactions ? (
          /* Empty State */
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
          >
            <View style={[styles.emptyIconCircle, { backgroundColor: brand.emerald + '15' }]}>
              <AppIcon name="chart-bell-curve-cumulative" size={40} color={brand.emerald} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No spending data yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Add your first income or expense transaction to visualize daily spending trends and category insights.
            </Text>
          </View>
        ) : (
          <>
            {/* 1. Summary Cards Row */}
            <View style={styles.summaryRow}>
              {/* Total Spent */}
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                ]}
              >
                <View style={styles.summaryCardHeader}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Total Spent</Text>
                  <AppIcon name="arrow-top-right" size={16} color={semantic.expense} />
                </View>
                <Text style={[styles.summaryAmount, { color: semantic.expense }]}>
                  {currencySymbol}
                  {summary.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>

              {/* Total Income */}
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                ]}
              >
                <View style={styles.summaryCardHeader}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Total Income</Text>
                  <AppIcon name="arrow-bottom-left" size={16} color={semantic.income} />
                </View>
                <Text style={[styles.summaryAmount, { color: semantic.income }]}>
                  {currencySymbol}
                  {summary.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>

              {/* Net Savings */}
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                ]}
              >
                <View style={styles.summaryCardHeader}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Net Savings</Text>
                  <AppIcon name="piggy-bank-outline" size={16} color={brand.emerald} />
                </View>
                <Text
                  style={[
                    styles.summaryAmount,
                    { color: summary.savings >= 0 ? brand.emerald : semantic.expense },
                  ]}
                >
                  {currencySymbol}
                  {Math.abs(summary.savings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>

            {/* 2. Graph 1: Daily Spending Trend (LineChart) */}
            <View
              style={[
                styles.chartCard,
                {
                  backgroundColor: theme.dark ? '#0B0F19' : theme.colors.surface,
                  borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.outline,
                },
              ]}
              accessible
              accessibilityLabel={`Daily spending trend chart. Total spent in this period is ${currencySymbol}${summary.totalSpent.toLocaleString('en-IN')}.`}
            >
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <AppIcon name="chart-line" size={18} color={brand.emerald} />
                  <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
                    Daily Spending Trend
                  </Text>
                </View>
                <Text style={[styles.chartSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {period === 'this_week'
                    ? 'This week'
                    : period === 'this_month'
                    ? 'This month'
                    : period === 'last_month'
                    ? 'Last month'
                    : 'Every day in period'}
                </Text>
              </View>

              {lineData.length > 0 ? (
                <View style={styles.chartWrapper}>
                  {/* Y-Axis Title */}
                  <View style={styles.yAxisTitleRow}>
                    <Text style={[styles.axisTitleText, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>
                      Daily Spending ({currencySymbol})
                    </Text>
                  </View>

                  <LineChart
                    data={lineData}
                    height={190}
                    width={VISIBLE_CHART_WIDTH}
                    maxValue={maxLineValue}
                    mostNegativeValue={0}
                    adjustToWidth={false}
                    initialSpacing={16}
                    endSpacing={16}
                    spacing={
                      lineData.length <= 7
                        ? Math.max(Math.floor((VISIBLE_CHART_WIDTH - 32) / Math.max(lineData.length - 1, 1)), 40)
                        : 42
                    }
                    color={brand.emerald}
                    thickness={2.5}
                    curved
                    areaChart
                    startFillColor={brand.emerald}
                    startOpacity={0.22}
                    endFillColor={brand.emerald}
                    endOpacity={0.01}
                    dataPointsColor={brand.emerald}
                    dataPointsRadius={lineData.length > 35 ? 2.5 : 3.5}
                    dataPointsWidth={lineData.length > 35 ? 5 : 7}
                    hideDataPoints={false}
                    rulesType="dashed"
                    rulesColor={theme.dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)'}
                    rulesThickness={1}
                    dashWidth={4}
                    dashGap={4}
                    noOfSections={4}
                    yAxisColor="transparent"
                    yAxisThickness={0}
                    xAxisColor={theme.dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}
                    xAxisThickness={1}
                    yAxisTextStyle={{
                      color: theme.dark ? '#94A3B8' : '#64748B',
                      fontSize: 10,
                      fontWeight: '500',
                    }}
                    xAxisLabelTextStyle={{
                      color: theme.dark ? '#94A3B8' : '#64748B',
                      fontSize: 9.5,
                      fontWeight: '500',
                      textAlign: 'center',
                    }}
                    yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                    formatYLabel={(val) =>
                      `${currencySymbol}${Math.round(Number(val) || 0).toLocaleString('en-IN')}`
                    }
                    showScrollIndicator={lineData.length > 7}
                    pointerConfig={{
                      pointerStripHeight: 175,
                      pointerStripColor: theme.dark
                        ? 'rgba(255, 255, 255, 0.22)'
                        : 'rgba(0, 0, 0, 0.18)',
                      pointerStripWidth: 1.5,
                      pointerStripUptoDataPoint: false,
                      pointerColor: brand.emerald,
                      radius: 5,
                      pointerLabelWidth: 140,
                      pointerLabelHeight: 56,
                      activatePointersOnLongPress: false,
                      activatePointersInstantlyOnTouch: true,
                      autoAdjustPointerLabelPosition: true,
                      shiftPointerLabelX: -70,
                      shiftPointerLabelY: -36,
                      pointerVanishDelay: 3500,
                      persistPointer: false,
                      resetPointerIndexOnRelease: false,
                      pointerComponent: () => (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: brand.emerald,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            shadowColor: brand.emerald,
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.4,
                            shadowRadius: 3,
                            elevation: 3,
                          }}
                        />
                      ),
                      pointerLabelComponent: (items) => {
                        const item = items?.[0];
                        if (!item) return null;
                        const dateText = item.fullDate || item.label || 'Date';
                        const amountVal = Number(item.value || 0);
                        const formattedAmount = `${currencySymbol}${amountVal.toLocaleString('en-IN', {
                          maximumFractionDigits: 0,
                        })}`;

                        return (
                          <View style={styles.tooltipBox}>
                            <Text style={styles.tooltipDate}>{dateText}</Text>
                            <View style={styles.tooltipValueRow}>
                              <View style={styles.tooltipIndicatorCol}>
                                <View style={styles.tooltipDot} />
                                <Text style={styles.tooltipLabel}>Spending</Text>
                              </View>
                              <Text style={styles.tooltipAmount}>{formattedAmount}</Text>
                            </View>
                          </View>
                        );
                      },
                    }}
                  />

                  {/* X-Axis Title */}
                  <View style={styles.xAxisTitleRow}>
                    <Text style={[styles.axisTitleText, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>
                      Date
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={[styles.emptyTitle, { color: theme.colors.onSurface, fontSize: 14 }]}>
                    No spending data yet
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtitle,
                      { color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
                    ]}
                  >
                    Add your first expense to see your spending trend.
                  </Text>
                </View>
              )}
            </View>

            {/* 3. Graph 2: Monthly / Weekly Income vs Expense (Side-by-Side BarChart) */}
            <View
              style={[
                styles.chartCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
              ]}
            >
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <AppIcon name="chart-bar" size={18} color={brand.emerald} />
                  <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
                    Income vs Expense
                  </Text>
                </View>

                {/* Legends */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: brand.emerald }]} />
                    <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>Income</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: semantic.expense }]} />
                    <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>Expense</Text>
                  </View>
                </View>
              </View>

              {/* Period Filter for Income vs Expense */}
              <View style={styles.barPeriodRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.barPeriodScroll}
                >
                  {PERIOD_OPTIONS.map((opt) => {
                    const isSelected = period === opt.id;
                    return (
                      <Chip
                        key={`bar-opt-${opt.id}`}
                        selected={isSelected}
                        onPress={() => setPeriod(opt.id)}
                        style={[
                          styles.barPeriodChip,
                          isSelected
                            ? { backgroundColor: brand.emerald }
                            : { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                        ]}
                        textStyle={{
                          color: isSelected ? '#FFFFFF' : theme.colors.onSurface,
                          fontSize: 11,
                          fontWeight: isSelected ? '700' : '500',
                        }}
                      >
                        {opt.label}
                      </Chip>
                    );
                  })}
                </ScrollView>
              </View>

              {barData.length > 0 ? (
                <View style={styles.chartWrapper}>
                  {/* Y-Axis Title */}
                  <View style={styles.yAxisTitleRow}>
                    <Text style={[styles.axisTitleText, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>
                      Amount ({currencySymbol})
                    </Text>
                  </View>

                  <BarChart
                    scrollRef={barScrollRef}
                    data={barData}
                    barWidth={BAR_WIDTH}
                    initialSpacing={INITIAL_SPACING}
                    endSpacing={20}
                    roundedTop
                    roundedBottom
                    hideRules={false}
                    rulesType="dashed"
                    rulesColor={theme.dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)'}
                    rulesThickness={1}
                    dashWidth={4}
                    dashGap={4}
                    xAxisThickness={1}
                    xAxisColor={theme.dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}
                    xAxisLabelTextStyle={{
                      color: theme.dark ? '#94A3B8' : '#64748B',
                      fontSize: 10,
                      fontWeight: '500',
                      textAlign: 'center',
                    }}
                    yAxisThickness={0}
                    yAxisColor="transparent"
                    yAxisTextStyle={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: '500' }}
                    yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                    formatYLabel={(val) =>
                      `${currencySymbol}${Math.round(Number(val) || 0).toLocaleString('en-IN')}`
                    }
                    noOfSections={4}
                    height={180}
                    width={VISIBLE_CHART_WIDTH}
                    maxValue={maxBarValue}
                    showScrollIndicator={true}
                    remainingScrollViewProps={{
                      onContentSizeChange: () => scrollToCurrentPeriod(false),
                    }}
                  />

                  {/* X-Axis Title */}
                  <View style={styles.xAxisTitleRow}>
                    <Text style={[styles.axisTitleText, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>
                      {comparisonData?.xAxisTitle || (period === 'this_week' ? 'Week' : 'Month')}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant, fontSize: 12 }]}>
                    No income or expense recorded in this period.
                  </Text>
                </View>
              )}
            </View>

            {/* 4. Graph 3: Spending by Category (Donut / Pie Chart) */}
            <View
              style={[
                styles.chartCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
              ]}
            >
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <AppIcon name="chart-donut" size={18} color={brand.emerald} />
                  <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
                    Spending by Category
                  </Text>
                </View>
                <Text style={[styles.chartSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Proportion of expenses
                </Text>
              </View>

              {pieData.length > 0 && summary.totalSpent > 0 ? (
                <View style={styles.donutContainer}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={80}
                    innerRadius={52}
                    innerCircleColor={theme.colors.surface}
                    centerLabelComponent={() => (
                      <View style={styles.donutCenter}>
                        <Text style={[styles.donutCenterAmount, { color: theme.colors.onSurface }]}>
                          {currencySymbol}
                          {summary.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Text>
                        <Text style={[styles.donutCenterSub, { color: theme.colors.onSurfaceVariant }]}>Spent</Text>
                      </View>
                    )}
                  />

                  {/* Slices Legend */}
                  <View style={styles.donutLegend}>
                    {pieData.map((item, idx) => (
                      <View key={`pie-leg-${idx}`} style={styles.donutLegendRow}>
                        <View style={[styles.donutColorDot, { backgroundColor: item.color }]} />
                        <Text
                          style={[styles.donutCategoryName, { color: theme.colors.onSurface }]}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Text>
                        <Text style={[styles.donutCategoryPercent, { color: theme.colors.onSurfaceVariant }]}>
                          {item.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                    No expense transactions recorded in this period.
                  </Text>
                </View>
              )}
            </View>

            {/* 5. Category Ranking List */}
            <View
              style={[
                styles.chartCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
              ]}
            >
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <AppIcon name="format-list-numbered" size={18} color={brand.emerald} />
                  <Text style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
                    Category Ranking
                  </Text>
                </View>
                <Text style={[styles.chartSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Highest to lowest
                </Text>
              </View>

              <View style={styles.rankingList}>
                {(analyticsData?.categoryRanking || []).map((cat, idx) => (
                  <View key={`rank-${idx}`} style={styles.rankingItem}>
                    <View style={styles.rankingLeft}>
                      <Text style={[styles.rankNumber, { color: theme.colors.onSurfaceVariant }]}>
                        #{cat.rank}
                      </Text>
                      <CategoryIcon category={cat.category} size={28} />
                      <View style={styles.rankNameCol}>
                        <Text style={[styles.rankCatName, { color: theme.colors.onSurface }]}>
                          {cat.category}
                        </Text>
                        <Text style={[styles.rankCountText, { color: theme.colors.onSurfaceVariant }]}>
                          {cat.count} {cat.count === 1 ? 'transaction' : 'transactions'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rankingRight}>
                      <Text style={[styles.rankAmount, { color: theme.colors.onSurface }]}>
                        {currencySymbol}
                        {cat.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </Text>
                      <View style={styles.rankPercentBadge}>
                        <Text style={[styles.rankPercentText, { color: brand.emerald }]}>
                          {cat.percentage}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  periodRow: {
    marginVertical: spacing.sm,
  },
  periodScroll: {
    gap: spacing.xs,
  },
  periodChip: {
    borderRadius: 20,
    height: 32,
    borderWidth: StyleSheet.hairlineWidth,
  },
  barPeriodRow: {
    marginBottom: spacing.sm,
  },
  barPeriodScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  barPeriodChip: {
    borderRadius: 16,
    height: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  errorCard: {
    padding: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  errorDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  retryBtn: {
    marginTop: spacing.md,
    borderRadius: 12,
  },
  emptyCard: {
    padding: spacing.xxl,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    elevation: 1,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  chartSubtitle: {
    fontSize: 11,
  },
  chartWrapper: {
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    overflow: 'hidden',
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  donutCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  donutCenterSub: {
    fontSize: 10,
  },
  donutLegend: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 6,
  },
  donutLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donutColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  donutCategoryName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  donutCategoryPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  rankingList: {
    gap: spacing.sm,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700',
    width: 22,
  },
  rankNameCol: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  rankCatName: {
    fontSize: 13,
    fontWeight: '700',
  },
  rankCountText: {
    fontSize: 10,
    marginTop: 1,
  },
  rankingRight: {
    alignItems: 'flex-end',
  },
  rankAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  rankPercentBadge: {
    marginTop: 2,
  },
  rankPercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    minWidth: 125,
  },
  tooltipDate: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 3,
  },
  tooltipValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tooltipIndicatorCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.emerald,
  },
  tooltipLabel: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '500',
  },
  tooltipAmount: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  yAxisTitleRow: {
    paddingLeft: 2,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  xAxisTitleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingBottom: 2,
  },
  axisTitleText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
