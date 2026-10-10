import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Dashboard() {
  const router = useRouter();

  const stats = [
    {
      label: 'Total Medicines',
      value: '542',
      type: 'normal',
      icon: 'MED',
    },
    {
      label: 'Expiring Soon',
      value: '12',
      type: 'warning',
      icon: 'EXP',
    },
    {
      label: 'Expired',
      value: '3',
      type: 'danger',
      icon: 'OUT',
    },
    {
      label: 'Low Stock',
      value: '8',
      type: 'warning',
      icon: 'STK',
    },
  ];

  const alerts = [
    {
      name: 'Cough Syrup',
      days: '5 days',
      batch: 'BT2024-112',
      status: 'critical',
    },
    {
      name: 'Vitamin C Tabs',
      days: '28 days',
      batch: 'BT2024-445',
      status: 'warning',
    },
    {
      name: 'Paracetamol 500',
      days: '45 days',
      batch: 'BT2024-789',
      status: 'caution',
    },
  ];

  const actions = [
    {
      label: 'Add Medicine',
      icon: '+',
      route: '/add-medicine',
    },
    {
      label: 'Scan Barcode',
      icon: 'QR',
      route: '/scan',
    },
    {
      label: 'Billing',
      icon: 'BIL',
      route: '/billing',
    },
    {
      label: 'Medicines',
      icon: 'MED',
      route: '/medicines',
    },
    {
      label: 'Suppliers',
      icon: 'SUP',
      route: '/suppliers',
    },
    {
      label: 'Reports',
      icon: 'REP',
      route: '/reports',
    },
  ];

  const getAlertColor = (status) => {
    if (status === 'critical') return '#D92D20';
    if (status === 'warning') return '#D98C00';
    return '#8A6A00';
  };

  const getAlertBackground = (status) => {
    if (status === 'critical') return '#FEF3F2';
    if (status === 'warning') return '#FFF8E7';
    return '#FFFBEA';
  };

  const getStatColor = (type) => {
    if (type === 'danger') return '#D92D20';
    if (type === 'warning') return '#B77900';
    return '#176B52';
  };

  const getStatBackground = (type) => {
    if (type === 'danger') return '#FEF3F2';
    if (type === 'warning') return '#FFF8E7';
    return '#EAF6F1';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>M</Text>
          </View>

          <View style={styles.headerText}>
            <Text style={styles.greeting}>Good Morning</Text>

            <Text style={styles.pharmacyName}>
              Sri Murugan Pharmacy
            </Text>

            <Text style={styles.date}>
              {new Date().toDateString()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => router.push('/')}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutIcon}>↪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Overview */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.sectionSubtitle}>
            Pharmacy inventory summary
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, i) => {
          const color = getStatColor(stat.type);
          const background = getStatBackground(stat.type);

          return (
            <View key={i} style={styles.statCard}>
              <View style={styles.statTop}>
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: background },
                  ]}
                >
                  <Text
                    style={[
                      styles.statIcon,
                      { color },
                    ]}
                  >
                    {stat.icon}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statIndicator,
                    { backgroundColor: color },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.statValue,
                  { color },
                ]}
              >
                {stat.value}
              </Text>

              <Text style={styles.statLabel}>
                {stat.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Expiry Alerts */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Expiry Alerts
          </Text>

          <Text style={styles.sectionSubtitle}>
            Medicines requiring attention
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/alerts')}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertsContainer}>
        {alerts.map((alert, i) => {
          const color = getAlertColor(alert.status);
          const background = getAlertBackground(alert.status);

          return (
            <View
              key={i}
              style={[
                styles.alertCard,
                {
                  borderLeftColor: color,
                },
              ]}
            >
              <View style={styles.alertContent}>
                <View style={styles.alertMain}>
                  <Text style={styles.alertName}>
                    {alert.name}
                  </Text>

                  <Text style={styles.alertBatch}>
                    Batch: {alert.batch}
                  </Text>
                </View>

                <View
                  style={[
                    styles.alertBadge,
                    {
                      backgroundColor: background,
                      borderColor: color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.alertDays,
                      { color },
                    ]}
                  >
                    {alert.days}
                  </Text>

                  <Text
                    style={[
                      styles.alertBadgeLabel,
                      { color },
                    ]}
                  >
                    remaining
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Quick Actions */}
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
        {actions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionCard}
            onPress={() => router.push(action.route)}
            activeOpacity={0.75}
          >
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>
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

      {/* Revenue */}
      <View style={styles.revenueCard}>
        <View style={styles.revenueTop}>
          <View>
            <Text style={styles.revenueLabel}>
              Today's Revenue
            </Text>

            <Text style={styles.revenueValue}>
              ₹ 4,250
            </Text>

            <Text style={styles.revenueSubtext}>
              24 medicines sold today
            </Text>
          </View>

          <View style={styles.revenueIconBox}>
            <Text style={styles.revenueIcon}>
              ₹
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewReportBtn}
          onPress={() => router.push('/reports')}
          activeOpacity={0.8}
        >
          <Text style={styles.viewReportText}>
            View Report
          </Text>

          <Text style={styles.viewReportArrow}>
            →
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },

  content: {
    padding: 16,
    paddingTop: 10,
  },

  /* Header */

  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4EAE7',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  headerText: {
    marginLeft: 12,
    flex: 1,
  },

  greeting: {
    color: '#718078',
    fontSize: 12,
    marginBottom: 2,
  },

  pharmacyName: {
    color: '#17201C',
    fontSize: 17,
    fontWeight: '800',
  },

  date: {
    color: '#8A9690',
    fontSize: 10,
    marginTop: 3,
  },

  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },

  logoutIcon: {
    color: '#D92D20',
    fontSize: 22,
    fontWeight: '700',
  },

  logoutText: {
    color: '#D92D20',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Section */

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: 2,
  },

  sectionTitle: {
    color: '#17201C',
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#7A8781',
    fontSize: 11,
    marginTop: 3,
  },

  viewAllText: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Stats */

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 26,
  },

  statCard: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4EAE7',
  },

  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statIcon: {
    fontSize: 10,
    fontWeight: '800',
  },

  statIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statValue: {
    fontSize: 27,
    fontWeight: '800',
    marginTop: 13,
  },

  statLabel: {
    color: '#6F7B75',
    fontSize: 11,
    marginTop: 2,
  },

  /* Alerts */

  alertsContainer: {
    marginBottom: 26,
  },

  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E4EAE7',
    borderRightColor: '#E4EAE7',
    borderBottomColor: '#E4EAE7',
    padding: 14,
    marginBottom: 10,
  },

  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  alertMain: {
    flex: 1,
    paddingRight: 10,
  },

  alertName: {
    color: '#17201C',
    fontSize: 14,
    fontWeight: '800',
  },

  alertBatch: {
    color: '#7B8781',
    fontSize: 11,
    marginTop: 4,
  },

  alertBadge: {
    minWidth: 78,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: 'center',
  },

  alertDays: {
    fontSize: 12,
    fontWeight: '800',
  },

  alertBadgeLabel: {
    fontSize: 9,
    marginTop: 1,
  },

  /* Quick Actions */

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 26,
  },

  actionCard: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E4EAE7',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIcon: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '800',
  },

  actionLabel: {
    flex: 1,
    color: '#27322D',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 10,
  },

  actionArrow: {
    color: '#9AA59F',
    fontSize: 17,
    fontWeight: '600',
  },

  /* Revenue */

  revenueCard: {
    backgroundColor: '#176B52',
    borderRadius: 18,
    padding: 18,
  },

  revenueTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  revenueLabel: {
    color: '#D9EEE7',
    fontSize: 12,
    fontWeight: '600',
  },

  revenueValue: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    marginTop: 4,
  },

  revenueSubtext: {
    color: '#C6E3D9',
    fontSize: 10,
    marginTop: 3,
  },

  revenueIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: '#2A7A63',
    alignItems: 'center',
    justifyContent: 'center',
  },

  revenueIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  viewReportBtn: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewReportText: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '800',
  },

  viewReportArrow: {
    color: '#176B52',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 6,
  },

  bottomSpace: {
    height: 30,
  },
});