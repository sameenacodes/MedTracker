import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  createReorderOrder,
  getAIReorderSuggestions,
} from '../services/api';

export default function Reorder() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');

  const [summary, setSummary] = useState({
    totalMedicines: 0,
    needReorder: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
  });

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);

      const result = await getAIReorderSuggestions();

      setSummary({
        totalMedicines: result?.summary?.totalMedicines || 0,
        needReorder: result?.summary?.needReorder || 0,
        highPriority: result?.summary?.highPriority || 0,
        mediumPriority: result?.summary?.mediumPriority || 0,
        lowPriority: result?.summary?.lowPriority || 0,
      });

      setSuggestions(
        Array.isArray(result?.suggestions) ? result.suggestions : []
      );
    } catch (error) {
      console.log('AI Reorder Error:', error);
      setSuggestions([]);
      Alert.alert(
        'AI Reorder Error',
        error?.message || 'Unable to load reorder suggestions.'
      );
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = (priority) => {
    if (priority === 'HIGH') return '#C62828';
    if (priority === 'MEDIUM') return '#B7791F';
    return '#176B52';
  };

  const priorityBackground = (priority) => {
    if (priority === 'HIGH') return '#FDECEC';
    if (priority === 'MEDIUM') return '#FFF7E6';
    return '#EAF5F1';
  };

  const handleOrder = (item) => {
    Alert.alert(
      'Place Order',
      `Medicine: ${item.name}\n\n` +
        `Quantity: ${item.reorderQuantity} units\n\n` +
        `Supplier: ${item.supplier || 'Not specified'}\n\n` +
        'Do you want to place this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place Order',
          onPress: () => placeOrder(item),
        },
      ]
    );
  };

  const placeOrder = async (item) => {
    try {
      setOrdering(true);

      if (!item?.medicineId) {
        throw new Error('Medicine ID is missing.');
      }

      const quantity = Number(item.reorderQuantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Invalid reorder quantity.');
      }

      const result = await createReorderOrder(
        item.medicineId,
        quantity,
        item.priority || 'MEDIUM'
      );

      console.log('Reorder created:', result);

      setMessage(
        `Order placed — ${quantity} units of ${item.name}`
      );

      // Remove only this medicine from the AI suggestion list.
      setSuggestions((previous) =>
        previous.filter(
          (suggestion) => suggestion.medicineId !== item.medicineId
        )
      );

      setSummary((previous) => ({
        ...previous,
        needReorder: Math.max(0, previous.needReorder - 1),
        highPriority:
          item.priority === 'HIGH'
            ? Math.max(0, previous.highPriority - 1)
            : previous.highPriority,
        mediumPriority:
          item.priority === 'MEDIUM'
            ? Math.max(0, previous.mediumPriority - 1)
            : previous.mediumPriority,
        lowPriority:
          item.priority === 'LOW'
            ? Math.max(0, previous.lowPriority - 1)
            : previous.lowPriority,
      }));

      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      console.log('Place Order Error:', error);
      Alert.alert(
        'Order Failed',
        error?.message || 'Unable to place order.'
      );
    } finally {
      setOrdering(false);
    }
  };

  const SummaryCard = ({ value, label, accent }) => (
    <View style={[styles.summaryCard, { borderTopColor: accent }]}>
      <Text style={[styles.summaryValue, { color: accent }]}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Reorder</Text>
          <Text style={styles.headerSubtitle}>
            Smart inventory planning
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchSuggestions}
          disabled={loading || ordering}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {message !== '' && (
        <View style={styles.messageBanner}>
          <View style={styles.successDot} />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.aiCard}>
          <View style={styles.aiIconBox}>
            <Text style={styles.aiIcon}>AI</Text>
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>AI Reorder Engine</Text>
            <Text style={styles.aiSubtitle}>
              Analyzes 90 days of sales data to calculate optimal
              reorder quantities.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/reorder-history')}
        >
          <View style={styles.historyIconBox}>
            <Text style={styles.historyIcon}>↗</Text>
          </View>

          <View style={styles.historyContent}>
            <Text style={styles.historyTitle}>Reorder History</Text>
            <Text style={styles.historySubtitle}>
              Track orders and receive stock
            </Text>
          </View>

          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        {!loading && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Overview</Text>

            <View style={styles.summaryRow}>
              <SummaryCard
                value={summary.totalMedicines}
                label="Total Medicines"
                accent="#176B52"
              />
              <SummaryCard
                value={summary.needReorder}
                label="Need Reorder"
                accent="#B7791F"
              />
              <SummaryCard
                value={summary.highPriority}
                label="High Priority"
                accent="#C62828"
              />
              <SummaryCard
                value={summary.mediumPriority}
                label="Medium Priority"
                accent="#B7791F"
              />
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#176B52" size="large" />
            <Text style={styles.loadingTitle}>
              Analyzing inventory
            </Text>
            <Text style={styles.loadingText}>
              Calculating reorder quantities...
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Reorder Suggestions
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Based on recent sales patterns
                </Text>
              </View>

              {suggestions.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {suggestions.length}
                  </Text>
                </View>
              )}
            </View>

            {suggestions.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Text style={styles.emptyIcon}>✓</Text>
                </View>
                <Text style={styles.emptyTitle}>
                  Stock Levels Look Good
                </Text>
                <Text style={styles.emptyText}>
                  No medicines require reordering right now.
                </Text>
              </View>
            ) : (
              suggestions.map((item, index) => {
                const color = priorityColor(item.priority);
                const background = priorityBackground(item.priority);

                return (
                  <View
                    key={item.medicineId || index}
                    style={styles.card}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.medicineInfo}>
                        <Text style={styles.medicineName}>
                          {item.name}
                        </Text>
                        <Text style={styles.medicineBrand}>
                          {item.brand || 'No brand'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor: background,
                            borderColor: color,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.priorityDot,
                            { backgroundColor: color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.priorityText,
                            { color },
                          ]}
                        >
                          {item.priority || 'LOW'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>
                          Current Stock
                        </Text>
                        <Text
                          style={[
                            styles.statValue,
                            {
                              color:
                                Number(item.currentStock) < 10
                                  ? '#C62828'
                                  : '#1F2937',
                            },
                          ]}
                        >
                          {item.currentStock ?? 0}
                        </Text>
                        <Text style={styles.statUnit}>units</Text>
                      </View>

                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>
                          Daily Average
                        </Text>
                        <Text
                          style={[
                            styles.statValue,
                            { color: '#176B52' },
                          ]}
                        >
                          {Number(item.dailyAverage || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.statUnit}>
                          units/day
                        </Text>
                      </View>

                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>
                          Monthly Need
                        </Text>
                        <Text style={styles.statValue}>
                          {Number(item.monthlyNeed || 0).toFixed(0)}
                        </Text>
                        <Text style={styles.statUnit}>units</Text>
                      </View>

                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>
                          Stock Lasts
                        </Text>
                        <Text
                          style={[
                            styles.statValue,
                            {
                              color:
                                Number(item.stockLasts || 0) <= 7
                                  ? '#C62828'
                                  : '#1F2937',
                            },
                          ]}
                        >
                          {Number(item.stockLasts || 0).toFixed(1)}
                        </Text>
                        <Text style={styles.statUnit}>
                          {Number(item.stockLasts || 0) === 1
                            ? 'day'
                            : 'days'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recommendation}>
                      <View style={styles.recommendationIcon}>
                        <Text style={styles.recommendationIconText}>
                          AI
                        </Text>
                      </View>

                      <View style={styles.recommendationContent}>
                        <Text style={styles.recommendationLabel}>
                          Recommended Order
                        </Text>
                        <Text style={styles.recommendationValue}>
                          {item.reorderQuantity} units
                        </Text>
                        <Text style={styles.supplierText}>
                          Supplier:{' '}
                          {item.supplier || 'Not specified'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.salesRow}>
                      <Text style={styles.salesLabel}>
                        90-day sales
                      </Text>
                      <Text style={styles.salesValue}>
                        {item.soldLast90Days || 0} units sold
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.orderButton}
                      onPress={() => handleOrder(item)}
                      disabled={ordering}
                    >
                      {ordering ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.orderButtonText}>
                            Place Order
                          </Text>
                          <Text style={styles.orderQuantity}>
                            {item.reorderQuantity} units
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backText: {
    fontSize: 23,
    color: '#176B52',
  },
  backLabel: {
    fontSize: 13,
    color: '#176B52',
    fontWeight: '600',
    marginLeft: 3,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#17211D',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#7A8782',
    marginTop: 2,
  },
  refreshButton: {
    width: 70,
    alignItems: 'flex-end',
  },
  refreshText: {
    fontSize: 26,
    color: '#176B52',
  },
  messageBanner: {
    backgroundColor: '#EAF5F1',
    borderWidth: 1,
    borderColor: '#B9DDD0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  successDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#176B52',
    marginRight: 9,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    color: '#176B52',
    fontWeight: '600',
  },
  aiCard: {
    backgroundColor: '#176B52',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  aiIcon: {
    color: '#176B52',
    fontSize: 14,
    fontWeight: '800',
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiSubtitle: {
    color: '#DCEDE7',
    fontSize: 11,
    lineHeight: 17,
  },
  historyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE5E1',
    marginBottom: 20,
  },
  historyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EAF5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyIcon: {
    fontSize: 20,
    color: '#176B52',
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17211D',
  },
  historySubtitle: {
    fontSize: 11,
    color: '#7A8782',
    marginTop: 3,
  },
  arrow: {
    fontSize: 21,
    color: '#176B52',
  },
  summarySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17211D',
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#7A8782',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 7,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#E5EBE8',
  },
  summaryValue: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#718078',
    textAlign: 'center',
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#EAF5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 45,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8E4',
  },
  loadingTitle: {
    fontSize: 15,
    color: '#176B52',
    fontWeight: '700',
    marginTop: 14,
  },
  loadingText: {
    fontSize: 11,
    color: '#7A8782',
    marginTop: 5,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8E4',
  },
  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EAF5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIcon: {
    fontSize: 27,
    color: '#176B52',
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#176B52',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#7A8782',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E7E3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  medicineInfo: {
    flex: 1,
    paddingRight: 10,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17211D',
  },
  medicineBrand: {
    fontSize: 11,
    color: '#7A8782',
    marginTop: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F7F9F8',
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: '#EDF1EF',
  },
  statLabel: {
    fontSize: 9,
    color: '#84908B',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  statUnit: {
    fontSize: 9,
    color: '#84908B',
    marginTop: 1,
  },
  recommendation: {
    backgroundColor: '#EAF5F1',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CBE2D9',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  recommendationIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationLabel: {
    fontSize: 9,
    color: '#718078',
  },
  recommendationValue: {
    fontSize: 17,
    color: '#176B52',
    fontWeight: '800',
  },
  supplierText: {
    fontSize: 10,
    color: '#718078',
    marginTop: 3,
  },
  salesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  salesLabel: {
    fontSize: 10,
    color: '#84908B',
  },
  salesValue: {
    fontSize: 11,
    color: '#4F5D57',
    fontWeight: '600',
  },
  orderButton: {
    backgroundColor: '#176B52',
    borderRadius: 11,
    minHeight: 48,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  orderQuantity: {
    color: '#DCEDE7',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpace: {
    height: 30,
  },
});
