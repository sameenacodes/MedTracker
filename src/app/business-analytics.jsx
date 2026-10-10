import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { getBusinessAnalytics } from '../services/api';

const COLORS = {
  background: '#F6F8F7',
  white: '#FFFFFF',
  green: '#176B52',
  greenDark: '#0F4F3D',
  greenLight: '#E8F3EF',
  text: '#17221E',
  textSecondary: '#66736E',
  border: '#E1E7E4',
  muted: '#F0F3F2',
  red: '#C62828',
  redLight: '#FDECEC',
  amber: '#A56A00',
  amberLight: '#FFF4DC',
};

export default function BusinessAnalytics() {
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =====================================================
  // LOAD ANALYTICS
  // =====================================================

  const loadAnalytics = async () => {
    try {
      const result = await getBusinessAnalytics();

      setData(result);
    } catch (error) {
      console.error(
        'Business analytics loading error:',
        error
      );

      Alert.alert(
        'Unable to load analytics',
        error?.message ||
          'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // SCREEN FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const formatMoney = (value) => {
    return `₹${Number(value || 0).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString('en-IN');
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading && !data) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingIcon}>
          <Text style={styles.loadingIconText}>₹</Text>
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.green}
        />

        <Text style={styles.loadingTitle}>
          Loading analytics...
        </Text>

        <Text style={styles.loadingSubtitle}>
          Preparing your business insights
        </Text>
      </View>
    );
  }

  const summary = data?.summary || {};
  const today = data?.today || {};
  const thisMonth = data?.thisMonth || {};
  const inventory = data?.inventory || {};

  const topSelling =
    Array.isArray(data?.topSelling)
      ? data.topSelling
      : [];

  const categorySales =
    Array.isArray(data?.categorySales)
      ? data.categorySales
      : [];

  const dailySales =
    Array.isArray(data?.dailySales)
      ? data.dailySales
      : [];

  const maxDailyRevenue =
    dailySales.length > 0
      ? Math.max(
          ...dailySales.map(
            (item) =>
              Number(item.revenue || 0)
          )
        )
      : 0;

  // =====================================================
  // UI
  // =====================================================

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.green}
          />
        }
        contentContainerStyle={styles.content}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Business Analytics
            </Text>

            <Text style={styles.headerSubtitle}>
              Understand your pharmacy performance
            </Text>
          </View>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              LIVE
            </Text>
          </View>
        </View>

        {/* =================================================
            TODAY SNAPSHOT
        ================================================= */}

        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View>
              <Text style={styles.todayLabel}>
                TODAY'S SALES
              </Text>

              <Text style={styles.todayRevenue}>
                {formatMoney(today.revenue)}
              </Text>
            </View>

            <View style={styles.todayIcon}>
              <Text style={styles.todayIconText}>
                ₹
              </Text>
            </View>
          </View>

          <View style={styles.todayDivider} />

          <View style={styles.todayStats}>

            <View style={styles.todayStat}>
              <Text style={styles.todayStatValue}>
                {formatNumber(today.bills)}
              </Text>

              <Text style={styles.todayStatLabel}>
                Bills
              </Text>
            </View>

            <View style={styles.todayStat}>
              <Text style={styles.todayStatValue}>
                {formatNumber(today.unitsSold)}
              </Text>

              <Text style={styles.todayStatLabel}>
                Units Sold
              </Text>
            </View>

            <View style={styles.todayStat}>
              <Text style={styles.todayStatValue}>
                {formatMoney(today.profit)}
              </Text>

              <Text style={styles.todayStatLabel}>
                Profit
              </Text>
            </View>

          </View>
        </View>

        {/* =================================================
            OVERALL SUMMARY
        ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Overall Performance
          </Text>

          <Text style={styles.sectionSubtitle}>
            Sales recorded this year
          </Text>

          <View style={styles.metricGrid}>

            <View style={styles.metricCard}>
              <View
                style={[
                  styles.metricIcon,
                  styles.metricGreen,
                ]}
              >
                <Text style={styles.metricIconText}>
                  ₹
                </Text>
              </View>

              <Text style={styles.metricLabel}>
                Revenue
              </Text>

              <Text style={styles.metricValue}>
                {formatMoney(summary.totalRevenue)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View
                style={[
                  styles.metricIcon,
                  styles.metricBlue,
                ]}
              >
                <Text style={styles.metricIconText}>
                  +
                </Text>
              </View>

              <Text style={styles.metricLabel}>
                Profit
              </Text>

              <Text style={styles.metricValue}>
                {formatMoney(summary.totalProfit)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View
                style={[
                  styles.metricIcon,
                  styles.metricAmber,
                ]}
              >
                <Text style={styles.metricIconText}>
                  #
                </Text>
              </View>

              <Text style={styles.metricLabel}>
                Total Bills
              </Text>

              <Text style={styles.metricValue}>
                {formatNumber(summary.totalBills)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View
                style={[
                  styles.metricIcon,
                  styles.metricPurple,
                ]}
              >
                <Text style={styles.metricIconText}>
                  *
                </Text>
              </View>

              <Text style={styles.metricLabel}>
                Units Sold
              </Text>

              <Text style={styles.metricValue}>
                {formatNumber(summary.totalUnitsSold)}
              </Text>
            </View>

          </View>
        </View>

        {/* =================================================
            PROFIT MARGIN
        ================================================= */}

        <View style={styles.marginCard}>

          <View style={styles.marginTop}>
            <View>
              <Text style={styles.marginTitle}>
                Profit Margin
              </Text>

              <Text style={styles.marginSubtitle}>
                Revenue converted into profit
              </Text>
            </View>

            <Text style={styles.marginValue}>
              {Number(
                summary.profitMargin || 0
              ).toFixed(1)}
              %
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    Math.max(
                      Number(
                        summary.profitMargin || 0
                      ),
                      0
                    ),
                    100
                  )}%`,
                },
              ]}
            />
          </View>

        </View>

        {/* =================================================
            MONTHLY PERFORMANCE
        ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            This Month
          </Text>

          <Text style={styles.sectionSubtitle}>
            Current month's performance
          </Text>

          <View style={styles.monthCard}>

            <View style={styles.monthRow}>
              <Text style={styles.monthLabel}>
                Revenue
              </Text>

              <Text style={styles.monthValue}>
                {formatMoney(thisMonth.revenue)}
              </Text>
            </View>

            <View style={styles.monthRow}>
              <Text style={styles.monthLabel}>
                Profit
              </Text>

              <Text style={styles.monthValue}>
                {formatMoney(thisMonth.profit)}
              </Text>
            </View>

            <View style={styles.monthRow}>
              <Text style={styles.monthLabel}>
                Bills
              </Text>

              <Text style={styles.monthValue}>
                {formatNumber(thisMonth.bills)}
              </Text>
            </View>

            <View style={styles.monthRow}>
              <Text style={styles.monthLabel}>
                Units Sold
              </Text>

              <Text style={styles.monthValue}>
                {formatNumber(
                  thisMonth.unitsSold
                )}
              </Text>
            </View>

            <View style={styles.monthDivider} />

            <View style={styles.monthRow}>
              <Text style={styles.monthAverageLabel}>
                Average Bill
              </Text>

              <Text style={styles.monthAverageValue}>
                {formatMoney(
                  thisMonth.averageBillValue
                )}
              </Text>
            </View>

          </View>
        </View>

        {/* =================================================
            INVENTORY
        ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Inventory Overview
          </Text>

          <Text style={styles.sectionSubtitle}>
            Current stock position
          </Text>

          <View style={styles.inventoryCard}>

            <View style={styles.inventoryRow}>

              <View style={styles.inventoryItem}>
                <Text style={styles.inventoryValue}>
                  {formatNumber(
                    inventory.totalMedicines
                  )}
                </Text>

                <Text style={styles.inventoryLabel}>
                  Medicines
                </Text>
              </View>

              <View style={styles.inventoryDivider} />

              <View style={styles.inventoryItem}>
                <Text style={styles.inventoryValue}>
                  {formatNumber(
                    inventory.totalUnits
                  )}
                </Text>

                <Text style={styles.inventoryLabel}>
                  Units
                </Text>
              </View>

              <View style={styles.inventoryDivider} />

              <View style={styles.inventoryItem}>
                <Text style={styles.inventoryValue}>
                  {formatMoney(
                    inventory.inventoryValue
                  )}
                </Text>

                <Text style={styles.inventoryLabel}>
                  Stock Value
                </Text>
              </View>

            </View>

            <View style={styles.inventoryAlerts}>

              <View style={styles.inventoryAlert}>
                <View
                  style={[
                    styles.alertDot,
                    styles.alertDotAmber,
                  ]}
                />

                <Text style={styles.inventoryAlertText}>
                  {formatNumber(
                    inventory.lowStockCount
                  )}{' '}
                  low stock
                </Text>
              </View>

              <View style={styles.inventoryAlert}>
                <View
                  style={[
                    styles.alertDot,
                    styles.alertDotRed,
                  ]}
                />

                <Text style={styles.inventoryAlertText}>
                  {formatNumber(
                    inventory.outOfStockCount
                  )}{' '}
                  out of stock
                </Text>
              </View>

            </View>

          </View>
        </View>

        {/* =================================================
            TOP SELLING
        ================================================= */}

        <View style={styles.section}>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>
                Top Selling Medicines
              </Text>

              <Text style={styles.sectionSubtitle}>
                Based on units sold
              </Text>
            </View>

            <View style={styles.smallBadge}>
              <Text style={styles.smallBadgeText}>
                TOP 10
              </Text>
            </View>
          </View>

          {topSelling.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No sales data yet
              </Text>

              <Text style={styles.emptyText}>
                Complete some bills to see
                top-selling medicines.
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>

              {topSelling.map(
                (item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    style={[
                      styles.topItem,
                      index !==
                        topSelling.length - 1 &&
                        styles.listBorder,
                    ]}
                  >

                    <View style={styles.rankCircle}>
                      <Text style={styles.rankText}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.topInfo}>
                      <Text
                        style={styles.topName}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      <Text style={styles.topMeta}>
                        {formatNumber(
                          item.unitsSold
                        )}{' '}
                        units sold
                      </Text>
                    </View>

                    <View style={styles.topRight}>
                      <Text style={styles.topRevenue}>
                        {formatMoney(
                          item.revenue
                        )}
                      </Text>

                      <Text style={styles.topProfit}>
                        Profit{' '}
                        {formatMoney(
                          item.profit
                        )}
                      </Text>
                    </View>

                  </View>
                )
              )}

            </View>
          )}

        </View>

        {/* =================================================
            CATEGORY SALES
        ================================================= */}

        <View style={styles.section}>

          <Text style={styles.sectionTitle}>
            Category Performance
          </Text>

          <Text style={styles.sectionSubtitle}>
            Revenue by medicine category
          </Text>

          {categorySales.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No category data yet
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>

              {categorySales.map(
                (item, index) => (
                  <View
                    key={`${item.category}-${index}`}
                    style={[
                      styles.categoryItem,
                      index !==
                        categorySales.length - 1 &&
                        styles.listBorder,
                    ]}
                  >

                    <View style={styles.categoryIcon}>
                      <Text style={styles.categoryIconText}>
                        #
                      </Text>
                    </View>

                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>
                        {item.category}
                      </Text>

                      <Text style={styles.categoryMeta}>
                        {formatNumber(
                          item.unitsSold
                        )}{' '}
                        units
                      </Text>
                    </View>

                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryRevenue}>
                        {formatMoney(
                          item.revenue
                        )}
                      </Text>

                      <Text style={styles.categoryProfit}>
                        Profit{' '}
                        {formatMoney(
                          item.profit
                        )}
                      </Text>
                    </View>

                  </View>
                )
              )}

            </View>
          )}

        </View>

        {/* =================================================
            SALES TREND
        ================================================= */}

        <View style={styles.section}>

          <Text style={styles.sectionTitle}>
            Sales Trend
          </Text>

          <Text style={styles.sectionSubtitle}>
            Daily revenue for the last 30 days
          </Text>

          {dailySales.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No daily sales yet
              </Text>
            </View>
          ) : (
            <View style={styles.chartCard}>

              {dailySales.map(
                (item, index) => {

                  const revenue =
                    Number(
                      item.revenue || 0
                    );

                  const percentage =
                    maxDailyRevenue > 0
                      ? (revenue /
                          maxDailyRevenue) *
                        100
                      : 0;

                  const date =
                    new Date(item.date);

                  const label =
                    date.toLocaleDateString(
                      'en-IN',
                      {
                        day: '2-digit',
                        month: 'short',
                      }
                    );

                  return (
                    <View
                      key={`${item.date}-${index}`}
                      style={styles.chartRow}
                    >

                      <Text style={styles.chartDate}>
                        {label}
                      </Text>

                      <View style={styles.chartBarBackground}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              width: `${Math.max(
                                percentage,
                                revenue > 0
                                  ? 2
                                  : 0
                              )}%`,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.chartValue}>
                        {formatMoney(revenue)}
                      </Text>

                    </View>
                  );
                }
              )}

            </View>
          )}

        </View>

        {/* =================================================
            REFRESH INFO
        ================================================= */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pull down to refresh analytics
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 35,
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  loadingIconText: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.green,
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  loadingSubtitle: {
    marginTop: 5,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backArrow: {
    fontSize: 30,
    lineHeight: 32,
    color: COLORS.text,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.text,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  headerBadge: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  headerBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.green,
  },

  // ===================================================
  // TODAY
  // ===================================================

  todayCard: {
    backgroundColor: COLORS.green,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
  },

  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  todayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D8EEE7',
    letterSpacing: 0.8,
  },

  todayRevenue: {
    marginTop: 5,
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
  },

  todayIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  todayIconText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.white,
  },

  todayDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 16,
  },

  todayStats: {
    flexDirection: 'row',
  },

  todayStat: {
    flex: 1,
  },

  todayStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },

  todayStatLabel: {
    marginTop: 3,
    fontSize: 10,
    color: '#C9E2DA',
  },

  // ===================================================
  // SECTIONS
  // ===================================================

  section: {
    marginBottom: 24,
  },

  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    marginBottom: 12,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // ===================================================
  // METRICS
  // ===================================================

  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },

  metricIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  metricGreen: {
    backgroundColor: COLORS.greenLight,
  },

  metricBlue: {
    backgroundColor: '#EAF1FA',
  },

  metricAmber: {
    backgroundColor: COLORS.amberLight,
  },

  metricPurple: {
    backgroundColor: '#F0EBF8',
  },

  metricIconText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.green,
  },

  metricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  metricValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },

  // ===================================================
  // PROFIT MARGIN
  // ===================================================

  marginCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
  },

  marginTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  marginTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  marginSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  marginValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.green,
  },

  progressBackground: {
    height: 8,
    backgroundColor: COLORS.muted,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 14,
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 5,
  },

  // ===================================================
  // MONTH
  // ===================================================

  monthCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  monthLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  monthValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  monthDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 13,
  },

  monthAverageLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },

  monthAverageValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.green,
  },

  // ===================================================
  // INVENTORY
  // ===================================================

  inventoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  inventoryItem: {
    flex: 1,
    alignItems: 'center',
  },

  inventoryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },

  inventoryValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },

  inventoryLabel: {
    marginTop: 4,
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  inventoryAlerts: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },

  inventoryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  alertDotAmber: {
    backgroundColor: COLORS.amber,
  },

  alertDotRed: {
    backgroundColor: COLORS.red,
  },

  inventoryAlertText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  // ===================================================
  // LIST
  // ===================================================

  smallBadge: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  smallBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.green,
  },

  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
  },

  listBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  rankText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.green,
  },

  topInfo: {
    flex: 1,
    minWidth: 0,
  },

  topName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },

  topMeta: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.textSecondary,
  },

  topRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  topRevenue: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },

  topProfit: {
    marginTop: 3,
    fontSize: 8,
    color: COLORS.green,
  },

  // ===================================================
  // CATEGORY
  // ===================================================

  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
  },

  categoryIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  categoryIconText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.green,
  },

  categoryInfo: {
    flex: 1,
  },

  categoryName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },

  categoryMeta: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.textSecondary,
  },

  categoryRight: {
    alignItems: 'flex-end',
  },

  categoryRevenue: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },

  categoryProfit: {
    marginTop: 3,
    fontSize: 8,
    color: COLORS.green,
  },

  // ===================================================
  // CHART
  // ===================================================

  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },

  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  chartDate: {
    width: 55,
    fontSize: 8,
    color: COLORS.textSecondary,
  },

  chartBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.muted,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },

  chartBar: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 5,
  },

  chartValue: {
    width: 65,
    textAlign: 'right',
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.text,
  },

  // ===================================================
  // EMPTY
  // ===================================================

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  emptyText: {
    marginTop: 5,
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // ===================================================
  // FOOTER
  // ===================================================

  footer: {
    alignItems: 'center',
    paddingTop: 4,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});