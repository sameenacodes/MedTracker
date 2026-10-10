import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getExpiryRisk } from '../services/api';

const GREEN = '#176B52';
const RED = '#B33D38';
const AMBER = '#A66A00';
const ORANGE = '#C56A00';
const TEXT = '#17221D';
const MUTED = '#718078';
const BORDER = '#E3E9E5';
const LIGHT_GREEN = '#EDF6F2';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;

const getRiskStyle = (risk) => {
  switch (risk) {
    case 'CRITICAL':
      return {
        color: RED,
        background: '#FFF1F1',
        label: 'Critical',
      };

    case 'HIGH':
      return {
        color: ORANGE,
        background: '#FFF5EA',
        label: 'High',
      };

    case 'MEDIUM':
      return {
        color: AMBER,
        background: '#FFF9EC',
        label: 'Medium',
      };

    default:
      return {
        color: GREEN,
        background: '#EDF6F2',
        label: 'Low',
      };
  }
};

const formatDate = (date) => {
  if (!date) {
    return 'N/A';
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return 'N/A';
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

export default function ExpiryRisk() {
  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [data, setData] = useState({
    summary: {},
    items: [],
  });

  const [filter, setFilter] =
    useState('ALL');

  const [search, setSearch] =
    useState('');

  const [error, setError] =
    useState('');

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = useCallback(
    async () => {
      try {
        setError('');

        const result =
          await getExpiryRisk();

        setData({
          summary:
            result?.summary || {},

          items:
            Array.isArray(
              result?.items
            )
              ? result.items
              : [],
        });
      } catch (err) {
        console.error(
          'Expiry risk load error:',
          err
        );

        setError(
          err?.message ||
            'Unable to load expiry risk data.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // =====================================================
  // FILTER + SEARCH
  // =====================================================

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return data.items.filter(
        (item) => {
          const matchesFilter =
            filter === 'ALL' ||
            item.riskLevel ===
              filter;

          const matchesSearch =
            !query ||
            item.name
              ?.toLowerCase()
              .includes(query) ||
            item.brand
              ?.toLowerCase()
              .includes(query) ||
            item.batchNumber
              ?.toLowerCase()
              .includes(query) ||
            item.category
              ?.toLowerCase()
              .includes(query) ||
            item.supplier
              ?.toLowerCase()
              .includes(query);

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      data.items,
      filter,
      search,
    ]);

  const summary =
    data.summary || {};

  // =====================================================
  // UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={GREEN}
        />
      }
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text
            style={
              styles.headerIconText
            }
          >
            ER
          </Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Expiry Risk Prediction
          </Text>

          <Text style={styles.subtitle}>
            Identify medicines likely to
            remain unsold before expiry
          </Text>
        </View>
      </View>

      {/* =================================================
          INFO
      ================================================= */}

      <View style={styles.infoBox}>
        <View style={styles.infoIcon}>
          <Text
            style={
              styles.infoIconText
            }
          >
            i
          </Text>
        </View>

        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>
            How risk is calculated
          </Text>

          <Text style={styles.infoText}>
            The system uses the last 90
            days of sales to estimate
            how many units can be sold
            before the medicine expires.
          </Text>
        </View>
      </View>

      {/* =================================================
          ERROR
      ================================================= */}

      {error !== '' && (
        <View style={styles.errorBox}>
          <View
            style={
              styles.errorContent
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Unable to load data
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.retryText
              }
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* =================================================
          SUMMARY
      ================================================= */}

      <View style={styles.summaryGrid}>
        {/* Critical */}

        <View
          style={[
            styles.summaryCard,
            summary.criticalCount >
              0 &&
              styles.summaryCardDanger,
          ]}
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            Critical
          </Text>

          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  summary.criticalCount >
                  0
                    ? RED
                    : TEXT,
              },
            ]}
          >
            {summary.criticalCount ||
              0}
          </Text>

          <Text
            style={
              styles.summarySub
            }
          >
            Immediate action
          </Text>
        </View>

        {/* High */}

        <View
          style={[
            styles.summaryCard,
            summary.highCount >
              0 &&
              styles.summaryCardWarning,
          ]}
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            High Risk
          </Text>

          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  summary.highCount >
                  0
                    ? ORANGE
                    : TEXT,
              },
            ]}
          >
            {summary.highCount || 0}
          </Text>

          <Text
            style={
              styles.summarySub
            }
          >
            Needs attention
          </Text>
        </View>

        {/* Medium */}

        <View style={styles.summaryCard}>
          <Text
            style={
              styles.summaryLabel
            }
          >
            Medium Risk
          </Text>

          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  summary.mediumCount >
                  0
                    ? AMBER
                    : TEXT,
              },
            ]}
          >
            {summary.mediumCount ||
              0}
          </Text>

          <Text
            style={
              styles.summarySub
            }
          >
            Monitor closely
          </Text>
        </View>

        {/* Value */}

        <View style={styles.summaryCard}>
          <Text
            style={
              styles.summaryLabel
            }
          >
            Value at Risk
          </Text>

          <Text
            style={
              styles.summaryValueSmall
            }
          >
            {money(
              summary.totalValueAtRisk
            )}
          </Text>

          <Text
            style={
              styles.summarySub
            }
          >
            Expected leftover value
          </Text>
        </View>
      </View>

      {/* =================================================
          SEARCH
      ================================================= */}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search medicine, batch or supplier"
        placeholderTextColor="#9AA59F"
        style={styles.search}
      />

      {/* =================================================
          FILTERS
      ================================================= */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filterContainer
        }
      >
        {[
          'ALL',
          'CRITICAL',
          'HIGH',
          'MEDIUM',
          'LOW',
        ].map((item) => {
          const active =
            filter === item;

          const risk =
            getRiskStyle(item);

          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.filterButton,
                active &&
                  styles.filterButtonActive,
                active &&
                  item !== 'ALL' && {
                    backgroundColor:
                      risk.color,
                    borderColor:
                      risk.color,
                  },
              ]}
              onPress={() =>
                setFilter(item)
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterText,
                  active &&
                    styles.filterTextActive,
                ]}
              >
                {item === 'ALL'
                  ? 'All'
                  : risk.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* =================================================
          RESULTS HEADER
      ================================================= */}

      <View
        style={
          styles.resultsHeader
        }
      >
        <View>
          <Text
            style={
              styles.resultsTitle
            }
          >
            Risk Analysis
          </Text>

          <Text
            style={
              styles.resultsSubtitle
            }
          >
            {filteredItems.length}{' '}
            medicine
            {filteredItems.length !==
            1
              ? 's'
              : ''}{' '}
            found
          </Text>
        </View>

        <View
          style={
            styles.periodBadge
          }
        >
          <Text
            style={
              styles.periodText
            }
          >
            90-Day Sales
          </Text>
        </View>
      </View>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (
        <View
          style={
            styles.loadingBox
          }
        >
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Calculating expiry risk...
          </Text>
        </View>
      ) : filteredItems.length ===
        0 ? (
        /* ===============================================
           EMPTY
        =============================================== */

        <View
          style={
            styles.emptyBox
          }
        >
          <View
            style={
              styles.emptyIcon
            }
          >
            <Text
              style={
                styles.emptyIconText
              }
            >
              ✓
            </Text>
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No expiry risks found
          </Text>

          <Text
            style={
              styles.emptySubtitle
            }
          >
            No medicines match the
            selected risk level or search.
          </Text>
        </View>
      ) : (
        /* ===============================================
           MEDICINE LIST
        =============================================== */

        <View style={styles.list}>
          {filteredItems.map(
            (item) => {
              const risk =
                getRiskStyle(
                  item.riskLevel
                );

              return (
                <View
                  key={
                    item.id ||
                    item.medicineId
                  }
                  style={
                    styles.medicineCard
                  }
                >
                  {/* -------------------------------------
                      CARD HEADER
                  ------------------------------------- */}

                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <View
                      style={
                        styles.medicineInfo
                      }
                    >
                      <Text
                        style={
                          styles.medicineName
                        }
                      >
                        {item.name ||
                          'Unknown Medicine'}
                      </Text>

                      {item.brand ? (
                        <Text
                          style={
                            styles.brand
                          }
                        >
                          {item.brand}
                        </Text>
                      ) : null}

                      <Text
                        style={
                          styles.batch
                        }
                      >
                        Batch:{' '}
                        {item.batchNumber ||
                          'N/A'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.riskBadge,
                        {
                          backgroundColor:
                            risk.background,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.riskDot,
                          {
                            backgroundColor:
                              risk.color,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.riskText,
                          {
                            color:
                              risk.color,
                          },
                        ]}
                      >
                        {risk.label}
                      </Text>
                    </View>
                  </View>

                  {/* -------------------------------------
                      EXPIRY
                  ------------------------------------- */}

                  <View
                    style={
                      styles.expiryRow
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Expiry Date
                      </Text>

                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color:
                              item.daysLeft <=
                              30
                                ? risk.color
                                : TEXT,
                          },
                        ]}
                      >
                        {formatDate(
                          item.expiryDate
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.daysBox
                      }
                    >
                      <Text
                        style={
                          styles.daysNumber
                        }
                      >
                        {item.daysLeft <=
                        0
                          ? 'Expired'
                          : item.daysLeft}
                      </Text>

                      {item.daysLeft >
                        0 && (
                        <Text
                          style={
                            styles.daysLabel
                          }
                        >
                          days left
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* -------------------------------------
                      METRICS
                  ------------------------------------- */}

                  <View
                    style={
                      styles.metricsGrid
                    }
                  >
                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Current Stock
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {item.currentStock ||
                          0}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Sold / 90 Days
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {item.soldLast90Days ||
                          0}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metric
                      }
                    >
                      <Text
                        style={
                          styles.metricLabel
                        }
                      >
                        Daily Average
                      </Text>

                      <Text
                        style={
                          styles.metricValue
                        }
                      >
                        {Number(
                          item.dailyAverage ||
                            0
                        ).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* -------------------------------------
                      PREDICTION
                  ------------------------------------- */}

                  <View
                    style={
                      styles.predictionBox
                    }
                  >
                    <View
                      style={
                        styles.predictionRow
                      }
                    >
                      <Text
                        style={
                          styles.predictionLabel
                        }
                      >
                        Expected sales
                        before expiry
                      </Text>

                      <Text
                        style={
                          styles.predictionValue
                        }
                      >
                        {
                          item.expectedSalesBeforeExpiry
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.predictionRow
                      }
                    >
                      <Text
                        style={
                          styles.predictionLabel
                        }
                      >
                        Expected leftover
                      </Text>

                      <Text
                        style={[
                          styles.predictionValue,
                          {
                            color:
                              risk.color,
                          },
                        ]}
                      >
                        {item.expectedLeftover}{' '}
                        units
                      </Text>
                    </View>

                    <View
                      style={
                        styles.predictionRow
                      }
                    >
                      <Text
                        style={
                          styles.predictionLabel
                        }
                      >
                        Leftover percentage
                      </Text>

                      <Text
                        style={
                          styles.predictionValue
                        }
                      >
                        {
                          item.leftoverPercentage
                        }
                        %
                      </Text>
                    </View>

                    <View
                      style={
                        styles.predictionRow
                      }
                    >
                      <Text
                        style={
                          styles.predictionLabel
                        }
                      >
                        Value at risk
                      </Text>

                      <Text
                        style={[
                          styles.predictionValue,
                          {
                            color:
                              risk.color,
                          },
                        ]}
                      >
                        {money(
                          item.stockValueAtRisk
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* -------------------------------------
                      STOCK BAR
                  ------------------------------------- */}

                  <View
                    style={
                      styles.progressSection
                    }
                  >
                    <View
                      style={
                        styles.progressHeader
                      }
                    >
                      <Text
                        style={
                          styles.progressLabel
                        }
                      >
                        Expected leftover
                      </Text>

                      <Text
                        style={[
                          styles.progressPercent,
                          {
                            color:
                              risk.color,
                          },
                        ]}
                      >
                        {
                          item.leftoverPercentage
                        }
                        %
                      </Text>
                    </View>

                    <View
                      style={
                        styles.progressTrack
                      }
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              Number(
                                item.leftoverPercentage ||
                                  0
                              ),
                              100
                            )}%`,
                            backgroundColor:
                              risk.color,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* -------------------------------------
                      LOCATION
                  ------------------------------------- */}

                  {(item.rackNumber ||
                    item.shelfNumber ||
                    item.boxNumber) && (
                    <View
                      style={
                        styles.locationBox
                      }
                    >
                      <Text
                        style={
                          styles.locationTitle
                        }
                      >
                        Storage Location
                      </Text>

                      <Text
                        style={
                          styles.locationText
                        }
                      >
                        Rack:{' '}
                        {item.rackNumber ||
                          'N/A'}
                        {'  '}|{'  '}
                        Shelf:{' '}
                        {item.shelfNumber ||
                          'N/A'}
                        {'  '}|{'  '}
                        Box:{' '}
                        {item.boxNumber ||
                          'N/A'}
                      </Text>
                    </View>
                  )}

                  {/* -------------------------------------
                      RECOMMENDATION
                  ------------------------------------- */}

                  <View
                    style={[
                      styles.recommendationBox,
                      {
                        borderLeftColor:
                          risk.color,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.recommendationTitle
                      }
                    >
                      Recommended Action
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
                </View>
              );
            }
          )}
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F7F9F8',
    },

    content: {
      padding: 18,
      paddingBottom: 40,
    },

    // =================================================
    // HEADER
    // =================================================

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },

    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: LIGHT_GREEN,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    headerIconText: {
      color: GREEN,
      fontSize: 14,
      fontWeight: '800',
    },

    headerText: {
      flex: 1,
    },

    title: {
      color: TEXT,
      fontSize: 20,
      fontWeight: '800',
    },

    subtitle: {
      color: MUTED,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 3,
    },

    // =================================================
    // INFO
    // =================================================

    infoBox: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#CFE1D9',
      borderRadius: 13,
      padding: 14,
      marginBottom: 16,
    },

    infoIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: LIGHT_GREEN,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    infoIconText: {
      color: GREEN,
      fontWeight: '800',
    },

    infoContent: {
      flex: 1,
    },

    infoTitle: {
      color: TEXT,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
    },

    infoText: {
      color: MUTED,
      fontSize: 11,
      lineHeight: 17,
    },

    // =================================================
    // ERROR
    // =================================================

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF3F3',
      borderWidth: 1,
      borderColor: '#E7C6C4',
      borderRadius: 12,
      padding: 13,
      marginBottom: 16,
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      color: RED,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 3,
    },

    errorText: {
      color: '#7F4B48',
      fontSize: 11,
    },

    retryButton: {
      backgroundColor: RED,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginLeft: 10,
    },

    retryText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },

    // =================================================
    // SUMMARY
    // =================================================

    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
    },

    summaryCard: {
      width: '48.5%',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 12,
      padding: 13,
      marginBottom: 10,
    },

    summaryCardDanger: {
      borderColor: '#E7C6C4',
    },

    summaryCardWarning: {
      borderColor: '#EAD9B5',
    },

    summaryLabel: {
      color: MUTED,
      fontSize: 11,
      fontWeight: '600',
    },

    summaryValue: {
      color: TEXT,
      fontSize: 25,
      fontWeight: '800',
      marginTop: 6,
    },

    summaryValueSmall: {
      color: GREEN,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 10,
    },

    summarySub: {
      color: '#8A948E',
      fontSize: 10,
      marginTop: 4,
    },

    // =================================================
    // SEARCH
    // =================================================

    search: {
      height: 46,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 11,
      paddingHorizontal: 14,
      color: TEXT,
      fontSize: 12,
      marginBottom: 12,
    },

    // =================================================
    // FILTER
    // =================================================

    filterContainer: {
      paddingBottom: 16,
      gap: 8,
    },

    filterButton: {
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },

    filterButtonActive: {
      backgroundColor: GREEN,
      borderColor: GREEN,
    },

    filterText: {
      color: MUTED,
      fontSize: 11,
      fontWeight: '700',
    },

    filterTextActive: {
      color: '#FFFFFF',
    },

    // =================================================
    // RESULTS
    // =================================================

    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

    resultsTitle: {
      color: TEXT,
      fontSize: 16,
      fontWeight: '800',
    },

    resultsSubtitle: {
      color: MUTED,
      fontSize: 11,
      marginTop: 3,
    },

    periodBadge: {
      backgroundColor: LIGHT_GREEN,
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },

    periodText: {
      color: GREEN,
      fontSize: 10,
      fontWeight: '700',
    },

    // =================================================
    // LOADING
    // =================================================

    loadingBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 13,
      borderWidth: 1,
      borderColor: BORDER,
      paddingVertical: 40,
      alignItems: 'center',
    },

    loadingText: {
      color: MUTED,
      fontSize: 12,
      marginTop: 10,
    },

    // =================================================
    // EMPTY
    // =================================================

    emptyBox: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 14,
      padding: 28,
      alignItems: 'center',
    },

    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: LIGHT_GREEN,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },

    emptyIconText: {
      color: GREEN,
      fontSize: 24,
      fontWeight: '800',
    },

    emptyTitle: {
      color: TEXT,
      fontSize: 15,
      fontWeight: '800',
    },

    emptySubtitle: {
      color: MUTED,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 5,
    },

    // =================================================
    // LIST
    // =================================================

    list: {
      gap: 12,
    },

    medicineCard: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: 14,
      padding: 14,
    },

    // =================================================
    // CARD HEADER
    // =================================================

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    medicineInfo: {
      flex: 1,
      paddingRight: 10,
    },

    medicineName: {
      color: TEXT,
      fontSize: 15,
      fontWeight: '800',
    },

    brand: {
      color: MUTED,
      fontSize: 11,
      marginTop: 3,
    },

    batch: {
      color: '#8A948E',
      fontSize: 10,
      marginTop: 5,
    },

    riskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    riskDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },

    riskText: {
      fontSize: 10,
      fontWeight: '800',
    },

    // =================================================
    // EXPIRY
    // =================================================

    expiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F8FAF9',
      borderRadius: 10,
      padding: 11,
      marginBottom: 12,
    },

    detailLabel: {
      color: MUTED,
      fontSize: 10,
      marginBottom: 4,
    },

    detailValue: {
      fontSize: 13,
      fontWeight: '700',
    },

    daysBox: {
      alignItems: 'flex-end',
    },

    daysNumber: {
      color: TEXT,
      fontSize: 15,
      fontWeight: '800',
    },

    daysLabel: {
      color: MUTED,
      fontSize: 9,
      marginTop: 2,
    },

    // =================================================
    // METRICS
    // =================================================

    metricsGrid: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingBottom: 12,
      marginBottom: 12,
    },

    metric: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: BORDER,
      paddingHorizontal: 8,
    },

    metric:{
      flex: 1,
      paddingLeft: 0,
    },
    

    metricLabel: {
      color: MUTED,
      fontSize: 9,
      marginBottom: 5,
    },

    metricValue: {
      color: TEXT,
      fontSize: 14,
      fontWeight: '800',
    },

    // =================================================
    // PREDICTION
    // =================================================

    predictionBox: {
      backgroundColor: '#F8FAF9',
      borderRadius: 10,
      padding: 11,
      marginBottom: 12,
    },

    predictionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },

    predictionLabel: {
      color: MUTED,
      fontSize: 10,
    },

    predictionValue: {
      color: TEXT,
      fontSize: 11,
      fontWeight: '800',
    },

    // =================================================
    // PROGRESS
    // =================================================

    progressSection: {
      marginBottom: 12,
    },

    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },

    progressLabel: {
      color: MUTED,
      fontSize: 10,
    },

    progressPercent: {
      fontSize: 10,
      fontWeight: '800',
    },

    progressTrack: {
      height: 7,
      backgroundColor: '#E9EEEB',
      borderRadius: 10,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      borderRadius: 10,
    },

    // =================================================
    // LOCATION
    // =================================================

    locationBox: {
      backgroundColor: LIGHT_GREEN,
      borderRadius: 9,
      padding: 10,
      marginBottom: 10,
    },

    locationTitle: {
      color: GREEN,
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 4,
    },

    locationText: {
      color: '#4F6259',
      fontSize: 10,
    },

    // =================================================
    // RECOMMENDATION
    // =================================================

    recommendationBox: {
      backgroundColor: '#FAFBFA',
      borderLeftWidth: 3,
      borderRadius: 5,
      padding: 10,
    },

    recommendationTitle: {
      color: TEXT,
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 4,
    },

    recommendationText: {
      color: MUTED,
      fontSize: 10,
      lineHeight: 16,
    },
  });