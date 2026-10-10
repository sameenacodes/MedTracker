import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

export default function PharmacistDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  const [stats, setStats] = useState({
    total: 0,
    expiringSoon: 0,
    expired: 0,
    lowStock: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState('');

  // =====================================================
  // QUICK ACTIONS
  // =====================================================

  // =====================================================
// QUICK ACTIONS
// =====================================================

const actions = [
  {
    label: 'Add Medicine',
    icon: '+',
    route: '/add-medicine',
  },

  {
    label: 'Medicines',
    icon: 'M',
    route: '/medicines',
  },

  {
    label: 'Rack Finder',
    icon: 'RF',
    route: '/rack-finder',
  },

  {
    label: 'Scan Medicine',
    icon: 'SM',
    route: '/scan-medicine',
  },

  {
    label: 'Batch Tracking',
    icon: 'BT',
    route: '/batches',
  },

  {
    label: 'Billing',
    icon: '₹',
    route: '/billing',
  },

  {
    label: 'Alerts',
    icon: '!',
    route: '/alerts',
  },

  {
    label: 'AI Reorder',
    icon: 'AI',
    route: '/reorder',
  },

  {
    label: 'Auto Reorder',
    icon: 'AR',
    route: '/auto-reorder',
  },

  {
    label: 'QR Removal',
    icon: 'QR',
    route: '/qr-removal',
  },

  {
    label: 'Suppliers',
    icon: 'S',
    route: '/suppliers',
  },

  {
    label: 'Reports',
    icon: 'R',
    route: '/reports',
  },

  {
    label: 'Dead Stock',
    icon: 'DS',
    route: '/dead-stock',
  },

  {
    label: 'Expiry Risk',
    icon: 'ER',
    route: '/expiry-risk',
  },

  {
    label: 'WhatsApp Reports',
    subtitle: 'Send inventory report',
    icon: 'WA',
    route: '/whatsapp-reports',
  },

  // =====================================================
  // ONLINE PHARMACY
  // =====================================================

  {
    label: 'Online Orders',
    subtitle: 'Manage customer orders',
    icon: 'OO',
    route: '/pharmacy-orders',
  },

  {
    label: 'Online Inventory',
    subtitle: 'Manage marketplace stock',
    icon: 'OI',
    route: '/pharmacy-online-inventory',
  },
  {
    label: 'Prescriptions',
    subtitle: 'Verify customer prescriptions',
    icon: 'RX',
    route: '/pharmacy-prescriptions',
  },
];

  // =====================================================
  // LOAD
  // =====================================================

  useEffect(() => {
    checkRoleAndLoadDashboard();
  }, []);

  // =====================================================
  // ROLE PROTECTION + LOAD USER
  // =====================================================

  const checkRoleAndLoadDashboard = async () => {
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

      if (!parsedUser || !parsedUser.role) {
        await clearAll();
        router.replace('/');
        return;
      }

      if (parsedUser.role === 'admin') {
        router.replace('/admin-dashboard');
        return;
      }

      if (parsedUser.role !== 'pharmacist') {
        if (parsedUser.role === 'customer') {
          router.replace('/customer-dashboard');
        } else {
          router.replace('/');
        }
        return;
      }

      setUser(parsedUser);
      fetchData();
    } catch (error) {
      console.log('Role/user load error:', error);
      router.replace('/');
    }
  };

  // =====================================================
  // FETCH DASHBOARD DATA
  // =====================================================

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
        });
      }

      const expiringResult = await getExpiringMedicines();

      if (Array.isArray(expiringResult)) {
        const alertList = expiringResult
          .slice(0, 5)
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
              batch: med.batchNumber,
            };
          });

        setAlerts(alertList);
      }
    } catch (error) {
      console.log('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SEND ALERTS
  // =====================================================

  const handleSendAlerts = async () => {
    try {
      const result = await generateAlerts();

      setMessage(
        result.emailSent
          ? 'Alerts sent successfully'
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

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    await clearAll();
    router.push('/');
  };

  // =====================================================
  // ALERT TYPE
  // =====================================================

  const getAlertType = (status) => {
    if (status === 'critical') {
      return {
        label: 'Critical',
        color: '#C62828',
        background: '#FFF3F3',
      };
    }

    if (status === 'warning') {
      return {
        label: 'Warning',
        color: '#B76E00',
        background: '#FFF8EA',
      };
    }

    if (status === 'expired') {
      return {
        label: 'Expired',
        color: '#6B7280',
        background: '#F3F4F6',
      };
    }

    return {
      label: 'Caution',
      color: '#A66A00',
      background: '#FFF9EC',
    };
  };

  // =====================================================
  // STAT CARDS
  // =====================================================

  const statCards = [
    {
      label: 'Total Medicines',
      value: stats.total,
    },
    {
      label: 'Expiring Soon',
      value: stats.expiringSoon,
      warning: stats.expiringSoon > 0,
    },
    {
      label: 'Expired',
      value: stats.expired,
      danger: stats.expired > 0,
    },
    {
      label: 'Low Stock',
      value: stats.lowStock,
      warning: stats.lowStock > 0,
    },
  ];

  // =====================================================
  // UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* ================= HEADER ================= */}

      <View style={styles.header}>

        <View style={styles.headerLeft}>

          <View style={styles.brandRow}>

            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>
                +
              </Text>
            </View>

            <Text style={styles.brandName}>
              MedTracker
            </Text>

          </View>

          <Text style={styles.dashboardTitle}>
            Pharmacist Dashboard
          </Text>

          <Text style={styles.welcomeText}>
            Welcome back, {user.name || 'Pharmacist'}
          </Text>

        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>
            Logout
          </Text>
        </TouchableOpacity>

      </View>

      {/* ================= MESSAGE ================= */}

      {message !== '' && (
        <View
          style={[
            styles.messageBox,
            message.includes('Failed')
              ? styles.errorMessage
              : styles.successMessage,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              message.includes('Failed')
                ? styles.errorMessageText
                : styles.successMessageText,
            ]}
          >
            {message}
          </Text>
        </View>
      )}

      {/* ================= LOADING ================= */}

      {loading ? (
        <View style={styles.loadingBox}>

          <ActivityIndicator
            size="large"
            color="#176B52"
          />

          <Text style={styles.loadingText}>
            Loading dashboard...
          </Text>

        </View>
      ) : (
        <>

          {/* ================= OVERVIEW ================= */}

          <View style={styles.sectionHeader}>

            <View>
              <Text style={styles.sectionTitle}>
                Overview
              </Text>

              <Text style={styles.sectionSubtitle}>
                Current pharmacy inventory status
              </Text>
            </View>

          </View>

          <View style={styles.statsGrid}>

            {statCards.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.statCard,
                  item.danger &&
                    styles.statCardDanger,
                  item.warning &&
                    !item.danger &&
                    styles.statCardWarning,
                ]}
              >

                <Text style={styles.statLabel}>
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.statValue,
                    item.danger &&
                      styles.statValueDanger,
                    item.warning &&
                      !item.danger &&
                      styles.statValueWarning,
                  ]}
                >
                  {item.value}
                </Text>

              </View>
            ))}

          </View>

          {/* ================= AI ASSISTANT ================= */}

          <TouchableOpacity
            style={styles.aiCard}
            onPress={() => router.push('/ai-chat')}
            activeOpacity={0.85}
          >

            <View style={styles.aiIcon}>
              <Text style={styles.aiIconText}>
                AI
              </Text>
            </View>

            <View style={styles.aiContent}>

              <Text style={styles.aiTitle}>
                AI Pharmacy Assistant
              </Text>

              <Text style={styles.aiSubtitle}>
                Ask about stock, expiry & inventory
              </Text>

            </View>

            <Text style={styles.aiArrow}>
              →
            </Text>

          </TouchableOpacity>

          {/* ================= QUICK ACTIONS ================= */}

          <View style={styles.sectionHeader}>

            <View>

              <Text style={styles.sectionTitle}>
                Quick Actions
              </Text>

              <Text style={styles.sectionSubtitle}>
                Manage your pharmacy
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

                <View style={styles.actionIcon}>

                  <Text style={styles.actionIconText}>
                    {action.icon}
                  </Text>

                </View>

                <Text style={styles.actionLabel}>
                  {action.label}
                </Text>

                <Text style={styles.actionArrow}>
                  →
                </Text>

              </TouchableOpacity>
            ))}

          </View>

          {/* ================= EXPIRY ALERTS ================= */}

          <View style={styles.alertSectionHeader}>

            <View>

              <Text style={styles.sectionTitle}>
                Expiry Alerts
              </Text>

              <Text style={styles.sectionSubtitle}>
                Medicines requiring attention
              </Text>

            </View>

            <TouchableOpacity
              style={styles.emailButton}
              onPress={handleSendAlerts}
              activeOpacity={0.8}
            >

              <Text style={styles.emailButtonText}>
                Send Email
              </Text>

            </TouchableOpacity>

          </View>

          {alerts.length === 0 ? (

            <View style={styles.emptyAlert}>

              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>
                  ✓
                </Text>
              </View>

              <View>

                <Text style={styles.emptyTitle}>
                  All clear
                </Text>

                <Text style={styles.emptySubtitle}>
                  No medicines require expiry attention
                </Text>

              </View>

            </View>

          ) : (

            <View style={styles.alertList}>

              {alerts.map((alert, index) => {

                const type = getAlertType(
                  alert.status
                );

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.alertCard}
                    onPress={() =>
                      router.push('/alerts')
                    }
                    activeOpacity={0.8}
                  >

                    <View
                      style={[
                        styles.alertIndicator,
                        {
                          backgroundColor:
                            type.color,
                        },
                      ]}
                    />

                    <View style={styles.alertInfo}>

                      <Text style={styles.alertName}>
                        {alert.name}
                      </Text>

                      <Text style={styles.alertBatch}>
                        Batch: {alert.batch || 'N/A'}
                      </Text>

                    </View>

                    <View
                      style={[
                        styles.alertBadge,
                        {
                          backgroundColor:
                            type.background,
                        },
                      ]}
                    >

                      <Text
                        style={[
                          styles.alertBadgeText,
                          {
                            color: type.color,
                          },
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

          {/* ================= REFRESH ================= */}

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
  );
}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 30,
  },


  /* ================= HEADER ================= */

  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E3E9E5',

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',

    shadowColor: '#17382B',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '400',
  },

  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17221D',
  },

  dashboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17221D',
    marginBottom: 5,
  },

  welcomeText: {
    fontSize: 12,
    color: '#748078',
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: '#D8E1DC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },

  logoutButtonText: {
    color: '#4B5952',
    fontSize: 12,
    fontWeight: '600',
  },


  /* ================= MESSAGE ================= */

  messageBox: {
    borderRadius: 9,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },

  successMessage: {
    backgroundColor: '#F0F8F4',
    borderColor: '#C9E4D6',
  },

  errorMessage: {
    backgroundColor: '#FFF4F3',
    borderColor: '#F0CECA',
  },

  messageText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  successMessageText: {
    color: '#176B52',
  },

  errorMessageText: {
    color: '#B33D38',
  },


  /* ================= LOADING ================= */

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },

  loadingText: {
    marginTop: 12,
    color: '#718078',
    fontSize: 13,
  },


  /* ================= SECTIONS ================= */

  sectionHeader: {
    marginTop: 4,
    marginBottom: 12,
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


  /* ================= STATS ================= */

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,

    borderWidth: 1,
    borderColor: '#E3E9E5',

    shadowColor: '#17382B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 7,
    elevation: 1,
  },

  statCardWarning: {
    borderColor: '#EAD9B5',
  },

  statCardDanger: {
    borderColor: '#E7C6C4',
  },

  statLabel: {
    fontSize: 11,
    color: '#718078',
    marginBottom: 10,
  },

  statValue: {
    fontSize: 27,
    fontWeight: '700',
    color: '#176B52',
  },

  statValueWarning: {
    color: '#A66A00',
  },

  statValueDanger: {
    color: '#B33D38',
  },


  /* ================= AI ASSISTANT ================= */

  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#CFE1D9',
    padding: 15,
    marginBottom: 24,

    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#17382B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  aiIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#E8F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  aiIconText: {
    color: '#176B52',
    fontSize: 13,
    fontWeight: '800',
  },

  aiContent: {
    flex: 1,
  },

  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17221D',
  },

  aiSubtitle: {
    fontSize: 11,
    color: '#718078',
    marginTop: 4,
  },

  aiArrow: {
    color: '#176B52',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },


  /* ================= ACTIONS ================= */

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  actionCard: {
    width: '48.5%',
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E9E5',

    padding: 12,
    marginBottom: 10,

    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#17382B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 7,
    elevation: 1,
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EDF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  actionIconText: {
    color: '#176B52',
    fontSize: 14,
    fontWeight: '700',
  },

  actionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#29362F',
  },

  actionArrow: {
    color: '#A1ACA6',
    fontSize: 16,
  },


  /* ================= ALERT HEADER ================= */

  alertSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  emailButton: {
    backgroundColor: '#176B52',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },


  /* ================= EMPTY ALERT ================= */

  emptyAlert: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    flexDirection: 'row',
    alignItems: 'center',
  },

  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EDF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  emptyIconText: {
    color: '#176B52',
    fontSize: 20,
    fontWeight: '700',
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#29362F',
  },

  emptySubtitle: {
    fontSize: 11,
    color: '#829089',
    marginTop: 3,
  },


  /* ================= ALERT LIST ================= */

  alertList: {
    marginBottom: 6,
  },

  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    minHeight: 68,
    marginBottom: 9,

    borderWidth: 1,
    borderColor: '#E3E9E5',

    flexDirection: 'row',
    alignItems: 'center',

    overflow: 'hidden',
  },

  alertIndicator: {
    width: 4,
    height: '100%',
    alignSelf: 'stretch',
  },

  alertInfo: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  alertName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#29362F',
  },

  alertBatch: {
    fontSize: 10,
    color: '#829089',
    marginTop: 4,
  },

  alertBadge: {
    marginRight: 12,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  alertBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },


  /* ================= REFRESH ================= */

  refreshButton: {
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CBD8D2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  refreshButtonText: {
    color: '#176B52',
    fontSize: 13,
    fontWeight: '600',
  },


  bottomSpace: {
    height: 20,
  },

});