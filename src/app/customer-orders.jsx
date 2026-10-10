import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { getCustomerOrders } from '../services/api';

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  white: '#FFFFFF',
  background: '#F8FAFC',
  text: '#0F172A',
  secondary: '#64748B',
  border: '#E2E8F0',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  orange: '#EA580C',
  orangeLight: '#FFF7ED',
  red: '#DC2626',
  redLight: '#FEF2F2',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
};

const STATUS_CONFIG = {
  placed: {
    label: 'Order Placed',
    icon: '📝',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
  },

  accepted: {
    label: 'Accepted',
    icon: '✅',
    color: COLORS.green,
    bg: COLORS.greenLight,
  },

  preparing: {
    label: 'Preparing',
    icon: '👨‍⚕️',
    color: COLORS.orange,
    bg: COLORS.orangeLight,
  },

  ready_for_pickup: {
    label: 'Ready',
    icon: '📦',
    color: COLORS.purple,
    bg: COLORS.purpleLight,
  },

  out_for_delivery: {
    label: 'Out for Delivery',
    icon: '🚚',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
  },

  delivered: {
    label: 'Delivered',
    icon: '🎉',
    color: COLORS.green,
    bg: COLORS.greenLight,
  },

  rejected: {
    label: 'Rejected',
    icon: '❌',
    color: COLORS.red,
    bg: COLORS.redLight,
  },

  cancelled: {
    label: 'Cancelled',
    icon: '🚫',
    color: COLORS.red,
    bg: COLORS.redLight,
  },
};

