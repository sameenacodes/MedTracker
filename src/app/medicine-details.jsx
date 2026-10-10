import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  addToCart,
  getMarketplaceMedicine,
} from '../services/api';

export default function MedicineDetails() {
  const router = useRouter();

  const { inventoryId } =
    useLocalSearchParams();

  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);


  const loadMedicine = async () => {
  try {
    setLoading(true);

    const data =
      await getMarketplaceMedicine(
        inventoryId
      );

    setItem(data.inventory);

  } catch (error) {
    console.log(
      'Medicine details error:',
      error
    );

    Alert.alert(
      'Error',
      error.message ||
        'Unable to load medicine'
    );

  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  if (inventoryId) {
    loadMedicine();
  }
}, [inventoryId]);

  // =====================================================
  // ADD TO CART
  // =====================================================

  const handleAddToCart = async () => {
    if (!item) {
      return;
    }

    try {
      setAdding(true);

      await addToCart(
        item._id,
        quantity
      );

      Alert.alert(
        'Added to Cart',
        `${item.medicine?.name} added successfully`,
        [
          {
            text: 'Continue Shopping',
          },
          {
            text: 'View Cart',
            onPress: () =>
              router.push('/cart'),
          },
        ]
      );

    } catch (error) {
      console.log(
        'Add to cart error:',
        error
      );

      Alert.alert(
        'Unable to Add',
        error.message ||
          'Failed to add item to cart'
      );

    } finally {
      setAdding(false);
    }
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading medicine...
        </Text>
      </View>
    );
  }


  // =====================================================
  // MEDICINE NOT FOUND
  // =====================================================

  if (!item) {
    return (
      <View style={styles.center}>

        <Text style={styles.errorIcon}>
          💊
        </Text>

        <Text style={styles.errorTitle}>
          Medicine details unavailable
        </Text>

        <Text style={styles.errorText}>
          We couldn't load this medicine.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>

      </View>
    );
  }


  const medicine = item.medicine;
  const pharmacy = item.pharmacy;

  const maxQuantity =
    Math.min(
      item.onlineQuantity,
      item.maxOrderQuantity
    );


  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >

      {/* Header */}

      <View style={styles.header}>

        <TouchableOpacity
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ←
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Medicine Details
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push('/cart')
          }
        >
          <Text style={styles.cart}>
            🛒
          </Text>
        </TouchableOpacity>

      </View>


      {/* Medicine */}

      <View style={styles.medicineCard}>

        <View style={styles.medicineIcon}>
          <Text style={styles.icon}>
            💊
          </Text>
        </View>

        <Text style={styles.name}>
          {medicine?.name}
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


      {/* Pharmacy */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Pharmacy
        </Text>

        <Text style={styles.pharmacyName}>
          🏪 {pharmacy?.name}
        </Text>

        <Text style={styles.address}>
          {pharmacy?.address || ''}
        </Text>

        <Text style={styles.address}>
          {pharmacy?.area
            ? `${pharmacy.area}, `
            : ''}
          {pharmacy?.city || ''}
        </Text>

      </View>


      {/* Price */}

      <View style={styles.priceCard}>

        <View>
          <Text style={styles.smallLabel}>
            Price
          </Text>

          <Text style={styles.price}>
            ₹{Number(
              item.sellingPrice
            ).toFixed(2)}
          </Text>
        </View>

        <View>
          <Text style={styles.smallLabel}>
            Available
          </Text>

          <Text style={styles.stock}>
            {item.onlineQuantity}
          </Text>
        </View>

      </View>


      {/* Delivery */}

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Delivery
        </Text>

        <Text style={styles.delivery}>
          {pharmacy?.deliveryAvailable
            ? '🚚 Delivery available'
            : '🏪 Pickup only'}
        </Text>

        {pharmacy?.deliveryRadiusKm ? (
          <Text style={styles.address}>
            Delivery radius:{' '}
            {pharmacy.deliveryRadiusKm} km
          </Text>
        ) : null}

      </View>


      {/* Quantity */}

      <View style={styles.quantitySection}>

        <Text style={styles.sectionTitle}>
          Quantity
        </Text>

        <View style={styles.quantityRow}>

          <TouchableOpacity
            style={styles.quantityButton}
            disabled={quantity <= 1}
            onPress={() =>
              setQuantity(
                Math.max(
                  1,
                  quantity - 1
                )
              )
            }
          >
            <Text style={styles.quantityButtonText}>
              −
            </Text>
          </TouchableOpacity>

          <Text style={styles.quantity}>
            {quantity}
          </Text>

          <TouchableOpacity
            style={styles.quantityButton}
            disabled={
              quantity >= maxQuantity
            }
            onPress={() =>
              setQuantity(
                Math.min(
                  maxQuantity,
                  quantity + 1
                )
              )
            }
          >
            <Text style={styles.quantityButtonText}>
              +
            </Text>
          </TouchableOpacity>

        </View>

      </View>


      {/* Total */}

      <View style={styles.totalRow}>

        <Text style={styles.totalLabel}>
          Total
        </Text>

        <Text style={styles.total}>
          ₹{(
            Number(item.sellingPrice) *
            quantity
          ).toFixed(2)}
        </Text>

      </View>


      {/* Add to cart */}

      <TouchableOpacity
        style={[
          styles.addButton,
          adding && styles.disabledButton,
        ]}
        disabled={adding}
        onPress={handleAddToCart}
      >

        {adding ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.addButtonText}>
            🛒 Add to Cart
          </Text>
        )}

      </TouchableOpacity>

      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingTop: 50,
  },

  contentContainer: {
    paddingHorizontal: 18,
    paddingBottom: 60,
  },

  header: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  back: {
    fontSize: 30,
    color: '#172033',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
  },

  cart: {
    fontSize: 23,
  },

  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },

  medicineIcon: {
    width: 75,
    height: 75,
    borderRadius: 20,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 38,
  },

  name: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
  },

  brand: {
    marginTop: 4,
    fontSize: 14,
    color: '#475569',
  },

  category: {
    marginTop: 3,
    fontSize: 12,
    color: '#94A3B8',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 8,
  },

  pharmacyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263247',
  },

  address: {
    marginTop: 4,
    fontSize: 12,
    color: '#687386',
  },

  priceCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
  },

  smallLabel: {
    fontSize: 11,
    color: '#8A94A6',
    marginBottom: 3,
  },

  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#16A34A',
  },

  stock: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },

  delivery: {
    fontSize: 14,
    color: '#334155',
  },

  quantitySection: {
    marginTop: 15,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },

  quantity: {
    width: 55,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#172033',
  },

  totalRow: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },

  total: {
    fontSize: 23,
    fontWeight: '800',
    color: '#172033',
  },

  addButton: {
    marginTop: 15,
    marginBottom: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  center: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  loadingText: {
    marginTop: 10,
    color: '#64748B',
  },

  errorIcon: {
    fontSize: 50,
  },

  errorTitle: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
  },

  errorText: {
    marginTop: 6,
    color: '#64748B',
    textAlign: 'center',
  },

  backButton: {
    marginTop: 20,
    backgroundColor: '#2563EB',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

});