import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getReorderOrders,
  updateReorderOrder,
} from '../services/api';

export default function ReorderHistory() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState(null);

  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiveInput, setReceiveInput] = useState('');

  const loadOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const result = await getReorderOrders();

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.orders)
          ? result.orders
          : [];

      setOrders(list);
    } catch (error) {
      console.log('Reorder History Error:', error);
      Alert.alert(
        'Unable to load orders',
        error?.message || 'Please try again.'
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

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(false);
  };

  const getOrderId = (order) => order?._id || order?.id;

  const medicineName = (order) =>
    order?.medicineName ||
    order?.medicine?.name ||
    'Unknown medicine';

  const orderedQuantity = (order) =>
    Number(order?.quantity || 0);

  const receivedQuantity = (order) =>
    Number(order?.receivedQuantity || 0);

  const remainingQuantity = (order) =>
    Math.max(
      0,
      orderedQuantity(order) - receivedQuantity(order)
    );

  const normalizeStatus = (status) =>
    String(status || 'pending').toLowerCase();

  const statusLabel = (status) => {
    const value = normalizeStatus(status);

    if (value === 'partially_received') {
      return 'PARTIALLY RECEIVED';
    }

    if (value === 'received') return 'RECEIVED';
    if (value === 'ordered') return 'ORDERED';
    if (value === 'cancelled') return 'CANCELLED';

    return 'PENDING';
  };

  const statusColor = (status) => {
    const value = normalizeStatus(status);

    if (value === 'received') return '#176B52';
    if (value === 'partially_received') return '#B7791F';
    if (value === 'ordered') return '#2563EB';
    if (value === 'cancelled') return '#C62828';

    return '#7A5A00';
  };

  const statusBackground = (status) => {
    const value = normalizeStatus(status);

    if (value === 'received') return '#EAF5F1';
    if (value === 'partially_received') return '#FFF7E6';
    if (value === 'ordered') return '#EEF4FF';
    if (value === 'cancelled') return '#FDECEC';

    return '#FFF7E6';
  };

  const updateStatus = async (order, status) => {
    const id = getOrderId(order);

    if (!id) {
      Alert.alert('Error', 'Order ID is missing.');
      return;
    }

    try {
      setWorkingId(id);

      await updateReorderOrder(id, { status });

      await loadOrders(false);
    } catch (error) {
      console.log('Update reorder status error:', error);
      Alert.alert(
        'Update Failed',
        error?.message || 'Unable to update order.'
      );
    } finally {
      setWorkingId(null);
    }
  };

  const markAsOrdered = (order) => {
    Alert.alert(
      'Mark as Ordered',
      `Mark ${medicineName(order)} as ordered from the supplier?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Ordered',
          onPress: () => updateStatus(order, 'ordered'),
        },
      ]
    );
  };

  const openReceiveModal = (order) => {
    const remaining = remainingQuantity(order);

    if (remaining <= 0) {
      Alert.alert(
        'Already Received',
        'This order has no remaining quantity.'
      );
      return;
    }

    setSelectedOrder(order);
    setReceiveInput(String(remaining));
    setReceiveModalVisible(true);
  };

  const closeReceiveModal = () => {
    if (workingId) return;

    setReceiveModalVisible(false);
    setSelectedOrder(null);
    setReceiveInput('');
  };

  const receiveStock = async () => {
    if (!selectedOrder) return;

    const id = getOrderId(selectedOrder);
    const ordered = orderedQuantity(selectedOrder);
    const alreadyReceived = receivedQuantity(selectedOrder);
    const remaining = Math.max(0, ordered - alreadyReceived);
    const receiveNow = Number(receiveInput);

    if (!Number.isInteger(receiveNow) || receiveNow <= 0) {
      Alert.alert(
        'Invalid Quantity',
        'Enter a whole number greater than 0.'
      );
      return;
    }

    if (receiveNow > remaining) {
      Alert.alert(
        'Quantity Too High',
        `Only ${remaining} unit(s) are remaining for this order.`
      );
      return;
    }

    const newReceivedTotal = alreadyReceived + receiveNow;
    const newStatus =
      newReceivedTotal >= ordered
        ? 'received'
        : 'partially_received';

    try {
      setWorkingId(id);

      /*
       * The backend must handle receivedQuantity atomically:
       * - add only receiveNow to Medicine.quantity
       * - save receivedQuantity = newReceivedTotal
       * - status = newStatus
       *
       * Do NOT increase medicine stock from this frontend.
       */
      await updateReorderOrder(id, {
        status: newStatus,
        receivedQuantity: newReceivedTotal,
      });

      closeReceiveModal();
      await loadOrders(false);

      Alert.alert(
        newStatus === 'received'
          ? 'Stock Received'
          : 'Partial Stock Received',
        `${receiveNow} unit(s) of ${medicineName(
          selectedOrder
        )} received.`
      );
    } catch (error) {
      console.log('Receive stock error:', error);
      Alert.alert(
        'Receive Failed',
        error?.message || 'Unable to receive stock.'
      );
    } finally {
      setWorkingId(null);
    }
  };

  const cancelOrder = (order) => {
    Alert.alert(
      'Cancel Order',
      `Cancel the order for ${medicineName(order)}?`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => updateStatus(order, 'cancelled'),
        },
      ]
    );
  };

  const renderAction = (order) => {
    const status = normalizeStatus(order?.status);
    const id = getOrderId(order);
    const busy = workingId === id;

    if (status === 'pending') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.orderedButton]}
            onPress={() => markAsOrdered(order)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionText}>
                Mark as Ordered
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallButton, styles.cancelButton]}
            onPress={() => cancelOrder(order)}
            disabled={busy}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      status === 'ordered' ||
      status === 'partially_received'
    ) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.receiveButton]}
          onPress={() => openReceiveModal(order)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionText}>
              Receive Stock
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    if (status === 'received') {
      return (
        <View style={styles.completedBox}>
          <Text style={styles.completedText}>
            ✓ Stock Updated
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.cancelledBox}>
        <Text style={styles.cancelledText}>Order Cancelled</Text>
      </View>
    );
  };

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
          <Text style={styles.headerTitle}>
            Reorder History
          </Text>
          <Text style={styles.headerSubtitle}>
            Purchase orders & stock receipts
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#176B52" />
          <Text style={styles.loadingText}>
            Loading reorder history...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#176B52"
            />
          }
        >
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              Purchase Order Workflow
            </Text>
            <Text style={styles.infoText}>
              Pending → Ordered → Partially Received →
              Received
            </Text>
            <Text style={styles.infoHint}>
              Stock is added only when stock is received.
            </Text>
          </View>

          {orders.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>✓</Text>
              </View>
              <Text style={styles.emptyTitle}>
                No Reorder Orders
              </Text>
              <Text style={styles.emptyText}>
                Orders created from AI Reorder will appear here.
              </Text>
            </View>
          ) : (
            orders.map((order, index) => {
              const ordered = orderedQuantity(order);
              const received = receivedQuantity(order);
              const remaining = remainingQuantity(order);
              const status = normalizeStatus(order?.status);
              const color = statusColor(status);
              const background = statusBackground(status);

              return (
                <View
                  key={getOrderId(order) || index}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.medicineInfo}>
                      <Text style={styles.medicineName}>
                        {medicineName(order)}
                      </Text>

                      <Text style={styles.supplier}>
                        Supplier:{' '}
                        {order?.supplier || 'Not specified'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: background,
                          borderColor: color,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color },
                        ]}
                      >
                        {statusLabel(status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.quantityGrid}>
                    <View style={styles.quantityBox}>
                      <Text style={styles.quantityLabel}>
                        Ordered
                      </Text>
                      <Text style={styles.quantityValue}>
                        {ordered}
                      </Text>
                    </View>

                    <View style={styles.quantityBox}>
                      <Text style={styles.quantityLabel}>
                        Received
                      </Text>
                      <Text
                        style={[
                          styles.quantityValue,
                          { color: '#176B52' },
                        ]}
                      >
                        {received}
                      </Text>
                    </View>

                    <View style={styles.quantityBox}>
                      <Text style={styles.quantityLabel}>
                        Remaining
                      </Text>
                      <Text
                        style={[
                          styles.quantityValue,
                          {
                            color:
                              remaining > 0
                                ? '#C62828'
                                : '#176B52',
                          },
                        ]}
                      >
                        {remaining}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Priority:{' '}
                      {order?.priority || 'MEDIUM'}
                    </Text>

                    <Text style={styles.metaText}>
                      {order?.createdAt
                        ? new Date(
                            order.createdAt
                          ).toLocaleDateString()
                        : ''}
                    </Text>
                  </View>

                  {renderAction(order)}
                </View>
              );
            })
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      )}

      <Modal
        visible={receiveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeReceiveModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Receive Stock
            </Text>

            <Text style={styles.modalMedicine}>
              {medicineName(selectedOrder)}
            </Text>

            <View style={styles.modalSummary}>
              <Text style={styles.modalLine}>
                Ordered:{' '}
                <Text style={styles.bold}>
                  {orderedQuantity(selectedOrder)}
                </Text>
              </Text>

              <Text style={styles.modalLine}>
                Already received:{' '}
                <Text style={styles.bold}>
                  {receivedQuantity(selectedOrder)}
                </Text>
              </Text>

              <Text style={styles.modalLine}>
                Remaining:{' '}
                <Text style={styles.bold}>
                  {remainingQuantity(selectedOrder)}
                </Text>
              </Text>
            </View>

            <Text style={styles.inputLabel}>
              Received now
            </Text>

            <TextInput
              value={receiveInput}
              onChangeText={setReceiveInput}
              keyboardType="number-pad"
              placeholder="Enter received quantity"
              placeholderTextColor="#9AA59F"
              style={styles.input}
              editable={!workingId}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={closeReceiveModal}
                disabled={!!workingId}
              >
                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalReceive}
                onPress={receiveStock}
                disabled={!!workingId}
              >
                {workingId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalReceiveText}>
                    Receive
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    alignItems: 'center',
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
  headerSpacer: {
    width: 70,
  },
  infoCard: {
    backgroundColor: '#EAF5F1',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBE2D9',
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: {
    color: '#176B52',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  infoText: {
    color: '#2F5E50',
    fontSize: 11,
    fontWeight: '600',
  },
  infoHint: {
    color: '#718078',
    fontSize: 10,
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#7A8782',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 45,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8E4',
  },
  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#EAF5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconText: {
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
    marginBottom: 14,
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
  supplier: {
    fontSize: 11,
    color: '#7A8782',
    marginTop: 4,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 145,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  quantityGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quantityBox: {
    flex: 1,
    backgroundColor: '#F7F9F8',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF1EF',
  },
  quantityLabel: {
    fontSize: 9,
    color: '#84908B',
    marginBottom: 5,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 10,
    color: '#84908B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  orderedButton: {
    backgroundColor: '#2563EB',
  },
  receiveButton: {
    backgroundColor: '#176B52',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  smallButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F0C5C5',
  },
  cancelText: {
    color: '#C62828',
    fontSize: 11,
    fontWeight: '700',
  },
  completedBox: {
    backgroundColor: '#EAF5F1',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  completedText: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelledBox: {
    backgroundColor: '#FDECEC',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelledText: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#17211D',
  },
  modalMedicine: {
    fontSize: 13,
    fontWeight: '600',
    color: '#176B52',
    marginTop: 5,
    marginBottom: 15,
  },
  modalSummary: {
    backgroundColor: '#F7F9F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  modalLine: {
    fontSize: 12,
    color: '#59665F',
    marginBottom: 5,
  },
  bold: {
    fontWeight: '800',
    color: '#17211D',
  },
  inputLabel: {
    fontSize: 11,
    color: '#59665F',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DCE5E1',
    borderRadius: 11,
    paddingHorizontal: 13,
    fontSize: 15,
    color: '#17211D',
    backgroundColor: '#FAFCFB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 15,
  },
  modalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F5F3',
  },
  modalCancelText: {
    color: '#59665F',
    fontSize: 12,
    fontWeight: '700',
  },
  modalReceive: {
    flex: 1,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B52',
  },
  modalReceiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomSpace: {
    height: 30,
  },
});
