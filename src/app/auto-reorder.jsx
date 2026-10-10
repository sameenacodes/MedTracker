import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    getAutoReorderSuggestions,
    placeReorder,
} from '../services/api';


// =====================================================
// CONSTANTS
// =====================================================

const GREEN = '#176B52';
const GREEN_LIGHT = '#EAF5F1';
const RED = '#C62828';
const RED_LIGHT = '#FDECEC';
const AMBER = '#B7791F';
const AMBER_LIGHT = '#FFF6DF';
const TEXT = '#17201D';
const MUTED = '#68736F';
const BORDER = '#E4E9E6';
const BG = '#F7F9F8';


// =====================================================
// HELPERS
// =====================================================

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0';
  }

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(1);
};


const formatCurrency = (value) => {
  const number = Number(value) || 0;

  return `₹${number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
};


const formatDate = (value) => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};


const getPriorityColors = (priority) => {
  switch (priority) {
    case 'HIGH':
      return {
        text: RED,
        background: RED_LIGHT,
      };

    case 'MEDIUM':
      return {
        text: AMBER,
        background: AMBER_LIGHT,
      };

    default:
      return {
        text: GREEN,
        background: GREEN_LIGHT,
      };
  }
};


const getPriorityLabel = (priority) => {
  switch (priority) {
    case 'HIGH':
      return 'HIGH PRIORITY';

    case 'MEDIUM':
      return 'MEDIUM PRIORITY';

    default:
      return 'LOW PRIORITY';
  }
};


// =====================================================
// MAIN SCREEN
// =====================================================

export default function AutoReorder() {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState({
    totalMedicines: 0,
    needReorder: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
  });

  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [placingId, setPlacingId] = useState(null);


  // ===================================================
  // LOAD DATA
  // ===================================================

  const loadSuggestions = useCallback(async () => {
    try {
      const result = await getAutoReorderSuggestions();

      const list = Array.isArray(result?.suggestions)
        ? result.suggestions
        : [];

      setSuggestions(list);

      if (result?.summary) {
        setSummary({
          totalMedicines:
            Number(result.summary.totalMedicines) || 0,

          needReorder:
            Number(result.summary.needReorder) || 0,

          highPriority:
            Number(result.summary.highPriority) || 0,

          mediumPriority:
            Number(result.summary.mediumPriority) || 0,

          lowPriority:
            Number(result.summary.lowPriority) || 0,
        });
      }
    } catch (error) {
      console.log(
        'Auto reorder load error:',
        error?.message
      );

      Alert.alert(
        'Unable to load',
        error?.message ||
          'Failed to load auto reorder suggestions.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSuggestions();
    }, [loadSuggestions])
  );


  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSuggestions();
  };


  // ===================================================
  // PLACE ORDER
  // ===================================================

  const handlePlaceOrder = (item) => {
    const quantity = Number(item.reorderQuantity) || 0;

    if (!quantity || quantity <= 0) {
      Alert.alert(
        'Invalid quantity',
        'There is no valid reorder quantity for this medicine.'
      );

      return;
    }

    Alert.alert(
      'Place Reorder',
      `Order ${quantity} units of ${item.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Place Order',
          onPress: async () => {
            try {
              setPlacingId(String(item.medicineId));

              const result = await placeReorder(
                item.medicineId,
                quantity,
                item.priority || 'MEDIUM'
              );

              Alert.alert(
                'Order Placed',
                result?.message ||
                  `${quantity} units ordered successfully.`
              );

              await loadSuggestions();
            } catch (error) {
              Alert.alert(
                'Order Failed',
                error?.message ||
                  'Failed to place reorder.'
              );
            } finally {
              setPlacingId(null);
            }
          },
        },
      ]
    );
  };


  // ===================================================
  // FILTER
  // ===================================================

  const filteredSuggestions = suggestions.filter((item) => {
    if (filter === 'ALL') {
      return true;
    }

    return item.priority === filter;
  });


  // ===================================================
  // SUMMARY CARD
  // ===================================================

  const SummaryCard = ({
    label,
    value,
    type = 'default',
  }) => {
    let valueColor = TEXT;

    if (type === 'high') {
      valueColor = RED;
    }

    if (type === 'medium') {
      valueColor = AMBER;
    }

    if (type === 'green') {
      valueColor = GREEN;
    }

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          {label}
        </Text>

        <Text
          style={[
            styles.summaryValue,
            { color: valueColor },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  };


  // ===================================================
  // MEDICINE CARD
  // ===================================================

  const renderItem = ({ item }) => {
    const priorityColors =
      getPriorityColors(item.priority);

    const isPlacing =
      placingId === String(item.medicineId);

    const currentStock =
      Number(item.currentStock) || 0;

    const dailyAverage =
      Number(item.dailyAverage) || 0;

    const stockLasts =
      Number(item.stockLasts);

    const reorderQuantity =
      Number(item.reorderQuantity) || 0;

    return (
      <View style={styles.medicineCard}>

        {/* TOP ROW */}
        <View style={styles.cardTopRow}>
          <View style={styles.medicineTitleArea}>
            <Text
              style={styles.medicineName}
              numberOfLines={1}
            >
              {item.name || 'Unknown Medicine'}
            </Text>

            {!!item.brand && (
              <Text
                style={styles.brandText}
                numberOfLines={1}
              >
                {item.brand}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor:
                  priorityColors.background,
              },
            ]}
          >
            <View
              style={[
                styles.priorityDot,
                {
                  backgroundColor:
                    priorityColors.text,
                },
              ]}
            />

            <Text
              style={[
                styles.priorityText,
                {
                  color:
                    priorityColors.text,
                },
              ]}
            >
              {getPriorityLabel(item.priority)}
            </Text>
          </View>
        </View>


        {/* CATEGORY / BATCH */}
        <View style={styles.metaRow}>
          {!!item.category && (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>
                {item.category}
              </Text>
            </View>
          )}

          {!!item.batchNumber && (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>
                Batch: {item.batchNumber}
              </Text>
            </View>
          )}
        </View>


        {/* STOCK GRID */}
        <View style={styles.statsGrid}>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              Current Stock
            </Text>

            <Text style={styles.statValue}>
              {formatNumber(currentStock)}
            </Text>

            <Text style={styles.statUnit}>
              units
            </Text>
          </View>


          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              Daily Sales
            </Text>

            <Text style={styles.statValue}>
              {formatNumber(dailyAverage)}
            </Text>

            <Text style={styles.statUnit}>
              units/day
            </Text>
          </View>


          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              Stock Lasts
            </Text>

            <Text
              style={[
                styles.statValue,
                stockLasts <= 7 &&
                  styles.dangerValue,
              ]}
            >
              {Number.isFinite(stockLasts)
                ? `${Math.ceil(stockLasts)}`
                : '∞'}
            </Text>

            <Text style={styles.statUnit}>
              days
            </Text>
          </View>

        </View>


        {/* REORDER HIGHLIGHT */}
        <View style={styles.reorderBox}>
          <View style={styles.reorderLeft}>
            <Text style={styles.reorderTitle}>
              Suggested Reorder
            </Text>

            <Text style={styles.reorderDescription}>
              Based on recent 90-day sales
            </Text>
          </View>

          <View style={styles.reorderQuantityBox}>
            <Text style={styles.reorderQuantity}>
              {formatNumber(reorderQuantity)}
            </Text>

            <Text style={styles.reorderUnits}>
              units
            </Text>
          </View>
        </View>


        {/* DETAILS */}
        <View style={styles.detailsSection}>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Sold in last 90 days
            </Text>

            <Text style={styles.detailValue}>
              {formatNumber(item.soldLast90Days)}
            </Text>
          </View>


          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Monthly requirement
            </Text>

            <Text style={styles.detailValue}>
              {formatNumber(item.monthlyNeed)}
            </Text>
          </View>


          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Supplier
            </Text>

            <Text
              style={styles.detailValue}
              numberOfLines={1}
            >
              {item.supplier || 'Not specified'}
            </Text>
          </View>


          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Purchase price
            </Text>

            <Text style={styles.detailValue}>
              {formatCurrency(item.purchasePrice)}
            </Text>
          </View>


          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Expiry date
            </Text>

            <Text style={styles.detailValue}>
              {formatDate(item.expiryDate)}
            </Text>
          </View>

        </View>


        {/* ACTION */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isPlacing}
          onPress={() => handlePlaceOrder(item)}
          style={[
            styles.orderButton,
            isPlacing &&
              styles.orderButtonDisabled,
          ]}
        >
          {isPlacing ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text style={styles.orderButtonIcon}>
                +
              </Text>

              <Text style={styles.orderButtonText}>
                Place Order · {reorderQuantity} units
              </Text>
            </>
          )}
        </TouchableOpacity>

      </View>
    );
  };


  // ===================================================
  // HEADER
  // ===================================================

  const ListHeader = () => (
    <View>

      {/* TITLE */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleArea}>
          <Text style={styles.headerTitle}>
            Auto Reorder
          </Text>

          <Text style={styles.headerSubtitle}>
            Smart inventory replenishment
          </Text>
        </View>
      </View>


      {/* INTRO CARD */}
      <View style={styles.aiCard}>
        <View style={styles.aiIcon}>
          <Text style={styles.aiIconText}>
            AI
          </Text>
        </View>

        <View style={styles.aiContent}>
          <Text style={styles.aiTitle}>
            Smart Reorder Suggestions
          </Text>

          <Text style={styles.aiDescription}>
            Recommendations are calculated from your
            recent medicine sales and current stock.
          </Text>
        </View>
      </View>


      {/* SUMMARY */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryScroll}
      >
        <SummaryCard
          label="Need Reorder"
          value={summary.needReorder}
          type="green"
        />

        <SummaryCard
          label="High Priority"
          value={summary.highPriority}
          type="high"
        />

        <SummaryCard
          label="Medium"
          value={summary.mediumPriority}
          type="medium"
        />

        <SummaryCard
          label="Low Priority"
          value={summary.lowPriority}
        />
      </ScrollView>


      {/* FILTER */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>
          Suggestions
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >

          {[
            {
              key: 'ALL',
              label: 'All',
              count: suggestions.length,
            },
            {
              key: 'HIGH',
              label: 'High',
              count: summary.highPriority,
            },
            {
              key: 'MEDIUM',
              label: 'Medium',
              count: summary.mediumPriority,
            },
            {
              key: 'LOW',
              label: 'Low',
              count: summary.lowPriority,
            },
          ].map((option) => {
            const active =
              filter === option.key;

            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.8}
                onPress={() =>
                  setFilter(option.key)
                }
                style={[
                  styles.filterChip,
                  active &&
                    styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>

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
                    {option.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

        </ScrollView>
      </View>

    </View>
  );


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text style={styles.loadingText}>
            Analysing inventory...
          </Text>

          <Text style={styles.loadingSubtext}>
            Calculating smart reorder suggestions
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // ===================================================
  // MAIN
  // ===================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <FlatList
        data={filteredSuggestions}
        keyExtractor={(item, index) =>
          String(
            item.medicineId ||
            item._id ||
            index
          )
        }
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>

            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ✓
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No Reorders Needed
            </Text>

            <Text style={styles.emptyText}>
              {filter === 'ALL'
                ? 'Your current inventory does not require any reorder.'
                : `There are no ${filter.toLowerCase()} priority reorder suggestions.`}
            </Text>

          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  listContent: {
    paddingBottom: 40,
  },


  // ---------------------------------------------------
  // HEADER
  // ---------------------------------------------------

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 18 : 10,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F4F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backText: {
    fontSize: 32,
    lineHeight: 34,
    color: TEXT,
    marginTop: -3,
  },

  headerTitleArea: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: TEXT,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: MUTED,
  },


  // ---------------------------------------------------
  // AI CARD
  // ---------------------------------------------------

  aiCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: '#D6EAE3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  aiIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  aiIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  aiContent: {
    flex: 1,
  },

  aiTitle: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '800',
  },

  aiDescription: {
    color: '#52635E',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },


  // ---------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------

  summaryScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 5,
  },

  summaryCard: {
    width: 116,
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginRight: 10,
  },

  summaryLabel: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },

  summaryValue: {
    marginTop: 8,
    fontSize: 25,
    fontWeight: '800',
  },


  // ---------------------------------------------------
  // FILTER
  // ---------------------------------------------------

  filterSection: {
    paddingTop: 18,
    paddingBottom: 8,
  },

  filterTitle: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 10,
  },

  filterScroll: {
    paddingHorizontal: 16,
  },

  filterChip: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },

  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  filterCount: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#EEF1F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },

  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: MUTED,
  },

  filterCountTextActive: {
    color: '#FFFFFF',
  },


  // ---------------------------------------------------
  // MEDICINE CARD
  // ---------------------------------------------------

  medicineCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  medicineTitleArea: {
    flex: 1,
    paddingRight: 10,
  },

  medicineName: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
  },

  brandText: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED,
  },

  priorityBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  priorityText: {
    fontSize: 9,
    fontWeight: '900',
  },


  // ---------------------------------------------------
  // META
  // ---------------------------------------------------

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 11,
  },

  metaPill: {
    backgroundColor: '#F4F6F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 5,
  },

  metaText: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
  },


  // ---------------------------------------------------
  // STATS
  // ---------------------------------------------------

  statsGrid: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEF1EF',
    paddingVertical: 13,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EEF1EF',
  },

  statBoxLast: {
    borderRightWidth: 0,
  },

  statLabel: {
    fontSize: 9,
    color: MUTED,
    fontWeight: '600',
    textAlign: 'center',
  },

  statValue: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
  },

  dangerValue: {
    color: RED,
  },

  statUnit: {
    marginTop: 2,
    fontSize: 9,
    color: MUTED,
  },


  // ---------------------------------------------------
  // REORDER BOX
  // ---------------------------------------------------

  reorderBox: {
    marginTop: 13,
    padding: 13,
    borderRadius: 13,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: '#D8EAE4',
    flexDirection: 'row',
    alignItems: 'center',
  },

  reorderLeft: {
    flex: 1,
  },

  reorderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: GREEN,
  },

  reorderDescription: {
    marginTop: 3,
    fontSize: 10,
    color: '#60716B',
  },

  reorderQuantityBox: {
    alignItems: 'flex-end',
  },

  reorderQuantity: {
    fontSize: 23,
    fontWeight: '900',
    color: GREEN,
  },

  reorderUnits: {
    fontSize: 9,
    color: GREEN,
    fontWeight: '700',
  },


  // ---------------------------------------------------
  // DETAILS
  // ---------------------------------------------------

  detailsSection: {
    marginTop: 12,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  detailLabel: {
    flex: 1,
    fontSize: 11,
    color: MUTED,
  },

  detailValue: {
    maxWidth: '55%',
    fontSize: 11,
    color: TEXT,
    fontWeight: '700',
    textAlign: 'right',
  },


  // ---------------------------------------------------
  // BUTTON
  // ---------------------------------------------------

  orderButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: GREEN,
    marginTop: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  orderButtonDisabled: {
    opacity: 0.65,
  },

  orderButtonIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '400',
    marginRight: 7,
    marginTop: -2,
  },

  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },


  // ---------------------------------------------------
  // EMPTY
  // ---------------------------------------------------

  emptyState: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 45,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyIconText: {
    fontSize: 27,
    fontWeight: '800',
    color: GREEN,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    textAlign: 'center',
  },


  // ---------------------------------------------------
  // LOADING
  // ---------------------------------------------------

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: BG,
  },

  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },

  loadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
  },

});