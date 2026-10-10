import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { searchMarketplaceMedicines } from '../services/api';
const BASE_URL = 'https://medtracker-1.onrender.com/api';

export default function Marketplace() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchMedicine = async () => {
  const query = search.trim();

  if (!query) {
    Alert.alert(
      'Search',
      'Enter a medicine name'
    );
    return;
  }

  try {
    setLoading(true);
    setSearched(true);

    const data =
      await searchMarketplaceMedicines(query);

    console.log(
      'Marketplace response:',
      data
    );

    const medicines = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];

    setResults(medicines);

  } catch (error) {
    console.error(
      'Marketplace search error:',
      error
    );

    Alert.alert(
      'Error',
      error.message ||
        'Unable to search medicines'
    );

    setResults([]);

  } finally {
    setLoading(false);
  }
};

  const renderMedicine = ({ item }) => {
    const medicine = item.medicine;
    const pharmacy = item.pharmacy;

    return (
      <View style={styles.card}>

        {/* Medicine */}
        <View style={styles.medicineHeader}>
          <View style={styles.medicineIcon}>
            <Text style={styles.iconText}>
              💊
            </Text>
          </View>

          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>
              {medicine?.name || 'Medicine'}
            </Text>

            {medicine?.brand ? (
              <Text style={styles.brand}>
                {medicine.brand}
              </Text>
            ) : null}

            {medicine?.category ? (
              <Text style={styles.category}>
                {medicine.category}
              </Text>
            ) : null}
          </View>
        </View>


        {/* Pharmacy */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Pharmacy
          </Text>

          <Text style={styles.pharmacyName}>
            {pharmacy?.name || 'Pharmacy'}
          </Text>

          <Text style={styles.address}>
            {pharmacy?.area
              ? `${pharmacy.area}, `
              : ''}
            {pharmacy?.city || ''}
          </Text>
        </View>


        {/* Price + Stock */}
        <View style={styles.priceRow}>

          <View>
            <Text style={styles.label}>
              Price
            </Text>

            <Text style={styles.price}>
              ₹{Number(item.sellingPrice).toFixed(2)}
            </Text>
          </View>

          <View>
            <Text style={styles.label}>
              Available
            </Text>

            <Text style={styles.stock}>
              {item.onlineQuantity} units
            </Text>
          </View>

        </View>


        {/* Delivery */}
        <View style={styles.deliveryRow}>
          <Text style={styles.deliveryText}>
            {pharmacy?.deliveryAvailable
              ? '🚚 Delivery available'
              : '🏪 Pickup only'}
          </Text>

          {pharmacy?.deliveryRadiusKm ? (
            <Text style={styles.radius}>
              Up to {pharmacy.deliveryRadiusKm} km
            </Text>
          ) : null}
        </View>


        {/* Action */}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() =>
            router.push({
              pathname: '/medicine-details',
              params: {
                inventoryId: item._id,
              },
            })
          }
        >
          <Text style={styles.viewButtonText}>
            View & Add to Cart
          </Text>
        </TouchableOpacity>

      </View>
    );
  };


  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Medicine Marketplace
          </Text>

          <Text style={styles.subtitle}>
            Find medicines from nearby pharmacies
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cartButton}
          onPress={() =>
            router.push('/cart')
          }
        >
          <Text style={styles.cartText}>
            🛒
          </Text>
        </TouchableOpacity>
      </View>


      {/* Search */}
      <View style={styles.searchContainer}>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search medicine..."
          placeholderTextColor="#888"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={searchMedicine}
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchMedicine}
        >
          <Text style={styles.searchButtonText}>
            Search
          </Text>
        </TouchableOpacity>

      </View>


      {/* Loading */}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Searching pharmacies...
          </Text>
        </View>
      )}


      {/* Empty state */}
      {!loading &&
        searched &&
        results.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              🔍
            </Text>

            <Text style={styles.emptyTitle}>
              No medicines found
            </Text>

            <Text style={styles.emptyText}>
              Try another medicine name or brand.
            </Text>
          </View>
        )}


      {/* Initial state */}
      {!loading &&
        !searched && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              💊
            </Text>

            <Text style={styles.emptyTitle}>
              Search for a medicine
            </Text>

            <Text style={styles.emptyText}>
              Find medicines and compare
              pharmacies, prices and availability.
            </Text>
          </View>
        )}


      {/* Results */}
      {!loading &&
        results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item) =>
              item._id
            }
            renderItem={renderMedicine}
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
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#172033',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#687386',
  },

  cartButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },

  cartText: {
    fontSize: 22,
  },

  searchContainer: {
    marginHorizontal: 18,
    marginBottom: 15,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 5,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#172033',
  },

  searchButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },

  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },

  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  medicineIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    fontSize: 26,
  },

  medicineInfo: {
    flex: 1,
    marginLeft: 12,
  },

  medicineName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#172033',
  },

  brand: {
    marginTop: 2,
    fontSize: 13,
    color: '#4B5563',
  },

  category: {
    marginTop: 2,
    fontSize: 12,
    color: '#8A94A6',
  },

  section: {
    marginTop: 16,
  },

  label: {
    fontSize: 11,
    color: '#8A94A6',
    marginBottom: 3,
  },

  pharmacyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#263247',
  },

  address: {
    marginTop: 2,
    fontSize: 12,
    color: '#687386',
  },

  priceRow: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16A34A',
  },

  stock: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },

  deliveryRow: {
    marginTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  deliveryText: {
    fontSize: 12,
    color: '#475569',
  },

  radius: {
    fontSize: 12,
    color: '#64748B',
  },

  viewButton: {
    marginTop: 15,
    backgroundColor: '#2563EB',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  loading: {
    alignItems: 'center',
    marginTop: 50,
  },

  loadingText: {
    marginTop: 10,
    color: '#64748B',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 45,
    paddingBottom: 100,
  },

  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    color: '#687386',
  },

});