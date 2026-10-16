import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  approvePrescription,
  getPharmacyPrescriptions,
  rejectPrescription,
} from '../services/prescriptionService';

// =====================================================
// PRODUCTION BACKEND
// =====================================================

const BASE_URL =
  'https://medtracker-1.onrender.com';

// =====================================================
// SCREEN
// =====================================================

export default function PharmacyPrescriptions() {
  const [
    prescriptions,
    setPrescriptions,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  // ===================================================
  // LOAD PRESCRIPTIONS
  // ===================================================

  const loadPrescriptions = async (
    showLoader = true
  ) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const result =
        await getPharmacyPrescriptions();

      const data =
        Array.isArray(result)
          ? result
          : Array.isArray(
              result?.prescriptions
            )
          ? result.prescriptions
          : [];

      setPrescriptions(data);

    } catch (error) {
      console.log(
        'Load pharmacy prescriptions error:',
        error
      );

      Alert.alert(
        'Unable to load prescriptions',
        error?.message ||
          'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===================================================
  // LOAD WHEN SCREEN GETS FOCUS
  // ===================================================

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions();
    }, [])
  );

  // ===================================================
  // REFRESH
  // ===================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadPrescriptions(false);
  };

  // ===================================================
  // STATUS STYLE
  // ===================================================

  const getStatusStyle = (
    status
  ) => {
    switch (status) {
      case 'approved':
        return {
          badge:
            styles.approvedBadge,
          text:
            styles.approvedText,
          label: 'APPROVED',
        };

      case 'rejected':
        return {
          badge:
            styles.rejectedBadge,
          text:
            styles.rejectedText,
          label: 'REJECTED',
        };

      default:
        return {
          badge:
            styles.pendingBadge,
          text:
            styles.pendingText,
          label: 'PENDING',
        };
    }
  };

  // ===================================================
  // GET PRESCRIPTION FILE URL
  // ===================================================

  const getFileUrl = (
    fileUrl
  ) => {
    if (!fileUrl) {
      return null;
    }

    const cleanUrl =
      String(fileUrl).trim();

    // Already complete URL
    if (
      cleanUrl.startsWith(
        'http://'
      ) ||
      cleanUrl.startsWith(
        'https://'
      )
    ) {
      return cleanUrl;
    }

    // Backend normally returns:
    //
    // /api/prescriptions/:id/file/:token
    //
    if (
      cleanUrl.startsWith('/')
    ) {
      return `${BASE_URL}${cleanUrl}`;
    }

    return `${BASE_URL}/${cleanUrl}`;
  };

  // ===================================================
  // OPEN PRESCRIPTION
  // ===================================================

  const openPrescription = async (
    prescription
  ) => {
    try {
      const url =
        getFileUrl(
          prescription?.fileUrl
        );

      console.log(
        '📄 Prescription URL:',
        url
      );

      if (!url) {
        Alert.alert(
          'File unavailable',
          'Prescription file URL is missing.'
        );
        return;
      }

      const supported =
        await Linking.canOpenURL(
          url
        );

      if (!supported) {
        Alert.alert(
          'Cannot open file',
          'This device cannot open the prescription file.'
        );
        return;
      }

      await Linking.openURL(
        url
      );

    } catch (error) {
      console.log(
        '❌ Open prescription error:',
        error
      );

      Alert.alert(
        'Unable to open',
        'Could not open the prescription file.'
      );
    }
  };

  // ===================================================
  // APPROVE PRESCRIPTION
  // ===================================================

  const handleApprove = async (
    prescription
  ) => {
    if (
      !prescription?._id
    ) {
      return;
    }

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

              await approvePrescription(
                prescription._id
              );

              Alert.alert(
                'Success',
                'Prescription approved successfully.'
              );

              await loadPrescriptions(
                false
              );

            } catch (error) {
              console.log(
                'Approve prescription error:',
                error
              );

              Alert.alert(
                'Approval Failed',
                error?.message ||
                  'Unable to approve prescription.'
              );
            } finally {
              setActionLoading(
                false
              );
            }
          },
        },
      ]
    );
  };

  // ===================================================
  // REJECT PRESCRIPTION
  // ===================================================

  const handleReject = async (
    prescription
  ) => {
    if (
      !prescription?._id
    ) {
      return;
    }

    Alert.prompt(
      'Reject Prescription',
      'Enter the reason for rejection:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Reject',
          style: 'destructive',

          onPress: async (
            reason
          ) => {
            const rejectionReason =
              String(
                reason || ''
              ).trim();

            if (
              !rejectionReason
            ) {
              Alert.alert(
                'Reason Required',
                'Please enter a rejection reason.'
              );
              return;
            }

            try {
              setActionLoading(
                true
              );

              await rejectPrescription(
                prescription._id,
                rejectionReason
              );

              Alert.alert(
                'Prescription Rejected',
                'Prescription rejected successfully.'
              );

              await loadPrescriptions(
                false
              );

            } catch (error) {
              console.log(
                'Reject prescription error:',
                error
              );

              Alert.alert(
                'Rejection Failed',
                error?.message ||
                  'Unable to reject prescription.'
              );
            } finally {
              setActionLoading(
                false
              );
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // ===================================================
  // RENDER PRESCRIPTION CARD
  // ===================================================

  const renderPrescription = ({
    item,
  }) => {
    const status =
      getStatusStyle(
        item?.status
      );

    const customerName =
      item?.customer?.name ||
      item?.customer?.email ||
      'Customer';

    const customerEmail =
      item?.customer?.email ||
      '';

    const medicines =
      Array.isArray(
        item?.medicines
      )
        ? item.medicines
        : [];

    const createdDate =
      item?.createdAt
        ? new Date(
            item.createdAt
          ).toLocaleString()
        : 'Date unavailable';

    return (
      <View
        style={
          styles.card
        }
      >
        {/* =========================================
            HEADER
        ========================================= */}

        <View
          style={
            styles.cardHeader
          }
        >
          <View
            style={
              styles.headerLeft
            }
          >
            <Text
              style={
                styles.prescriptionTitle
              }
            >
              Prescription
            </Text>

            <Text
              style={
                styles.dateText
              }
            >
              {createdDate}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              status.badge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                status.text,
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        {/* =========================================
            CUSTOMER
        ========================================= */}

        <View
          style={
            styles.infoSection
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Customer
          </Text>

          <Text
            style={
              styles.customerName
            }
          >
            {customerName}
          </Text>

          {customerEmail ? (
            <Text
              style={
                styles.emailText
              }
            >
              {customerEmail}
            </Text>
          ) : null}
        </View>

        {/* =========================================
            ORDER
        ========================================= */}

        {item?.order ? (
          <View
            style={
              styles.infoSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Order
            </Text>

            <Text
              style={
                styles.normalText
              }
            >
              {item.order.orderNumber ||
                item.order._id ||
                'Order'}
            </Text>

            {item.order.orderStatus ? (
              <Text
                style={
                  styles.secondaryText
                }
              >
                Status:{' '}
                {
                  item.order
                    .orderStatus
                }
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* =========================================
            MEDICINES
        ========================================= */}

        {medicines.length > 0 ? (
          <View
            style={
              styles.infoSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Medicines
            </Text>

            {medicines.map(
              (
                medicine,
                index
              ) => (
                <View
                  key={
                    medicine?._id ||
                    index
                  }
                  style={
                    styles.medicineRow
                  }
                >
                  <Text
                    style={
                      styles.medicineName
                    }
                  >
                    {medicine?.name ||
                      'Medicine'}
                  </Text>

                  {medicine?.brand ? (
                    <Text
                      style={
                        styles.secondaryText
                      }
                    >
                      {medicine.brand}
                    </Text>
                  ) : null}
                </View>
              )
            )}
          </View>
        ) : null}

        {/* =========================================
            FILE INFO
        ========================================= */}

        <View
          style={
            styles.fileSection
          }
        >
          <Text
            style={
              styles.fileIcon
            }
          >
            📄
          </Text>

          <View
            style={
              styles.fileInfo
            }
          >
            <Text
              style={
                styles.fileName
              }
              numberOfLines={2}
            >
              {item?.originalName ||
                item?.fileName ||
                'Prescription file'}
            </Text>

            <Text
              style={
                styles.fileType
              }
            >
              {item?.fileType ===
              'pdf'
                ? 'PDF'
                : 'Image'}
            </Text>
          </View>
        </View>

        {/* =========================================
            REJECTION REASON
        ========================================= */}

        {item?.status ===
          'rejected' &&
        item?.rejectionReason ? (
          <View
            style={
              styles.rejectionBox
            }
          >
            <Text
              style={
                styles.rejectionTitle
              }
            >
              Rejection Reason
            </Text>

            <Text
              style={
                styles.rejectionText
              }
            >
              {
                item.rejectionReason
              }
            </Text>
          </View>
        ) : null}

        {/* =========================================
            ACTION BUTTONS
        ========================================= */}

        <View
          style={
            styles.actionContainer
          }
        >
          {/* VIEW */}

          <TouchableOpacity
            style={
              styles.viewButton
            }
            activeOpacity={0.8}
            onPress={() =>
              openPrescription(
                item
              )
            }
            disabled={
              actionLoading
            }
          >
            <Text
              style={
                styles.viewButtonText
              }
            >
              View Prescription
            </Text>
          </TouchableOpacity>

          {/* APPROVE / REJECT */}

          {item?.status ===
          'pending' ? (
            <View
              style={
                styles.reviewRow
              }
            >
              <TouchableOpacity
                style={
                  styles.approveButton
                }
                activeOpacity={0.8}
                onPress={() =>
                  handleApprove(
                    item
                  )
                }
                disabled={
                  actionLoading
                }
              >
                <Text
                  style={
                    styles.approveText
                  }
                >
                  Approve
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.rejectButton
                }
                activeOpacity={0.8}
                onPress={() =>
                  handleReject(
                    item
                  )
                }
                disabled={
                  actionLoading
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
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (
    loading &&
    !refreshing
  ) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading prescriptions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // MAIN UI
  // ===================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <View
        style={
          styles.header
        }
      >
        <View>
          <Text
            style={
              styles.headerTitle
            }
          >
            Prescriptions
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Review customer prescriptions
          </Text>
        </View>

        <View
          style={
            styles.countBadge
          }
        >
          <Text
            style={
              styles.countText
            }
          >
            {prescriptions.length}
          </Text>
        </View>
      </View>

      {/* =========================================
          SUMMARY
      ========================================= */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.summaryContainer
        }
      >
        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryNumber
            }
          >
            {
              prescriptions.filter(
                (item) =>
                  item?.status ===
                  'pending'
              ).length
            }
          </Text>

          <Text
            style={
              styles.summaryLabel
            }
          >
            Pending
          </Text>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryNumber
            }
          >
            {
              prescriptions.filter(
                (item) =>
                  item?.status ===
                  'approved'
              ).length
            }
          </Text>

          <Text
            style={
              styles.summaryLabel
            }
          >
            Approved
          </Text>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryNumber
            }
          >
            {
              prescriptions.filter(
                (item) =>
                  item?.status ===
                  'rejected'
              ).length
            }
          </Text>

          <Text
            style={
              styles.summaryLabel
            }
          >
            Rejected
          </Text>
        </View>
      </ScrollView>

      {/* =========================================
          PRESCRIPTION LIST
      ========================================= */}

      <FlatList
        data={
          prescriptions
        }
        keyExtractor={(
          item,
          index
        ) =>
          String(
            item?._id ||
              item?.id ||
              index
          )
        }
        renderItem={
          renderPrescription
        }
        contentContainerStyle={
          prescriptions.length ===
          0
            ? styles.emptyList
            : styles.listContainer
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
        ListEmptyComponent={
          <View
            style={
              styles.emptyContainer
            }
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              📄
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No Prescriptions
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Customer prescriptions
              will appear here.
            </Text>
          </View>
        }
      />

      {/* =========================================
          GLOBAL ACTION LOADING
      ========================================= */}

      {actionLoading ? (
        <View
          style={
            styles.actionLoadingOverlay
          }
        >
          <View
            style={
              styles.actionLoadingBox
            }
          >
            <ActivityIndicator
              size="large"
            />

            <Text
              style={
                styles.actionLoadingText
              }
            >
              Updating prescription...
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F7F8FA',
    },

    // ================================================
    // HEADER
    // ================================================

    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    headerTitle: {
      fontSize: 25,
      fontWeight: '800',
      color: '#111827',
    },

    headerSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: '#6B7280',
    },

    countBadge: {
      minWidth: 42,
      height: 42,
      paddingHorizontal: 10,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#E8F1FF',
    },

    countText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#2563EB',
    },

    // ================================================
    // SUMMARY
    // ================================================

    summaryContainer: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 10,
    },

    summaryCard: {
      width: 105,
      minHeight: 78,
      borderRadius: 14,
      backgroundColor:
        '#FFFFFF',
      padding: 12,
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        '#E5E7EB',
    },

    summaryNumber: {
      fontSize: 22,
      fontWeight: '800',
      color: '#111827',
    },

    summaryLabel: {
      marginTop: 2,
      fontSize: 12,
      color: '#6B7280',
    },

    // ================================================
    // LIST
    // ================================================

    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 30,
    },

    emptyList: {
      flexGrow: 1,
      justifyContent:
        'center',
      padding: 30,
    },

    // ================================================
    // CARD
    // ================================================

    card: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        '#E5E7EB',

      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 2,
      },

      elevation: 2,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 15,
    },

    headerLeft: {
      flex: 1,
      paddingRight: 10,
    },

    prescriptionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#111827',
    },

    dateText: {
      marginTop: 4,
      fontSize: 12,
      color: '#6B7280',
    },

    // ================================================
    // STATUS
    // ================================================

    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },

    statusText: {
      fontSize: 10,
      fontWeight: '800',
    },

    pendingBadge: {
      backgroundColor:
        '#FEF3C7',
    },

    pendingText: {
      color: '#92400E',
    },

    approvedBadge: {
      backgroundColor:
        '#DCFCE7',
    },

    approvedText: {
      color: '#166534',
    },

    rejectedBadge: {
      backgroundColor:
        '#FEE2E2',
    },

    rejectedText: {
      color: '#991B1B',
    },

    // ================================================
    // INFO
    // ================================================

    infoSection: {
      marginBottom: 14,
      paddingTop: 2,
    },

    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#9CA3AF',
      textTransform:
        'uppercase',
      marginBottom: 5,
      letterSpacing: 0.5,
    },

    customerName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1F2937',
    },

    emailText: {
      marginTop: 2,
      fontSize: 12,
      color: '#6B7280',
    },

    normalText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
    },

    secondaryText: {
      marginTop: 2,
      fontSize: 12,
      color: '#6B7280',
    },

    // ================================================
    // MEDICINES
    // ================================================

    medicineRow: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginBottom: 5,
      borderRadius: 8,
      backgroundColor:
        '#F9FAFB',
    },

    medicineName: {
      fontSize: 13,
      fontWeight: '700',
      color: '#374151',
    },

    // ================================================
    // FILE
    // ================================================

    fileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor:
        '#F3F4F6',
    },

    fileIcon: {
      fontSize: 26,
      marginRight: 10,
    },

    fileInfo: {
      flex: 1,
    },

    fileName: {
      fontSize: 13,
      fontWeight: '700',
      color: '#374151',
    },

    fileType: {
      marginTop: 3,
      fontSize: 11,
      color: '#6B7280',
      textTransform:
        'uppercase',
    },

    // ================================================
    // REJECTION
    // ================================================

    rejectionBox: {
      padding: 12,
      marginBottom: 12,
      borderRadius: 10,
      backgroundColor:
        '#FEF2F2',
      borderWidth: 1,
      borderColor:
        '#FECACA',
    },

    rejectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#991B1B',
      marginBottom: 4,
    },

    rejectionText: {
      fontSize: 13,
      color: '#7F1D1D',
      lineHeight: 19,
    },

    // ================================================
    // ACTIONS
    // ================================================

    actionContainer: {
      marginTop: 2,
    },

    viewButton: {
      minHeight: 46,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#2563EB',
      paddingHorizontal: 15,
    },

    viewButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    reviewRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },

    approveButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#16A34A',
    },

    approveText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    rejectButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#DC2626',
    },

    rejectText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    // ================================================
    // LOADING
    // ================================================

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#6B7280',
    },

    // ================================================
    // EMPTY
    // ================================================

    emptyContainer: {
      alignItems: 'center',
      justifyContent:
        'center',
      padding: 30,
    },

    emptyIcon: {
      fontSize: 46,
      marginBottom: 12,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#111827',
    },

    emptyText: {
      marginTop: 6,
      textAlign: 'center',
      fontSize: 13,
      color: '#6B7280',
      lineHeight: 20,
    },

    // ================================================
    // ACTION LOADING
    // ================================================

    actionLoadingOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(0,0,0,0.18)',
    },

    actionLoadingBox: {
      minWidth: 190,
      padding: 22,
      borderRadius: 15,
      alignItems: 'center',
      backgroundColor:
        '#FFFFFF',
    },

    actionLoadingText: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: '600',
      color: '#374151',
    },
  });