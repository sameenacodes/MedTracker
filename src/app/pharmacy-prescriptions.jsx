import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  getPharmacyPrescriptions,
  verifyPrescription,
} from '../services/api';

const BASE_URL = 'https://medtracker-1.onrender.com';

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
  orange: '#B86B00',
  orangeLight: '#FFF4DF',
  blue: '#2563EB',
  blueLight: '#EAF1FF',
};

export default function PharmacyPrescriptions() {
  const router = useRouter();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadPrescriptions = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const result = await getPharmacyPrescriptions();

      const data = Array.isArray(result)
        ? result
        : Array.isArray(result?.prescriptions)
          ? result.prescriptions
          : [];

      setPrescriptions(data);
    } catch (error) {
      console.log('Load pharmacy prescriptions error:', error);

      Alert.alert(
        'Unable to load prescriptions',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPrescriptions(false);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved':
        return {
          badge: styles.approvedBadge,
          text: styles.approvedText,
          label: 'APPROVED',
        };

      case 'rejected':
        return {
          badge: styles.rejectedBadge,
          text: styles.rejectedText,
          label: 'REJECTED',
        };

      default:
        return {
          badge: styles.pendingBadge,
          text: styles.pendingText,
          label: 'PENDING',
        };
    }
  };

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;

    if (
      fileUrl.startsWith('http://') ||
      fileUrl.startsWith('https://')
    ) {
      return fileUrl;
    }

    return `${BASE_URL}${fileUrl}`;
  };

  const openPrescription = async (prescription) => {
    try {
      const url = getFileUrl(prescription?.fileUrl);

      if (!url) {
        Alert.alert('File unavailable', 'Prescription file URL is missing.');
        return;
      }

      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          'Cannot open file',
          'This device cannot open the prescription file.'
        );
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log('Open prescription error:', error);

      Alert.alert(
        'Unable to open',
        'Could not open the prescription file.'
      );
    }
  };

  const approvePrescription = async (prescription) => {
    if (!prescription?._id) return;

    Alert.alert(
      'Approve Prescription',
      'Are you sure this prescription is valid and can be used for medicine ordering?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setActionLoading(true);

              await verifyPrescription(
                prescription._id,
                'approved',
                ''
              );

              Alert.alert(
                'Success',
                'Prescription approved successfully.'
              );

              await loadPrescriptions(false);
            } catch (error) {
              console.log('Approve prescription error:', error);

              Alert.alert(
                'Approval failed',
                error?.message || 'Could not approve prescription.'
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (prescription) => {
    setSelectedPrescription(prescription);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const rejectPrescription = async () => {
    if (!selectedPrescription?._id) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      Alert.alert(
        'Reason required',
        'Please enter a reason for rejecting this prescription.'
      );
      return;
    }

    try {
      setActionLoading(true);

      await verifyPrescription(
        selectedPrescription._id,
        'rejected',
        reason
      );

      setRejectModalVisible(false);
      setSelectedPrescription(null);
      setRejectionReason('');

      Alert.alert(
        'Prescription Rejected',
        'The customer prescription has been rejected.'
      );

      await loadPrescriptions(false);
    } catch (error) {
      console.log('Reject prescription error:', error);

      Alert.alert(
        'Rejection failed',
        error?.message || 'Could not reject prescription.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = prescriptions.filter(
    (item) => item.status === 'pending'
  ).length;

  const approvedCount = prescriptions.filter(
    (item) => item.status === 'approved'
  ).length;

  const rejectedCount = prescriptions.filter(
    (item) => item.status === 'rejected'
  ).length;

  const formatDate = (date) => {
    if (!date) return '-';

    try {
      const parsed = new Date(date);

      if (Number.isNaN(parsed.getTime())) {
        return String(date);
      }

      return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(date);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.green}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              Prescriptions
            </Text>

            <Text style={styles.headerSubtitle}>
              Verify customer prescriptions
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>RX</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {pendingCount}
            </Text>
            <Text style={styles.summaryLabel}>
              Pending
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.greenNumber]}>
              {approvedCount}
            </Text>
            <Text style={styles.summaryLabel}>
              Approved
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.redNumber]}>
              {rejectedCount}
            </Text>
            <Text style={styles.summaryLabel}>
              Rejected
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={COLORS.green}
            />

            <Text style={styles.loadingTitle}>
              Loading prescriptions
            </Text>

            <Text style={styles.loadingText}>
              Checking customer submissions...
            </Text>
          </View>
        ) : prescriptions.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>RX</Text>
            </View>

            <Text style={styles.emptyTitle}>
              No prescriptions yet
            </Text>

            <Text style={styles.emptyText}>
              Customer-uploaded prescriptions will appear here for verification.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {prescriptions.map((item, index) => {
              const status = getStatusStyle(item.status);

              const customerName =
                item.customer?.name ||
                item.customer?.email ||
                'Customer';

              const customerEmail =
                item.customer?.email || '-';

              return (
                <View
                  key={item._id || index}
                  style={styles.card}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.fileIcon}>
                      <Text style={styles.fileIconText}>
                        {item.fileType === 'pdf' ? 'PDF' : 'IMG'}
                      </Text>
                    </View>

                    <View style={styles.fileInfo}>
                      <Text
                        style={styles.fileName}
                        numberOfLines={2}
                      >
                        {item.originalName ||
                          item.fileName ||
                          'Prescription'}
                      </Text>

                      <Text style={styles.dateText}>
                        Uploaded {formatDate(item.createdAt)}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, status.badge]}>
                      <Text style={[styles.statusText, status.text]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.customerBox}>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerLabel}>
                        Customer
                      </Text>

                      <Text style={styles.customerValue}>
                        {customerName}
                      </Text>
                    </View>

                    <View style={styles.customerRow}>
                      <Text style={styles.customerLabel}>
                        Email
                      </Text>

                      <Text
                        style={styles.customerValue}
                        numberOfLines={1}
                      >
                        {customerEmail}
                      </Text>
                    </View>
                  </View>

                  {item.rejectionReason ? (
                    <View style={styles.reasonBox}>
                      <Text style={styles.reasonTitle}>
                        Rejection reason
                      </Text>

                      <Text style={styles.reasonText}>
                        {item.rejectionReason}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => openPrescription(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.viewButtonText}>
                      View Prescription
                    </Text>
                  </TouchableOpacity>

                  {item.status === 'pending' ? (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => openRejectModal(item)}
                        disabled={actionLoading}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.rejectButtonText}>
                          Reject
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => approvePrescription(item)}
                        disabled={actionLoading}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.approveButtonText}>
                          Approve
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {item.status === 'approved' ? (
                    <View style={styles.approvedInfo}>
                      <Text style={styles.approvedInfoText}>
                        ✓ Verified and approved
                      </Text>

                      {item.verifiedAt ? (
                        <Text style={styles.verifiedDate}>
                          {formatDate(item.verifiedAt)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!actionLoading) {
            setRejectModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Reject Prescription
            </Text>

            <Text style={styles.modalSubtitle}>
              Enter a clear reason so the customer knows why the prescription was rejected.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Example: Prescription is expired or unreadable"
              placeholderTextColor="#9AA6A1"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              textAlignVertical="top"
              editable={!actionLoading}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  if (!actionLoading) {
                    setRejectModalVisible(false);
                  }
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalRejectButton}
                onPress={rejectPrescription}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalRejectText}>
                    Reject
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
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  header: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 2,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  backText: {
    fontSize: 30,
    color: COLORS.text,
    lineHeight: 32,
    marginTop: -3,
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerIconText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.green,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  summaryCard: {
    width: '31.5%',
    backgroundColor: COLORS.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 13,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.orange,
  },

  greenNumber: {
    color: COLORS.green,
  },

  redNumber: {
    color: COLORS.red,
  },

  summaryLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '700',
  },

  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 50,
    alignItems: 'center',
  },

  loadingTitle: {
    marginTop: 13,
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
  },

  loadingText: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 45,
    paddingHorizontal: 25,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 13,
  },

  emptyIconText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.green,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  list: {
    gap: 11,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    elevation: 1,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: COLORS.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  fileIconText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.blue,
  },

  fileInfo: {
    flex: 1,
    paddingRight: 6,
  },

  fileName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 18,
  },

  dateText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  pendingBadge: {
    backgroundColor: COLORS.orangeLight,
  },

  pendingText: {
    color: COLORS.orange,
  },

  approvedBadge: {
    backgroundColor: COLORS.greenLight,
  },

  approvedText: {
    color: COLORS.green,
  },

  rejectedBadge: {
    backgroundColor: COLORS.redLight,
  },

  rejectedText: {
    color: COLORS.red,
  },

  customerBox: {
    backgroundColor: COLORS.muted,
    borderRadius: 11,
    padding: 10,
    marginTop: 12,
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  customerRowLast: {
    marginBottom: 0,
  },

  customerLabel: {
    width: 65,
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  customerValue: {
    flex: 1,
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '800',
  },

  reasonBox: {
    backgroundColor: COLORS.redLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },

  reasonTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.red,
  },

  reasonText: {
    fontSize: 10,
    color: COLORS.text,
    marginTop: 4,
    lineHeight: 15,
  },

  viewButton: {
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 11,
  },

  viewButtonText: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: '900',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 9,
  },

  rejectButton: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.redLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rejectButtonText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: '900',
  },

  approveButton: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },

  approveButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  approvedInfo: {
    marginTop: 10,
    backgroundColor: COLORS.greenLight,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  approvedInfoText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '900',
  },

  verifiedDate: {
    color: COLORS.textSecondary,
    fontSize: 9,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },

  modalSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 5,
    marginBottom: 13,
  },

  reasonInput: {
    minHeight: 105,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
  },

  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '900',
  },

  modalRejectButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalRejectText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  bottomSpace: {
    height: 20,
  },
});
