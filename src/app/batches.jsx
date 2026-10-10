import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    useFocusEffect,
    useRouter,
} from 'expo-router';

import {
    getBatches,
} from '../services/api';


const GREEN = '#176B52';
const LIGHT_GREEN = '#EAF5F0';
const BORDER = '#E1E8E4';
const TEXT = '#17201C';
const MUTED = '#718078';

const RED = '#C62828';
const LIGHT_RED = '#FDECEC';

const AMBER = '#B7791F';
const LIGHT_AMBER = '#FFF5E6';


export default function Batches() {
  const router =
    useRouter();


  const [batches, setBatches] =
    useState([]);

  const [summary, setSummary] =
    useState({
      totalBatches: 0,
      totalStock: 0,
      expired: 0,
      critical: 0,
      warning: 0,
      caution: 0,
      safe: 0,
      outOfStock: 0,
    });


  const [search, setSearch] =
    useState('');

  const [activeFilter, setActiveFilter] =
    useState('ALL');


  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');


  // =====================================================
  // LOAD
  // =====================================================

  const loadBatches =
    useCallback(
      async () => {
        try {
          setError('');

          const result =
            await getBatches();

          setBatches(
            Array.isArray(
              result?.batches
            )
              ? result.batches
              : []
          );

          setSummary(
            result?.summary ||
            {}
          );
        } catch (err) {
          console.log(
            'Batch screen error:',
            err
          );

          setError(
            err.message ||
            'Failed to load batches'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  useFocusEffect(
    useCallback(() => {
      loadBatches();
    }, [loadBatches])
  );


  const handleRefresh =
    () => {
      setRefreshing(true);
      loadBatches();
    };


  // =====================================================
  // FILTER
  // =====================================================

  const filteredBatches =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();


      return batches.filter(
        batch => {
          const matchesSearch =
            !query ||
            String(
              batch.name || ''
            )
              .toLowerCase()
              .includes(query) ||

            String(
              batch.brand || ''
            )
              .toLowerCase()
              .includes(query) ||

            String(
              batch.batchNumber || ''
            )
              .toLowerCase()
              .includes(query) ||

            String(
              batch.supplier || ''
            )
              .toLowerCase()
              .includes(query);


          if (!matchesSearch) {
            return false;
          }


          if (
            activeFilter ===
            'ALL'
          ) {
            return true;
          }


          return (
            batch.status ===
            activeFilter
          );
        }
      );
    }, [
      batches,
      search,
      activeFilter,
    ]);


  // =====================================================
  // DATE
  // =====================================================

  const formatDate =
    date => {
      if (!date) {
        return '—';
      }

      const d =
        new Date(date);

      if (
        Number.isNaN(
          d.getTime()
        )
      ) {
        return '—';
      }

      return d.toLocaleDateString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }
      );
    };


  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle =
    status => {
      switch (status) {
        case 'EXPIRED':
          return {
            background:
              LIGHT_RED,
            color: RED,
          };

        case 'CRITICAL':
        case 'WARNING':
          return {
            background:
              LIGHT_AMBER,
            color: AMBER,
          };

        case 'CAUTION':
          return {
            background:
              '#FFF9E8',
            color: AMBER,
          };

        case 'OUT_OF_STOCK':
          return {
            background:
              LIGHT_RED,
            color: RED,
          };

        default:
          return {
            background:
              LIGHT_GREEN,
            color: GREEN,
          };
      }
    };


  // =====================================================
  // FILTER BUTTON
  // =====================================================

  const FilterButton =
    ({
      label,
      value,
      count,
    }) => {
      const active =
        activeFilter === value;

      return (
        <TouchableOpacity
          style={[
            styles.filterButton,
            active &&
              styles.filterButtonActive,
          ]}
          onPress={() =>
            setActiveFilter(value)
          }
        >
          <Text
            style={[
              styles.filterText,
              active &&
                styles.filterTextActive,
            ]}
          >
            {label}
          </Text>

          {count !== undefined ? (
            <View
              style={[
                styles.filterCount,
                active &&
                  styles.filterCountActive,
              ]}
            >
              <Text
                style={[
                  styles.filterCountText,
                  active &&
                    styles.filterCountTextActive,
                ]}
              >
                {count}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );
    };


  // =====================================================
  // BATCH CARD
  // =====================================================

  const renderBatch =
    batch => {
      const statusStyle =
        getStatusStyle(
          batch.status
        );


      const daysLeft =
        batch.daysLeft;


      const daysText =
        daysLeft === null ||
        daysLeft === undefined
          ? 'Expiry unknown'
          : daysLeft < 0
          ? `${Math.abs(
              daysLeft
            )} days expired`
          : daysLeft === 0
          ? 'Expires today'
          : `${daysLeft} days left`;


      return (
        <View
          key={String(
            batch._id
          )}
          style={styles.batchCard}
        >
          {/* TOP */}

          <View
            style={styles.batchTop}
          >
            <View
              style={styles.batchIcon}
            >
              <Text
                style={
                  styles.batchIconText
                }
              >
                B
              </Text>
            </View>


            <View
              style={
                styles.batchTitleArea
              }
            >
              <Text
                style={
                  styles.medicineName
                }
                numberOfLines={1}
              >
                {batch.name ||
                  'Unnamed Medicine'}
              </Text>

              {batch.brand ? (
                <Text
                  style={styles.brand}
                  numberOfLines={1}
                >
                  {batch.brand}
                </Text>
              ) : null}
            </View>


            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    statusStyle.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      statusStyle.color,
                  },
                ]}
              >
                {batch.status ||
                  'UNKNOWN'}
              </Text>
            </View>
          </View>


          {/* BATCH */}

          <View
            style={styles.batchNumberBox}
          >
            <Text
              style={
                styles.batchNumberLabel
              }
            >
              BATCH NUMBER
            </Text>

            <Text
              style={
                styles.batchNumber
              }
            >
              {batch.batchNumber ||
                'Not available'}
            </Text>
          </View>


          {/* STOCK GRID */}

          <View
            style={styles.stockGrid}
          >
            <InfoBox
              label="Current Stock"
              value={`${batch.currentStock || 0}`}
            />

            <InfoBox
              label="Sold"
              value={`${batch.soldQuantity || 0}`}
            />

            <InfoBox
              label="Days Left"
              value={
                daysLeft === null ||
                daysLeft === undefined
                  ? '—'
                  : `${daysLeft}`
              }
            />
          </View>


          {/* EXPIRY */}

          <View
            style={styles.expiryRow}
          >
            <View>
              <Text
                style={
                  styles.smallLabel
                }
              >
                EXPIRY DATE
              </Text>

              <Text
                style={
                  styles.expiryDate
                }
              >
                {formatDate(
                  batch.expiryDate
                )}
              </Text>
            </View>


            <View
              style={
                styles.daysBadge
              }
            >
              <Text
                style={
                  styles.daysBadgeText
                }
              >
                {daysText}
              </Text>
            </View>
          </View>


          {/* LOCATION */}

          {(batch.rackNumber ||
            batch.shelfNumber ||
            batch.boxNumber) ? (
            <View
              style={
                styles.locationBox
              }
            >
              <Text
                style={
                  styles.smallLabel
                }
              >
                LOCATION
              </Text>

              <Text
                style={
                  styles.locationText
                }
              >
                Rack{' '}
                {batch.rackNumber ||
                  '—'}
                {'  '}→{'  '}
                Shelf{' '}
                {batch.shelfNumber ||
                  '—'}
                {'  '}→{'  '}
                Box{' '}
                {batch.boxNumber ||
                  '—'}
              </Text>
            </View>
          ) : null}


          {/* SUPPLIER */}

          {batch.supplier ? (
            <View
              style={
                styles.supplierRow
              }
            >
              <Text
                style={
                  styles.smallLabel
                }
              >
                SUPPLIER
              </Text>

              <Text
                style={
                  styles.supplierText
                }
              >
                {batch.supplier}
              </Text>
            </View>
          ) : null}


          {/* FEFO */}

          {batch.currentStock >
            0 &&
          batch.status !==
            'EXPIRED' ? (
            <View
              style={
                styles.fefoBanner
              }
            >
              <Text
                style={
                  styles.fefoIcon
                }
              >
                FEFO
              </Text>

              <Text
                style={
                  styles.fefoText
                }
              >
                Earlier expiry batches
                should be sold first.
              </Text>
            </View>
          ) : null}
        </View>
      );
    };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={styles.center}
        >
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text
            style={styles.loadingText}
          >
            Loading batch inventory...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View
        style={styles.container}
      >
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backText}
            >
              ‹
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.headerContent
            }
          >
            <Text
              style={styles.title}
            >
              Batch Tracking
            </Text>

            <Text
              style={styles.subtitle}
            >
              Track stock and expiry batch-wise
            </Text>
          </View>
        </View>


        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              tintColor={GREEN}
              colors={[GREEN]}
            />
          }
          contentContainerStyle={
            styles.content
          }
        >
          {/* SUMMARY */}

          <View
            style={styles.summaryGrid}
          >
            <SummaryCard
              label="Batches"
              value={
                summary.totalBatches ||
                0
              }
            />

            <SummaryCard
              label="Total Stock"
              value={
                summary.totalStock ||
                0
              }
            />

            <SummaryCard
              label="Expired"
              value={
                summary.expired ||
                0
              }
              danger
            />

            <SummaryCard
              label="Critical"
              value={
                summary.critical ||
                0
              }
              warning
            />
          </View>


          {/* SEARCH */}

          <View
            style={styles.searchCard}
          >
            <Text
              style={
                styles.searchLabel
              }
            >
              Search Batches
            </Text>

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Medicine, batch, brand or supplier..."
              placeholderTextColor="#9AA59F"
              style={
                styles.searchInput
              }
            />
          </View>


          {/* FILTERS */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            <FilterButton
              label="All"
              value="ALL"
              count={
                summary.totalBatches
              }
            />

            <FilterButton
              label="Expired"
              value="EXPIRED"
              count={
                summary.expired
              }
            />

            <FilterButton
              label="Critical"
              value="CRITICAL"
              count={
                summary.critical
              }
            />

            <FilterButton
              label="Warning"
              value="WARNING"
              count={
                summary.warning
              }
            />

            <FilterButton
              label="Caution"
              value="CAUTION"
              count={
                summary.caution
              }
            />

            <FilterButton
              label="Safe"
              value="SAFE"
              count={
                summary.safe
              }
            />

            <FilterButton
              label="Out of Stock"
              value="OUT_OF_STOCK"
              count={
                summary.outOfStock
              }
            />
          </ScrollView>


          {/* RESULT HEADER */}

          <View
            style={
              styles.resultHeader
            }
          >
            <View>
              <Text
                style={
                  styles.resultTitle
                }
              >
                Batch Inventory
              </Text>

              <Text
                style={
                  styles.resultSubtitle
                }
              >
                {filteredBatches.length}{' '}
                batch
                {filteredBatches.length ===
                1
                  ? ''
                  : 'es'} found
              </Text>
            </View>

            <View
              style={
                styles.fefoHeaderBadge
              }
            >
              <Text
                style={
                  styles.fefoHeaderText
                }
              >
                FEFO
              </Text>
            </View>
          </View>


          {/* ERROR */}

          {error ? (
            <View
              style={styles.errorCard}
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Unable to load batches
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>

              <TouchableOpacity
                style={
                  styles.retryButton
                }
                onPress={
                  loadBatches
                }
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}


          {/* BATCHES */}

          {!error &&
          filteredBatches.length >
            0 ? (
            filteredBatches.map(
              renderBatch
            )
          ) : !error ? (
            <View
              style={
                styles.emptyCard
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
                  B
                </Text>
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No batches found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Try another search or
                filter.
              </Text>

              {search ||
              activeFilter !==
                'ALL' ? (
                <TouchableOpacity
                  style={
                    styles.clearButton
                  }
                  onPress={() => {
                    setSearch('');
                    setActiveFilter(
                      'ALL'
                    );
                  }}
                >
                  <Text
                    style={
                      styles.clearButtonText
                    }
                  >
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}


// =====================================================
// INFO BOX
// =====================================================

function InfoBox({
  label,
  value,
}) {
  return (
    <View
      style={styles.infoBox}
    >
      <Text
        style={styles.infoLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.infoValue}
      >
        {value}
      </Text>
    </View>
  );
}


// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  label,
  value,
  danger,
  warning,
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        danger &&
          styles.summaryDanger,
        warning &&
          styles.summaryWarning,
      ]}
    >
      <Text
        style={styles.summaryValue}
      >
        {value}
      </Text>

      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>
    </View>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        '#F7F9F8',
    },

    container: {
      flex: 1,
    },

    center: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 12,
      color: MUTED,
      fontSize: 14,
    },

    header: {
      height: 72,
      backgroundColor:
        '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor:
        BORDER,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        16,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#F1F5F3',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    backText: {
      fontSize: 32,
      color: TEXT,
      marginTop: -3,
    },

    headerContent: {
      flex: 1,
      marginLeft: 12,
    },

    title: {
      fontSize: 20,
      fontWeight: '800',
      color: TEXT,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 12,
      color: MUTED,
    },

    content: {
      padding: 16,
      paddingBottom: 40,
    },

    summaryGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 10,
      marginBottom: 14,
    },

    summaryCard: {
      width: '48%',
      minHeight: 82,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        BORDER,
      borderRadius: 14,
      padding: 13,
    },

    summaryDanger: {
      backgroundColor:
        LIGHT_RED,
      borderColor:
        '#F3D1D1',
    },

    summaryWarning: {
      backgroundColor:
        LIGHT_AMBER,
      borderColor:
        '#F0DFC1',
    },

    summaryValue: {
      fontSize: 22,
      fontWeight: '800',
      color: TEXT,
    },

    summaryLabel: {
      marginTop: 4,
      fontSize: 11,
      color: MUTED,
      fontWeight: '700',
    },

    searchCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        BORDER,
      padding: 15,
      marginBottom: 12,
    },

    searchLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: TEXT,
      marginBottom: 8,
    },

    searchInput: {
      height: 48,
      borderWidth: 1,
      borderColor:
        BORDER,
      borderRadius: 11,
      paddingHorizontal:
        13,
      color: TEXT,
      fontSize: 13,
      backgroundColor:
        '#FAFCFB',
    },

    filters: {
      gap: 8,
      paddingBottom: 15,
    },

    filterButton: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 7,
      paddingHorizontal:
        13,
      paddingVertical:
        9,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        BORDER,
      backgroundColor:
        '#FFFFFF',
    },

    filterButtonActive: {
      backgroundColor:
        GREEN,
      borderColor:
        GREEN,
    },

    filterText: {
      fontSize: 12,
      color: TEXT,
      fontWeight: '700',
    },

    filterTextActive: {
      color: '#FFFFFF',
    },

    filterCount: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor:
        '#EEF2F0',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    filterCountActive: {
      backgroundColor:
        'rgba(255,255,255,0.2)',
    },

    filterCountText: {
      fontSize: 9,
      color: MUTED,
      fontWeight: '800',
    },

    filterCountTextActive: {
      color: '#FFFFFF',
    },

    resultHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 12,
    },

    resultTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: TEXT,
    },

    resultSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: MUTED,
    },

    fefoHeaderBadge: {
      backgroundColor:
        LIGHT_GREEN,
      borderRadius: 9,
      paddingHorizontal:
        10,
      paddingVertical:
        6,
    },

    fefoHeaderText: {
      fontSize: 10,
      fontWeight: '800',
      color: GREEN,
    },

    batchCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        BORDER,
      padding: 15,
      marginBottom: 12,
    },

    batchTop: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    batchIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor:
        LIGHT_GREEN,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 11,
    },

    batchIconText: {
      color: GREEN,
      fontSize: 17,
      fontWeight: '800',
    },

    batchTitleArea: {
      flex: 1,
      marginRight: 8,
    },

    medicineName: {
      fontSize: 15,
      fontWeight: '800',
      color: TEXT,
    },

    brand: {
      marginTop: 3,
      fontSize: 11,
      color: MUTED,
    },

    statusBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    statusText: {
      fontSize: 9,
      fontWeight: '800',
    },

    batchNumberBox: {
      marginTop: 13,
      padding: 11,
      backgroundColor:
        '#F7F9F8',
      borderRadius: 10,
    },

    batchNumberLabel: {
      fontSize: 9,
      color: MUTED,
      fontWeight: '800',
      letterSpacing: 0.6,
    },

    batchNumber: {
      marginTop: 4,
      fontSize: 14,
      color: TEXT,
      fontWeight: '800',
    },

    stockGrid: {
      flexDirection:
        'row',
      gap: 8,
      marginTop: 10,
    },

    infoBox: {
      flex: 1,
      backgroundColor:
        '#FAFCFB',
      borderRadius: 10,
      padding: 10,
    },

    infoLabel: {
      fontSize: 9,
      color: MUTED,
      fontWeight: '700',
    },

    infoValue: {
      marginTop: 4,
      fontSize: 15,
      color: TEXT,
      fontWeight: '800',
    },

    expiryRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        '#EEF2F0',
    },

    smallLabel: {
      fontSize: 9,
      color: MUTED,
      fontWeight: '800',
      letterSpacing: 0.5,
    },

    expiryDate: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '800',
      color: TEXT,
    },

    daysBadge: {
      backgroundColor:
        '#F7F9F8',
      borderRadius: 9,
      paddingHorizontal:
        9,
      paddingVertical:
        7,
    },

    daysBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: MUTED,
    },

    locationBox: {
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor:
        LIGHT_GREEN,
    },

    locationText: {
      marginTop: 4,
      fontSize: 11,
      color: GREEN,
      fontWeight: '700',
    },

    supplierRow: {
      marginTop: 10,
    },

    supplierText: {
      marginTop: 4,
      fontSize: 12,
      color: TEXT,
      fontWeight: '600',
    },

    fefoBanner: {
      marginTop: 11,
      padding: 9,
      borderRadius: 9,
      backgroundColor:
        '#F7F9F8',
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    fefoIcon: {
      fontSize: 9,
      fontWeight: '900',
      color: GREEN,
      marginRight: 8,
    },

    fefoText: {
      flex: 1,
      fontSize: 10,
      color: MUTED,
    },

    errorCard: {
      backgroundColor:
        LIGHT_RED,
      borderRadius: 14,
      padding: 15,
      marginBottom: 12,
    },

    errorTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: RED,
    },

    errorText: {
      marginTop: 5,
      fontSize: 12,
      color: '#7A3030',
    },

    retryButton: {
      alignSelf:
        'flex-start',
      marginTop: 11,
      backgroundColor:
        RED,
      paddingHorizontal:
        14,
      paddingVertical:
        9,
      borderRadius: 9,
    },

    retryText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    emptyCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        BORDER,
      padding: 28,
      alignItems:
        'center',
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        LIGHT_GREEN,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyIconText: {
      fontSize: 22,
      fontWeight: '800',
      color: GREEN,
    },

    emptyTitle: {
      marginTop: 13,
      fontSize: 17,
      fontWeight: '800',
      color: TEXT,
    },

    emptyText: {
      marginTop: 5,
      fontSize: 12,
      color: MUTED,
      textAlign: 'center',
    },

    clearButton: {
      marginTop: 15,
      backgroundColor:
        GREEN,
      borderRadius: 9,
      paddingHorizontal:
        16,
      paddingVertical:
        9,
    },

    clearButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
  });