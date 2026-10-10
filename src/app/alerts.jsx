import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getAlerts,
  getUnreadAlertCount,
  markAlertAsRead,
  markAllAlertsAsRead,
  sendEmailAlert,
} from '../services/api';


// =====================================================
// COLORS
// =====================================================

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

  amber: '#A56A00',
  amberLight: '#FFF4DC',

  gray: '#737B77',
  grayLight: '#EEF1F0',
};


// =====================================================
// MAIN
// =====================================================

export default function Alerts() {

  const router = useRouter();

  const [activeTab, setActiveTab] =
    useState('all');

  const [alerts, setAlerts] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
    useState(null);

  const [markingAll, setMarkingAll] =
    useState(false);


  // =====================================================
  // LOAD ALERTS
  // =====================================================

  const loadAlerts = async (
    showLoader = true
  ) => {

    try {

      if (showLoader) {
        setLoading(true);
      }

      const [
        alertsData,
        unreadData,
      ] = await Promise.all([
        getAlerts(),
        getUnreadAlertCount(),
      ]);


      // Backend currently returns array
      setAlerts(
        Array.isArray(alertsData)
          ? alertsData
          : []
      );


      setUnreadCount(
        Number(
          unreadData?.count || 0
        )
      );

    } catch (error) {

      console.log(
        'Alerts loading error:',
        error
      );

      Alert.alert(
        'Unable to Load Alerts',
        error.message ||
          'Failed to load notifications.'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  };


  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {

    setRefreshing(true);

    await loadAlerts(false);

  };


  // =====================================================
  // SCREEN FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {

      loadAlerts();

    }, [])
  );


  // =====================================================
  // TABS
  // =====================================================

  const tabs = [
    {
      key: 'all',
      label: 'All',
    },

    {
      key: 'unread',
      label: 'Unread',
    },

    {
      key: 'critical',
      label: 'Critical',
    },

    {
      key: 'warning',
      label: 'Warning',
    },

    {
      key: 'caution',
      label: 'Caution',
    },

    {
      key: 'expired',
      label: 'Expired',
    },

    {
      key: 'lowstock',
      label: 'Low Stock',
    },
  ];


  // =====================================================
  // COLOR
  // =====================================================

  const getColor = (type) => {

    if (type === 'critical') {
      return COLORS.red;
    }

    if (type === 'warning') {
      return COLORS.amber;
    }

    if (type === 'caution') {
      return '#B88718';
    }

    if (type === 'expired') {
      return COLORS.gray;
    }

    if (type === 'lowstock') {
      return COLORS.green;
    }

    return COLORS.green;
  };


  // =====================================================
  // ICON
  // =====================================================

  const getIcon = (type) => {

    if (type === 'critical') {
      return '!';
    }

    if (type === 'warning') {
      return '!';
    }

    if (type === 'caution') {
      return '!';
    }

    if (type === 'expired') {
      return '×';
    }

    if (type === 'lowstock') {
      return '↓';
    }

    return '•';
  };


  // =====================================================
  // NORMALIZE ALERT
  // =====================================================

  const normalizeAlert = (item) => {

    return {

      ...item,

      id:
        item._id ||
        item.id,

      type:
        item.alertType ||
        item.type ||
        'warning',

      name:
        item.medicineName ||
        item.name ||
        'Unknown Medicine',

      batch:
        item.batchNumber ||
        item.batch ||
        'N/A',

      expiry:
        item.expiryDate ||
        item.expiry,

      qty:
        item.quantity ??
        item.qty ??
        0,

      daysLeft:
        item.daysLeft,

      isRead:
        item.isRead === true,

    };

  };


  // =====================================================
  // MARK SINGLE ALERT AS READ
  // =====================================================

  const handleMarkRead = async (item) => {

    const alertId =
      item._id ||
      item.id;

    if (!alertId) {
      return;
    }

    if (item.isRead) {
      return;
    }

    try {

      setProcessingId(alertId);

      await markAlertAsRead(
        alertId
      );

      setAlerts((previous) =>
        previous.map((alert) => {

          const id =
            alert._id ||
            alert.id;

          if (id !== alertId) {
            return alert;
          }

          return {
            ...alert,
            isRead: true,
            readAt: new Date().toISOString(),
          };

        })
      );


      setUnreadCount(
        (previous) =>
          Math.max(previous - 1, 0)
      );

    } catch (error) {

      console.log(
        'Mark read error:',
        error
      );

      Alert.alert(
        'Error',
        error.message ||
          'Unable to mark notification as read.'
      );

    } finally {

      setProcessingId(null);

    }
  };


  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const handleMarkAllRead = async () => {

    if (unreadCount === 0) {
      return;
    }

    try {

      setMarkingAll(true);

      await markAllAlertsAsRead();


      setAlerts((previous) =>
        previous.map((alert) => ({
          ...alert,

          isRead: true,

          readAt:
            alert.readAt ||
            new Date().toISOString(),

        }))
      );


      setUnreadCount(0);

    } catch (error) {

      console.log(
        'Mark all read error:',
        error
      );

      Alert.alert(
        'Error',
        error.message ||
          'Unable to mark all notifications as read.'
      );

    } finally {

      setMarkingAll(false);

    }
  };


  // =====================================================
  // EXPIRED → QR REMOVAL
  // =====================================================

  const handleExpiredRemoval = async (
    item
  ) => {

    await handleMarkRead(item);

    Alert.alert(
      'QR Verification Required',

      `You are trying to remove:\n\n` +
        `${item.name}\n` +
        `Batch: ${item.batch}\n` +
        `Qty: ${item.qty} units\n\n` +
        `QR verification is required before physical removal.`,

      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Scan QR',

          onPress: () => {

            router.push({
              pathname: '/qr-removal',

              params: {
                medicineId:
                  item.medicineId ||
                  item.medicine?._id ||
                  '',
              },

            });

          },

        },

      ]
    );
  };


  // =====================================================
  // LOW STOCK
  // =====================================================

  const handleReorder = async (
    item
  ) => {

    await handleMarkRead(item);

    Alert.alert(
      'Reorder Suggestion',

      `${item.name}\n\n` +
        `Current Stock: ${item.qty} units\n\n` +
        `Suggested action:\n` +
        `Restock this medicine.`,

      [
        {
          text: 'OK',
          style: 'default',
        },
      ]
    );
  };


  // =====================================================
  // SEND INDIVIDUAL EMAIL ALERT
  // =====================================================

  const handleSendAlert = async (
    item
  ) => {

    try {

      setProcessingId(
        item.id
      );

      const medicineData = [
        {
          name: item.name,

          batchNumber:
            item.batch,

          quantity:
            item.qty,

          status:
            item.type,

          daysLeft:
            item.daysLeft,
        },
      ];


      await sendEmailAlert(
        medicineData
      );


      await handleMarkRead(item);


      Alert.alert(
        'Alert Sent',
        `Alert sent for ${item.name}.`
      );

    } catch (error) {

      console.log(
        'Send alert error:',
        error
      );

      Alert.alert(
        'Alert',
        error.message ||
          'Unable to send email alert.'
      );

    } finally {

      setProcessingId(null);

    }
  };


  // =====================================================
  // MAIN ACTION
  // =====================================================

  const handleAction = (
    item
  ) => {

    if (
      item.type === 'expired'
    ) {

      handleExpiredRemoval(
        item
      );

      return;
    }


    if (
      item.type === 'lowstock'
    ) {

      handleReorder(
        item
      );

      return;
    }


    handleSendAlert(item);

  };


  // =====================================================
  // FILTER
  // =====================================================

  const normalizedAlerts =
    alerts.map(
      normalizeAlert
    );


  const filtered =
    normalizedAlerts.filter(
      (item) => {

        if (
          activeTab === 'unread'
        ) {

          return !item.isRead;

        }


        if (
          activeTab === 'all'
        ) {

          return true;

        }


        return (
          item.type ===
          activeTab
        );

      }
    );


  // =====================================================
  // COUNTS
  // =====================================================

  const getCount = (
    type
  ) => {

    return normalizedAlerts.filter(
      (item) =>
        item.type === type
    ).length;

  };


  const criticalCount =
    getCount('critical');

  const warningCount =
    getCount('warning');

  const expiredCount =
    getCount('expired');

  const lowStockCount =
    getCount('lowstock');


  // =====================================================
  // SUMMARY
  // =====================================================

  const summaryItems = [

    {
      label: 'Critical',
      count: criticalCount,
      type: 'critical',
    },

    {
      label: 'Warning',
      count: warningCount,
      type: 'warning',
    },

    {
      label: 'Expired',
      count: expiredCount,
      type: 'expired',
    },

    {
      label: 'Low Stock',
      count: lowStockCount,
      type: 'lowstock',
    },

  ];


  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    date
  ) => {

    if (!date) {
      return 'N/A';
    }

    try {

      return new Date(
        date
      ).toLocaleDateString(
        'en-GB'
      );

    } catch {

      return 'N/A';

    }
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <View
        style={
          styles.loadingContainer
        }
      >

        <View
          style={
            styles.loadingIcon
          }
        >

          <ActivityIndicator
            size="small"
            color={
              COLORS.green
            }
          />

        </View>


        <Text
          style={
            styles.loadingTitle
          }
        >
          Loading notifications
        </Text>


        <Text
          style={
            styles.loadingText
          }
        >
          Checking medicine status...
        </Text>

      </View>

    );

  }


  // =====================================================
  // UI
  // =====================================================

  return (

    <View
      style={styles.container}
    >

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

            tintColor={
              COLORS.green
            }

          />

        }

        contentContainerStyle={
          styles.contentContainer
        }

      >

        {/* ============================================
            HEADER
        ============================================ */}

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

            activeOpacity={0.75}

          >

            <Text
              style={
                styles.backArrow
              }
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
              style={
                styles.headerTitle
              }
            >
              Notifications
            </Text>


            <Text
              style={
                styles.headerSubtitle
              }
            >
              Medicine stock and expiry alerts
            </Text>

          </View>


          <View
            style={
              styles.notificationBadge
            }
          >

            <Text
              style={
                styles.notificationBadgeText
              }
            >
              {unreadCount}
            </Text>

          </View>

        </View>


        {/* ============================================
            UNREAD SUMMARY
        ============================================ */}

        <View
          style={
            styles.unreadCard
          }
        >

          <View
            style={
              styles.unreadIcon
            }
          >

            <Text
              style={
                styles.unreadIconText
              }
            >
              !
            </Text>

          </View>


          <View
            style={
              styles.unreadContent
            }
          >

            <Text
              style={
                styles.unreadTitle
              }
            >
              {unreadCount === 0
                ? 'All notifications read'
                : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            </Text>


            <Text
              style={
                styles.unreadSubtitle
              }
            >
              Stay updated on medicine stock and expiry status.
            </Text>

          </View>


          {unreadCount > 0 && (

            <TouchableOpacity

              style={
                styles.markAllButton
              }

              onPress={
                handleMarkAllRead
              }

              disabled={
                markingAll
              }

              activeOpacity={0.8}

            >

              {markingAll ? (

                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.green
                  }
                />

              ) : (

                <Text
                  style={
                    styles.markAllText
                  }
                >
                  Read all
                </Text>

              )}

            </TouchableOpacity>

          )}

        </View>


        {/* ============================================
            SUMMARY
        ============================================ */}

        <View
          style={
            styles.summarySection
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Alert Summary
          </Text>


          <ScrollView

            horizontal

            showsHorizontalScrollIndicator={
              false
            }

            contentContainerStyle={
              styles.summaryScroll
            }

          >

            {summaryItems.map(
              (item) => {

                const color =
                  getColor(
                    item.type
                  );


                return (

                  <View

                    key={
                      item.type
                    }

                    style={[
                      styles.summaryCard,

                      {
                        borderTopColor:
                          color,
                      },

                    ]}

                  >

                    <View
                      style={[
                        styles.summaryIcon,

                        {
                          backgroundColor:
                            color +
                            '18',
                        },

                      ]}
                    >

                      <Text
                        style={[
                          styles.summaryIconText,

                          {
                            color:
                              color,
                          },

                        ]}
                      >
                        {getIcon(
                          item.type
                        )}
                      </Text>

                    </View>


                    <Text
                      style={[
                        styles.summaryCount,

                        {
                          color:
                            color,
                        },

                      ]}
                    >
                      {item.count}
                    </Text>


                    <Text
                      style={
                        styles.summaryLabel
                      }
                    >
                      {item.label}
                    </Text>

                  </View>

                );

              }
            )}

          </ScrollView>

        </View>


        {/* ============================================
            FILTER
        ============================================ */}

        <View
          style={
            styles.tabsSection
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Filter
          </Text>


          <ScrollView

            horizontal

            showsHorizontalScrollIndicator={
              false
            }

            contentContainerStyle={
              styles.tabsScroll
            }

          >

            {tabs.map(
              (tab) => {

                const isActive =
                  activeTab ===
                  tab.key;


                return (

                  <TouchableOpacity

                    key={
                      tab.key
                    }

                    style={[
                      styles.tab,

                      isActive &&
                        styles.tabActive,
                    ]}

                    onPress={() =>
                      setActiveTab(
                        tab.key
                      )
                    }

                    activeOpacity={0.8}

                  >

                    <Text
                      style={[
                        styles.tabText,

                        isActive &&
                          styles.tabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>

                  </TouchableOpacity>

                );

              }
            )}

          </ScrollView>

        </View>


        {/* ============================================
            LIST HEADER
        ============================================ */}

        <View
          style={
            styles.listHeader
          }
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Notifications
            </Text>


            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {filtered.length}{' '}
              notification
              {filtered.length !== 1
                ? 's'
                : ''}{' '}
              found
            </Text>

          </View>


          <TouchableOpacity

            style={
              styles.refreshButton
            }

            onPress={
              handleRefresh
            }

            activeOpacity={0.8}

          >

            <Text
              style={
                styles.refreshText
              }
            >
              Refresh
            </Text>

          </TouchableOpacity>

        </View>


        {/* ============================================
            EMPTY
        ============================================ */}

        {filtered.length === 0 ? (

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
              {activeTab ===
              'unread'
                ? 'All Caught Up'
                : 'All Clear'}
            </Text>


            <Text
              style={
                styles.emptyText
              }
            >
              {activeTab ===
              'unread'
                ? 'You have no unread notifications.'
                : 'No notifications found in this category.'}
            </Text>

          </View>

        ) : (

          <View>

            {filtered.map(
              (item, index) => {

                const alertId =
                  item.id ||
                  index;

                const color =
                  getColor(
                    item.type
                  );

                const isCritical =
                  item.type ===
                    'critical' ||
                  item.type ===
                    'expired';

                const isProcessing =
                  processingId ===
                  alertId;


                return (

                  <View

                    key={
                      alertId
                    }

                    style={[
                      styles.alertCard,

                      !item.isRead &&
                        styles.unreadAlertCard,

                      {
                        borderLeftColor:
                          color,
                      },

                    ]}

                  >

                    {/* =================================
                        TOP
                    ================================= */}

                    <View
                      style={
                        styles.alertTop
                      }
                    >

                      <View
                        style={
                          styles.alertLeft
                        }
                      >

                        <View
                          style={[
                            styles.alertIcon,

                            {
                              backgroundColor:
                                color +
                                '18',
                            },

                          ]}
                        >

                          <Text
                            style={[
                              styles.alertIconText,

                              {
                                color:
                                  color,
                              },

                            ]}
                          >
                            {getIcon(
                              item.type
                            )}
                          </Text>

                        </View>


                        <View
                          style={
                            styles.alertInfo
                          }
                        >

                          <View
                            style={
                              styles.nameRow
                            }
                          >

                            <Text
                              style={
                                styles.alertName
                              }

                              numberOfLines={
                                1
                              }
                            >
                              {item.name}
                            </Text>


                            {!item.isRead && (

                              <View
                                style={
                                  styles.unreadDot
                                }
                              />

                            )}

                          </View>


                          <Text
                            style={
                              styles.alertBrand
                            }
                          >
                            {item.brand ||
                              'Medicine alert'}
                          </Text>

                        </View>

                      </View>


                      <View
                        style={
                          styles.readStatus
                        }
                      >

                        <Text
                          style={[
                            styles.readStatusText,

                            {
                              color:
                                item.isRead
                                  ? COLORS.gray
                                  : COLORS.green,
                            },

                          ]}
                        >
                          {item.isRead
                            ? 'Read'
                            : 'New'}
                        </Text>

                      </View>

                    </View>


                    {/* =================================
                        TYPE
                    ================================= */}

                    <View
                      style={
                        styles.typeRow
                      }
                    >

                      <View
                        style={[
                          styles.typeBadge,

                          {
                            backgroundColor:
                              color +
                              '18',
                          },

                        ]}
                      >

                        <Text
                          style={[
                            styles.typeBadgeText,

                            {
                              color:
                                color,
                            },

                          ]}
                        >
                          {item.type
                            .toUpperCase()}
                        </Text>

                      </View>


                      {item.daysLeft !==
                        undefined &&
                        item.daysLeft !==
                          null && (

                          <Text
                            style={[
                              styles.daysText,

                              isCritical &&
                                styles.daysTextDanger,
                            ]}
                          >
                            {item.daysLeft <
                            0
                              ? 'Expired'
                              : item.daysLeft ===
                                  0
                                ? 'Expires today'
                                : `${item.daysLeft} days remaining`}
                          </Text>

                        )}

                    </View>


                    {/* =================================
                        DETAILS
                    ================================= */}

                    <View
                      style={
                        styles.alertDetails
                      }
                    >

                      <View
                        style={
                          styles.detailBox
                        }
                      >

                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Batch
                        </Text>


                        <Text
                          style={
                            styles.detailValue
                          }

                          numberOfLines={
                            1
                          }
                        >
                          {item.batch}
                        </Text>

                      </View>


                      <View
                        style={
                          styles.detailBox
                        }
                      >

                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Expiry
                        </Text>


                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {formatDate(
                            item.expiry
                          )}
                        </Text>

                      </View>


                      <View
                        style={[
                          styles.detailBox,
                          styles.detailBoxLast,
                        ]}
                      >

                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Stock
                        </Text>


                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {Number(
                            item.qty || 0
                          )}{' '}
                          units
                        </Text>

                      </View>

                    </View>


                    {/* =================================
                        ACTIONS
                    ================================= */}

                    <View
                      style={
                        styles.actionRow
                      }
                    >

                      {!item.isRead && (

                        <TouchableOpacity

                          style={
                            styles.readButton
                          }

                          onPress={() =>
                            handleMarkRead(
                              item
                            )
                          }

                          disabled={
                            isProcessing
                          }

                          activeOpacity={
                            0.8
                          }

                        >

                          {isProcessing ? (

                            <ActivityIndicator
                              size="small"
                              color={
                                COLORS.green
                              }
                            />

                          ) : (

                            <Text
                              style={
                                styles.readButtonText
                              }
                            >
                              Mark as Read
                            </Text>

                          )}

                        </TouchableOpacity>

                      )}


                      <TouchableOpacity

                        style={[
                          styles.actionButton,

                          {
                            backgroundColor:
                              color,
                          },

                          item.isRead &&
                            styles.actionButtonFull,
                        ]}

                        onPress={() =>
                          handleAction(
                            item
                          )
                        }

                        disabled={
                          isProcessing
                        }

                        activeOpacity={
                          0.85
                        }

                      >

                        <Text
                          style={
                            styles.actionButtonText
                          }
                        >

                          {item.type ===
                          'expired'
                            ? 'Remove Stock'
                            : item.type ===
                                'lowstock'
                              ? 'Reorder'
                              : 'Send Alert'}

                        </Text>

                      </TouchableOpacity>

                    </View>

                  </View>

                );

              }
            )}

          </View>

        )}


        {/* ============================================
            SEND ALL EMAIL ALERTS
        ============================================ */}

        {filtered.length >
          0 && (

          <TouchableOpacity

            style={
              styles.sendAllButton
            }

            onPress={() => {

              Alert.alert(

                'Send Alerts',

                'Do you want to send email alerts for all current notifications?',

                [

                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },

                  {
                    text: 'Send',

                    onPress:
                      async () => {

                        try {

                          const medicineData =
                            filtered.map(
                              (item) => ({

                                name:
                                  item.name,

                                batchNumber:
                                  item.batch,

                                quantity:
                                  item.qty,

                                status:
                                  item.type,

                                daysLeft:
                                  item.daysLeft,

                              })
                            );


                          await sendEmailAlert(
                            medicineData
                          );


                          Alert.alert(
                            'Alerts Sent',
                            'Email alert request completed.'
                          );

                        } catch (
                          error
                        ) {

                          Alert.alert(
                            'Alert',
                            error.message ||
                              'Unable to send alerts.'
                          );

                        }

                      },

                  },

                ]

              );

            }}

            activeOpacity={
              0.85
            }

          >

            <View
              style={
                styles.sendAllIcon
              }
            >

              <Text
                style={
                  styles.sendAllIconText
                }
              >
                @
              </Text>

            </View>


            <View
              style={
                styles.sendAllContent
              }
            >

              <Text
                style={
                  styles.sendAllTitle
                }
              >
                Send All Alerts
              </Text>


              <Text
                style={
                  styles.sendAllSubtitle
                }
              >
                Email current medicine notifications
              </Text>

            </View>


            <Text
              style={
                styles.sendAllArrow
              }
            >
              ›
            </Text>

          </TouchableOpacity>

        )}


        <View
          style={{
            height: 35,
          }}
        />

      </ScrollView>

    </View>

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
        COLORS.background,
    },


    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 30,
    },


    // =================================================
    // LOADING
    // =================================================

    loadingContainer: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
      backgroundColor:
        COLORS.background,
    },


    loadingIcon: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor:
        COLORS.greenLight,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginBottom: 12,
    },


    loadingTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: COLORS.text,
    },


    loadingText: {
      marginTop: 4,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },


    // =================================================
    // HEADER
    // =================================================

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 18,
    },


    backButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 11,
    },


    backArrow: {
      fontSize: 30,
      lineHeight: 32,
      color:
        COLORS.text,
      fontWeight: '400',
    },


    headerContent: {
      flex: 1,
    },


    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
      color:
        COLORS.text,
    },


    headerSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color:
        COLORS.textSecondary,
    },


    notificationBadge: {
      minWidth: 36,
      height: 32,
      paddingHorizontal: 9,
      borderRadius: 10,
      backgroundColor:
        COLORS.greenLight,
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    notificationBadgeText: {
      fontSize: 12,
      fontWeight: '900',
      color:
        COLORS.green,
    },


    // =================================================
    // UNREAD CARD
    // =================================================

    unreadCard: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      padding: 13,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 20,
    },


    unreadIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        COLORS.greenLight,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 10,
    },


    unreadIconText: {
      fontSize: 18,
      fontWeight: '900',
      color:
        COLORS.green,
    },


    unreadContent: {
      flex: 1,
    },


    unreadTitle: {
      fontSize: 13,
      fontWeight: '900',
      color:
        COLORS.text,
    },


    unreadSubtitle: {
      marginTop: 3,
      fontSize: 9,
      lineHeight: 14,
      color:
        COLORS.textSecondary,
    },


    markAllButton: {
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor:
        COLORS.greenLight,
      marginLeft: 7,
    },


    markAllText: {
      fontSize: 9,
      fontWeight: '900',
      color:
        COLORS.green,
    },


    // =================================================
    // SECTIONS
    // =================================================

    sectionTitle: {
      fontSize: 16,
      fontWeight: '900',
      color:
        COLORS.text,
    },


    sectionSubtitle: {
      marginTop: 3,
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },


    summarySection: {
      marginBottom: 20,
    },


    summaryScroll: {
      paddingTop: 11,
      paddingRight: 5,
    },


    // =================================================
    // SUMMARY
    // =================================================

    summaryCard: {
      width: 92,
      height: 112,
      backgroundColor:
        COLORS.white,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderTopWidth: 3,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },


    summaryIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginBottom: 5,
    },


    summaryIconText: {
      fontSize: 16,
      fontWeight: '900',
    },


    summaryCount: {
      fontSize: 21,
      fontWeight: '900',
    },


    summaryLabel: {
      marginTop: 2,
      fontSize: 9,
      color:
        COLORS.textSecondary,
      fontWeight: '600',
    },


    // =================================================
    // TABS
    // =================================================

    tabsSection: {
      marginBottom: 20,
    },


    tabsScroll: {
      paddingTop: 10,
      paddingRight: 5,
    },


    tab: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 8,
      marginRight: 7,
    },


    tabActive: {
      backgroundColor:
        COLORS.green,
      borderColor:
        COLORS.green,
    },


    tabText: {
      fontSize: 11,
      color:
        COLORS.textSecondary,
      fontWeight: '700',
    },


    tabTextActive: {
      color:
        COLORS.white,
    },


    // =================================================
    // LIST HEADER
    // =================================================

    listHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 12,
    },


    refreshButton: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },


    refreshText: {
      fontSize: 10,
      color:
        COLORS.green,
      fontWeight: '800',
    },


    // =================================================
    // ALERT CARD
    // =================================================

    alertCard: {
      backgroundColor:
        COLORS.white,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderLeftWidth: 4,
      padding: 14,
      marginBottom: 11,

      shadowColor:
        '#000000',

      shadowOpacity:
        0.025,

      shadowRadius:
        7,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      elevation: 1,
    },


    unreadAlertCard: {
      borderColor:
        '#D3E8DF',
      backgroundColor:
        '#FCFFFD',
    },


    alertTop: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },


    alertLeft: {
      flexDirection:
        'row',
      alignItems:
        'center',
      flex: 1,
      minWidth: 0,
    },


    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 10,
    },


    alertIconText: {
      fontSize: 18,
      fontWeight: '900',
    },


    alertInfo: {
      flex: 1,
      minWidth: 0,
    },


    nameRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      flexShrink: 1,
    },


    alertName: {
      fontSize: 14,
      fontWeight: '900',
      color:
        COLORS.text,
      flexShrink: 1,
    },


    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        COLORS.green,
      marginLeft: 6,
    },


    alertBrand: {
      marginTop: 3,
      fontSize: 10,
      color:
        COLORS.textSecondary,
    },


    readStatus: {
      marginLeft: 8,
    },


    readStatusText: {
      fontSize: 9,
      fontWeight: '800',
    },


    // =================================================
    // TYPE
    // =================================================

    typeRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 12,
      marginBottom: 11,
    },


    typeBadge: {
      borderRadius: 7,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },


    typeBadgeText: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.5,
    },


    daysText: {
      marginLeft: 8,
      fontSize: 10,
      color:
        COLORS.textSecondary,
      fontWeight: '600',
    },


    daysTextDanger: {
      color:
        COLORS.red,
      fontWeight: '800',
    },


    // =================================================
    // DETAILS
    // =================================================

    alertDetails: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      marginBottom: 12,
    },


    detailBox: {
      flex: 1,
      backgroundColor:
        COLORS.muted,
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 8,
      marginRight: 6,
    },


    detailBoxLast: {
      marginRight: 0,
    },


    detailLabel: {
      fontSize: 8,
      color:
        COLORS.textSecondary,
      marginBottom: 3,
    },


    detailValue: {
      fontSize: 10,
      fontWeight: '800',
      color:
        COLORS.text,
    },


    // =================================================
    // ACTIONS
    // =================================================

    actionRow: {
      flexDirection:
        'row',
      gap: 7,
    },


    readButton: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor:
        COLORS.green,
      justifyContent:
        'center',
      alignItems:
        'center',
      backgroundColor:
        COLORS.white,
    },


    readButtonText: {
      fontSize: 10,
      fontWeight: '900',
      color:
        COLORS.green,
    },


    actionButton: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    actionButtonFull: {
      flex: 1,
    },


    actionButtonText: {
      color:
        COLORS.white,
      fontSize: 11,
      fontWeight: '900',
    },


    // =================================================
    // EMPTY
    // =================================================

    emptyBox: {
      backgroundColor:
        COLORS.white,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      paddingVertical: 45,
      paddingHorizontal: 20,
      alignItems:
        'center',
    },


    emptyIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor:
        COLORS.greenLight,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginBottom: 12,
    },


    emptyIconText: {
      fontSize: 25,
      color:
        COLORS.green,
      fontWeight: '900',
    },


    emptyTitle: {
      fontSize: 17,
      fontWeight: '900',
      color:
        COLORS.text,
    },


    emptyText: {
      marginTop: 5,
      fontSize: 11,
      color:
        COLORS.textSecondary,
      textAlign:
        'center',
    },


    // =================================================
    // SEND ALL
    // =================================================

    sendAllButton: {
      backgroundColor:
        COLORS.green,
      borderRadius: 14,
      padding: 14,
      marginTop: 4,
      flexDirection:
        'row',
      alignItems:
        'center',
    },


    sendAllIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        'rgba(255,255,255,0.14)',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 11,
    },


    sendAllIconText: {
      color:
        COLORS.white,
      fontSize: 17,
      fontWeight: '900',
    },


    sendAllContent: {
      flex: 1,
    },


    sendAllTitle: {
      color:
        COLORS.white,
      fontSize: 13,
      fontWeight: '900',
    },


    sendAllSubtitle: {
      color:
        '#D5E9E2',
      fontSize: 9,
      marginTop: 3,
    },


    sendAllArrow: {
      color:
        COLORS.white,
      fontSize: 25,
      fontWeight: '300',
    },

  });