import {
  ActivityIndicator,

  Alert,

  KeyboardAvoidingView,

  Platform,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,
} from 'react-native';

import {
  useCallback,

  useEffect,

  useState,
} from 'react';

import {
  useFocusEffect,

  useRouter,
} from 'expo-router';

import RazorpayCheckout from 'react-native-razorpay';

import {
  createCustomerOrder,

  createRazorpayOrder,

  demoPay,

  getCart,
  getMyPrescriptions,
  verifyRazorpayPayment
} from '../services/api';

// =====================================================

// CHECKOUT

// =====================================================

export default function Checkout() {

  const router = useRouter();

  // ===================================================

  // STATE

  // ===================================================

  const [cart, setCart] =

    useState(null);

  const [loading, setLoading] =

    useState(true);

  const [placingOrder, setPlacingOrder] =

    useState(false);

  const [name, setName] =

    useState('');

  const [phone, setPhone] =

    useState('');

  const [address, setAddress] =

    useState('');

  const [area, setArea] =

    useState('');

  const [city, setCity] =

    useState('');

  const [district, setDistrict] =

    useState('');

  const [pincode, setPincode] =

    useState('');

  const [paymentMethod, setPaymentMethod] =

    useState('COD');

  const [prescriptions, setPrescriptions] = useState([]);

  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);

  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);

  // =====================================================

  // LOAD CART

  // =====================================================

  const loadCart = async () => {

    try {

      setLoading(true);

      const data =

        await getCart();

      const loadedCart =

        data?.cart || {

          items: [],

          subtotal: 0,

        };

      setCart(

        loadedCart

      );

    } catch (error) {

      console.log(

        'Checkout cart error:',

        error

      );

      Alert.alert(

        'Error',

        error?.message ||

          'Unable to load cart'

      );

    } finally {

      setLoading(false);

    }

  };

  // =====================================================

  // PRESCRIPTION HELPERS

  // =====================================================

  const prescriptionRequired = Boolean(

    cart?.items?.some((item) =>

      Boolean(

        item?.requiresPrescription ??

        item?.inventory?.requiresPrescription

      )

    )

  );

  const loadApprovedPrescriptions = async () => {

    if (!prescriptionRequired) {

      setPrescriptions([]);

      setSelectedPrescriptionId(null);

      return;

    }

    try {

      setPrescriptionsLoading(true);

      const result = await getMyPrescriptions();

      const approvedAll = Array.isArray(result)
        ? result.filter((item) => item?.status === 'approved')
        : Array.isArray(result?.prescriptions)
          ? result.prescriptions.filter((item) => item?.status === 'approved')
          : [];

      // Only show approved prescriptions linked to a medicine in the current cart.
      const cartMedicineIds = (cart?.items || [])
        .map((item) => item?.medicine?._id || item?.medicine)
        .filter(Boolean)
        .map((id) => String(id));

      const approved = approvedAll.filter((prescription) => {
        const prescriptionMedicineIds = Array.isArray(prescription?.medicines)
          ? prescription.medicines
              .map((medicine) => medicine?._id || medicine)
              .filter(Boolean)
              .map((id) => String(id))
          : [];

        return (
          prescriptionMedicineIds.length > 0 &&
          prescriptionMedicineIds.some((id) => cartMedicineIds.includes(id))
        );
      });

      setPrescriptions(approved);

      setSelectedPrescriptionId((current) => {

        if (current && approved.some((item) => String(item?._id) === String(current))) {

          return current;

        }

        return approved.length === 1 ? approved[0]._id : null;

      });

    } catch (error) {

      console.log('Load approved prescriptions error:', error);

      setPrescriptions([]);

    } finally {

      setPrescriptionsLoading(false);

    }

  };

  useEffect(() => {

    loadApprovedPrescriptions();

  }, [prescriptionRequired, cart]);

  // =====================================================

  // LOAD CART WHEN SCREEN FOCUSES

  // =====================================================

  useFocusEffect(

    useCallback(() => {

      loadCart();

    }, [])

  );

  // =====================================================

  // GO TO ORDER DETAILS

  // =====================================================

  const goToOrderDetails = (

    order

  ) => {

    if (order?._id) {

      router.replace({

        pathname:

          '/customer-order-details',

        params: {

          orderId:

            String(order._id),

        },

      });

    } else {

      router.replace(

        '/customer-orders'

      );

    }

  };

  // =====================================================

  // VALIDATE CHECKOUT

  // =====================================================

  const validateCheckout = () => {

    // -----------------------------------------------

    // CART

    // -----------------------------------------------

    if (

      !cart?.items?.length

    ) {

      Alert.alert(

        'Cart Empty',

        'Please add medicines to your cart.'

      );

      return false;

    }

    // -----------------------------------------------

    // NAME

    // -----------------------------------------------

    if (

      !name.trim()

    ) {

      Alert.alert(

        'Required',

        'Please enter your name.'

      );

      return false;

    }

    // -----------------------------------------------

    // PHONE

    // -----------------------------------------------

    if (

      !phone.trim()

    ) {

      Alert.alert(

        'Required',

        'Please enter your phone number.'

      );

      return false;

    }

    if (

      !/^[0-9]{10}$/.test(

        phone.trim()

      )

    ) {

      Alert.alert(

        'Invalid Phone',

        'Enter a valid 10-digit phone number.'

      );

      return false;

    }

    // -----------------------------------------------

    // ADDRESS

    // -----------------------------------------------

    if (

      !address.trim()

    ) {

      Alert.alert(

        'Required',

        'Please enter your delivery address.'

      );

      return false;

    }

    // -----------------------------------------------

    // CITY

    // -----------------------------------------------

    if (

      !city.trim()

    ) {

      Alert.alert(

        'Required',

        'Please enter your city.'

      );

      return false;

    }

    // -----------------------------------------------

    // PINCODE

    // -----------------------------------------------

    if (

      !pincode.trim()

    ) {

      Alert.alert(

        'Required',

        'Please enter your pincode.'

      );

      return false;

    }

    if (

      !/^[0-9]{6}$/.test(

        pincode.trim()

      )

    ) {

      Alert.alert(

        'Invalid Pincode',

        'Enter a valid 6-digit pincode.'

      );

      return false;

    }

    // -----------------------------------------------

    // PHARMACY

    // -----------------------------------------------

    const pharmacyId =

      cart?.pharmacy?._id ||

      cart?.pharmacy;

    if (!pharmacyId) {

      Alert.alert(

        'Pharmacy Error',

        'Selected pharmacy information is missing.'

      );

      return false;

    }

    // -----------------------------------------------

    // ITEMS

    // -----------------------------------------------

    const invalidItem =

      cart.items.find(

        (item) => {

          const inventoryId =

            item.inventory?._id ||

            item.inventory;

          const quantity =

            Number(item.quantity);

          return (

            !inventoryId ||

            !Number.isInteger(

              quantity

            ) ||

            quantity <= 0

          );

        }

      );

    if (invalidItem) {

      Alert.alert(

        'Cart Error',

        'One or more cart items are invalid. Please refresh your cart.'

      );

      return false;

    }

    if (prescriptionRequired && !selectedPrescriptionId) {

      Alert.alert(

        'Prescription Required',

        prescriptions.length

          ? 'Please select an approved prescription before placing this order.'

          : 'This order contains prescription medicines. Please upload a prescription and get it approved first.'

      );

      return false;

    }

    return true;

  };

  // =====================================================

  // BUILD ORDER DATA

  // =====================================================

  const buildOrderData = () => {

    const items =

      cart.items.map(

        (item) => ({

          inventoryId:

            item.inventory?._id ||

            item.inventory,

          quantity:

            Number(

              item.quantity

            ),

        })

      );

    const pharmacyId =

      cart.pharmacy?._id ||

      cart.pharmacy;

    const deliveryAddress = {

      name:

        name.trim(),

      phone:

        phone.trim(),

      address:

        address.trim(),

      area:

        area.trim(),

      city:

        city.trim(),

      district:

        district.trim(),

      pincode:

        pincode.trim(),

    };

    return {

      pharmacyId,

      items,

      deliveryAddress,

      ...(selectedPrescriptionId

        ? { prescriptionId: selectedPrescriptionId }

        : {}),

    };

  };

  // =====================================================

  // COD ORDER

  // =====================================================

  const placeCODOrder = async () => {

    const orderData =

      buildOrderData();

    const result =

      await createCustomerOrder({

        ...orderData,

        paymentMethod:

          'COD',

      });

    const order =

      result?.order;

    if (!order?._id) {

      throw new Error(

        'Order was created but order details were not returned.'

      );

    }

    Alert.alert(

      '🎉 Order Placed',

      `Your order ${

        order?.orderNumber || ''

      } has been placed successfully.`,

      [

        {

          text:

            'View Order',

          onPress: () => {

            goToOrderDetails(

              order

            );

          },

        },

      ]

    );

  };

  // =====================================================

  // DEMO PAYMENT SCREEN

  // =====================================================

  const processDemoPayment = async (

    paymentOrder

  ) => {

    return new Promise(

      (resolve) => {

        Alert.alert(

          '💳 Demo Payment',

          `Amount: ₹${Number(

            paymentOrder?.totalAmount || 0

          ).toFixed(2)}\n\nThis is a test payment. No real money will be charged.`,

          [

            // -----------------------------------------

            // CANCEL

            // -----------------------------------------

            {

              text:

                'Cancel',

              style:

                'cancel',

              onPress: () => {

                resolve({

                  cancelled: true,

                });

              },

            },

            // -----------------------------------------

            // FAILURE

            // -----------------------------------------

            {

              text:

                'Simulate Failure',

              style:

                'destructive',

              onPress: async () => {

                try {

                  await demoPay(

                    paymentOrder

                      .paymentSessionId,

                    'failed'

                  );

                  Alert.alert(

                    '❌ Payment Failed',

                    'Demo payment was intentionally failed.'

                  );

                  resolve({

                    failed: true,

                  });

                } catch (error) {

                  Alert.alert(

                    'Payment Failed',

                    error?.message ||

                      'Demo payment failed.'

                  );

                  resolve({

                    failed: true,

                  });

                }

              },

            },

            // -----------------------------------------

            // SUCCESS

            // -----------------------------------------

            {

              text:

                'Pay Successfully',

              onPress: async () => {

                try {

                  const result =

                    await demoPay(

                      paymentOrder

                        .paymentSessionId,

                      'success'

                    );

                  const order =

                    result?.order;

                  if (

                    !order?._id

                  ) {

                    throw new Error(

                      'Payment succeeded but order details were not returned.'

                    );

                  }

                  Alert.alert(

                    '✅ Payment Successful',

                    `Your order ${

                      order.orderNumber || ''

                    } has been placed successfully.`,

                    [

                      {

                        text:

                          'View Order',

                        onPress: () => {

                          goToOrderDetails(

                            order

                          );

                        },

                      },

                    ]

                  );

                  resolve({

                    success: true,

                  });

                } catch (error) {

                  console.log(

                    'Demo payment success error:',

                    error

                  );

                  Alert.alert(

                    'Payment Failed',

                    error?.message ||

                      'Unable to complete demo payment.'

                  );

                  resolve({

                    failed: true,

                  });

                }

              },

            },

          ]

        );

      }

    );

  };

  // =====================================================

  // REAL RAZORPAY PAYMENT

  // =====================================================

  const processRazorpayPayment = async (

    paymentOrder

  ) => {

    // -----------------------------------------------

    // CHECK REQUIRED DATA

    // -----------------------------------------------

    if (

      !paymentOrder?.razorpayOrderId

    ) {

      throw new Error(

        'Razorpay order ID is missing.'

      );

    }

    if (

      !paymentOrder?.paymentSessionId

    ) {

      throw new Error(

        'Payment session ID is missing.'

      );

    }

    if (

      !paymentOrder?.key

    ) {

      throw new Error(

        'Razorpay key is missing.'

      );

    }

    // -----------------------------------------------

    // RAZORPAY OPTIONS

    // -----------------------------------------------

    const options = {

      description:

        'MedTracker Medicine Order',

      currency:

        paymentOrder.currency ||

        'INR',

      key:

        paymentOrder.key,

      amount:

        paymentOrder.amount,

      name:

        'MedTracker',

      order_id:

        paymentOrder.razorpayOrderId,

      prefill: {

        name:

          name.trim(),

        contact:

          phone.trim(),

      },

      theme: {

        color:

          '#2563EB',

      },

    };

    console.log(

      'Opening Razorpay:',

      {

        orderId:

          paymentOrder

            .razorpayOrderId,

        amount:

          paymentOrder.amount,

      }

    );

    // -----------------------------------------------

    // OPEN RAZORPAY

    // -----------------------------------------------

    const razorpayResponse =

      await RazorpayCheckout.open(

        options

      );

    console.log(

      'Razorpay response:',

      razorpayResponse

    );

    // -----------------------------------------------

    // VERIFY ON SERVER

    // -----------------------------------------------

    const verified =

      await verifyRazorpayPayment({

        paymentSessionId:

          paymentOrder

            .paymentSessionId,

        razorpay_payment_id:

          razorpayResponse

            .razorpay_payment_id,

        razorpay_order_id:

          razorpayResponse

            .razorpay_order_id,

        razorpay_signature:

          razorpayResponse

            .razorpay_signature,

      });

    const order =

      verified?.order;

    if (!order?._id) {

      throw new Error(

        'Payment succeeded but order creation failed.'

      );

    }

    // -----------------------------------------------

    // SUCCESS

    // -----------------------------------------------

    Alert.alert(

      '✅ Payment Successful',

      `Your payment was successful.\n\nOrder ${

        order.orderNumber || ''

      } has been placed.`,

      [

        {

          text:

            'View Order',

          onPress: () => {

            goToOrderDetails(

              order

            );

          },

        },

      ]

    );

  };

  // =====================================================

  // ONLINE PAYMENT

  // =====================================================

  const startOnlinePayment = async () => {

    const orderData =

      buildOrderData();

    // -----------------------------------------------

    // CREATE PAYMENT ORDER

    // -----------------------------------------------

    const paymentOrder =

      await createRazorpayOrder(

        orderData

      );

    if (

      !paymentOrder

    ) {

      throw new Error(

        'Payment server returned an empty response.'

      );

    }

    console.log(

      'Payment order:',

      paymentOrder

    );

    // =================================================

    // DEMO MODE

    // =================================================

    if (

      paymentOrder.paymentMode ===

      'demo'

    ) {

      await processDemoPayment(

        paymentOrder

      );

      return;

    }

    // =================================================

    // REAL RAZORPAY MODE

    // =================================================

    await processRazorpayPayment(

      paymentOrder

    );

  };

  // =====================================================

  // PLACE ORDER

  // =====================================================

  const placeOrder = async () => {

    // -----------------------------------------------

    // VALIDATION

    // -----------------------------------------------

    if (

      !validateCheckout()

    ) {

      return;

    }

    // -----------------------------------------------

    // PREVENT DOUBLE CLICK

    // -----------------------------------------------

    if (

      placingOrder

    ) {

      return;

    }

    try {

      setPlacingOrder(

        true

      );

      // ---------------------------------------------

      // COD

      // ---------------------------------------------

      if (

        paymentMethod ===

        'COD'

      ) {

        await placeCODOrder();

      }

      // ---------------------------------------------

      // ONLINE

      // ---------------------------------------------

      else {

        await startOnlinePayment();

      }

    } catch (error) {

      console.log(

        'Place order error:',

        error

      );

      const errorCode =

        error?.code;

      const errorMessage =

        String(

          error?.description ||

          error?.message ||

          ''

        );

      const lowerMessage =

        errorMessage.toLowerCase();

      // ---------------------------------------------

      // RAZORPAY CANCEL

      // ---------------------------------------------

      if (

        paymentMethod ===

          'ONLINE' &&

        (

          errorCode === 2 ||

          lowerMessage.includes(

            'cancel'

          )

        )

      ) {

        Alert.alert(

          'Payment Cancelled',

          'You cancelled the payment. No order was placed.'

        );

      }

      // ---------------------------------------------

      // NORMAL ERROR

      // ---------------------------------------------

      else {

        Alert.alert(

          paymentMethod ===

          'ONLINE'

            ? 'Payment Failed'

            : 'Order Failed',

          errorMessage ||

            (

              paymentMethod ===

              'ONLINE'

                ? 'Unable to complete online payment.'

                : 'Unable to place your order.'

            )

        );

      }

    } finally {

      setPlacingOrder(

        false

      );

    }

  };

  // =====================================================

  // LOADING

  // =====================================================

  if (loading) {

    return (

      <View

        style={styles.center}

      >

        <ActivityIndicator

          size="large"

        />

        <Text

          style={

            styles.loadingText

          }

        >

          Loading checkout...

        </Text>

      </View>

    );

  }

  // =====================================================

  // EMPTY CART

  // =====================================================

  if (

    !cart?.items?.length

  ) {

    return (

      <View

        style={styles.center}

      >

        <Text

          style={styles.emptyIcon}

        >

          🛒

        </Text>

        <Text

          style={styles.emptyTitle}

        >

          Your cart is empty

        </Text>

        <TouchableOpacity

          style={

            styles.shopButton

          }

          onPress={() =>

            router.replace(

              '/marketplace'

            )

          }

        >

          <Text

            style={

              styles.shopButtonText

            }

          >

            Browse Medicines

          </Text>

        </TouchableOpacity>

      </View>

    );

  }

  // =====================================================

  // MAIN UI

  // =====================================================

  return (

    <KeyboardAvoidingView

      style={

        styles.container

      }

      behavior={

        Platform.OS === 'ios'

          ? 'padding'

          : undefined

      }

    >




      <View

        style={styles.header}

      >

        <TouchableOpacity

          onPress={() =>

            router.back()

          }

          disabled={

            placingOrder

          }

        >

          <Text

            style={styles.back}

          >

            ←

          </Text>

        </TouchableOpacity>

        <Text

          style={

            styles.headerTitle

          }

        >

          Checkout

        </Text>

        <View

          style={

            styles.headerSpace

          }

        />

      </View>




      <ScrollView

        showsVerticalScrollIndicator={

          false

        }

        keyboardShouldPersistTaps="handled"

        contentContainerStyle={

          styles.scrollContent

        }

      >




        <View

          style={styles.card}

        >

          <Text

            style={

              styles.sectionTitle

            }

          >

            🏪 Pharmacy

          </Text>

          <Text

            style={

              styles.pharmacyName

            }

          >

            {cart.pharmacy?.name ||

              'Selected Pharmacy'}

          </Text>

          {cart.pharmacy?.city ? (

            <Text

              style={

                styles.muted

              }

            >

              {cart.pharmacy.city}

            </Text>

          ) : null}

        </View>




        <View

          style={styles.card}

        >

          <Text

            style={

              styles.sectionTitle

            }

          >

            📍 Delivery Address

          </Text>


          <TextInput

            style={

              styles.input

            }

            placeholder="Full Name"

            placeholderTextColor="#8A94A6"

            value={name}

            onChangeText={setName}

            editable={

              !placingOrder

            }

          />


          <TextInput

            style={

              styles.input

            }

            placeholder="10-digit Mobile Number"

            placeholderTextColor="#8A94A6"

            value={phone}

            onChangeText={(value) => {

              setPhone(

                value.replace(

                  /[^0-9]/g,

                  ''

                )

              );

            }}

            keyboardType="phone-pad"

            maxLength={10}

            editable={

              !placingOrder

            }

          />


          <TextInput

            style={[

              styles.input,

              styles.multiline,

            ]}

            placeholder="House / Street / Full Address"

            placeholderTextColor="#8A94A6"

            value={address}

            onChangeText={setAddress}

            multiline

            editable={

              !placingOrder

            }

          />


          <TextInput

            style={

              styles.input

            }

            placeholder="Area"

            placeholderTextColor="#8A94A6"

            value={area}

            onChangeText={setArea}

            editable={

              !placingOrder

            }

          />


          <View

            style={styles.row}

          >

            <TextInput

              style={[

                styles.input,

                styles.halfInput,

              ]}

              placeholder="City"

              placeholderTextColor="#8A94A6"

              value={city}

              onChangeText={setCity}

              editable={

                !placingOrder

              }

            />

            <TextInput

              style={[

                styles.input,

                styles.halfInput,

              ]}

              placeholder="District"

              placeholderTextColor="#8A94A6"

              value={district}

              onChangeText={setDistrict}

              editable={

                !placingOrder

              }

            />

          </View>


          <TextInput

            style={

              styles.input

            }

            placeholder="Pincode"

            placeholderTextColor="#8A94A6"

            value={pincode}

            onChangeText={(value) => {

              setPincode(

                value.replace(

                  /[^0-9]/g,

                  ''

                )

              );

            }}

            keyboardType="number-pad"

            maxLength={6}

            editable={

              !placingOrder

            }

          />

        </View>


        {/* PRESCRIPTION */}

        {prescriptionRequired && (

          <View style={styles.card}>

            <Text style={styles.sectionTitle}>📄 Prescription</Text>

            <View style={styles.prescriptionNotice}>

              <Text style={styles.prescriptionNoticeTitle}>Prescription required</Text>

              <Text style={styles.prescriptionNoticeText}>One or more medicines in your cart require an approved prescription.</Text>

            </View>

            {prescriptionsLoading ? (

              <View style={styles.prescriptionLoading}>

                <ActivityIndicator size="small" />

                <Text style={styles.muted}>Loading approved prescriptions...</Text>

              </View>

            ) : prescriptions.length === 0 ? (

              <View style={styles.noPrescriptionBox}>

                <Text style={styles.noPrescriptionTitle}>No approved prescription found</Text>

                <Text style={styles.muted}>Upload your prescription and wait for pharmacy approval before placing this order.</Text>

                <TouchableOpacity style={styles.uploadPrescriptionButton} onPress={() => {
                  const selectedPharmacyId =
                    cart?.pharmacy?._id ||
                    cart?.pharmacy;

                  if (!selectedPharmacyId) {
                    Alert.alert(
                      'Pharmacy Error',
                      'Selected pharmacy information is missing.'
                    );
                    return;
                  }

                  router.push({
                    pathname: '/prescriptions',
                    params: {
                      pharmacyId: String(
                        selectedPharmacyId
                      ),
                    },
                  });
                }} disabled={placingOrder}>

                  <Text style={styles.uploadPrescriptionButtonText}>Upload Prescription</Text>

                </TouchableOpacity>

              </View>

            ) : (

              <View>

                {prescriptions.map((prescription) => {

                  const selected = String(selectedPrescriptionId) === String(prescription?._id);

                  return (

                    <TouchableOpacity key={String(prescription?._id)} style={[styles.prescriptionOption, selected && styles.selectedPrescription]} onPress={() => setSelectedPrescriptionId(prescription?._id)} disabled={placingOrder}>

                      <View style={styles.prescriptionRadio}>{selected && <View style={styles.prescriptionRadioSelected} />}</View>

                      <View style={styles.prescriptionContent}>

                        <Text style={styles.prescriptionName} numberOfLines={1}>{prescription?.originalName || prescription?.fileName || 'Prescription'}</Text>

                        <Text style={styles.muted}>Approved prescription</Text>

                      </View>

                    </TouchableOpacity>

                  );

                })}

                <TouchableOpacity style={styles.uploadPrescriptionButtonSecondary} onPress={() => {
                  const selectedPharmacyId =
                    cart?.pharmacy?._id ||
                    cart?.pharmacy;

                  if (!selectedPharmacyId) {
                    Alert.alert(
                      'Pharmacy Error',
                      'Selected pharmacy information is missing.'
                    );
                    return;
                  }

                  router.push({
                    pathname: '/prescriptions',
                    params: {
                      pharmacyId: String(
                        selectedPharmacyId
                      ),
                    },
                  });
                }} disabled={placingOrder}>

                  <Text style={styles.uploadPrescriptionButtonSecondaryText}>Manage Prescriptions</Text>

                </TouchableOpacity>

              </View>

            )}

          </View>

        )}



        <View

          style={styles.card}

        >

          <Text

            style={

              styles.sectionTitle

            }

          >

            💳 Payment Method

          </Text>




          <TouchableOpacity

            style={[

              styles.paymentOption,

              paymentMethod ===

                'COD' &&

                styles.selectedPayment,

            ]}

            onPress={() =>

              setPaymentMethod(

                'COD'

              )

            }

            disabled={

              placingOrder

            }

          >

            <View

              style={

                styles.radio

              }

            >

              {paymentMethod ===

                'COD' && (

                <View

                  style={

                    styles.radioSelected

                  }

                />

              )}

            </View>

            <View

              style={

                styles.paymentContent

              }

            >

              <Text

                style={

                  styles.paymentTitle

                }

              >

                Cash on Delivery

              </Text>

              <Text

                style={

                  styles.muted

                }

              >

                Pay when your medicine arrives

              </Text>

            </View>

          </TouchableOpacity>




          <TouchableOpacity

            style={[

              styles.paymentOption,

              paymentMethod ===

                'ONLINE' &&

                styles.selectedPayment,

            ]}

            onPress={() =>

              setPaymentMethod(

                'ONLINE'

              )

            }

            disabled={

              placingOrder

            }

          >

            <View

              style={

                styles.radio

              }

            >

              {paymentMethod ===

                'ONLINE' && (

                <View

                  style={

                    styles.radioSelected

                  }

                />

              )}

            </View>

            <View

              style={

                styles.paymentContent

              }

            >

              <Text

                style={

                  styles.paymentTitle

                }

              >

                Online Payment

              </Text>

              <Text

                style={

                  styles.muted

                }

              >

                Secure payment / Demo payment

              </Text>

            </View>

          </TouchableOpacity>

        </View>




        <View

          style={styles.card}

        >

          <Text

            style={

              styles.sectionTitle

            }

          >

            🧾 Order Summary

          </Text>

          {cart.items.map(

            (item) => (

              <View

                key={

                  item._id

                }

                style={

                  styles.summaryRow

                }

              >

                <Text

                  style={

                    styles.itemName

                  }

                  numberOfLines={1}

                >

                  {item.medicineName}

                  {' × '}

                  {item.quantity}

                </Text>

                <Text

                  style={

                    styles.itemPrice

                  }

                >

                  ₹

                  {Number(

                    item.totalPrice ||

                    0

                  ).toFixed(2)}

                </Text>

              </View>

            )

          )}

          <View

            style={

              styles.divider

            }

          />


          <View

            style={

              styles.totalRow

            }

          >

            <Text

              style={

                styles.totalLabel

              }

            >

              Subtotal

            </Text>

            <Text

              style={

                styles.totalValue

              }

            >

              ₹

              {Number(

                cart.subtotal ||

                0

              ).toFixed(2)}

            </Text>

          </View>

          <Text

            style={

              styles.deliveryNote

            }

          >

            Delivery fee will be calculated

            automatically.

          </Text>

        </View>

      </ScrollView>




      <View

        style={

          styles.bottomBar

        }

      >


        <View>

          <Text

            style={

              styles.bottomLabel

            }

          >

            Subtotal

          </Text>

          <Text

            style={

              styles.bottomTotal

            }

          >

            ₹

            {Number(

              cart.subtotal ||

              0

            ).toFixed(2)}

          </Text>

        </View>


        <TouchableOpacity

          style={[

            styles.placeButton,

            placingOrder &&

              styles.disabled,

          ]}

          onPress={

            placeOrder

          }

          disabled={

            placingOrder

          }

        >

          {placingOrder ? (

            <View

              style={

                styles.loadingButton

              }

            >

              <ActivityIndicator

                color="#FFFFFF"

                size="small"

              />

              <Text

                style={

                  styles.processingText

                }

              >

                {paymentMethod ===

                'ONLINE'

                  ? 'Processing...'

                  : 'Placing...'}

              </Text>

            </View>

          ) : (

            <Text

              style={

                styles.placeButtonText

              }

            >

              {paymentMethod ===

              'ONLINE'

                ? 'Pay Now'

                : 'Place Order'}

            </Text>

          )}

        </TouchableOpacity>

      </View>

    </KeyboardAvoidingView>

  );

}

