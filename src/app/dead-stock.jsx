import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { getDeadStock } from '../services/api';

const GREEN = '#176B52';
const RED = '#B33D38';
const AMBER = '#A66A00';

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function DeadStock() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    summary: {},
    items: [],
  });
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const result = await getDeadStock();
      setData({
        summary: result?.summary || {},
        items: Array.isArray(result?.items)
          ? result.items
          : [],
      });
    } catch (err) {
      console.error('Dead stock load error:', err);
      setError(
        err?.message ||
          'Unable to load dead stock data.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.items.filter((item) => {
      const matchesFilter =
        filter === 'ALL' || item.type === filter;

      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.batchNumber?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [data.items, filter, search]);

  const summary = data.summary || {};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={GREEN}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>DS</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Dead Stock Detection</Text>
          <Text style={styles.subtitle}>
            Find medicines with little or no movement
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Detection rule</Text>
        <Text style={styles.infoText}>
          Dead stock: no units sold in the last 90 days.
          Slow-moving: current stock is expected to last
          more than 90 days at the recent average demand.
        </Text>
      </View>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Dead Stock</Text>
          <Text style={[styles.summaryValue, { color: RED }]}>
            {summary.deadStockCount || 0}
          </Text>
          <Text style={styles.summarySub}>
            {money(summary.deadStockValue)} value
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Slow Moving</Text>
          <Text style={[styles.summaryValue, { color: AMBER }]}>
            {summary.slowMovingCount || 0}
          </Text>
          <Text style={styles.summarySub}>
            {money(summary.slowMovingValue)} value
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Units at Risk</Text>
          <Text style={styles.summaryValue}>
            {(summary.totalDeadUnits || 0) +
              (summary.totalSlowUnits || 0)}
          </Text>
          <Text style={styles.summarySub}>units</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Stock Value</Text>
          <Text style={styles.summaryValueSmall}>
            {money(summary.totalAtRiskValue)}
          </Text>
          <Text style={styles.summarySub}>purchase value</Text>
        </View>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search medicine, batch or category"
        placeholderTextColor="#9AA59F"
        style={styles.search}
      />

      <View style={styles.filters}>
        {['ALL', 'DEAD', 'SLOW'].map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterButton,
              filter === item && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.filterTextActive,
              ]}
            >
              {item === 'ALL'
                ? 'All'
                : item === 'DEAD'
                ? 'Dead Stock'
                : 'Slow Moving'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listHeader}>
        <View>
          <Text style={styles.sectionTitle}>Attention Needed</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredItems.length} medicine
            {filteredItems.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>
            Analysing stock movement...
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>✓</Text>
          </View>
          <Text style={styles.emptyTitle}>No matching stock</Text>
          <Text style={styles.emptyText}>
            No dead or slow-moving medicines match your current filter.
          </Text>
        </View>
      ) : (
        filteredItems.map((item) => (
          <View key={String(item.id)} style={styles.card}>
            <View
              style={[
                styles.indicator,
                {
                  backgroundColor:
                    item.type === 'DEAD' ? RED : AMBER,
                },
              ]}
            />

            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <View style={styles.nameWrap}>
                  <Text style={styles.name}>{item.name}</Text>
                  {!!item.brand && (
                    <Text style={styles.brand}>{item.brand}</Text>
                  )}
                </View>

                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        item.type === 'DEAD'
                          ? '#FFF1F0'
                          : '#FFF7E8',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          item.type === 'DEAD'
                            ? RED
                            : AMBER,
                      },
                    ]}
                  >
                    {item.type === 'DEAD'
                      ? 'DEAD STOCK'
                      : 'SLOW MOVING'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <Detail label="Stock" value={`${item.currentStock}`} />
                <Detail
                  label="Sold / 90d"
                  value={`${item.soldLast90Days}`}
                />
                <Detail
                  label="Stock Value"
                  value={money(item.stockValue)}
                />
                <Detail
                  label="Last Sale"
                  value={
                    item.lastSaleDate
                      ? new Date(item.lastSaleDate).toLocaleDateString()
                      : 'No sales'
                  }
                />
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  Batch: {item.batchNumber || 'N/A'}
                </Text>
                <Text style={styles.metaText}>
                  Rack: {item.rackNumber || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
        activeOpacity={0.8}
      >
        <Text style={styles.refreshText}>Refresh Analysis</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#E8F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIconText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#17221D',
  },
  subtitle: {
    fontSize: 11,
    color: '#748078',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE8E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#68756E',
  },
  errorBox: {
    backgroundColor: '#FFF4F3',
    borderWidth: 1,
    borderColor: '#F0CECA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: RED,
    fontSize: 12,
  },
  retryText: {
    color: RED,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E9E5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#748078',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: GREEN,
  },
  summaryValueSmall: {
    fontSize: 17,
    fontWeight: '700',
    color: GREEN,
  },
  summarySub: {
    fontSize: 10,
    color: '#8A958F',
    marginTop: 4,
  },
  search: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#26332C',
    fontSize: 12,
    marginBottom: 10,
  },
  filters: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8E1DC',
    backgroundColor: '#FFFFFF',
    marginRight: 7,
  },
  filterButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterText: {
    color: '#65726B',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17221D',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#829089',
    marginTop: 3,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    color: '#748078',
    fontSize: 12,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E9E5',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EDF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyIconText: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#29362F',
  },
  emptyText: {
    textAlign: 'center',
    color: '#829089',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E9E5',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  indicator: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 13,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameWrap: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#29362F',
  },
  brand: {
    fontSize: 10,
    color: '#829089',
    marginTop: 3,
  },
  badge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: 9,
  },
  detailLabel: {
    fontSize: 9,
    color: '#8A958F',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#29362F',
  },
  metaRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
    paddingTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 9,
    color: '#829089',
  },
  refreshButton: {
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CBD8D2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  refreshText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 20,
  },
});
