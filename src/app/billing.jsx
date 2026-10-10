import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  createInvoiceFromSale,
  createSale,
  getMedicines,
} from '../services/api';

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

export default function Billing() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState('');
  const [search, setSearch] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [billGenerated, setBillGenerated] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [billNumber, setBillNumber] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  // ---------------------------------------------------------
  // LOAD MEDICINES
  // ---------------------------------------------------------
  const loadMedicines = async () => {
    try {
      setLoading(true);

      const response = await getMedicines();

      const medicines = Array.isArray(response)
        ? response
        : response?.medicines || response?.data || [];

      const formatted = medicines.map((medicine) => ({
        id: medicine._id,
        name: medicine.name,
        batch: medicine.batchNumber || '-',
        expiry: medicine.expiryDate
          ? new Date(medicine.expiryDate).toLocaleDateString('en-IN')
          : '-',
        price: Number(medicine.sellingPrice || 0),
        stock: Number(medicine.quantity || 0),
        status: medicine.status || 'safe',
      }));

      setAvailableMedicines(formatted);
    } catch (error) {
      console.error('Load medicines error:', error);

      Alert.alert(
        'Unable to load medicines',
        'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMedicines();
  };

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------
  const filteredMedicines = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return availableMedicines;
    }

    return availableMedicines.filter(
      (medicine) =>
        medicine.name?.toLowerCase().includes(value) ||
        medicine.batch?.toLowerCase().includes(value)
    );
  }, [availableMedicines, search]);

  // ---------------------------------------------------------
  // ADD TO CART
  // ---------------------------------------------------------
  const addToCart = (medicine) => {
    if (medicine.status === 'expired') {
      Alert.alert(
        'Medicine expired',
        `${medicine.name} cannot be added to the bill.`
      );
      return;
    }

    if (medicine.status === 'removed') {
      Alert.alert(
        'Medicine removed',
        `${medicine.name} is marked as removed from stock.`
      );
      return;
    }

    if (medicine.stock <= 0) {
      Alert.alert(
        'Out of stock',
        `${medicine.name} is currently out of stock.`
      );
      return;
    }

    const existingItem = cartItems.find(
      (item) => item.id === medicine.id
    );

    if (existingItem) {
      if (existingItem.quantity >= medicine.stock) {
        Alert.alert(
          'Stock limit reached',
          `Only ${medicine.stock} unit(s) available.`
        );
        return;
      }

      setCartItems((current) =>
        current.map((item) =>
          item.id === medicine.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );

      return;
    }

    setCartItems((current) => [
      ...current,
      {
        ...medicine,
        quantity: 1,
      },
    ]);
  };

  // ---------------------------------------------------------
  // REMOVE FROM CART
  // ---------------------------------------------------------
  const removeFromCart = (medicineId) => {
    setCartItems((current) =>
      current.filter((item) => item.id !== medicineId)
    );
  };

  // ---------------------------------------------------------
  // UPDATE QUANTITY
  // ---------------------------------------------------------
  const updateQty = (medicineId, change) => {
    setCartItems((current) =>
      current
        .map((item) => {
          if (item.id !== medicineId) {
            return item;
          }

          const newQuantity = item.quantity + change;

          if (newQuantity > item.stock) {
            Alert.alert(
              'Stock limit reached',
              `Only ${item.stock} unit(s) available for ${item.name}.`
            );

            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // ---------------------------------------------------------
  // CALCULATIONS
  // ---------------------------------------------------------
  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [cartItems]);

  const gst = useMemo(() => {
    return Math.round(subtotal * 0.05);
  }, [subtotal]);

  const total = subtotal + gst;

  // ---------------------------------------------------------
  // GENERATE BILL
  // ---------------------------------------------------------
  const generateBill = async () => {
    if (cartItems.length === 0) {
      Alert.alert(
        'Cart is empty',
        'Please add at least one medicine before generating the bill.'
      );
      return;
    }

    if (!customerName.trim()) {
      Alert.alert(
        'Customer name required',
        'Please enter the customer name.'
      );
      return;
    }

    try {
      setGenerating(true);

      // ============================================
      // 1. CREATE SALE
      // ============================================

      const saleData = {
        customerName: customerName.trim(),

        items: cartItems.map((item) => ({
          medicine: item.id,
          medicineName: item.name,
          batchNumber: item.batch,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
      };

      console.log('Creating sale:', saleData);

      const saleResponse = await createSale(saleData);

      console.log('Sale response:', saleResponse);

      if (!saleResponse) {
        throw new Error('Sale could not be recorded.');
      }

      // ============================================
      // 2. CREATE DIGITAL INVOICE
      // ============================================
      // The existing billing screen uses 5% GST.
      // Send the same aggregate totals shown on screen
      // so the digital invoice matches the generated bill.

      const invoiceData = {
        customer: {
          name: customerName.trim(),
          phone: '',
          email: '',
          address: '',
        },

        items: cartItems.map((item) => {
          const itemSubtotal =
            Number(item.price || 0) *
            Number(item.quantity || 0);

          return {
            medicine: item.id,
            medicineName: item.name,
            batchNumber: item.batch,
            quantity: item.quantity,
            price: Number(item.price || 0),
            taxRate: 5,
            discount: 0,
            subtotal: itemSubtotal,
            taxAmount: 0,
            total: itemSubtotal,
          };
        }),

        subtotal: Number(subtotal || 0),
        discount: 0,
        taxAmount: Number(gst || 0),
        grandTotal: Number(total || 0),
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        notes: 'Generated from pharmacy billing',
      };

      console.log('Creating digital invoice:', invoiceData);

      const invoiceResponse =
        await createInvoiceFromSale(invoiceData);

      console.log(
        'Digital invoice response:',
        invoiceResponse
      );

      if (
        !invoiceResponse ||
        !invoiceResponse.invoice
      ) {
        throw new Error(
          'Sale was created, but digital invoice could not be created.'
        );
      }

      // ============================================
      // 3. USE REAL BACKEND INVOICE NUMBER
      // ============================================

      const generatedBillNumber =
        invoiceResponse.invoice.invoiceNumber;

      setBillNumber(generatedBillNumber);
      setBillGenerated(true);
    } catch (error) {
      console.error('Generate bill error:', error);

      Alert.alert(
        'Bill generation failed',
        error?.message ||
          'Unable to generate the bill. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  // ---------------------------------------------------------
  // NEW BILL
  // ---------------------------------------------------------
  const newBill = () => {
    setCartItems([]);
    setCustomerName('');
    setSearch('');
    setBillGenerated(false);
    setBillNumber('');

    loadMedicines();
  };

  // ---------------------------------------------------------
  // MONEY FORMAT
  // ---------------------------------------------------------
  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toFixed(2)}`;
  };

  // =========================================================
  // BILL GENERATED VIEW
  // =========================================================
  if (billGenerated) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.invoiceScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* SUCCESS HEADER */}
          <View style={styles.successHeader}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>

            <Text style={styles.successTitle}>Bill Generated</Text>

            <Text style={styles.successSubtitle}>
              Sale recorded successfully
            </Text>
          </View>

          {/* INVOICE */}
          <View style={styles.invoiceCard}>
            {/* PHARMACY HEADER */}
            <View style={styles.invoicePharmacy}>
              <View style={styles.pharmacyLogo}>
                <Text style={styles.pharmacyLogoText}>+</Text>
              </View>

              <View style={styles.pharmacyInfo}>
                <Text style={styles.pharmacyName}>
                  Sri Murugan Pharmacy
                </Text>

                <Text style={styles.pharmacyDetail}>
                  K.R. Nagar, Kovilpatti - 628 503
                </Text>

                <Text style={styles.pharmacyDetail}>
                  Phone: 98765 43210
                </Text>
              </View>
            </View>

            <View style={styles.invoiceDivider} />

            {/* INVOICE TITLE */}
            <View style={styles.invoiceTitleRow}>
              <View>
                <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
                <Text style={styles.invoiceSmall}>
                  Pharmacy Sale Receipt
                </Text>
              </View>

              <View style={styles.invoiceNumberBox}>
                <Text style={styles.invoiceNumberLabel}>
                  INVOICE NO.
                </Text>

                <Text style={styles.invoiceNumber}>
                  {billNumber}
                </Text>
              </View>
            </View>

            {/* CUSTOMER DETAILS */}
            <View style={styles.customerInfoBox}>
              <View style={styles.customerInfoItem}>
                <Text style={styles.invoiceLabel}>CUSTOMER</Text>

                <Text style={styles.invoiceValue}>
                  {customerName}
                </Text>
              </View>

              <View style={styles.customerInfoItem}>
                <Text style={styles.invoiceLabel}>DATE</Text>

                <Text style={styles.invoiceValue}>
                  {new Date().toLocaleDateString('en-IN')}
                </Text>
              </View>
            </View>

            {/* TABLE HEADER */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.itemColumn]}>
                MEDICINE
              </Text>

              <Text style={[styles.tableHeaderText, styles.qtyColumn]}>
                QTY
              </Text>

              <Text style={[styles.tableHeaderText, styles.priceColumn]}>
                PRICE
              </Text>

              <Text style={[styles.tableHeaderText, styles.totalColumn]}>
                TOTAL
              </Text>
            </View>

            {/* TABLE ITEMS */}
            {cartItems.map((item) => (
              <View
                key={item.id}
                style={styles.invoiceItemRow}
              >
                <View style={styles.itemColumn}>
                  <Text style={styles.invoiceMedicineName}>
                    {item.name}
                  </Text>

                  <Text style={styles.invoiceBatch}>
                    Batch: {item.batch}
                  </Text>
                </View>

                <Text style={[styles.invoiceCell, styles.qtyColumn]}>
                  {item.quantity}
                </Text>

                <Text style={[styles.invoiceCell, styles.priceColumn]}>
                  {formatCurrency(item.price)}
                </Text>

                <Text
                  style={[
                    styles.invoiceCell,
                    styles.totalColumn,
                    styles.invoiceTotalCell,
                  ]}
                >
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            ))}

            <View style={styles.invoiceDivider} />

            {/* SUMMARY */}
            <View style={styles.invoiceSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>

                <Text style={styles.summaryValue}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  GST (5%)
                </Text>

                <Text style={styles.summaryValue}>
                  {formatCurrency(gst)}
                </Text>
              </View>

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>
                  TOTAL
                </Text>

                <Text style={styles.grandTotalValue}>
                  {formatCurrency(total)}
                </Text>
              </View>
            </View>

            {/* FOOTER */}
            <View style={styles.invoiceFooter}>
              <Text style={styles.thankYouText}>
                Thank you for choosing Sri Murugan Pharmacy
              </Text>

              <Text style={styles.safetyText}>
                Please check your medicines before leaving the pharmacy.
              </Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={newBill}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              Create New Bill
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/dashboard')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // =========================================================
  // BILLING SCREEN
  // =========================================================
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.green}
          />
        }
        contentContainerStyle={styles.contentContainer}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>
              Create Bill
            </Text>

            <Text style={styles.headerSubtitle}>
              Select medicines and generate invoice
            </Text>
          </View>
        </View>

        {/* CUSTOMER SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Customer Details
          </Text>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>
              Customer Name
            </Text>

            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Enter customer name"
              placeholderTextColor="#9AA6A1"
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* MEDICINE SEARCH */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Add Medicines
              </Text>

              <Text style={styles.sectionSubtitle}>
                Search by medicine name or batch number
              </Text>
            </View>

            <View style={styles.stockCount}>
              <Text style={styles.stockCountText}>
                {availableMedicines.length}
              </Text>

              <Text style={styles.stockCountLabel}>
                Items
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search medicine or batch..."
              placeholderTextColor="#9AA6A1"
              style={styles.searchInput}
            />

            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                style={styles.clearSearch}
              >
                <Text style={styles.clearSearchText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* MEDICINE LIST */}
          <View style={styles.medicineList}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator
                  size="small"
                  color={COLORS.green}
                />

                <Text style={styles.loadingText}>
                  Loading medicines...
                </Text>
              </View>
            ) : filteredMedicines.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>⌕</Text>
                </View>

                <Text style={styles.emptyTitle}>
                  No medicines found
                </Text>

                <Text style={styles.emptySubtitle}>
                  Try another medicine name or batch number.
                </Text>
              </View>
            ) : (
              filteredMedicines.map((medicine) => {
                const isExpired =
                  medicine.status === 'expired';

                const isRemoved =
                  medicine.status === 'removed';

                const isOutOfStock =
                  medicine.stock <= 0;

                const isUnavailable =
                  isExpired ||
                  isRemoved ||
                  isOutOfStock;

                return (
                  <View
                    key={medicine.id}
                    style={[
                      styles.medicineCard,
                      isUnavailable &&
                        styles.medicineCardDisabled,
                    ]}
                  >
                    <View style={styles.medicineMain}>
                      <View style={styles.medicineIcon}>
                        <Text style={styles.medicineIconText}>
                          +
                        </Text>
                      </View>

                      <View style={styles.medicineInfo}>
                        <Text
                          style={styles.medicineName}
                          numberOfLines={1}
                        >
                          {medicine.name}
                        </Text>

                        <Text style={styles.batchText}>
                          Batch {medicine.batch}
                        </Text>

                        <View style={styles.medicineMeta}>
                          <Text style={styles.expiryText}>
                            Exp: {medicine.expiry}
                          </Text>

                          <View style={styles.metaDot} />

                          <Text
                            style={[
                              styles.stockText,
                              medicine.stock <= 0 &&
                                styles.stockTextDanger,
                            ]}
                          >
                            Stock: {medicine.stock}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.priceBox}>
                        <Text style={styles.priceText}>
                          {formatCurrency(medicine.price)}
                        </Text>

                        <Text style={styles.perUnit}>
                          per unit
                        </Text>
                      </View>
                    </View>

                    <View style={styles.medicineBottom}>
                      {isExpired ? (
                        <View
                          style={[
                            styles.statusBadge,
                            styles.statusExpired,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              styles.statusExpiredText,
                            ]}
                          >
                            EXPIRED
                          </Text>
                        </View>
                      ) : isRemoved ? (
                        <View
                          style={[
                            styles.statusBadge,
                            styles.statusRemoved,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              styles.statusRemovedText,
                            ]}
                          >
                            REMOVED
                          </Text>
                        </View>
                      ) : isOutOfStock ? (
                        <View
                          style={[
                            styles.statusBadge,
                            styles.statusExpired,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              styles.statusExpiredText,
                            ]}
                          >
                            OUT OF STOCK
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.statusBadge,
                            styles.statusAvailable,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              styles.statusAvailableText,
                            ]}
                          >
                            AVAILABLE
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          isUnavailable &&
                            styles.addButtonDisabled,
                        ]}
                        onPress={() => addToCart(medicine)}
                        disabled={isUnavailable}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.addButtonText,
                            isUnavailable &&
                              styles.addButtonTextDisabled,
                          ]}
                        >
                          {isUnavailable
                            ? 'Unavailable'
                            : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* CART */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Current Bill
              </Text>

              <Text style={styles.sectionSubtitle}>
                {cartItems.length === 0
                  ? 'No medicines added yet'
                  : `${cartItems.length} medicine${
                      cartItems.length > 1 ? 's' : ''
                    } added`}
              </Text>
            </View>

            {cartItems.length > 0 && (
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>
                  {cartItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}{' '}
                  units
                </Text>
              </View>
            )}
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <View style={styles.emptyCartIcon}>
                <Text style={styles.emptyCartIconText}>
                  +
                </Text>
              </View>

              <Text style={styles.emptyCartTitle}>
                Your bill is empty
              </Text>

              <Text style={styles.emptyCartSubtitle}>
                Add medicines from the list above to start billing.
              </Text>
            </View>
          ) : (
            <View style={styles.cartCard}>
              {cartItems.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.cartItem,
                    index !== cartItems.length - 1 &&
                      styles.cartItemBorder,
                  ]}
                >
                  <View style={styles.cartItemInfo}>
                    <Text
                      style={styles.cartItemName}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    <Text style={styles.cartItemBatch}>
                      Batch {item.batch}
                    </Text>

                    <Text style={styles.cartItemPrice}>
                      {formatCurrency(item.price)} ×{' '}
                      {item.quantity}
                    </Text>
                  </View>

                  <View style={styles.cartItemRight}>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateQty(item.id, -1)
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quantityButtonText}>
                          −
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.quantityText}>
                        {item.quantity}
                      </Text>

                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateQty(item.id, 1)
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quantityButtonText}>
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cartItemTotal}>
                      {formatCurrency(
                        item.price * item.quantity
                      )}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        removeFromCart(item.id)
                      }
                      style={styles.removeButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeButtonText}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* BILL SUMMARY */}
        {cartItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Bill Summary
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Subtotal
                </Text>

                <Text style={styles.summaryValue}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  GST
                </Text>

                <Text style={styles.summaryValue}>
                  {formatCurrency(gst)}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>
                    Total Amount
                  </Text>

                  <Text style={styles.totalSubtext}>
                    Inclusive of 5% GST
                  </Text>
                </View>

                <Text style={styles.totalValue}>
                  {formatCurrency(total)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.generateButton,
                generating && styles.generateButtonDisabled,
              ]}
              onPress={generateBill}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.white}
                  />

                  <Text style={styles.generateButtonText}>
                    Generating...
                  </Text>
                </>
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate Bill
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* BOTTOM SPACE */}
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

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 30,
  },

  invoiceScroll: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 35,
  },

  // -------------------------------------------------------
  // HEADER
  // -------------------------------------------------------

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backArrow: {
    fontSize: 30,
    lineHeight: 32,
    color: COLORS.text,
    fontWeight: '400',
  },

  headerTextBox: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.text,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // -------------------------------------------------------
  // SECTIONS
  // -------------------------------------------------------

  section: {
    marginBottom: 22,
  },

  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // -------------------------------------------------------
  // CUSTOMER INPUT
  // -------------------------------------------------------

  inputCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 7,
  },

  textInput: {
    height: 45,
    backgroundColor: COLORS.muted,
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 14,
    color: COLORS.text,
  },

  // -------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------

  searchBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 12,
  },

  searchIcon: {
    fontSize: 24,
    color: COLORS.green,
    marginRight: 8,
    marginTop: -3,
  },

  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: COLORS.text,
  },

  clearSearch: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  clearSearchText: {
    fontSize: 22,
    color: COLORS.textSecondary,
  },

  stockCount: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },

  stockCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.green,
  },

  stockCountLabel: {
    fontSize: 9,
    color: COLORS.green,
    marginTop: 1,
  },

  // -------------------------------------------------------
  // MEDICINE LIST
  // -------------------------------------------------------

  medicineList: {
    gap: 10,
  },

  medicineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
  },

  medicineCardDisabled: {
    opacity: 0.72,
  },

  medicineMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  medicineIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  medicineIconText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.green,
  },

  medicineInfo: {
    flex: 1,
    minWidth: 0,
  },

  medicineName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  batchText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  medicineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  expiryText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#AAB4AF',
    marginHorizontal: 6,
  },

  stockText: {
    fontSize: 10,
    color: COLORS.green,
    fontWeight: '700',
  },

  stockTextDanger: {
    color: COLORS.red,
  },

  priceBox: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  perUnit: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  medicineBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  statusBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  statusAvailable: {
    backgroundColor: COLORS.greenLight,
  },

  statusAvailableText: {
    color: COLORS.green,
  },

  statusExpired: {
    backgroundColor: COLORS.redLight,
  },

  statusExpiredText: {
    color: COLORS.red,
  },

  statusRemoved: {
    backgroundColor: COLORS.muted,
  },

  statusRemovedText: {
    color: COLORS.textSecondary,
  },

  addButton: {
    minWidth: 74,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  addButtonDisabled: {
    backgroundColor: COLORS.muted,
  },

  addButtonTextDisabled: {
    color: COLORS.textSecondary,
  },

  // -------------------------------------------------------
  // LOADING / EMPTY
  // -------------------------------------------------------

  loadingBox: {
    minHeight: 120,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 9,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  emptyBox: {
    minHeight: 150,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  emptyIconText: {
    fontSize: 22,
    color: COLORS.textSecondary,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  emptySubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // -------------------------------------------------------
  // CART
  // -------------------------------------------------------

  cartCount: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  cartCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
  },

  emptyCart: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 25,
    alignItems: 'center',
  },

  emptyCartIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 11,
  },

  emptyCartIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.green,
  },

  emptyCartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  emptyCartSubtitle: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },

  cartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  cartItem: {
    padding: 14,
    flexDirection: 'row',
  },

  cartItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  cartItemInfo: {
    flex: 1,
    paddingRight: 8,
  },

  cartItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  cartItemBatch: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  cartItemPrice: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 7,
  },

  cartItemRight: {
    alignItems: 'flex-end',
    minWidth: 120,
  },

  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.muted,
    borderRadius: 9,
    overflow: 'hidden',
  },

  quantityButton: {
    width: 31,
    height: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quantityButtonText: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.green,
  },

  quantityText: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  cartItemTotal: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  removeButton: {
    marginTop: 5,
    paddingVertical: 2,
  },

  removeButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.red,
  },

  // -------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  totalSubtext: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.green,
  },

  generateButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 13,
    flexDirection: 'row',
    gap: 9,
  },

  generateButtonDisabled: {
    opacity: 0.7,
  },

  generateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 10,
  },

  // =======================================================
  // GENERATED INVOICE
  // =======================================================

  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },

  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  successIconText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.green,
  },

  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },

  successSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  invoiceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  invoicePharmacy: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pharmacyLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  pharmacyLogoText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '400',
  },

  pharmacyInfo: {
    flex: 1,
  },

  pharmacyName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },

  pharmacyDetail: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  invoiceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  invoiceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  invoiceTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.4,
  },

  invoiceSmall: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  invoiceNumberBox: {
    alignItems: 'flex-end',
  },

  invoiceNumberLabel: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  invoiceNumber: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '900',
  },

  customerInfoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.muted,
    borderRadius: 10,
    padding: 11,
    marginTop: 15,
  },

  customerInfoItem: {
    flex: 1,
  },

  invoiceLabel: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  invoiceValue: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '700',
  },

  // -------------------------------------------------------
  // INVOICE TABLE
  // -------------------------------------------------------

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  tableHeaderText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  itemColumn: {
    flex: 1,
  },

  qtyColumn: {
    width: 35,
    textAlign: 'center',
  },

  priceColumn: {
    width: 65,
    textAlign: 'right',
  },

  totalColumn: {
    width: 70,
    textAlign: 'right',
  },

  invoiceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    minHeight: 48,
  },

  invoiceMedicineName: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.text,
  },

  invoiceBatch: {
    fontSize: 8,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  invoiceCell: {
    fontSize: 9,
    color: COLORS.text,
  },

  invoiceTotalCell: {
    fontWeight: '800',
  },

  invoiceSummary: {
    marginTop: 2,
  },

  grandTotalRow: {
    marginTop: 8,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },

  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.green,
  },

  invoiceFooter: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  thankYouText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  safetyText: {
    marginTop: 5,
    fontSize: 8,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },

  // -------------------------------------------------------
  // INVOICE ACTIONS
  // -------------------------------------------------------

  primaryButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryButton: {
    height: 50,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
});