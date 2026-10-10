import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  generateAlerts,
  getDashboardStats,
  getExpiringMedicines,
} from '../services/api';

import { clearAll, getData } from '../services/storage';

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

  shadow: '#000000',
};

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [user, setUser] = useState({});

  const [stats, setStats] = useState({
    total: 0,
    expiringSoon: 0,
    expired: 0,
    lowStock: 0,
    stockValue: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState('');

  // -------------------------------------------------------
  // MANAGEMENT ACTIONS
  // -------------------------------------------------------

  const actions = [
    {
      label: 'Medicines',
      subtitle: 'View inventory',
      icon: '+',
      route: '/medicines',
    },
    {
      label: 'User Management',
      subtitle: 'Manage accounts',
      icon: 'U',
      route: '/user-management',
    },
    {
      label: 'Add Medicine',
      subtitle: 'Add new stock',
      icon: '+',
      route: '/add-medicine',
    },
    {
      label: 'Billing',
      subtitle: 'Create invoice',
      icon: '₹',
      route: '/billing',
    },
    {
      label: 'Alerts',
      subtitle: 'View notifications',
      icon: '!',
      route: '/alerts',
    },
    {
      label: 'Reports',
      subtitle: 'View analytics',
      icon: '▥',
      route: '/reports',
    },
    {
      label: 'Suppliers',
      subtitle: 'Manage suppliers',
      icon: 'S',
      route: '/suppliers',
    },
    {
      label: 'AI Reorder',
      subtitle: 'Stock suggestions',
      icon: 'AI',
      route: '/reorder',
    },
    {
      label: 'QR Removal',
      subtitle: 'Remove stock',
      icon: 'QR',
      route: '/qr-removal',
    },
    {
      label: 'WhatsApp Reports',
      subtitle: 'Send inventory report',
      icon: 'WA',
      route: '/whatsapp-reports',
    },
    {
      label: 'Backup & Restore',
      subtitle: 'Protect pharmacy data',
      icon: 'BR',
      route: '/backup-restore',
    },
  ];

  // -------------------------------------------------------
  // LOAD USER
  // -------------------------------------------------------

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const userData = await getData('user');

      if (!userData) {
        router.replace('/');
        return;
      }

      const parsedUser =
        typeof userData === 'string'
          ? JSON.parse(userData)
          : userData;

      if (parsedUser?.role !== 'admin') {
        if (parsedUser?.role === 'pharmacist') {
          router.replace('/pharmacist-dashboard');
        } else if (parsedUser?.role === 'customer') {
          router.replace('/customer-dashboard');
        } else {
          router.replace('/');
        }
        return;
      }

      setUser(parsedUser);
      fetchData();
    } catch (error) {
      console.log('Admin access check error:', error);
      router.replace('/');
    }
  };

  // -------------------------------------------------------
  // FETCH DASHBOARD DATA
  // -------------------------------------------------------

  const fetchData = async () => {
    setLoading(true);

    try {
      const statsResult = await getDashboardStats();

      if (statsResult) {
        setStats({
          total: statsResult.total || 0,
          expiringSoon: statsResult.expiringSoon || 0,
          expired: statsResult.expired || 0,
          lowStock: statsResult.lowStock || 0,
          stockValue: statsResult.stockValue || 0,
        });
      }

      const expiringResult = await getExpiringMedicines();

      if (Array.isArray(expiringResult)) {
        const alertList = expiringResult
          .slice(0, 3)
          .map((med) => {
            const today = new Date();
            const expiry = new Date(med.expiryDate);

            const daysLeft = Math.ceil(
              (expiry - today) /
                (1000 * 60 * 60 * 24)
            );

            return {
              name: med.name,
              days:
                daysLeft <= 0
                  ? 'EXPIRED'
                  : `${daysLeft} days`,
              status: med.status,
            };
          });

        setAlerts(alertList);
      }
    } catch (err) {
      console.log('Error:', err);

      setStats({
        total: 0,
        expiringSoon: 0,
        expired: 0,
        lowStock: 0,
        stockValue: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // -------------------------------------------------------
  // REFRESH
  // -------------------------------------------------------

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // -------------------------------------------------------
  // SEND ALERTS
  // -------------------------------------------------------

  const handleSendAlerts = async () => {
    try {
      const result = await generateAlerts();

      setMessage(
        result.emailSent
          ? 'Email + WhatsApp alerts sent successfully'
          : 'Alerts generated successfully'
      );

      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (error) {
      console.log('Alert error:', error);

      setMessage('Failed to send alerts');

      setTimeout(() => {
        setMessage('');
      }, 3000);
    }
  };

  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------

  const handleLogout = async () => {
    await clearAll();
    router.push('/');
  };

  // -------------------------------------------------------
  // STAT CARDS
  // -------------------------------------------------------

  const statCards = [
    {
      label: 'Total Medicines',
      value: stats.total,
      type: 'normal',
    },
    {
      label: 'Expiring Soon',
      value: stats.expiringSoon,
      type: 'warning',
    },
    {
      label: 'Expired',
      value: stats.expired,
      type: 'danger',
    },
    {
      label: 'Low Stock',
      value: stats.lowStock,
      type: 'normal',
    },
  ];

  // -------------------------------------------------------
  // ALERT COLOR
  // -------------------------------------------------------

  const getAlertStyle = (status) => {
    if (status === 'critical' || status === 'expired') {
      return {
        container: styles.alertCritical,
        badge: styles.alertBadgeCritical,
        text: styles.alertBadgeTextLight,
      };
    }

    if (status === 'warning') {
      return {
        container: styles.alertWarning,
        badge: styles.alertBadgeWarning,
        text: styles.alertBadgeTextDark,
      };
    }

    return {
      container: styles.alertCaution,
      badge: styles.alertBadgeCaution,
      text: styles.alertBadgeTextDark,
    };
  };

  // =======================================================
  // UI
  // =======================================================

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.green}
          />
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>+</Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.roleText}>
                ADMIN PANEL
              </Text>

              <Text style={styles.nameText}>
                Welcome, {user.name || 'Admin'}
              </Text>

              <Text style={styles.dateText}>
                {new Date().toDateString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message !== '' && (
          <View
            style={[
              styles.messageBanner,
              message.includes('Failed')
                ? styles.messageError
                : styles.messageSuccess,
            ]}
          >
            <View
              style={[
                styles.messageDot,
                message.includes('Failed')
                  ? styles.messageDotError
                  : styles.messageDotSuccess,
              ]}
            />

            <Text style={styles.messageText}>
              {message}
            </Text>
          </View>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <View style={styles.loadingBox}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator
                color={COLORS.green}
                size="small"
              />
            </View>

            <Text style={styles.loadingTitle}>
              Loading dashboard
            </Text>

            <Text style={styles.loadingSubtitle}>
              Fetching your pharmacy data...
            </Text>
          </View>
        ) : (
          <>
            {/* =============================================
                OVERVIEW
            ============================================= */}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Overview
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Current inventory status
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              {statCards.map((stat, index) => {
                const isDanger =
                  stat.type === 'danger';

                const isWarning =
                  stat.type === 'warning';

                return (
                  <View
                    key={index}
                    style={styles.statCard}
                  >
                    <View
                      style={[
                        styles.statIndicator,
                        isDanger
                          ? styles.statIndicatorDanger
                          : isWarning
                          ? styles.statIndicatorWarning
                          : styles.statIndicatorGreen,
                      ]}
                    />

                    <View style={styles.statCardContent}>
                      <Text
                        style={[
                          styles.statValue,
                          isDanger
                            ? styles.statValueDanger
                            : isWarning
                            ? styles.statValueWarning
                            : styles.statValueGreen,
                        ]}
                      >
                        {stat.value}
                      </Text>

                      <Text style={styles.statLabel}>
                        {stat.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* =============================================
                STOCK VALUE
            ============================================= */}

            <View style={styles.stockCard}>
              <View style={styles.stockLeft}>
                <View style={styles.stockIcon}>
                  <Text style={styles.stockIconText}>
                    ₹
                  </Text>
                </View>

                <View>
                  <Text style={styles.stockLabel}>
                    Total Stock Value
                  </Text>

                  <Text style={styles.stockSubtitle}>
                    Current inventory purchase value
                  </Text>
                </View>
              </View>

              <Text style={styles.stockValue}>
                ₹
                {parseFloat(
                  stats.stockValue || 0
                ).toLocaleString('en-IN')}
              </Text>
            </View>

            {/* =============================================
                MANAGEMENT
            ============================================= */}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Manage
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Pharmacy operations
                </Text>
              </View>
            </View>

            <View style={styles.actionsGrid}>
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionCard}
                  onPress={() =>
                    router.push(action.route)
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.actionTop}>
                    <View style={styles.actionIcon}>
                      <Text style={styles.actionIconText}>
                        {action.icon}
                      </Text>
                    </View>

                    <Text style={styles.actionArrow}>
                      ›
                    </Text>
                  </View>

                  <Text style={styles.actionLabel}>
                    {action.label}
                  </Text>

                  <Text style={styles.actionSubtitle}>
                    {action.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* =============================================
                EXPIRY ALERTS
            ============================================= */}

            <View style={styles.alertHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Expiry Alerts
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Medicines requiring attention
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendAlerts}
                activeOpacity={0.8}
              >
                <Text style={styles.sendButtonText}>
                  Send All
                </Text>
              </TouchableOpacity>
            </View>

            {alerts.length === 0 ? (
              <View style={styles.noAlertBox}>
                <View style={styles.noAlertIcon}>
                  <Text style={styles.noAlertIconText}>
                    ✓
                  </Text>
                </View>

                <View style={styles.noAlertContent}>
                  <Text style={styles.noAlertTitle}>
                    No expiry alerts
                  </Text>

                  <Text style={styles.noAlertSubtitle}>
                    Everything looks good right now.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.alertList}>
                {alerts.map((alert, index) => {
                  const alertStyle =
                    getAlertStyle(alert.status);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.alertCard,
                        alertStyle.container,
                      ]}
                      onPress={() =>
                        router.push('/alerts')
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.alertLeft}>
                        <View style={styles.alertIcon}>
                          <Text
                            style={styles.alertIconText}
                          >
                            !
                          </Text>
                        </View>

                        <View
                          style={styles.alertInfo}
                        >
                          <Text
                            style={styles.alertName}
                            numberOfLines={1}
                          >
                            {alert.name}
                          </Text>

                          <Text
                            style={styles.alertAction}
                          >
                            Tap to view alert details
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.alertBadge,
                          alertStyle.badge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.alertDays,
                            alertStyle.text,
                          ]}
                        >
                          {alert.days}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* =============================================
                REFRESH
            ============================================= */}

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchData}
              activeOpacity={0.8}
            >
              <Text style={styles.refreshButtonText}>
                Refresh Dashboard
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

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

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,

    shadowColor: COLORS.shadow,
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  brandIconText: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '400',
  },

  headerInfo: {
    flex: 1,
  },

  roleText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.green,
    letterSpacing: 1,
  },

  nameText: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },

  dateText: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  logoutButton: {
    backgroundColor: COLORS.redLight,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginLeft: 8,
  },

  logoutText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: '800',
  },

  // =======================================================
  // MESSAGE
  // =======================================================

  messageBanner: {
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },

  messageSuccess: {
    backgroundColor: COLORS.greenLight,
    borderColor: '#CFE5DD',
  },

  messageError: {
    backgroundColor: COLORS.redLight,
    borderColor: '#F3CECE',
  },

  messageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 9,
  },

  messageDotSuccess: {
    backgroundColor: COLORS.green,
  },

  messageDotError: {
    backgroundColor: COLORS.red,
  },

  messageText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },

  // =======================================================
  // LOADING
  // =======================================================

  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 45,
    alignItems: 'center',
  },

  loadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  loadingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  loadingSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // =======================================================
  // SECTION
  // =======================================================

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // =======================================================
  // STATS
  // =======================================================

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  statCard: {
    width: '48.2%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: COLORS.shadow,
    shadowOpacity: 0.025,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  statIndicator: {
    width: 4,
    height: 42,
    borderRadius: 3,
    marginRight: 11,
  },

  statIndicatorGreen: {
    backgroundColor: COLORS.green,
  },

  statIndicatorWarning: {
    backgroundColor: COLORS.amber,
  },

  statIndicatorDanger: {
    backgroundColor: COLORS.red,
  },

  statCardContent: {
    flex: 1,
  },

  statValue: {
    fontSize: 23,
    fontWeight: '900',
  },

  statValueGreen: {
    color: COLORS.green,
  },

  statValueWarning: {
    color: COLORS.amber,
  },

  statValueDanger: {
    color: COLORS.red,
  },

  statLabel: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },

  // =======================================================
  // STOCK VALUE
  // =======================================================

  stockCard: {
    backgroundColor: COLORS.green,
    borderRadius: 15,
    padding: 16,
    marginBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  stockIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  stockIconText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },

  stockLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  stockSubtitle: {
    color: '#D5E9E2',
    fontSize: 9,
    marginTop: 3,
  },

  stockValue: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 8,
  },

  // =======================================================
  // ACTIONS
  // =======================================================

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  actionCard: {
    width: '48.2%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,

    shadowColor: COLORS.shadow,
    shadowOpacity: 0.025,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  actionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIconText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '900',
  },

  actionArrow: {
    fontSize: 24,
    color: '#A4AEA9',
    fontWeight: '300',
  },

  actionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  actionSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  // =======================================================
  // ALERTS
  // =======================================================

  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sendButton: {
    backgroundColor: COLORS.green,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  sendButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },

  alertList: {
    marginBottom: 12,
  },

  alertCard: {
    backgroundColor: COLORS.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  alertCritical: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },

  alertWarning: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.amber,
  },

  alertCaution: {
    borderLeftWidth: 4,
    borderLeftColor: '#C99522',
  },

  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },

  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  alertIconText: {
    color: COLORS.red,
    fontSize: 17,
    fontWeight: '900',
  },

  alertInfo: {
    flex: 1,
    minWidth: 0,
  },

  alertName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  alertAction: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.textSecondary,
  },

  alertBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 8,
  },

  alertBadgeCritical: {
    backgroundColor: COLORS.red,
  },

  alertBadgeWarning: {
    backgroundColor: COLORS.amberLight,
  },

  alertBadgeCaution: {
    backgroundColor: '#FFF1C7',
  },

  alertDays: {
    fontSize: 9,
    fontWeight: '900',
  },

  alertBadgeTextLight: {
    color: COLORS.white,
  },

  alertBadgeTextDark: {
    color: COLORS.amber,
  },

  noAlertBox: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  noAlertIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  noAlertIconText: {
    color: COLORS.green,
    fontSize: 19,
    fontWeight: '900',
  },

  noAlertContent: {
    flex: 1,
  },

  noAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  noAlertSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  // =======================================================
  // REFRESH
  // =======================================================

  refreshButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  refreshButtonText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 15,
  },
});