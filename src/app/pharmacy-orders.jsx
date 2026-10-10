import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    getMyPharmacy,
    getPharmacyOrders,
    updateCustomerOrderStatus,
} from '../services/api';

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
    label: 'New Order',
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

export default function PharmacyOrders() {

  const router = useRouter();

  const [pharmacy, setPharmacy] =
    useState(null);

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [updatingOrder, setUpdatingOrder] =
    useState(null);

  // =====================================================
  // LOAD PHARMACY + ORDERS
  // =====================================================

  const loadOrders = async () => {

    try {

      const pharmacyResponse =
        await getMyPharmacy();

      const myPharmacy =
        pharmacyResponse?.pharmacy;

      if (!myPharmacy?._id) {

        throw new Error(
          'No pharmacy is linked to this account'
        );
      }

      setPharmacy(myPharmacy);

      const ordersResponse =
        await getPharmacyOrders(
          myPharmacy._id
        );

      const orderList =
        ordersResponse?.orders ||
        ordersResponse?.data ||
        [];

      setOrders(
        Array.isArray(orderList)
          ? orderList
          : []
      );

    } catch (error) {

      console.log(
        'Pharmacy orders error:',
        error
      );

      Alert.alert(
        'Unable to load orders',
        error?.message ||
          'Something went wrong'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);
    }
  };

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
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {

    if (!date) {
      return '';
    }

    try {

      return new Date(
        date
      ).toLocaleString(
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

      return '';
    }
  };

  // =====================================================
  // UPDATE STATUS
  // =====================================================

  const changeStatus = async (
    order,
    nextStatus
  ) => {

    const status = order.orderStatus;

    // -------------------------------------------------
    // Confirmation
    // -------------------------------------------------

    let title = 'Update Order';

    let message =
      `Change order to "${getStatus(nextStatus).label}"?`;

    if (nextStatus === 'rejected') {

      title = 'Reject Order';

      message =
        'Are you sure you want to reject this order?';
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: 'No',
          style: 'cancel',
        },

        {
          text: 'Yes',
          onPress: async () => {

            try {

              setUpdatingOrder(
                order._id
              );

              await updateCustomerOrderStatus(
                order._id,
                nextStatus,
                nextStatus === 'rejected'
                  ? 'Rejected by pharmacy'
                  : ''
              );

              await loadOrders();

            } catch (error) {

              Alert.alert(
                'Update Failed',
                error?.message ||
                  'Could not update order'
              );

            } finally {

              setUpdatingOrder(null);
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // NEXT ACTION
  // =====================================================

  const getNextAction = (order) => {

    switch (order.orderStatus) {

      case 'placed':
        return {
          label: 'Accept Order',
          status: 'accepted',
        };

      case 'accepted':
        return {
          label: 'Start Preparing',
          status: 'preparing',
        };

      case 'preparing':
        return {
          label: 'Mark Ready',
          status: 'ready_for_pickup',
        };

      case 'ready_for_pickup':
        return {
          label: 'Out for Delivery',
          status: 'out_for_delivery',
        };

      case 'out_for_delivery':
        return {
          label: 'Mark Delivered',
          status: 'delivered',
        };

      default:
        return null;
    }
  };

  // =====================================================
  // ORDER CARD
  // =====================================================

  const renderOrder = ({
    item,
  }) => {

    const status =
      getStatus(
        item.orderStatus
      );

    const nextAction =
      getNextAction(item);

    const customer =
      item.customer?.name ||
      item.customerName ||
      'Customer';

    const orderNumber =
      item.orderNumber ||
      item._id
        ?.slice(-8)
        ?.toUpperCase() ||
      'N/A';

    const itemCount =
      item.itemsCount ||
      item.items?.length ||
      0;

    const total =
      Number(
        item.total || 0
      ).toFixed(2);

    const updating =
      updatingOrder === item._id;

    return (
      <View
        style={styles.orderCard}
      >

        {/* HEADER */}
        <View
          style={styles.orderHeader}
        >

          <View>

            <Text
              style={styles.orderLabel}
            >
              ORDER
            </Text>

            <Text
              style={styles.orderNumber}
            >
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

            <Text
              style={styles.statusIcon}
            >
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

        {/* CUSTOMER */}
        <View
          style={styles.customerRow}
        >

          <View
            style={styles.customerIcon}
          >
            <Text>👤</Text>
          </View>

          <View
            style={styles.customerInfo}
          >

            <Text
              style={styles.customerName}
            >
              {customer}
            </Text>

            <Text
              style={styles.orderDate}
            >
              {formatDate(
                item.createdAt
              )}
            </Text>

          </View>

        </View>

        {/* DELIVERY ADDRESS */}
        {item.deliveryAddress ? (
          <View
            style={styles.addressBox}
          >

            <Text
              style={styles.addressTitle}
            >
              📍 Delivery Address
            </Text>

            <Text
              style={styles.addressText}
            >
              {item.deliveryAddress.address}
            </Text>

            <Text
              style={styles.addressText}
            >
              {[
                item.deliveryAddress.area,
                item.deliveryAddress.city,
                item.deliveryAddress.pincode,
              ]
                .filter(Boolean)
                .join(', ')}
            </Text>

            {item.deliveryAddress
              .phone ? (
              <Text
                style={styles.phoneText}
              >
                📞{' '}
                {
                  item.deliveryAddress
                    .phone
                }
              </Text>
            ) : null}

          </View>
        ) : null}

        {/* ITEMS */}
        <View
          style={styles.divider}
        />

        <Text
          style={styles.itemsTitle}
        >
          Medicines
        </Text>

        {Array.isArray(item.items) &&
        item.items.length > 0 ? (

          item.items
            .slice(0, 3)
            .map(
              (
                orderItem,
                index
              ) => {

                const medicineName =
                  orderItem.medicine
                    ?.name ||
                  orderItem.medicineName ||
                  'Medicine';

                const quantity =
                  orderItem.quantity ||
                  0;

                const price =
                  Number(
                    orderItem.unitPrice ||
                    orderItem.price ||
                    0
                  ).toFixed(2);

                return (
                  <View
                    key={
                      orderItem._id ||
                      index
                    }
                    style={
                      styles.itemRow
                    }
                  >

                    <Text
                      style={
                        styles.itemName
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {medicineName}
                    </Text>

                    <Text
                      style={
                        styles.itemQuantity
                      }
                    >
                      × {quantity}
                    </Text>

                    <Text
                      style={
                        styles.itemPrice
                      }
                    >
                      ₹{price}
                    </Text>

                  </View>
                );
              }
            )

        ) : (

          <Text
            style={styles.noItems}
          >
            {itemCount} medicine(s)
          </Text>
        )}

        {item.items?.length > 3 ? (
          <Text
            style={styles.moreItems}
          >
            + {item.items.length - 3}{' '}
            more medicine(s)
          </Text>
        ) : null}

        {/* TOTAL */}
        <View
          style={styles.totalRow}
        >

          <View>

            <Text
              style={styles.paymentMethod}
            >
              {item.paymentMethod ===
              'ONLINE'
                ? '💳 Online Payment'
                : '💵 Cash on Delivery'}
            </Text>

          </View>

          <View
            style={styles.totalBox}
          >

            <Text
              style={styles.totalLabel}
            >
              Total
            </Text>

            <Text
              style={styles.totalValue}
            >
              ₹{total}
            </Text>

          </View>

        </View>

        {/* ACTIONS */}
        {item.orderStatus ===
          'placed' && (
          <View
            style={styles.actionRow}
          >

            <TouchableOpacity
              style={
                styles.rejectButton
              }
              disabled={updating}
              onPress={() =>
                changeStatus(
                  item,
                  'rejected'
                )
              }
            >
              <Text
                style={
                  styles.rejectText
                }
              >
                Reject
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.acceptButton
              }
              disabled={updating}
              onPress={() =>
                changeStatus(
                  item,
                  'accepted'
                )
              }
            >
              {updating ? (
                <ActivityIndicator
                  color={
                    COLORS.white
                }
                  size="small"
                />
              ) : (
                <Text
                  style={
                    styles.acceptText
                  }
                >
                  Accept Order
                </Text>
              )}
            </TouchableOpacity>

          </View>
        )}

        {nextAction &&
          item.orderStatus !==
            'placed' && (
          <TouchableOpacity
            style={
              styles.nextButton
            }
            disabled={updating}
            onPress={() =>
              changeStatus(
                item,
                nextAction.status
              )
            }
          >

            {updating ? (
              <ActivityIndicator
                color={
                  COLORS.white
                }
              />
            ) : (
              <Text
                style={
                  styles.nextButtonText
                }
              >
                {nextAction.label}
              </Text>
            )}

          </TouchableOpacity>
        )}

        {/* FINAL STATUS */}
        {[
          'delivered',
          'rejected',
          'cancelled',
        ].includes(
          item.orderStatus
        ) && (
          <View
            style={[
              styles.finalBox,
              {
                backgroundColor:
                  status.bg,
              },
            ]}
          >

            <Text
              style={{
                color:
                  status.color,
                fontSize: 12,
                fontWeight: '800',
              }}
            >
              {status.icon}{' '}
              {status.label}
            </Text>

          </View>
        )}

      </View>
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

        <View
          style={
            styles.loadingContainer
          }
        >

          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading pharmacy orders...
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
            styles.headerCenter
          }
        >

          <Text
            style={
              styles.headerTitle
            }
          >
            Online Orders
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
            numberOfLines={1}
          >
            {pharmacy?.name ||
              'Pharmacy'}
          </Text>

        </View>

        <View
          style={styles.headerIcon}
        >
          <Text>📦</Text>
        </View>

      </View>

      {/* SUMMARY */}
      <View
        style={styles.summaryContainer}
      >

        <View
          style={styles.summaryCard}
        >

          <Text
            style={styles.summaryNumber}
          >
            {
              orders.filter(
                (o) =>
                  o.orderStatus ===
                  'placed'
              ).length
            }
          </Text>

          <Text
            style={styles.summaryLabel}
          >
            New
          </Text>

        </View>

        <View
          style={styles.summaryCard}
        >

          <Text
            style={styles.summaryNumber}
          >
            {
              orders.filter(
                (o) =>
                  [
                    'accepted',
                    'preparing',
                    'ready_for_pickup',
                    'out_for_delivery',
                  ].includes(
                    o.orderStatus
                  )
              ).length
            }
          </Text>

          <Text
            style={styles.summaryLabel}
          >
            Active
          </Text>

        </View>

        <View
          style={styles.summaryCard}
        >

          <Text
            style={styles.summaryNumber}
          >
            {
              orders.filter(
                (o) =>
                  o.orderStatus ===
                  'delivered'
              ).length
            }
          </Text>

          <Text
            style={styles.summaryLabel}
          >
            Delivered
          </Text>

        </View>

      </View>

      {/* ORDERS */}
      {orders.length === 0 ? (

        <View
          style={
            styles.emptyContainer
          }
        >

          <View
            style={
              styles.emptyIconBox
            }
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              📦
            </Text>
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            No Online Orders
          </Text>

          <Text
            style={
              styles.emptySubtitle
            }
          >
            Customer orders will appear
            here when they place an order.
          </Text>

        </View>

      ) : (

        <FlatList
          data={orders}
          keyExtractor={(item) =>
            item._id
          }
          renderItem={
            renderOrder
          }
          contentContainerStyle={
            styles.listContent
          }
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
              colors={[
                COLORS.primary,
              ]}
            />
          }
        />

      )}

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

  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor:
      COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },

  summaryLabel: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 2,
  },

  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

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

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },

  customerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  customerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  orderDate: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 3,
  },

  addressBox: {
    marginTop: 14,
    backgroundColor:
      COLORS.background,
    padding: 12,
    borderRadius: 12,
  },

  addressTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 5,
  },

  addressText: {
    fontSize: 10,
    color: COLORS.secondary,
    lineHeight: 16,
  },

  phoneText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor:
      COLORS.border,
    marginVertical: 14,
  },

  itemsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  itemName: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
  },

  itemQuantity: {
    width: 45,
    fontSize: 10,
    color: COLORS.secondary,
    textAlign: 'center',
  },

  itemPrice: {
    width: 65,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'right',
  },

  noItems: {
    fontSize: 11,
    color: COLORS.secondary,
  },

  moreItems: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },

  paymentMethod: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: '600',
  },

  totalBox: {
    alignItems: 'flex-end',
  },

  totalLabel: {
    fontSize: 9,
    color: COLORS.secondary,
  },

  totalValue: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },

  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor:
      COLORS.red,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },

  rejectText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '800',
  },

  acceptButton: {
    flex: 2,
    backgroundColor:
      COLORS.green,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },

  acceptText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  nextButton: {
    marginTop: 15,
    backgroundColor:
      COLORS.primary,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },

  nextButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  finalBox: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

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
    fontSize: 21,
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

});