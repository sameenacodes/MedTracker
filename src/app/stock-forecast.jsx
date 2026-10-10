import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getStockForecast,
} from '../services/api';


// =====================================================
// COLORS
// =====================================================

const COLORS = {
  green: '#176B52',
  greenLight: '#EAF6F1',

  white: '#FFFFFF',
  background: '#F6F8F7',

  text: '#17201C',
  muted: '#6B7772',

  border: '#E2E8E5',

  red: '#C62828',
  redLight: '#FDECEC',

  amber: '#B7791F',
  amberLight: '#FFF6E5',

  blue: '#2563EB',
  blueLight: '#EEF4FF',
};


// =====================================================
// MAIN SCREEN
// =====================================================

export default function StockForecast() {

  const router = useRouter();


  // ---------------------------------------------------
  // STATE
  // ---------------------------------------------------

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState('');

  const [
    forecastData,
    setForecastData
  ] = useState([]);

  const [
    summary,
    setSummary
  ] = useState({
    totalMedicines: 0,
    highPriority: 0,
    mediumPriority: 0,
    runningOut: 0,
    expectedShortage: 0,
    totalSuggestedReorder: 0,
  });

  const [
    selectedFilter,
    setSelectedFilter
  ] = useState('ALL');


  // ===================================================
  // LOAD FORECAST
  // ===================================================

  const loadForecast = async (
    showLoader = true
  ) => {

    try {

      if (showLoader) {
        setLoading(true);
      }

      setError('');


      const result =
        await getStockForecast();


      if (
        !result ||
        result.success !== true
      ) {

        throw new Error(
          result?.message ||
          'Unable to load stock forecast'
        );

      }


      setForecastData(
        Array.isArray(result.data)
          ? result.data
          : []
      );


      setSummary(
        result.summary || {
          totalMedicines: 0,
          highPriority: 0,
          mediumPriority: 0,
          runningOut: 0,
          expectedShortage: 0,
          totalSuggestedReorder: 0,
        }
      );


    } catch (err) {

      console.log(
        'Stock forecast error:',
        err
      );

      setError(
        err?.message ||
        'Failed to load stock forecast'
      );


    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  };


  // ===================================================
  // INITIAL / FOCUS LOAD
  // ===================================================

  useFocusEffect(
    useCallback(() => {

      loadForecast();

    }, [])
  );


  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = () => {

    setRefreshing(true);

    loadForecast(false);

  };


  // ===================================================
  // FILTER
  // ===================================================

  const filteredForecast =
    forecastData.filter(
      (item) => {

        if (
          selectedFilter === 'ALL'
        ) {
          return true;
        }


        if (
          selectedFilter === 'HIGH'
        ) {
          return item.priority === 'HIGH';
        }


        if (
          selectedFilter === 'MEDIUM'
        ) {
          return item.priority === 'MEDIUM';
        }


        if (
          selectedFilter === 'RUNNING_OUT'
        ) {

          return (
            item.forecastStatus ===
              'RUNNING_OUT' ||
            item.forecastStatus ===
              'OUT_OF_STOCK'
          );

        }


        return true;

      }
    );


  // ===================================================
  // HELPERS
  // ===================================================

  const getPriorityColor = (
    priority
  ) => {

    if (
      priority === 'HIGH'
    ) {
      return COLORS.red;
    }

    if (
      priority === 'MEDIUM'
    ) {
      return COLORS.amber;
    }

    return COLORS.green;

  };


  const getPriorityBackground = (
    priority
  ) => {

    if (
      priority === 'HIGH'
    ) {
      return COLORS.redLight;
    }

    if (
      priority === 'MEDIUM'
    ) {
      return COLORS.amberLight;
    }

    return COLORS.greenLight;

  };


  const getStatusLabel = (
    status
  ) => {

    switch (status) {

      case 'OUT_OF_STOCK':
        return 'OUT OF STOCK';

      case 'RUNNING_OUT':
        return 'RUNNING OUT';

      case 'SHORTAGE_EXPECTED':
        return 'SHORTAGE EXPECTED';

      case 'MONITOR':
        return 'MONITOR';

      default:
        return 'HEALTHY';

    }

  };


  const getStatusColor = (
    status
  ) => {

    if (
      status === 'OUT_OF_STOCK' ||
      status === 'RUNNING_OUT'
    ) {
      return COLORS.red;
    }

    if (
      status === 'SHORTAGE_EXPECTED' ||
      status === 'MONITOR'
    ) {
      return COLORS.amber;
    }

    return COLORS.green;

  };


  const formatDate = (
    date
  ) => {

    if (!date) {
      return '—';
    }

    const value =
      new Date(date);

    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return '—';
    }

    return value.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );

  };


  // ===================================================
  // LOADING
  // ===================================================

  if (
    loading &&
    forecastData.length === 0
  ) {

    return (
      <View style={styles.loadingContainer}>

        <ActivityIndicator
          size="large"
          color={COLORS.green}
        />

        <Text style={styles.loadingText}>
          Analysing stock and sales...
        </Text>

      </View>
    );

  }


  // ===================================================
  // ERROR
  // ===================================================

  if (
    error &&
    forecastData.length === 0
  ) {

    return (
      <View style={styles.errorContainer}>

        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>
            !
          </Text>
        </View>

        <Text style={styles.errorTitle}>
          Unable to load forecast
        </Text>

        <Text style={styles.errorMessage}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() =>
            loadForecast()
          }
        >
          <Text style={styles.retryButtonText}>
            Try Again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>

      </View>
    );

  }


  // ===================================================
  // MAIN UI
  // ===================================================

  return (
    <View style={styles.container}>

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.headerBack}
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.headerBackText}>
            ‹
          </Text>
        </TouchableOpacity>


        <View style={styles.headerTitleContainer}>

          <Text style={styles.headerTitle}>
            AI Stock Forecast
          </Text>

          <Text style={styles.headerSubtitle}>
            Demand & inventory prediction
          </Text>

        </View>


        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >

          {refreshing ? (

            <ActivityIndicator
              size="small"
              color={COLORS.green}
            />

          ) : (

            <Text style={styles.refreshIcon}>
              ↻
            </Text>

          )}

        </TouchableOpacity>

      </View>


      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.green}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* =========================================== */}
        {/* AI INTRO */}
        {/* =========================================== */}

        <View style={styles.introCard}>

          <View style={styles.introIcon}>

            <Text style={styles.introIconText}>
              AI
            </Text>

          </View>


          <View style={styles.introContent}>

            <Text style={styles.introTitle}>
              Smart demand forecasting
            </Text>

            <Text style={styles.introText}>
              Forecasts are calculated from
              your actual medicine stock and
              recent sales history.
            </Text>

          </View>

        </View>


        {/* =========================================== */}
        {/* SUMMARY */}
        {/* =========================================== */}

        <Text style={styles.sectionTitle}>
          Inventory Forecast
        </Text>


        <View style={styles.summaryGrid}>

          {/* TOTAL */}

          <View style={styles.summaryCard}>

            <Text style={styles.summaryLabel}>
              Medicines
            </Text>

            <Text style={styles.summaryValue}>
              {summary.totalMedicines || 0}
            </Text>

            <Text style={styles.summaryHint}>
              Analysed
            </Text>

          </View>


          {/* HIGH */}

          <View
            style={[
              styles.summaryCard,
              styles.summaryDanger,
            ]}
          >

            <Text style={styles.summaryLabel}>
              High Priority
            </Text>

            <Text
              style={[
                styles.summaryValue,
                {
                  color: COLORS.red,
                },
              ]}
            >
              {summary.highPriority || 0}
            </Text>

            <Text style={styles.summaryHint}>
              Need attention
            </Text>

          </View>


          {/* RUNNING OUT */}

          <View
            style={[
              styles.summaryCard,
              styles.summaryWarning,
            ]}
          >

            <Text style={styles.summaryLabel}>
              Running Out
            </Text>

            <Text
              style={[
                styles.summaryValue,
                {
                  color: COLORS.amber,
                },
              ]}
            >
              {summary.runningOut || 0}
            </Text>

            <Text style={styles.summaryHint}>
              Low coverage
            </Text>

          </View>


          {/* REORDER */}

          <View
            style={[
              styles.summaryCard,
              styles.summaryGreen,
            ]}
          >

            <Text style={styles.summaryLabel}>
              Suggested Reorder
            </Text>

            <Text
              style={[
                styles.summaryValue,
                {
                  color: COLORS.green,
                },
              ]}
            >
              {summary.totalSuggestedReorder || 0}
            </Text>

            <Text style={styles.summaryHint}>
              Units
            </Text>

          </View>

        </View>


        {/* =========================================== */}
        {/* FILTERS */}
        {/* =========================================== */}

        <Text style={styles.sectionTitle}>
          Filter Forecast
        </Text>


        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterContainer
          }
        >

          {[
            ['ALL', 'All'],
            ['HIGH', 'High'],
            ['MEDIUM', 'Medium'],
            ['RUNNING_OUT', 'Running Out'],
          ].map(
            ([value, label]) => (

              <TouchableOpacity
                key={value}
                style={[
                  styles.filterButton,

                  selectedFilter === value &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setSelectedFilter(value)
                }
              >

                <Text
                  style={[
                    styles.filterText,

                    selectedFilter === value &&
                      styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>

              </TouchableOpacity>

            )
          )}

        </ScrollView>


        {/* =========================================== */}
        {/* RESULT COUNT */}
        {/* =========================================== */}

        <View style={styles.resultHeader}>

          <Text style={styles.resultTitle}>
            Forecast Results
          </Text>

          <Text style={styles.resultCount}>
            {filteredForecast.length} medicines
          </Text>

        </View>


        {/* =========================================== */}
        {/* EMPTY */}
        {/* =========================================== */}

        {filteredForecast.length === 0 ? (

          <View style={styles.emptyCard}>

            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ✓
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No medicines found
            </Text>

            <Text style={styles.emptyText}>
              There are no medicines matching
              the selected forecast filter.
            </Text>

          </View>

        ) : (

          /* ========================================= */
          /* MEDICINE CARDS */
          /* ========================================= */

          filteredForecast.map(
            (item, index) => {

              const priorityColor =
                getPriorityColor(
                  item.priority
                );

              const priorityBackground =
                getPriorityBackground(
                  item.priority
                );

              const statusColor =
                getStatusColor(
                  item.forecastStatus
                );


              return (
                <View
                  key={
                    item.medicineId ||
                    `${item.name}-${index}`
                  }
                  style={styles.medicineCard}
                >

                  {/* -------------------------------- */}
                  {/* CARD HEADER */}
                  {/* -------------------------------- */}

                  <View style={styles.cardHeader}>

                    <View
                      style={
                        styles.medicineTitleContainer
                      }
                    >

                      <Text
                        style={
                          styles.medicineName
                        }
                        numberOfLines={1}
                      >
                        {item.name || 'Medicine'}
                      </Text>


                      {item.brand ? (

                        <Text
                          style={
                            styles.medicineBrand
                          }
                          numberOfLines={1}
                        >
                          {item.brand}
                        </Text>

                      ) : null}

                    </View>


                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor:
                            priorityBackground,
                        },
                      ]}
                    >

                      <Text
                        style={[
                          styles.priorityText,
                          {
                            color:
                              priorityColor,
                          },
                        ]}
                      >
                        {item.priority || 'LOW'}
                      </Text>

                    </View>

                  </View>


                  {/* -------------------------------- */}
                  {/* STATUS */}
                  {/* -------------------------------- */}

                  <View
                    style={[
                      styles.statusBanner,
                      {
                        backgroundColor:
                          statusColor ===
                          COLORS.red
                            ? COLORS.redLight
                            : statusColor ===
                              COLORS.amber
                              ? COLORS.amberLight
                              : COLORS.greenLight,
                      },
                    ]}
                  >

                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            statusColor,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            statusColor,
                        },
                      ]}
                    >
                      {getStatusLabel(
                        item.forecastStatus
                      )}
                    </Text>

                  </View>


                  {/* -------------------------------- */}
                  {/* STOCK METRICS */}
                  {/* -------------------------------- */}

                  <View style={styles.metricsRow}>

                    <View style={styles.metricBox}>

                      <Text style={styles.metricLabel}>
                        Current Stock
                      </Text>

                      <Text style={styles.metricValue}>
                        {item.currentStock ?? 0}
                      </Text>

                    </View>


                    <View style={styles.metricDivider} />


                    <View style={styles.metricBox}>

                      <Text style={styles.metricLabel}>
                        Daily Demand
                      </Text>

                      <Text style={styles.metricValue}>
                        {item.dailyAverage ?? 0}
                      </Text>

                    </View>


                    <View style={styles.metricDivider} />


                    <View style={styles.metricBox}>

                      <Text style={styles.metricLabel}>
                        Stock Lasts
                      </Text>

                      <Text style={styles.metricValue}>

                        {item.stockLastsDays !==
                        null &&
                        item.stockLastsDays !==
                        undefined
                          ? `${item.stockLastsDays}d`
                          : '—'}

                      </Text>

                    </View>

                  </View>


                  {/* -------------------------------- */}
                  {/* FORECAST */}
                  {/* -------------------------------- */}

                  <View style={styles.forecastSection}>

                    <Text style={styles.forecastTitle}>
                      Demand Forecast
                    </Text>


                    <View style={styles.forecastRow}>

                      <View
                        style={
                          styles.forecastItem
                        }
                      >

                        <Text
                          style={
                            styles.forecastLabel
                          }
                        >
                          Next 7 Days
                        </Text>

                        <Text
                          style={
                            styles.forecastValue
                          }
                        >
                          {item.forecast7Days ??
                            0}{' '}
                          units
                        </Text>

                      </View>


                      <View
                        style={
                          styles.forecastItem
                        }
                      >

                        <Text
                          style={
                            styles.forecastLabel
                          }
                        >
                          Next 30 Days
                        </Text>

                        <Text
                          style={
                            styles.forecastValue
                          }
                        >
                          {item.forecast30Days ??
                            0}{' '}
                          units
                        </Text>

                      </View>


                      <View
                        style={
                          styles.forecastItem
                        }
                      >

                        <Text
                          style={
                            styles.forecastLabel
                          }
                        >
                          Demand
                        </Text>

                        <Text
                          style={
                            styles.forecastValue
                          }
                        >
                          {item.demandLevel ||
                            'LOW'}
                        </Text>

                      </View>

                    </View>

                  </View>


                  {/* -------------------------------- */}
                  {/* REORDER */}
                  {/* -------------------------------- */}

                  <View
                    style={
                      styles.reorderSection
                    }
                  >

                    <View>

                      <Text
                        style={
                          styles.reorderLabel
                        }
                      >
                        Suggested Reorder
                      </Text>

                      <Text
                        style={
                          styles.reorderValue
                        }
                      >
                        {item.suggestedReorder ??
                          0}{' '}
                        units
                      </Text>

                    </View>


                    {item.estimatedStockOutDate ? (

                      <View
                        style={
                          styles.stockOutContainer
                        }
                      >

                        <Text
                          style={
                            styles.stockOutLabel
                          }
                        >
                          Estimated stock-out
                        </Text>

                        <Text
                          style={
                            styles.stockOutDate
                          }
                        >
                          {formatDate(
                            item.estimatedStockOutDate
                          )}
                        </Text>

                      </View>

                    ) : null}

                  </View>


                  {/* -------------------------------- */}
                  {/* RECOMMENDATION */}
                  {/* -------------------------------- */}

                  <View
                    style={
                      styles.recommendationBox
                    }
                  >

                    <Text
                      style={
                        styles.recommendationLabel
                      }
                    >
                      Recommendation
                    </Text>

                    <Text
                      style={
                        styles.recommendationText
                      }
                    >
                      {item.recommendation ||
                        'Monitor this medicine.'}
                    </Text>

                  </View>


                  {/* -------------------------------- */}
                  {/* EXTRA INFO */}
                  {/* -------------------------------- */}

                  <View
                    style={
                      styles.extraInfoRow
                    }
                  >

                    <Text
                      style={
                        styles.extraInfoText
                      }
                    >
                      Sold last 30 days:{' '}
                      {item.totalSold30Days ??
                        0}
                    </Text>


                    <Text
                      style={
                        styles.extraInfoText
                      }
                    >
                      Sold last 90 days:{' '}
                      {item.totalSold90Days ??
                        0}
                    </Text>

                  </View>

                </View>
              );

            }
          )

        )}


        {/* =========================================== */}
        {/* FOOTER INFO */}
        {/* =========================================== */}

        <View style={styles.footerCard}>

          <Text style={styles.footerTitle}>
            How the forecast works
          </Text>

          <Text style={styles.footerText}>
            MedTracker analyses recent sales
            activity and current inventory to
            estimate future demand and identify
            medicines that may require
            replenishment.
          </Text>

        </View>


        <View style={styles.bottomSpace} />

      </ScrollView>

    </View>
  );

}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },


  // ---------------------------------------------------
  // LOADING
  // ---------------------------------------------------

  loadingContainer: {
    flex: 1,
    backgroundColor:
      COLORS.background,

    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,

    fontSize: 14,

    color:
      COLORS.muted,
  },


  // ---------------------------------------------------
  // ERROR
  // ---------------------------------------------------

  errorContainer: {
    flex: 1,

    backgroundColor:
      COLORS.background,

    alignItems: 'center',
    justifyContent: 'center',

    padding: 24,
  },

  errorIcon: {
    width: 54,
    height: 54,

    borderRadius: 27,

    backgroundColor:
      COLORS.redLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 14,
  },

  errorIconText: {
    fontSize: 26,

    fontWeight: '800',

    color:
      COLORS.red,
  },

  errorTitle: {
    fontSize: 19,

    fontWeight: '800',

    color:
      COLORS.text,

    marginBottom: 7,
  },

  errorMessage: {
    fontSize: 14,

    color:
      COLORS.muted,

    textAlign: 'center',

    lineHeight: 21,

    marginBottom: 20,
  },

  retryButton: {
    minWidth: 130,

    paddingVertical: 12,
    paddingHorizontal: 22,

    borderRadius: 10,

    backgroundColor:
      COLORS.green,

    alignItems: 'center',
  },

  retryButtonText: {
    color:
      COLORS.white,

    fontSize: 14,

    fontWeight: '700',
  },

  backButton: {
    marginTop: 12,

    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  backButtonText: {
    color:
      COLORS.green,

    fontSize: 14,

    fontWeight: '600',
  },


  // ---------------------------------------------------
  // HEADER
  // ---------------------------------------------------

  header: {
    backgroundColor:
      COLORS.white,

    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,

    flexDirection: 'row',

    alignItems: 'center',

    borderBottomWidth: 1,

    borderBottomColor:
      COLORS.border,
  },

  headerBack: {
    width: 40,
    height: 40,

    borderRadius: 10,

    backgroundColor:
      COLORS.greenLight,

    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBackText: {
    fontSize: 29,

    lineHeight: 31,

    color:
      COLORS.green,

    fontWeight: '400',
  },

  headerTitleContainer: {
    flex: 1,

    marginLeft: 11,
  },

  headerTitle: {
    fontSize: 19,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  headerSubtitle: {
    marginTop: 2,

    fontSize: 12,

    color:
      COLORS.muted,
  },

  refreshButton: {
    width: 40,
    height: 40,

    borderRadius: 10,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    alignItems: 'center',
    justifyContent: 'center',

    marginLeft: 10,
  },

  refreshIcon: {
    fontSize: 23,

    color:
      COLORS.green,
  },


  // ---------------------------------------------------
  // SCROLL
  // ---------------------------------------------------

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },


  // ---------------------------------------------------
  // INTRO
  // ---------------------------------------------------

  introCard: {
    backgroundColor:
      COLORS.greenLight,

    borderRadius: 14,

    padding: 15,

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 20,
  },

  introIcon: {
    width: 46,
    height: 46,

    borderRadius: 12,

    backgroundColor:
      COLORS.green,

    alignItems: 'center',
    justifyContent: 'center',
  },

  introIconText: {
    color:
      COLORS.white,

    fontSize: 15,

    fontWeight: '900',
  },

  introContent: {
    flex: 1,

    marginLeft: 12,
  },

  introTitle: {
    fontSize: 15,

    fontWeight: '800',

    color:
      COLORS.green,
  },

  introText: {
    marginTop: 4,

    fontSize: 12,

    lineHeight: 18,

    color:
      COLORS.muted,
  },


  // ---------------------------------------------------
  // SECTION
  // ---------------------------------------------------

  sectionTitle: {
    fontSize: 16,

    fontWeight: '800',

    color:
      COLORS.text,

    marginBottom: 10,
  },


  // ---------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------

  summaryGrid: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    marginHorizontal: -5,

    marginBottom: 20,
  },

  summaryCard: {
    width: '50%',

    padding: 5,
  },

  summaryCard: {
    width: '50%',

    backgroundColor:
      COLORS.white,

    borderRadius: 12,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    padding: 14,

    marginBottom: 10,

    minHeight: 104,
  },

  summaryDanger: {
    borderColor:
      '#F3D2D2',
  },

  summaryWarning: {
    borderColor:
      '#F2DFC0',
  },

  summaryGreen: {
    borderColor:
      '#CDE7DC',
  },

  summaryLabel: {
    fontSize: 11,

    color:
      COLORS.muted,

    fontWeight: '600',
  },

  summaryValue: {
    marginTop: 7,

    fontSize: 25,

    fontWeight: '900',

    color:
      COLORS.text,
  },

  summaryHint: {
    marginTop: 2,

    fontSize: 10,

    color:
      COLORS.muted,
  },


  // ---------------------------------------------------
  // FILTERS
  // ---------------------------------------------------

  filterContainer: {
    paddingBottom: 18,
  },

  filterButton: {
    paddingHorizontal: 15,

    paddingVertical: 9,

    borderRadius: 20,

    backgroundColor:
      COLORS.white,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    marginRight: 8,
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.green,

    borderColor:
      COLORS.green,
  },

  filterText: {
    fontSize: 12,

    fontWeight: '700',

    color:
      COLORS.muted,
  },

  filterTextActive: {
    color:
      COLORS.white,
  },


  // ---------------------------------------------------
  // RESULT HEADER
  // ---------------------------------------------------

  resultHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 10,
  },

  resultTitle: {
    fontSize: 16,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  resultCount: {
    fontSize: 12,

    color:
      COLORS.muted,
  },


  // ---------------------------------------------------
  // EMPTY
  // ---------------------------------------------------

  emptyCard: {
    backgroundColor:
      COLORS.white,

    borderRadius: 14,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    padding: 28,

    alignItems: 'center',
  },

  emptyIcon: {
    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor:
      COLORS.greenLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 12,
  },

  emptyIconText: {
    fontSize: 22,

    fontWeight: '900',

    color:
      COLORS.green,
  },

  emptyTitle: {
    fontSize: 16,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  emptyText: {
    marginTop: 6,

    fontSize: 12,

    lineHeight: 18,

    color:
      COLORS.muted,

    textAlign: 'center',
  },


  // ---------------------------------------------------
  // MEDICINE CARD
  // ---------------------------------------------------

  medicineCard: {
    backgroundColor:
      COLORS.white,

    borderRadius: 14,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    padding: 15,

    marginBottom: 13,
  },

  cardHeader: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent: 'space-between',
  },

  medicineTitleContainer: {
    flex: 1,

    paddingRight: 10,
  },

  medicineName: {
    fontSize: 16,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  medicineBrand: {
    marginTop: 3,

    fontSize: 12,

    color:
      COLORS.muted,
  },

  priorityBadge: {
    paddingHorizontal: 9,

    paddingVertical: 5,

    borderRadius: 7,
  },

  priorityText: {
    fontSize: 10,

    fontWeight: '900',
  },


  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  statusBanner: {
    flexDirection: 'row',

    alignItems: 'center',

    borderRadius: 8,

    paddingHorizontal: 10,

    paddingVertical: 8,

    marginTop: 13,
  },

  statusDot: {
    width: 7,
    height: 7,

    borderRadius: 4,

    marginRight: 7,
  },

  statusText: {
    fontSize: 11,

    fontWeight: '900',
  },


  // ---------------------------------------------------
  // METRICS
  // ---------------------------------------------------

  metricsRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 15,

    paddingVertical: 3,
  },

  metricBox: {
    flex: 1,

    alignItems: 'center',
  },

  metricLabel: {
    fontSize: 10,

    color:
      COLORS.muted,

    marginBottom: 4,
  },

  metricValue: {
    fontSize: 16,

    fontWeight: '800',

    color:
      COLORS.text,
  },

  metricDivider: {
    width: 1,

    height: 30,

    backgroundColor:
      COLORS.border,
  },


  // ---------------------------------------------------
  // FORECAST
  // ---------------------------------------------------

  forecastSection: {
    marginTop: 15,

    paddingTop: 13,

    borderTopWidth: 1,

    borderTopColor:
      COLORS.border,
  },

  forecastTitle: {
    fontSize: 12,

    fontWeight: '800',

    color:
      COLORS.text,

    marginBottom: 10,
  },

  forecastRow: {
    flexDirection: 'row',
  },

  forecastItem: {
    flex: 1,
  },

  forecastLabel: {
    fontSize: 10,

    color:
      COLORS.muted,

    marginBottom: 4,
  },

  forecastValue: {
    fontSize: 12,

    fontWeight: '800',

    color:
      COLORS.text,
  },


  // ---------------------------------------------------
  // REORDER
  // ---------------------------------------------------

  reorderSection: {
    marginTop: 15,

    padding: 12,

    borderRadius: 10,

    backgroundColor:
      COLORS.greenLight,

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },

  reorderLabel: {
    fontSize: 10,

    color:
      COLORS.muted,
  },

  reorderValue: {
    marginTop: 3,

    fontSize: 17,

    fontWeight: '900',

    color:
      COLORS.green,
  },

  stockOutContainer: {
    alignItems: 'flex-end',
  },

  stockOutLabel: {
    fontSize: 9,

    color:
      COLORS.muted,
  },

  stockOutDate: {
    marginTop: 3,

    fontSize: 11,

    fontWeight: '800',

    color:
      COLORS.red,
  },


  // ---------------------------------------------------
  // RECOMMENDATION
  // ---------------------------------------------------

  recommendationBox: {
    marginTop: 10,

    paddingHorizontal: 12,

    paddingVertical: 10,

    borderRadius: 9,

    backgroundColor:
      COLORS.background,
  },

  recommendationLabel: {
    fontSize: 10,

    fontWeight: '800',

    color:
      COLORS.muted,

    marginBottom: 3,
  },

  recommendationText: {
    fontSize: 12,

    lineHeight: 18,

    color:
      COLORS.text,
  },


  // ---------------------------------------------------
  // EXTRA INFO
  // ---------------------------------------------------

  extraInfoRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    marginTop: 10,
  },

  extraInfoText: {
    fontSize: 9,

    color:
      COLORS.muted,
  },


  // ---------------------------------------------------
  // FOOTER
  // ---------------------------------------------------

  footerCard: {
    backgroundColor:
      COLORS.white,

    borderRadius: 12,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    padding: 14,

    marginTop: 4,
  },

  footerTitle: {
    fontSize: 12,

    fontWeight: '800',

    color:
      COLORS.text,

    marginBottom: 5,
  },

  footerText: {
    fontSize: 11,

    lineHeight: 17,

    color:
      COLORS.muted,
  },

  bottomSpace: {
    height: 30,
  },

});