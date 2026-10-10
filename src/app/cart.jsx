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

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
    getCart,
    removeCartItem,
    updateCartItem,
} from '../services/api';

import { useFocusEffect } from 'expo-router';


export default function Cart() {

  const router = useRouter();

  const [cart, setCart] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);


  // =====================================================
  // LOAD CART
  // =====================================================

  const loadCart = async (
    showLoader = true
  ) => {

    try {

      if (showLoader) {
        setLoading(true);
      }

      const data =
        await getCart();

      setCart(
        data?.cart || {
          items: [],
          subtotal: 0,
          pharmacy: null,
        }
      );

    } catch (error) {

      console.log(
        'Load cart error:',
        error
      );

      Alert.alert(
        'Error',
        error.message ||
          'Unable to load cart'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }
  };


  // Reload whenever screen becomes active

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );


  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadCart(false);
  };


  // =====================================================
  // UPDATE QUANTITY
  // =====================================================

  const changeQuantity = async (
    item,
    change
  ) => {

    const newQuantity =
      item.quantity + change;


    if (newQuantity <= 0) {

      await removeItem(item._id);

      return;
    }


    try {

      setUpdating(true);

      const data =
        await updateCartItem(
          item._id,
          newQuantity
        );

      setCart(data.cart);

    } catch (error) {

      Alert.alert(
        'Unable to update',
        error.message ||
          'Failed to update quantity'
      );

    } finally {

      setUpdating(false);

    }
  };


  // =====================================================
  // REMOVE ITEM
  // =====================================================

  const removeItem = async (
    itemId
  ) => {

    try {

      setUpdating(true);

      const data =
        await removeCartItem(
          itemId
        );

      setCart(data.cart);

    } catch (error) {

      Alert.alert(
        'Unable to remove',
        error.message ||
          'Failed to remove item'
      );

    } finally {

      setUpdating(false);

    }
  };


  // =====================================================
  // CHECKOUT
  // =====================================================

  const handleCheckout = () => {

    if (
      !cart ||
      !cart.items ||
      cart.items.length === 0
    ) {
      Alert.alert(
        'Cart is empty',
        'Add a medicine before checkout.'
      );

      return;
    }


    router.push('/checkout');
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <View style={styles.center}>

        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading your cart...
        </Text>

      </View>
    );
  }


  const items =
    cart?.items || [];


  // =====================================================
  // EMPTY CART
  // =====================================================

  if (items.length === 0) {

    return (
      <View style={styles.container}>

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
            My Cart
          </Text>

          <View style={styles.headerSpace} />

        </View>


        <View style={styles.empty}>

          <Text style={styles.emptyIcon}>
            🛒
          </Text>

          <Text style={styles.emptyTitle}>
            Your cart is empty
          </Text>

          <Text style={styles.emptyText}>
            Search for medicines and add
            them to your cart.
          </Text>


          <TouchableOpacity
            style={styles.shopButton}
            onPress={() =>
              router.push('/marketplace')
            }
          >
            <Text style={styles.shopButtonText}>
              Browse Medicines
            </Text>
          </TouchableOpacity>

        </View>

      </View>
    );
  }


  return (
    <View style={styles.container}>

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

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
          My Cart
        </Text>


        <Text style={styles.itemCount}>
          {items.length}
        </Text>

      </View>


      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ================================================= */}
        {/* PHARMACY */}
        {/* ================================================= */}

        {cart?.pharmacy && (
          <View style={styles.pharmacyCard}>

            <Text style={styles.pharmacyIcon}>
              🏪
            </Text>

            <View style={styles.pharmacyInfo}>

              <Text style={styles.pharmacyLabel}>
                Ordering from
              </Text>

              <Text style={styles.pharmacyName}>
                {cart.pharmacy.name}
              </Text>

              {cart.pharmacy.city ? (
                <Text style={styles.pharmacyCity}>
                  {cart.pharmacy.city}
                </Text>
              ) : null}

            </View>

          </View>
        )}


        {/* ================================================= */}
        {/* CART ITEMS */}
        {/* ================================================= */}

        {items.map((item) => (

          <View
            key={item._id}
            style={styles.itemCard}
          >

            <View style={styles.itemTop}>

              <View style={styles.medicineIcon}>

                <Text style={styles.medicineEmoji}>
                  💊
                </Text>

              </View>


              <View style={styles.itemInfo}>

                <Text
                  style={styles.medicineName}
                  numberOfLines={2}
                >
                  {item.medicineName}
                </Text>

                {item.brand ? (
                  <Text style={styles.brand}>
                    {item.brand}
                  </Text>
                ) : null}

                <Text style={styles.unitPrice}>
                  ₹{Number(
                    item.unitPrice
                  ).toFixed(2)} each
                </Text>

              </View>


              <TouchableOpacity
                onPress={() =>
                  removeItem(item._id)
                }
                disabled={updating}
              >
                <Text style={styles.delete}>
                  🗑️
                </Text>
              </TouchableOpacity>

            </View>


            {/* Quantity */}

            <View style={styles.itemBottom}>

              <View style={styles.quantityRow}>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() =>
                    changeQuantity(
                      item,
                      -1
                    )
                  }
                  disabled={updating}
                >
                  <Text style={styles.quantityButtonText}>
                    −
                  </Text>
                </TouchableOpacity>


                <Text style={styles.quantity}>
                  {item.quantity}
                </Text>


                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() =>
                    changeQuantity(
                      item,
                      1
                    )
                  }
                  disabled={updating}
                >
                  <Text style={styles.quantityButtonText}>
                    +
                  </Text>
                </TouchableOpacity>

              </View>


              <Text style={styles.itemTotal}>
                ₹{Number(
                  item.totalPrice
                ).toFixed(2)}
              </Text>

            </View>

          </View>

        ))}


        {/* ================================================= */}
        {/* PRICE SUMMARY */}
        {/* ================================================= */}

        <View style={styles.summary}>

          <Text style={styles.summaryTitle}>
            Order Summary
          </Text>


          <View style={styles.summaryRow}>

            <Text style={styles.summaryLabel}>
              Subtotal
            </Text>

            <Text style={styles.summaryValue}>
              ₹{Number(
                cart.subtotal || 0
              ).toFixed(2)}
            </Text>

          </View>


          <View style={styles.summaryRow}>

            <Text style={styles.summaryLabel}>
              Delivery
            </Text>

            <Text style={styles.free}>
              Calculated at checkout
            </Text>

          </View>


          <View style={styles.divider} />


          <View style={styles.totalRow}>

            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              ₹{Number(
                cart.subtotal || 0
              ).toFixed(2)}
            </Text>

          </View>

        </View>

      </ScrollView>


      {/* ================================================= */}
      {/* CHECKOUT */}
      {/* ================================================= */}

      <View style={styles.bottomBar}>

        <View>

          <Text style={styles.bottomLabel}>
            Total
          </Text>

          <Text style={styles.bottomTotal}>
            ₹{Number(
              cart.subtotal || 0
            ).toFixed(2)}
          </Text>

        </View>


        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          disabled={updating}
        >
          <Text style={styles.checkoutText}>
            Proceed to Checkout →
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    paddingTop: 50,
  },

  center: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#64748B',
  },

  header: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F9FC',
  },

  back: {
    fontSize: 30,
    color: '#172033',
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#172033',
  },

  headerSpace: {
    width: 30,
  },

  itemCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingTop: 5,
    fontWeight: '800',
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 130,
  },

  pharmacyCard: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },

  pharmacyIcon: {
    fontSize: 28,
  },

  pharmacyInfo: {
    marginLeft: 12,
  },

  pharmacyLabel: {
    fontSize: 11,
    color: '#8A94A6',
  },

  pharmacyName: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#172033',
  },

  pharmacyCity: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },

  itemCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    elevation: 2,
  },

  itemTop: {
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

  medicineEmoji: {
    fontSize: 26,
  },

  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  medicineName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#172033',
  },

  brand: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },

  unitPrice: {
    marginTop: 5,
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },

  delete: {
    fontSize: 19,
  },

  itemBottom: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },

  quantity: {
    width: 45,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: '#172033',
  },

  itemTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#172033',
  },

  summary: {
    marginTop: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 17,
    elevation: 2,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 15,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
  },

  free: {
    fontSize: 12,
    color: '#64748B',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEF0F4',
    marginVertical: 5,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#172033',
  },

  totalValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#16A34A',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bottomLabel: {
    fontSize: 11,
    color: '#64748B',
  },

  bottomTotal: {
    fontSize: 19,
    fontWeight: '800',
    color: '#172033',
  },

  checkoutButton: {
    backgroundColor: '#2563EB',
    borderRadius: 13,
    paddingHorizontal: 18,
    height: 48,
    justifyContent: 'center',
  },

  checkoutText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  emptyIcon: {
    fontSize: 55,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#172033',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 20,
  },

  shopButton: {
    marginTop: 22,
    backgroundColor: '#2563EB',
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 12,
  },

  shopButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

});