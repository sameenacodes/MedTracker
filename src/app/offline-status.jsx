import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';

import {
    clearOfflineCache,
    getCachedMedicines,
    getLastSync,
    getPendingActions,
} from '../services/offlineService';

const GREEN = '#176B52';
const RED = '#D64545';
const AMBER = '#C88719';
const TEXT = '#17221E';
const MUTED = '#6B7772';
const BORDER = '#E4E9E6';
const BG = '#F7F9F8';

export default function OfflineStatus() {
  const router = useRouter();

  const [isConnected, setIsConnected] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [medicines, setMedicines] =
    useState([]);

  const [pendingActions, setPendingActions] =
    useState([]);

  const [lastSync, setLastSync] =
    useState(null);

  const [networkType, setNetworkType] =
    useState('Unknown');

  const loadStatus = useCallback(
    async () => {
      try {
        const state =
          await NetInfo.fetch();

        const online = Boolean(
          state.isConnected &&
          state.isInternetReachable !== false
        );

        setIsConnected(online);

        setNetworkType(
          state.type || 'Unknown'
        );

        const cached =
          await getCachedMedicines();

        const pending =
          await getPendingActions();

        const sync =
          await getLastSync();

        setMedicines(
          Array.isArray(cached)
            ? cached
            : []
        );

        setPendingActions(
          Array.isArray(pending)
            ? pending
            : []
        );

        setLastSync(sync);
      } catch (error) {
        console.log(
          'Offline status error:',
          error
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadStatus();

    const unsubscribe =
      NetInfo.addEventListener(
        (state) => {
          const online = Boolean(
            state.isConnected &&
            state.isInternetReachable !== false
          );

          setIsConnected(online);

          setNetworkType(
            state.type || 'Unknown'
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [loadStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await loadStatus();

    setIsRefreshing(false);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Offline Data',
      'This will remove cached medicines and pending offline actions from this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearOfflineCache();

              await loadStatus();

              Alert.alert(
                'Cache Cleared',
                'Offline data has been cleared from this device.'
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Unable to clear offline data.'
              );
            }
          },
        },
      ]
    );
  };

  const formatLastSync = () => {
    if (!lastSync) {
      return 'Never synced';
    }

    try {
      const date =
        new Date(lastSync);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return 'Unknown';
      }

      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const statusColor =
    isConnected
      ? GREEN
      : RED;

  const statusText =
    isConnected
      ? 'Online'
      : 'Offline';

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={GREEN}
        />

        <Text style={styles.loadingText}>
          Checking connection...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={GREEN}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.headerTextBox}>
            <Text style={styles.title}>
              Offline Mode
            </Text>

            <Text style={styles.subtitle}>
              Manage your local pharmacy data
            </Text>
          </View>
        </View>

        {/* CONNECTION CARD */}
        <View style={styles.connectionCard}>
          <View
            style={[
              styles.statusIcon,
              {
                backgroundColor:
                  isConnected
                    ? '#E7F5EF'
                    : '#FCECEC',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    statusColor,
                },
              ]}
            />
          </View>

          <View style={styles.connectionInfo}>
            <Text style={styles.cardLabel}>
              Connection Status
            </Text>

            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {statusText}
            </Text>

            <Text style={styles.networkText}>
              Network: {networkType}
            </Text>
          </View>
        </View>

        {/* OFFLINE MESSAGE */}
        {!isConnected && (
          <View style={styles.warningBox}>
            <View style={styles.warningBadge}>
              !
            </View>

            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>
                You're currently offline
              </Text>

              <Text style={styles.warningText}>
                Cached pharmacy data can still be
                viewed. Changes that require the
                server may not work until you are
                connected again.
              </Text>
            </View>
          </View>
        )}

        {/* ONLINE MESSAGE */}
        {isConnected && (
          <View style={styles.onlineBox}>
            <View style={styles.onlineBadge}>
              ✓
            </View>

            <View style={styles.onlineContent}>
              <Text style={styles.onlineTitle}>
                Internet connection available
              </Text>

              <Text style={styles.onlineText}>
                The app can communicate with the
                pharmacy server.
              </Text>
            </View>
          </View>
        )}

        {/* STATS */}
        <Text style={styles.sectionTitle}>
          Offline Data
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {medicines.length}
            </Text>

            <Text style={styles.statLabel}>
              Cached Medicines
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                pendingActions.length > 0 && {
                  color: AMBER,
                },
              ]}
            >
              {pendingActions.length}
            </Text>

            <Text style={styles.statLabel}>
              Pending Actions
            </Text>
          </View>
        </View>

        {/* LAST SYNC */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>
                Last Sync
              </Text>

              <Text style={styles.infoValue}>
                {formatLastSync()}
              </Text>
            </View>

            <Pressable
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Text
                style={styles.refreshButtonText}
              >
                Refresh
              </Text>
            </Pressable>
          </View>
        </View>

        {/* PENDING ACTIONS */}
        <Text style={styles.sectionTitle}>
          Pending Actions
        </Text>

        {pendingActions.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              ✓
            </View>

            <Text style={styles.emptyTitle}>
              No pending actions
            </Text>

            <Text style={styles.emptyText}>
              There are no offline actions waiting
              to be processed.
            </Text>
          </View>
        ) : (
          <View style={styles.pendingCard}>
            {pendingActions
              .slice(0, 10)
              .map((action, index) => (
                <View
                  key={
                    action.id ||
                    `${action.type}-${index}`
                  }
                  style={[
                    styles.pendingRow,
                    index ===
                      Math.min(
                        pendingActions.length,
                        10
                      ) -
                        1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <View style={styles.pendingDot}>
                    <View
                      style={
                        styles.pendingDotInner
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.pendingInfo
                    }
                  >
                    <Text
                      style={
                        styles.pendingTitle
                      }
                    >
                      {action.type ||
                        action.action ||
                        'Pending action'}
                    </Text>

                    <Text
                      style={
                        styles.pendingDate
                      }
                    >
                      {action.createdAt
                        ? new Date(
                            action.createdAt
                          ).toLocaleString()
                        : 'Waiting for sync'}
                    </Text>
                  </View>
                </View>
              ))}

            {pendingActions.length > 10 && (
              <Text style={styles.moreText}>
                + {pendingActions.length - 10}{' '}
                more pending actions
              </Text>
            )}
          </View>
        )}

        {/* HOW IT WORKS */}
        <Text style={styles.sectionTitle}>
          How Offline Mode Works
        </Text>

        <View style={styles.stepsCard}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              1
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Internet Available
              </Text>

              <Text style={styles.stepText}>
                The app fetches fresh pharmacy
                data from the backend.
              </Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              2
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Data Cached
              </Text>

              <Text style={styles.stepText}>
                Important data is stored locally
                on the device.
              </Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              3
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Internet Unavailable
              </Text>

              <Text style={styles.stepText}>
                The app can display previously
                cached data.
              </Text>
            </View>
          </View>
        </View>

        {/* CLEAR CACHE */}
        <Pressable
          style={styles.clearButton}
          onPress={handleClearCache}
        >
          <Text style={styles.clearButtonText}>
            Clear Offline Data
          </Text>
        </Pressable>

        <Text style={styles.footerText}>
          MedTracker Offline Mode
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: MUTED,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backText: {
    fontSize: 30,
    lineHeight: 32,
    color: TEXT,
    marginTop: -3,
  },

  headerTextBox: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: TEXT,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
  },

  connectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },

  connectionInfo: {
    flex: 1,
  },

  cardLabel: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
  },

  statusText: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: '800',
  },

  networkText: {
    marginTop: 3,
    fontSize: 12,
    color: MUTED,
    textTransform: 'capitalize',
  },

  warningBox: {
    marginTop: 14,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F1D79C',
    flexDirection: 'row',
  },

  warningBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AMBER,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '800',
    marginRight: 11,
  },

  warningContent: {
    flex: 1,
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#76500E',
  },

  warningText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#76500E',
  },

  onlineBox: {
    marginTop: 14,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#EAF6F0',
    borderWidth: 1,
    borderColor: '#C8E5D7',
    flexDirection: 'row',
  },

  onlineBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '800',
    marginRight: 11,
  },

  onlineContent: {
    flex: 1,
  },

  onlineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN,
  },

  onlineText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#356B58',
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 17,
  },

  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: GREEN,
  },

  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED,
  },

  infoCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 17,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  infoLabel: {
    fontSize: 12,
    color: MUTED,
  },

  infoValue: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  },

  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EAF6F0',
  },

  refreshButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF6F0',
    color: GREEN,
    textAlign: 'center',
    lineHeight: 42,
    fontSize: 19,
    fontWeight: '800',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },

  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    textAlign: 'center',
  },

  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
  },

  pendingRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF',
  },

  pendingDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  pendingDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AMBER,
  },

  pendingInfo: {
    flex: 1,
  },

  pendingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },

  pendingDate: {
    marginTop: 3,
    fontSize: 11,
    color: MUTED,
  },

  moreText: {
    paddingVertical: 13,
    fontSize: 12,
    color: AMBER,
    fontWeight: '700',
    textAlign: 'center',
  },

  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 17,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GREEN,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 12,
  },

  stepContent: {
    flex: 1,
    paddingTop: 1,
  },

  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT,
  },

  stepText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  stepLine: {
    width: 1,
    height: 20,
    backgroundColor: '#D9E1DD',
    marginLeft: 14,
    marginVertical: 4,
  },

  clearButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E4B6B6',
    backgroundColor: '#FFF8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearButtonText: {
    color: RED,
    fontSize: 13,
    fontWeight: '800',
  },

  footerText: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 11,
    color: '#9AA49F',
  },
});