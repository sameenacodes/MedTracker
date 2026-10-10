import { useLocalSearchParams, useRouter } from 'expo-router';

import { useEffect, useState } from 'react';



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
  cancelCustomerOrder,

  getCustomerOrder,
  getCustomerOrders,
} from '../services/api';



const STATUS_STEPS = [

  {

    key: 'placed',

    title: 'Order Placed',

    icon: '🛒',

  },

  {

    key: 'accepted',

    title: 'Order Accepted',

    icon: '✅',

  },

  {

    key: 'preparing',

    title: 'Preparing',

    icon: '📦',

  },

  {

    key: 'ready_for_pickup',

    title: 'Ready for Pickup',

    icon: '🏪',

  },

  {

    key: 'out_for_delivery',

    title: 'Out for Delivery',

    icon: '🚚',

  },

  {

    key: 'delivered',

    title: 'Delivered',

    icon: '🎉',

  },

];



const STATUS_INDEX = {

  placed: 0,

  accepted: 1,

  preparing: 2,

  ready_for_pickup: 3,

  out_for_delivery: 4,

  delivered: 5,

};



export default function CustomerOrderDetails() {



  const router = useRouter();



  const params = useLocalSearchParams();

  const rawOrderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;

  const rawId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const orderId = rawOrderId || rawId;



  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [cancelling, setCancelling] = useState(false);





  const loadOrder = async () => {
    try {
      if (!orderId) {
        Alert.alert('Error', 'Order ID is missing');
        return;
      }

      const normalizedOrderId = String(orderId);

      console.log(
        'Customer Order Details - orderId:',
        normalizedOrderId
      );

      let foundOrder = null;

      // First try the direct order endpoint using MongoDB _id.
      try {
        const response = await getCustomerOrder(
          normalizedOrderId
        );

        foundOrder =
          response?.order || response || null;
      } catch (directError) {
        console.log(
          'Direct order lookup failed, trying my orders:',
          directError
        );
      }

      // Fallback: supports an order number such as MED-...
      if (!foundOrder) {
        const response = await getCustomerOrders();

        const orders = Array.isArray(response)
          ? response
          : Array.isArray(response?.orders)
            ? response.orders
            : [];

        foundOrder =
          orders.find(
            (item) =>
              String(item?._id || '') === normalizedOrderId ||
              String(item?.orderNumber || '') === normalizedOrderId
          ) || null;
      }

      if (!foundOrder) {
        throw new Error('Order not found');
      }

      setOrder(foundOrder);



    } catch (error) {



      console.log('Load order error:', error);



      Alert.alert(

        'Error',

        error.message || 'Failed to load order'

      );



    } finally {



      setLoading(false);

      setRefreshing(false);



    }

  };





  useEffect(() => {

    loadOrder();

  }, [orderId]);





  const handleRefresh = () => {



    setRefreshing(true);



    loadOrder();



  };





  const handleCancel = () => {



    Alert.alert(

      'Cancel Order',

      'Are you sure you want to cancel this order?',

      [

        {

          text: 'No',

          style: 'cancel',

        },

        {

          text: 'Yes, Cancel',

          style: 'destructive',



          onPress: async () => {



            try {



              setCancelling(true);



              await cancelCustomerOrder(

                orderId,

                'Cancelled by customer'

              );



              Alert.alert(

                'Order Cancelled',

                'Your order has been cancelled and stock has been restored.'

              );



              await loadOrder();



            } catch (error) {



              Alert.alert(

                'Cancellation Failed',

                error.message || 'Unable to cancel order'

              );



            } finally {



              setCancelling(false);



            }

          },

        },

      ]

    );

  };





  if (loading) {



    return (

      <View style={styles.center}>

        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>

          Loading order...

        </Text>

      </View>

    );



  }





  if (!order) {



    return (

      <View style={styles.center}>



        <Text style={styles.errorText}>

          Order not found

        </Text>



        <TouchableOpacity

          style={styles.backButton}

          onPress={() => router.back()}

        >

          <Text style={styles.backButtonText}>

            Go Back

          </Text>

        </TouchableOpacity>



      </View>

    );



  }





  const currentStatus =

    order.orderStatus || 'placed';



  const currentIndex =

    STATUS_INDEX[currentStatus] ?? 0;



  const canCancel =

    currentStatus === 'placed' ||

    currentStatus === 'accepted';





  return (

    <ScrollView

      style={styles.container}

      contentContainerStyle={styles.content}

      refreshControl={

        <RefreshControl

          refreshing={refreshing}

          onRefresh={handleRefresh}

        />

      }

    >



      {/* HEADER */}



      <View style={styles.header}>



        <TouchableOpacity

          onPress={() => router.back()}

        >

          <Text style={styles.back}>

            ←

          </Text>

        </TouchableOpacity>



        <View style={styles.headerInfo}>



          <Text style={styles.title}>

            Order Details

          </Text>



          <Text style={styles.orderNumber}>

            #{order.orderNumber || order._id}

          </Text>



        </View>



      </View>





      {/* STATUS CARD */}



      <View style={styles.card}>



        <Text style={styles.cardTitle}>

          Order Status

        </Text>



        {STATUS_STEPS.map((step, index) => {



          const completed =

            index <= currentIndex;



          const active =

            index === currentIndex;



          return (

            <View

              key={step.key}

              style={styles.statusRow}

            >



              <View style={styles.statusLeft}>



                <View

                  style={[

                    styles.circle,

                    completed && styles.circleCompleted,

                    active && styles.circleActive,

                  ]}

                >



                  <Text style={styles.icon}>

                    {step.icon}

                  </Text>



                </View>



                {index !== STATUS_STEPS.length - 1 && (

                  <View

                    style={[

                      styles.line,

                      index < currentIndex &&

                        styles.lineCompleted,

                    ]}

                  />

                )}



              </View>





              <View style={styles.statusTextContainer}>



                <Text

                  style={[

                    styles.statusTitle,

                    completed &&

                      styles.statusCompleted,

                  ]}

                >

                  {step.title}

                </Text>



                {active && (

                  <Text style={styles.currentText}>

                    Current status

                  </Text>

                )}



              </View>



            </View>

          );



        })}



      </View>





      {/* REJECTED */}



      {currentStatus === 'rejected' && (

        <View style={styles.rejectedCard}>



          <Text style={styles.rejectedTitle}>

            ❌ Order Rejected

          </Text>



          <Text style={styles.rejectedText}>

            {order.cancellationReason ||

              'The pharmacy rejected this order.'}

          </Text>



        </View>

      )}





      {/* CANCELLED */}



      {currentStatus === 'cancelled' && (

        <View style={styles.rejectedCard}>



          <Text style={styles.rejectedTitle}>

            ❌ Order Cancelled

          </Text>



          <Text style={styles.rejectedText}>

            {order.cancellationReason ||

              'This order was cancelled.'}

          </Text>



        </View>

      )}





      {/* PHARMACY */}



      <View style={styles.card}>



        <Text style={styles.cardTitle}>

          Pharmacy

        </Text>



        <Text style={styles.pharmacyName}>

          {order.pharmacy?.name || 'Pharmacy'}

        </Text>



        {order.pharmacy?.phone && (

          <Text style={styles.info}>

            📞 {order.pharmacy.phone}

          </Text>

        )}



        {order.pharmacy?.address && (

          <Text style={styles.info}>

            📍 {order.pharmacy.address}

          </Text>

        )}



        {order.pharmacy?.city && (

          <Text style={styles.info}>

            {order.pharmacy.city}

          </Text>

        )}



      </View>





      {/* ITEMS */}



      <View style={styles.card}>



        <Text style={styles.cardTitle}>

          Medicines

        </Text>



        {order.items?.map((item, index) => (



          <View

            key={item._id || index}

            style={styles.itemRow}

          >



            <View style={styles.itemInfo}>



              <Text style={styles.medicineName}>

                {item.medicineName}

              </Text>



              {item.brand && (

                <Text style={styles.brand}>

                  {item.brand}

                </Text>

              )}



              <Text style={styles.quantity}>

                Qty: {item.quantity}

              </Text>



            </View>



            <Text style={styles.price}>

              ₹{Number(item.totalPrice || 0).toFixed(2)}

            </Text>



          </View>



        ))}



      </View>





      {/* DELIVERY ADDRESS */}



      <View style={styles.card}>



        <Text style={styles.cardTitle}>

          Delivery Address

        </Text>



        <Text style={styles.address}>

          {order.deliveryAddress?.address}

        </Text>



        {order.deliveryAddress?.city && (

          <Text style={styles.info}>

            {order.deliveryAddress.city}

          </Text>

        )}



        {order.deliveryAddress?.pincode && (

          <Text style={styles.info}>

            PIN: {order.deliveryAddress.pincode}

          </Text>

        )}



      </View>





      {/* PAYMENT */}



      <View style={styles.card}>



        <Text style={styles.cardTitle}>

          Payment

        </Text>



        <View style={styles.amountRow}>



          <Text>

            Subtotal

          </Text>



          <Text>

            ₹{Number(order.subtotal || 0).toFixed(2)}

          </Text>



        </View>



        <View style={styles.amountRow}>



          <Text>

            Delivery Fee

          </Text>



          <Text>

            ₹{Number(order.deliveryFee || 0).toFixed(2)}

          </Text>



        </View>



        <View style={styles.totalRow}>



          <Text style={styles.totalLabel}>

            Total

          </Text>



          <Text style={styles.totalAmount}>

            ₹{Number(order.totalAmount || 0).toFixed(2)}

          </Text>



        </View>



        <Text style={styles.paymentMethod}>

          Payment: {order.paymentMethod || 'COD'}

        </Text>



      </View>





      {/* CANCEL BUTTON */}



      {canCancel && (

        <TouchableOpacity

          style={styles.cancelButton}

          onPress={handleCancel}

          disabled={cancelling}

        >



          {cancelling ? (

            <ActivityIndicator />

          ) : (

            <Text style={styles.cancelText}>

              Cancel Order

            </Text>

          )}



        </TouchableOpacity>

      )}





      <TouchableOpacity

        style={styles.continueButton}

        onPress={() => router.back()}

      >



        <Text style={styles.continueText}>

          Back to Orders

        </Text>



      </TouchableOpacity>



    </ScrollView>

  );

}