// =====================================================

// STYLES

// =====================================================

const styles =

  StyleSheet.create({

    // -------------------------------------------------

    // MAIN

    // -------------------------------------------------

    container: {

      flex: 1,

      backgroundColor:

        '#F7F9FC',

      paddingTop: 50,

    },

    center: {

      flex: 1,

      backgroundColor:

        '#F7F9FC',

      alignItems:

        'center',

      justifyContent:

        'center',

      padding:

        30,

    },

    loadingText: {

      marginTop:

        10,

      color:

        '#64748B',

      fontSize:

        14,

    },

    // -------------------------------------------------

    // EMPTY CART

    // -------------------------------------------------

    emptyIcon: {

      fontSize:

        55,

    },

    emptyTitle: {

      marginTop:

        15,

      fontSize:

        20,

      fontWeight:

        '800',

      color:

        '#172033',

    },

    shopButton: {

      marginTop:

        20,

      backgroundColor:

        '#2563EB',

      paddingHorizontal:

        25,

      paddingVertical:

        13,

      borderRadius:

        12,

    },

    shopButtonText: {

      color:

        '#FFFFFF',

      fontWeight:

        '800',

    },

    // -------------------------------------------------

    // HEADER

    // -------------------------------------------------

    header: {

      height:

        58,

      paddingHorizontal:

        18,

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'space-between',

    },

    back: {

      fontSize:

        30,

      color:

        '#172033',

    },

    headerTitle: {

      fontSize:

        21,

      fontWeight:

        '800',

      color:

        '#172033',

    },

    headerSpace: {

      width:

        30,

    },

    // -------------------------------------------------

    // SCROLL

    // -------------------------------------------------

    scrollContent: {

      paddingHorizontal:

        18,

      paddingBottom:

        130,

    },

    // -------------------------------------------------

    // CARD

    // -------------------------------------------------

    card: {

      backgroundColor:

        '#FFFFFF',

      borderRadius:

        17,

      padding:

        17,

      marginBottom:

        13,

      elevation:

        2,

      shadowColor:

        '#000000',

      shadowOffset: {

        width:

          0,

        height:

          1,

      },

      shadowOpacity:

        0.05,

      shadowRadius:

        3,

    },

    // -------------------------------------------------

    // SECTION TITLE

    // -------------------------------------------------

    sectionTitle: {

      fontSize:

        16,

      fontWeight:

        '800',

      color:

        '#172033',

      marginBottom:

        13,

    },

    // -------------------------------------------------

    // PHARMACY

    // -------------------------------------------------

    pharmacyName: {

      fontSize:

        16,

      fontWeight:

        '700',

      color:

        '#263247',

    },

    muted: {

      marginTop:

        3,

      fontSize:

        12,

      color:

        '#64748B',

    },

    // -------------------------------------------------

    // INPUT

    // -------------------------------------------------

    input: {

      height:

        48,

      borderWidth:

        1,

      borderColor:

        '#E1E6EE',

      borderRadius:

        11,

      paddingHorizontal:

        13,

      marginBottom:

        11,

      color:

        '#172033',

      backgroundColor:

        '#FAFBFC',

      fontSize:

        14,

    },

    multiline: {

      height:

        80,

      paddingTop:

        13,

      textAlignVertical:

        'top',

    },

    row: {

      flexDirection:

        'row',

      justifyContent:

        'space-between',

    },

    halfInput: {

      width:

        '48%',

    },

    // -------------------------------------------------

    // PRESCRIPTION

    prescriptionNotice: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 11, padding: 12, marginBottom: 12 },

    prescriptionNoticeTitle: { fontSize: 14, fontWeight: '800', color: '#9A3412', marginBottom: 4 },

    prescriptionNoticeText: { fontSize: 12, color: '#7C2D12', lineHeight: 18 },

    prescriptionLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },

    noPrescriptionBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },

    noPrescriptionTitle: { fontSize: 14, fontWeight: '800', color: '#172033', marginBottom: 5 },

    uploadPrescriptionButton: { marginTop: 12, backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },

    uploadPrescriptionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

    prescriptionOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E1E6EE', borderRadius: 12, padding: 12, marginBottom: 10 },

    selectedPrescription: { borderColor: '#2563EB', backgroundColor: '#F1F6FF' },

    prescriptionRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },

    prescriptionRadioSelected: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },

    prescriptionContent: { flex: 1 },

    prescriptionName: { fontSize: 14, fontWeight: '700', color: '#172033' },

    uploadPrescriptionButtonSecondary: { borderWidth: 1, borderColor: '#2563EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 2 },

    uploadPrescriptionButtonSecondaryText: { color: '#2563EB', fontSize: 13, fontWeight: '800' },

    // PAYMENT

    // -------------------------------------------------

    paymentOption: {

      flexDirection:

        'row',

      alignItems:

        'center',

      borderWidth:

        1,

      borderColor:

        '#E1E6EE',

      borderRadius:

        13,

      padding:

        13,

      marginBottom:

        10,

    },

    selectedPayment: {

      borderColor:

        '#2563EB',

      backgroundColor:

        '#F1F6FF',

    },

    radio: {

      width:

        22,

      height:

        22,

      borderRadius:

        11,

      borderWidth:

        2,

      borderColor:

        '#2563EB',

      alignItems:

        'center',

      justifyContent:

        'center',

      marginRight:

        12,

    },

    radioSelected: {

      width:

        10,

      height:

        10,

      borderRadius:

        5,

      backgroundColor:

        '#2563EB',

    },

    paymentContent: {

      flex:

        1,

    },

    paymentTitle: {

      fontSize:

        14,

      fontWeight:

        '700',

      color:

        '#172033',

    },

    // -------------------------------------------------

    // SUMMARY

    // -------------------------------------------------

    summaryRow: {

      flexDirection:

        'row',

      justifyContent:

        'space-between',

      alignItems:

        'center',

      marginBottom:

        10,

    },

    itemName: {

      flex:

        1,

      marginRight:

        10,

      fontSize:

        13,

      color:

        '#475569',

    },

    itemPrice: {

      fontSize:

        13,

      fontWeight:

        '700',

      color:

        '#172033',

    },

    divider: {

      height:

        1,

      backgroundColor:

        '#EEF0F4',

      marginVertical:

        8,

    },

    totalRow: {

      flexDirection:

        'row',

      justifyContent:

        'space-between',

      alignItems:

        'center',

    },

    totalLabel: {

      fontSize:

        16,

      fontWeight:

        '800',

      color:

        '#172033',

    },

    totalValue: {

      fontSize:

        20,

      fontWeight:

        '800',

      color:

        '#16A34A',

    },

    deliveryNote: {

      marginTop:

        8,

      fontSize:

        11,

      color:

        '#64748B',

    },

    // -------------------------------------------------

    // BOTTOM BAR

    // -------------------------------------------------

    bottomBar: {

      position:

        'absolute',

      left:

        0,

      right:

        0,

      bottom:

        0,

      backgroundColor:

        '#FFFFFF',

      borderTopWidth:

        1,

      borderTopColor:

        '#E5E7EB',

      paddingHorizontal:

        18,

      paddingVertical:

        12,

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'space-between',

    },

    bottomLabel: {

      fontSize:

        11,

      color:

        '#64748B',

    },

    bottomTotal: {

      fontSize:

        19,

      fontWeight:

        '800',

      color:

        '#172033',

    },

    // -------------------------------------------------

    // PLACE / PAY BUTTON

    // -------------------------------------------------

    placeButton: {

      minHeight:

        48,

      minWidth:

        130,

      paddingHorizontal:

        20,

      borderRadius:

        13,

      backgroundColor:

        '#2563EB',

      alignItems:

        'center',

      justifyContent:

        'center',

    },

    placeButtonText: {

      color:

        '#FFFFFF',

      fontSize:

        14,

      fontWeight:

        '800',

    },

    disabled: {

      opacity:

        0.6,

    },

    // -------------------------------------------------

    // BUTTON LOADING

    // -------------------------------------------------

    loadingButton: {

      flexDirection:

        'row',

      alignItems:

        'center',

      justifyContent:

        'center',

    },

    processingText: {

      color:

        '#FFFFFF',

      fontSize:

        12,

      fontWeight:

        '700',

      marginLeft:

        8,

    },

  })

