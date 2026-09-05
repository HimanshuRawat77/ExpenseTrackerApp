import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Text, useTheme, Chip, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AppIcon } from '../src/components';
import { brand, semantic } from '../src/theme/colors';
import { spacing } from '../src/theme';
import { getMarketData } from '../src/services/marketService';

const CATEGORIES = ['All', 'Bullion', 'Stock Markets', 'Economy', 'Personal Finance'];
const WEIGHT_OPTIONS = [
  { label: '10g', multiplier: 10, name: '10 Grams' },
  { label: '1g', multiplier: 1, name: '1 Gram' },
  { label: '8g (1 Sovereign)', multiplier: 8, name: '8 Grams' },
  { label: '100g', multiplier: 100, name: '100 Grams' },
];

export default function FinancialNewsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWeight, setSelectedWeight] = useState(WEIGHT_OPTIONS[0]);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getMarketData();
      setMarketData(data);
    } catch (e) {
      // Fallback handled in service
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredNews = (marketData?.news || []).filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  const bullion = marketData?.bullion;
  const indices = marketData?.indices || [];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Markets & News"
        showBack={false}
        rightAction={
          <TouchableOpacity
            style={styles.headerRefreshBtn}
            onPress={() => loadData(true)}
            accessibilityLabel="Refresh market rates"
            accessibilityRole="button"
          >
            {refreshing ? (
              <ActivityIndicator size={18} color={brand.emerald} />
            ) : (
              <AppIcon name="refresh" size={20} color={brand.emerald} />
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={brand.emerald}
            colors={[brand.emerald]}
          />
        }
      >
        {/* Header Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.liveIndicator}>
            <View style={styles.livePulse} />
            <Text style={[styles.liveText, { color: semantic.income }]}>MARKETS LIVE</Text>
          </View>
          <Text style={[styles.lastUpdatedText, { color: theme.colors.onSurfaceVariant }]}>
            Updated: {marketData?.lastUpdated || 'Today'}
          </Text>
        </View>

        {/* 1. KEY INDICES & FOREX HORIZONTAL TICKER */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithIcon}>
            <AppIcon name="trending-up" size={18} color={brand.emerald} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Major Indices & Forex
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.indicesTicker}
        >
          {indices.map((idx, index) => {
            const isGreen = idx.isPositive;
            return (
              <View
                key={`idx-${index}`}
                style={[
                  styles.indexCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <View style={styles.indexTopRow}>
                  <Text style={[styles.indexSymbol, { color: theme.colors.onSurface }]}>
                    {idx.symbol}
                  </Text>
                  <Text style={[styles.indexExchange, { color: theme.colors.onSurfaceVariant }]}>
                    {idx.exchange}
                  </Text>
                </View>

                <Text style={[styles.indexPrice, { color: theme.colors.onSurface }]}>
                  {idx.price}
                </Text>

                <View style={styles.indexChangeRow}>
                  <AppIcon
                    name={isGreen ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={isGreen ? semantic.income : semantic.expense}
                  />
                  <Text
                    style={[
                      styles.indexChangeText,
                      { color: isGreen ? semantic.income : semantic.expense },
                    ]}
                  >
                    {idx.change} ({idx.changePercent})
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* 2. BULLION HUB: GOLD & SILVER RATES */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithIcon}>
            <AppIcon name="gold" size={18} color="#EAB308" />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Precious Metals (Gold & Silver)
            </Text>
          </View>
          <Text style={[styles.sectionBenchmark, { color: theme.colors.onSurfaceVariant }]}>
            IBJA / MCX
          </Text>
        </View>

        {/* Weight Selector */}
        <View style={styles.weightSelectorRow}>
          <Text style={[styles.weightLabel, { color: theme.colors.onSurfaceVariant }]}>
            Quantity:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {WEIGHT_OPTIONS.map((opt) => {
              const isSelected = selectedWeight.multiplier === opt.multiplier;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => setSelectedWeight(opt)}
                  style={[
                    styles.weightPill,
                    isSelected
                      ? { backgroundColor: brand.emerald }
                      : {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.weightPillText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.onSurface },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Gold & Silver Cards Grid */}
        {bullion && (
          <View style={styles.bullionGrid}>
            {/* Gold 24K */}
            <View
              style={[
                styles.bullionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <View style={styles.bullionCardHeader}>
                <View style={[styles.bullionBadge, { backgroundColor: '#FEF08A' }]}>
                  <Text style={styles.bullionBadgeText}>24K Pure</Text>
                </View>
                <View style={styles.trendRow}>
                  <AppIcon name="arrow-up" size={14} color={semantic.income} />
                  <Text style={[styles.bullionChange, { color: semantic.income }]}>
                    +{bullion.gold24k.changePercent}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.bullionTitle, { color: theme.colors.onSurface }]}>
                Gold 24 Karat
              </Text>
              <Text style={[styles.bullionPurity, { color: theme.colors.onSurfaceVariant }]}>
                {bullion.gold24k.purity}
              </Text>

              <Text style={[styles.bullionPrice, { color: theme.colors.onSurface }]}>
                ₹{(bullion.gold24k.pricePerGram * selectedWeight.multiplier).toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.bullionSubtext, { color: theme.colors.onSurfaceVariant }]}>
                for {selectedWeight.name} (₹{bullion.gold24k.pricePerGram}/g)
              </Text>
            </View>

            {/* Gold 22K */}
            <View
              style={[
                styles.bullionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <View style={styles.bullionCardHeader}>
                <View style={[styles.bullionBadge, { backgroundColor: '#FDE68A' }]}>
                  <Text style={styles.bullionBadgeText}>22K Standard</Text>
                </View>
                <View style={styles.trendRow}>
                  <AppIcon name="arrow-up" size={14} color={semantic.income} />
                  <Text style={[styles.bullionChange, { color: semantic.income }]}>
                    +{bullion.gold22k.changePercent}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.bullionTitle, { color: theme.colors.onSurface }]}>
                Gold 22 Karat
              </Text>
              <Text style={[styles.bullionPurity, { color: theme.colors.onSurfaceVariant }]}>
                {bullion.gold22k.purity}
              </Text>

              <Text style={[styles.bullionPrice, { color: theme.colors.onSurface }]}>
                ₹{(bullion.gold22k.pricePerGram * selectedWeight.multiplier).toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.bullionSubtext, { color: theme.colors.onSurfaceVariant }]}>
                for {selectedWeight.name} (₹{bullion.gold22k.pricePerGram}/g)
              </Text>
            </View>

            {/* Fine Silver 999 */}
            <View
              style={[
                styles.bullionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <View style={styles.bullionCardHeader}>
                <View style={[styles.bullionBadge, { backgroundColor: '#E2E8F0' }]}>
                  <Text style={[styles.bullionBadgeText, { color: '#334155' }]}>999 Silver</Text>
                </View>
                <View style={styles.trendRow}>
                  <AppIcon name="arrow-up" size={14} color={semantic.income} />
                  <Text style={[styles.bullionChange, { color: semantic.income }]}>
                    +{bullion.silver.changePercent}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.bullionTitle, { color: theme.colors.onSurface }]}>
                Fine Silver
              </Text>
              <Text style={[styles.bullionPurity, { color: theme.colors.onSurfaceVariant }]}>
                {bullion.silver.purity}
              </Text>

              <Text style={[styles.bullionPrice, { color: theme.colors.onSurface }]}>
                ₹{(bullion.silver.pricePerGram * selectedWeight.multiplier).toLocaleString('en-IN', {
                  maximumFractionDigits: 1,
                })}
              </Text>
              <Text style={[styles.bullionSubtext, { color: theme.colors.onSurfaceVariant }]}>
                ₹{bullion.silver.pricePerKg.toLocaleString('en-IN')} / 1 Kg
              </Text>
            </View>

            {/* Platinum */}
            <View
              style={[
                styles.bullionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <View style={styles.bullionCardHeader}>
                <View style={[styles.bullionBadge, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={[styles.bullionBadgeText, { color: '#3730A3' }]}>Platinum</Text>
                </View>
                <View style={styles.trendRow}>
                  <AppIcon name="arrow-down" size={14} color={semantic.expense} />
                  <Text style={[styles.bullionChange, { color: semantic.expense }]}>
                    {bullion.platinum.changePercent}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.bullionTitle, { color: theme.colors.onSurface }]}>
                Platinum (950)
              </Text>
              <Text style={[styles.bullionPurity, { color: theme.colors.onSurfaceVariant }]}>
                {bullion.platinum.purity}
              </Text>

              <Text style={[styles.bullionPrice, { color: theme.colors.onSurface }]}>
                ₹{(bullion.platinum.pricePerGram * selectedWeight.multiplier).toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.bullionSubtext, { color: theme.colors.onSurfaceVariant }]}>
                for {selectedWeight.name} (₹{bullion.platinum.pricePerGram}/g)
              </Text>
            </View>
          </View>
        )}

        {/* 3. DAILY FINANCIAL NEWS FEED */}
        <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
          <View style={styles.sectionTitleWithIcon}>
            <AppIcon name="newspaper-variant-outline" size={18} color={brand.emerald} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Daily Financial News
            </Text>
          </View>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Chip
                key={cat}
                selected={isSelected}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterChip,
                  isSelected
                    ? { backgroundColor: brand.emerald }
                    : {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outline,
                      },
                ]}
                textStyle={{
                  color: isSelected ? '#FFFFFF' : theme.colors.onSurface,
                  fontSize: 12,
                  fontWeight: isSelected ? '700' : '500',
                }}
              >
                {cat}
              </Chip>
            );
          })}
        </ScrollView>

        {/* News Articles */}
        <View style={styles.newsList}>
          {filteredNews.map((article) => (
            <TouchableOpacity
              key={article.id}
              activeOpacity={0.7}
              onPress={() => setSelectedArticle(article)}
              style={[
                styles.newsCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
              accessibilityLabel={`Read story: ${article.title}`}
              accessibilityRole="button"
            >
              <View style={styles.newsCardMeta}>
                <View
                  style={[
                    styles.newsCategoryBadge,
                    { backgroundColor: `${article.categoryColor}20` },
                  ]}
                >
                  <Text style={[styles.newsCategoryText, { color: article.categoryColor }]}>
                    {article.category}
                  </Text>
                </View>

                <View style={styles.newsSourceRow}>
                  <Text style={[styles.newsSource, { color: theme.colors.onSurfaceVariant }]}>
                    {article.source}
                  </Text>
                  <Text style={[styles.newsDot, { color: theme.colors.onSurfaceVariant }]}>
                    •
                  </Text>
                  <Text style={[styles.newsTime, { color: theme.colors.onSurfaceVariant }]}>
                    {article.timeAgo}
                  </Text>
                </View>
              </View>

              <Text style={[styles.newsTitle, { color: theme.colors.onSurface }]}>
                {article.title}
              </Text>

              <Text
                numberOfLines={2}
                style={[styles.newsSummary, { color: theme.colors.onSurfaceVariant }]}
              >
                {article.summary}
              </Text>

              <View style={styles.newsCardFooter}>
                <View style={styles.sentimentBadge}>
                  <AppIcon name="lightning-bolt" size={13} color={brand.emerald} />
                  <Text style={[styles.sentimentText, { color: brand.emerald }]}>
                    {article.sentiment}
                  </Text>
                </View>

                <View style={styles.readMoreRow}>
                  <Text style={[styles.readMoreText, { color: brand.emerald }]}>Read Story</Text>
                  <AppIcon name="chevron-right" size={16} color={brand.emerald} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ARTICLE READER MODAL */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedArticle(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            {selectedArticle && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.newsCategoryBadge,
                      { backgroundColor: `${selectedArticle.categoryColor}20` },
                    ]}
                  >
                    <Text
                      style={[styles.newsCategoryText, { color: selectedArticle.categoryColor }]}
                    >
                      {selectedArticle.category}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedArticle(null)}
                    style={styles.modalCloseBtn}
                    accessibilityLabel="Close article"
                  >
                    <AppIcon name="close" size={22} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                    {selectedArticle.title}
                  </Text>

                  <View style={styles.modalMetaRow}>
                    <Text style={[styles.modalSource, { color: brand.emerald }]}>
                      {selectedArticle.source}
                    </Text>
                    <Text style={[styles.newsDot, { color: theme.colors.onSurfaceVariant }]}>
                      •
                    </Text>
                    <Text style={[styles.modalTime, { color: theme.colors.onSurfaceVariant }]}>
                      {selectedArticle.timeAgo}
                    </Text>
                  </View>

                  {/* Key Takeaway Box */}
                  <View
                    style={[
                      styles.takeawayBox,
                      {
                        backgroundColor: `${brand.emerald}15`,
                        borderColor: brand.emerald,
                      },
                    ]}
                  >
                    <View style={styles.takeawayHeader}>
                      <AppIcon name="lightbulb-on-outline" size={18} color={brand.emerald} />
                      <Text style={[styles.takeawayTitle, { color: brand.emerald }]}>
                        Key Takeaway for You
                      </Text>
                    </View>
                    <Text
                      style={[styles.takeawayText, { color: theme.colors.onSurface }]}
                    >
                      {selectedArticle.keyTakeaway}
                    </Text>
                  </View>

                  {/* Body Content */}
                  <Text style={[styles.modalBody, { color: theme.colors.onSurface }]}>
                    {selectedArticle.content}
                  </Text>
                </ScrollView>

                <Button
                  mode="contained"
                  buttonColor={brand.emerald}
                  textColor="#FFFFFF"
                  style={styles.modalDoneBtn}
                  onPress={() => setSelectedArticle(null)}
                >
                  Close Story
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRefreshBtn: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semantic.income,
    marginRight: spacing.xs,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lastUpdatedText: {
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  sectionBenchmark: {
    fontSize: 12,
    fontWeight: '600',
  },
  indicesTicker: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  indexCard: {
    width: 142,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  indexTopRow: {
    marginBottom: spacing.xs,
  },
  indexSymbol: {
    fontSize: 13,
    fontWeight: '700',
  },
  indexExchange: {
    fontSize: 10,
    marginTop: 1,
  },
  indexPrice: {
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 2,
  },
  indexChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indexChangeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  weightSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weightLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  weightPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  weightPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bullionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bullionCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bullionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  bullionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bullionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullionChange: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  bullionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bullionPurity: {
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  bullionPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: brand.primary,
  },
  bullionSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  categoryChipsRow: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterChip: {
    borderRadius: 20,
    height: 32,
    borderWidth: StyleSheet.hairlineWidth,
  },
  newsList: {
    gap: spacing.md,
  },
  newsCard: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  newsCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  newsCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newsCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  newsSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: 11,
    fontWeight: '600',
  },
  newsDot: {
    marginHorizontal: 4,
    fontSize: 10,
  },
  newsTime: {
    fontSize: 11,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  newsSummary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  newsCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 26,
    marginVertical: spacing.xs,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalSource: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalTime: {
    fontSize: 13,
  },
  takeawayBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  takeawayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  takeawayTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: spacing.xs,
  },
  takeawayText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalDoneBtn: {
    marginTop: spacing.sm,
    borderRadius: 12,
  },
});