const styles = StyleSheet.create({



  container: {

    flex: 1,

    backgroundColor: '#f5f7fb',

  },



  content: {

    padding: 16,

    paddingBottom: 40,

  },



  center: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    padding: 20,

  },



  loadingText: {

    marginTop: 10,

    color: '#666',

  },



  errorText: {

    fontSize: 18,

    fontWeight: '600',

  },



  header: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 18,

  },



  back: {

    fontSize: 30,

    marginRight: 12,

  },



  headerInfo: {

    flex: 1,

  },



  title: {

    fontSize: 24,

    fontWeight: '700',

  },



  orderNumber: {

    marginTop: 3,

    color: '#777',

  },



  card: {

    backgroundColor: '#fff',

    borderRadius: 16,

    padding: 18,

    marginBottom: 15,

  },



  cardTitle: {

    fontSize: 18,

    fontWeight: '700',

    marginBottom: 15,

  },



  statusRow: {

    flexDirection: 'row',

    minHeight: 70,

  },



  statusLeft: {

    width: 45,

    alignItems: 'center',

  },



  circle: {

    width: 38,

    height: 38,

    borderRadius: 19,

    backgroundColor: '#e5e7eb',

    justifyContent: 'center',

    alignItems: 'center',

  },



  circleCompleted: {

    backgroundColor: '#d1fae5',

  },



  circleActive: {

    borderWidth: 2,

    borderColor: '#16a34a',

  },



  icon: {

    fontSize: 18,

  },



  line: {

    width: 2,

    flex: 1,

    backgroundColor: '#ddd',

    marginVertical: 3,

  },



  lineCompleted: {

    backgroundColor: '#16a34a',

  },



  statusTextContainer: {

    flex: 1,

    paddingLeft: 12,

    paddingTop: 7,

  },



  statusTitle: {

    fontSize: 15,

    color: '#999',

    fontWeight: '600',

  },



  statusCompleted: {

    color: '#222',

  },



  currentText: {

    color: '#16a34a',

    fontSize: 12,

    marginTop: 3,

  },



  rejectedCard: {

    backgroundColor: '#fee2e2',

    borderRadius: 16,

    padding: 18,

    marginBottom: 15,

  },



  rejectedTitle: {

    color: '#b91c1c',

    fontSize: 17,

    fontWeight: '700',

  },



  rejectedText: {

    color: '#7f1d1d',

    marginTop: 6,

  },



  pharmacyName: {

    fontSize: 17,

    fontWeight: '700',

    marginBottom: 8,

  },



  info: {

    color: '#666',

    marginTop: 5,

  },



  itemRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    borderBottomWidth: 1,

    borderBottomColor: '#eee',

    paddingVertical: 12,

  },



  itemInfo: {

    flex: 1,

  },



  medicineName: {

    fontSize: 16,

    fontWeight: '600',

  },



  brand: {

    color: '#777',

    marginTop: 3,

  },



  quantity: {

    color: '#555',

    marginTop: 5,

  },



  price: {

    fontSize: 15,

    fontWeight: '700',

    marginLeft: 10,

  },



  address: {

    fontSize: 15,

    lineHeight: 22,

  },



  amountRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    marginBottom: 10,

  },



  totalRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    borderTopWidth: 1,

    borderTopColor: '#ddd',

    paddingTop: 14,

    marginTop: 5,

  },



  totalLabel: {

    fontSize: 18,

    fontWeight: '700',

  },



  totalAmount: {

    fontSize: 18,

    fontWeight: '700',

  },



  paymentMethod: {

    marginTop: 12,

    color: '#666',

  },



  cancelButton: {

    backgroundColor: '#fee2e2',

    borderWidth: 1,

    borderColor: '#ef4444',

    borderRadius: 12,

    padding: 15,

    alignItems: 'center',

    marginBottom: 12,

  },



  cancelText: {

    color: '#dc2626',

    fontWeight: '700',

    fontSize: 16,

  },



  continueButton: {

    backgroundColor: '#111827',

    borderRadius: 12,

    padding: 15,

    alignItems: 'center',

  },



  continueText: {

    color: '#fff',

    fontWeight: '700',

    fontSize: 16,

  },



  backButton: {

    marginTop: 20,

    backgroundColor: '#111827',

    paddingHorizontal: 25,

    paddingVertical: 12,

    borderRadius: 10,

  },



  backButtonText: {

    color: '#fff',

    fontWeight: '600',

  },



});