export default function CustomerOrders() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  const loadOrders = async () => {
    try {
      setError('');

      const response = await getCustomerOrders();

      const orderList =
        response?.orders ||
        response?.data ||
        [];

      setOrders(
        Array.isArray(orderList)
          ? orderList
          : []
      );

    } catch (err) {
      console.log(
        'Customer orders error:',
        err
      );

      setError(
        err?.message ||
        'Failed to load your orders'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // REFRESH
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return 'Date unavailable';

    try {
      return new Date(date).toLocaleString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      );
    } catch {
      return 'Date unavailable';
    }
  };

  // =====================================================
  // STATUS
  // =====================================================

  const getStatus = (status) => {
    return (
      STATUS_CONFIG[status] || {
        label: status || 'Unknown',
        icon: '📋',
        color: COLORS.secondary,
        bg: '#F1F5F9',
      }
    );
  };

  // =====================================================
  // ORDER CARD
  // =====================================================

  const renderOrder = ({ item }) => {
    const status = getStatus(
      item.orderStatus
    );

    const pharmacyName =
      item.pharmacy?.name ||
      item.pharmacyName ||
      'Pharmacy';

    const orderNumber =
      item.orderNumber ||
      item._id?.slice(-8)?.toUpperCase() ||
      'N/A';

    const itemCount =
      item.itemsCount ||
      item.items?.length ||
      0;

    const total =
      Number(item.total || 0).toFixed(2);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.orderCard}
        onPress={() =>
          router.push({
            pathname:
              '/customer-order-details',
            params: {
              orderId: item._id,
            },
          })
        }
      >

        {/* HEADER */}
        <View style={styles.orderHeader}>

          <View style={styles.orderNumberBox}>
            <Text style={styles.orderLabel}>
              ORDER
            </Text>

            <Text style={styles.orderNumber}>
              #{orderNumber}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status.bg,
              },
            ]}
          >
            <Text style={styles.statusIcon}>
              {status.icon}
            </Text>

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    status.color,
                },
              ]}
            >
              {status.label}
            </Text>
          </View>

        </View>

        {/* PHARMACY */}
        <View style={styles.pharmacyRow}>

          <View style={styles.pharmacyIcon}>
            <Text>🏥</Text>
          </View>

          <View style={styles.pharmacyInfo}>
            <Text
              style={styles.pharmacyName}
              numberOfLines={1}
            >
              {pharmacyName}
            </Text>

            <Text style={styles.orderDate}>
              {formatDate(
                item.createdAt
              )}
            </Text>
          </View>

        </View>

        {/* SUMMARY */}
        <View style={styles.divider} />

        <View style={styles.summaryRow}>

          <View>
            <Text style={styles.summaryLabel}>
              Medicines
            </Text>

            <Text style={styles.summaryValue}>
              {itemCount}{' '}
              {itemCount === 1
                ? 'item'
                : 'items'}
            </Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.summaryLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              ₹{total}
            </Text>
          </View>

        </View>

        {/* PAYMENT */}
        <View style={styles.bottomRow}>

          <View style={styles.paymentBadge}>
            <Text style={styles.paymentIcon}>
              {item.paymentMethod ===
              'ONLINE'
                ? '💳'
                : '💵'}
            </Text>

            <Text style={styles.paymentText}>
              {item.paymentMethod ||
                'COD'}
            </Text>
          </View>

          <Text style={styles.viewText}>
            View Details →
          </Text>

        </View>

      </TouchableOpacity>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.loadingContainer}>

          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading your orders...
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >

      {/* HEADER */}
      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            My Orders
          </Text>

          <Text style={styles.headerSubtitle}>
            Track your medicine orders
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text>📦</Text>
        </View>

      </View>

      {/* ERROR */}
      {error ? (
        <View style={styles.errorBox}>

          <Text style={styles.errorIcon}>
            ⚠️
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadOrders();
            }}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </TouchableOpacity>

        </View>
      ) : null}

      {/* EMPTY */}
      {!error && orders.length === 0 ? (
        <View style={styles.emptyContainer}>

          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIcon}>
              📦
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            No Orders Yet
          </Text>

          <Text style={styles.emptySubtitle}>
            Your medicine orders will
            appear here.
          </Text>

          <TouchableOpacity
            style={styles.shopButton}
            onPress={() =>
              router.push(
                '/marketplace'
              )
            }
          >
            <Text style={styles.shopButtonText}>
              🛍️  Browse Medicines
            </Text>
          </TouchableOpacity>

        </View>
      ) : null}

      {/* ORDERS */}
      {!error &&
      orders.length > 0 ? (
        <FlatList
          data={orders}
          keyExtractor={(item) =>
            item._id
          }
          renderItem={renderOrder}
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={
                handleRefresh
              }
              colors={[
                COLORS.primary,
              ]}
            />
          }
          ListHeaderComponent={
            <View
              style={
                styles.listHeader
              }
            >
              <Text
                style={
                  styles.orderCount
                }
              >
                {orders.length}{' '}
                {orders.length === 1
                  ? 'Order'
                  : 'Orders'}
              </Text>

              <Text
                style={
                  styles.refreshHint
                }
              >
                Pull down to refresh
              </Text>
            </View>
          }
        />
      ) : null}

    </SafeAreaView>
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

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: COLORS.text,
    marginTop: -3,
  },

  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 2,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // LIST
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  orderCount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  refreshHint: {
    fontSize: 10,
    color: COLORS.secondary,
  },

  // ORDER CARD
  orderCard: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    padding: 16,
    marginBottom: 14,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  orderNumberBox: {
    flex: 1,
  },

  orderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 1,
  },

  orderNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // PHARMACY
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },

  pharmacyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pharmacyInfo: {
    flex: 1,
    marginLeft: 10,
  },

  pharmacyName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  orderDate: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor:
      COLORS.border,
    marginVertical: 14,
  },

  // SUMMARY
  summaryRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  summaryLabel: {
    fontSize: 10,
    color: COLORS.secondary,
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 3,
  },

  totalBox: {
    alignItems: 'flex-end',
  },

  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
  },

  // BOTTOM
  bottomRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginTop: 14,
  },

  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },

  paymentIcon: {
    fontSize: 11,
    marginRight: 4,
  },

  paymentText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.secondary,
  },

  viewText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.secondary,
  },

  // EMPTY
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },

  emptySubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  shopButton: {
    marginTop: 22,
    backgroundColor:
      COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
  },

  shopButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  // ERROR
  errorBox: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor:
      COLORS.redLight,
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: 25,
  },

  errorText: {
    fontSize: 12,
    color: COLORS.red,
    textAlign: 'center',
    marginTop: 8,
  },

  retryButton: {
    marginTop: 12,
    backgroundColor:
      COLORS.red,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },

  retryText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },

});

