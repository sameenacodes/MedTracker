import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { BASE_URL, authHeaders } from '../services/api';

export default function PharmacyList() {
  const router = useRouter();

  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPharmacies = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${BASE_URL}/pharmacies`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || 'Failed to fetch pharmacies'
        );
      }

      setPharmacies(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.pharmacies)
            ? data.pharmacies
            : []
      );
    } catch (error) {
      console.log('Pharmacy list error:', error);

      Alert.alert(
        'Error',
        error.message || 'Failed to load pharmacies'
      );

      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacies();
  }, []);

  const renderPharmacy = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🏥</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>
            {item.name || 'Pharmacy'}
          </Text>

          <Text style={styles.location}>
            📍{' '}
            {item.area
              ? `${item.area}, `
              : ''}
            {item.city || ''}
          </Text>

          {item.address ? (
            <Text style={styles.address}>
              {item.address}
            </Text>
          ) : null}

          {item.phone ? (
            <Text style={styles.phone}>
              📞 {item.phone}
            </Text>
          ) : null}

          <View style={styles.deliveryRow}>
            <Text style={styles.delivery}>
              {item.deliveryAvailable
                ? '🚚 Delivery Available'
                : '🏪 Pickup Only'}
            </Text>

            {item.deliveryRadiusKm ? (
              <Text style={styles.radius}>
                Up to {item.deliveryRadiusKm} km
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#176F55"
        />

        <Text style={styles.loadingText}>
          Loading pharmacies...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>
            Pharmacies
          </Text>

          <Text style={styles.subtitle}>
            Browse nearby pharmacies
          </Text>
        </View>
      </View>

      {/* Count */}
      <View style={styles.countBox}>
        <Text style={styles.count}>
          {pharmacies.length}
        </Text>

        <Text style={styles.countText}>
          {pharmacies.length === 1
            ? 'pharmacy'
            : 'pharmacies'}{' '}
          available
        </Text>
      </View>

      {/* Empty */}
      {pharmacies.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>
            🏥
          </Text>

          <Text style={styles.emptyTitle}>
            No pharmacies available
          </Text>

          <Text style={styles.emptyText}>
            There are currently no pharmacies
            accepting online orders.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadPharmacies}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pharmacies}
          keyExtractor={(item) =>
            String(item._id)
          }
          renderItem={renderPharmacy}
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingTop: 55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 28,
    color: '#172033',
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172033',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#718096',
  },

  countBox: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#E8F5F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  count: {
    fontSize: 22,
    fontWeight: '800',
    color: '#176F55',
  },

  countText: {
    fontSize: 15,
    color: '#52635D',
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E9E7',
  },

  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  icon: {
    fontSize: 28,
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 7,
  },

  location: {
    fontSize: 14,
    color: '#52635D',
    marginBottom: 5,
  },

  address: {
    fontSize: 13,
    color: '#7A8581',
    marginBottom: 7,
  },

  phone: {
    fontSize: 14,
    color: '#176F55',
    fontWeight: '600',
    marginBottom: 10,
  },

  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  delivery: {
    fontSize: 13,
    color: '#176F55',
    fontWeight: '600',
  },

  radius: {
    fontSize: 12,
    color: '#7A8581',
  },

  center: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#718096',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 23,
  },

  retryButton: {
    marginTop: 22,
    backgroundColor: '#176F55',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});