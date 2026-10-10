import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { getInvoiceById } from '../services/api';

export default function InvoiceDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // =====================================================
  // FETCH INVOICE
  // =====================================================

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError('');

      if (!id) {
        throw new Error('Invoice ID is missing');
      }

      const result = await getInvoiceById(id);

      if (!result?.invoice) {
        throw new Error('Invoice details not found');
      }

      setInvoice(result.invoice);
    } catch (error) {
      console.log('Invoice details error:', error);

      setError(
        error.message ||
          'Failed to load invoice'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (value) => {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // =====================================================
  // PAYMENT STYLE
  // =====================================================

  const getPaymentStyle = (status) => {
    switch (status) {
      case 'paid':
        return {
          background: '#EAF6F0',
          color: '#176B52',
          label: 'PAID',
        };

      case 'pending':
        return {
          background: '#FFF7E8',
          color: '#A66A00',
          label: 'PENDING',
        };

      case 'cancelled':
        return {
          background: '#FFF1F1',
          color: '#B33D38',
          label: 'CANCELLED',
        };

      default:
        return {
          background: '#F1F3F2',
          color: '#66736C',
          label:
            String(status || 'UNKNOWN').toUpperCase(),
        };
    }
  };

  // =====================================================
  // RETRY
  // =====================================================

  const handleRetry = () => {
    fetchInvoice();
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color="#176B52"
        />

        <Text style={styles.loadingText}>
          Loading invoice...
        </Text>
      </View>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error !== '') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>
            !
          </Text>
        </View>

        <Text style={styles.errorTitle}>
          Unable to load invoice
        </Text>

        <Text style={styles.errorText}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>
            Try Again
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backOutlineButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backOutlineButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!invoice) {
    return null;
  }

  const payment = getPaymentStyle(
    invoice.paymentStatus
  );

  const items = Array.isArray(invoice.items)
    ? invoice.items
    : [];

  const totalUnits = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>
            ←
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle}>
            Invoice Details
          </Text>

          <Text style={styles.headerSubtitle}>
            Digital pharmacy invoice
          </Text>
        </View>

        <View style={styles.headerMark}>
          <Text style={styles.headerMarkText}>
            ₹
          </Text>
        </View>
      </View>

      {/* =================================================
          INVOICE HEADER CARD
      ================================================= */}

      <View style={styles.invoiceHeaderCard}>
        <View style={styles.invoiceBrandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>
              +
            </Text>
          </View>

          <View>
            <Text style={styles.brandName}>
              MedTracker
            </Text>

            <Text style={styles.brandSubtitle}>
              Pharmacy Management System
            </Text>
          </View>
        </View>

        <View style={styles.invoiceNumberSection}>
          <Text style={styles.invoiceLabel}>
            INVOICE NUMBER
          </Text>

          <Text style={styles.invoiceNumber}>
            {invoice.invoiceNumber || 'N/A'}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  payment.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color: payment.color,
                },
              ]}
            >
              {payment.label}
            </Text>
          </View>
        </View>

        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>
            DATE
          </Text>

          <Text style={styles.dateValue}>
            {formatDate(invoice.createdAt)}
          </Text>

          <Text style={styles.timeValue}>
            {formatTime(invoice.createdAt)}
          </Text>
        </View>
      </View>

      {/* =================================================
          CUSTOMER
      ================================================= */}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Customer Information
        </Text>

        <View style={styles.sectionDivider} />

        <View style={styles.customerGrid}>
          <View style={styles.customerColumn}>
            <Text style={styles.fieldLabel}>
              Name
            </Text>

            <Text style={styles.fieldValue}>
              {invoice.customer?.name ||
                'Walk-in Customer'}
            </Text>
          </View>

          <View style={styles.customerColumn}>
            <Text style={styles.fieldLabel}>
              Phone
            </Text>

            <Text style={styles.fieldValue}>
              {invoice.customer?.phone || 'N/A'}
            </Text>
          </View>

          {invoice.customer?.email ? (
            <View style={styles.customerColumn}>
              <Text style={styles.fieldLabel}>
                Email
              </Text>

              <Text style={styles.fieldValue}>
                {invoice.customer.email}
              </Text>
            </View>
          ) : null}

          {invoice.customer?.address ? (
            <View style={styles.customerColumnFull}>
              <Text style={styles.fieldLabel}>
                Address
              </Text>

              <Text style={styles.fieldValue}>
                {invoice.customer.address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* =================================================
          MEDICINE ITEMS
      ================================================= */}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Medicines
            </Text>

            <Text style={styles.sectionSubtitle}>
              {items.length}{' '}
              {items.length === 1
                ? 'item'
                : 'items'} • {totalUnits}{' '}
              {totalUnits === 1
                ? 'unit'
                : 'units'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {items.length === 0 ? (
          <Text style={styles.noItemsText}>
            No medicine items available
          </Text>
        ) : (
          <View>
            {items.map((item, index) => (
              <View
                key={`${item.medicine || index}-${index}`}
                style={[
                  styles.itemCard,
                  index === items.length - 1 &&
                    styles.itemCardLast,
                ]}
              >
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>
                    {item.medicineName ||
                      'Medicine'}
                  </Text>

                  <Text style={styles.batchText}>
                    Batch:{' '}
                    {item.batchNumber || 'N/A'}
                  </Text>

                  <View style={styles.itemMeta}>
                    <Text style={styles.itemMetaText}>
                      {item.quantity || 0} × ₹
                      {Number(
                        item.price || 0
                      ).toFixed(2)}
                    </Text>

                    {Number(item.taxRate || 0) >
                      0 && (
                      <Text style={styles.taxText}>
                        GST {item.taxRate}%
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.itemAmountBox}>
                  <Text style={styles.itemAmount}>
                    ₹
                    {Number(
                      item.total || 0
                    ).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* =================================================
          PAYMENT SUMMARY
      ================================================= */}

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>
          Payment Summary
        </Text>

        <View style={styles.sectionDivider} />

        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>
            Subtotal
          </Text>

          <Text style={styles.summaryValue}>
            ₹
            {Number(
              invoice.subtotal || 0
            ).toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>
            Discount
          </Text>

          <Text
            style={[
              styles.summaryValue,
              styles.discountValue,
            ]}
          >
            - ₹
            {Number(
              invoice.discount || 0
            ).toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>
            Tax
          </Text>

          <Text style={styles.summaryValue}>
            ₹
            {Number(
              invoice.taxAmount || 0
            ).toFixed(2)}
          </Text>
        </View>

        <View style={styles.totalDivider} />

        <View style={styles.grandTotalLine}>
          <Text style={styles.grandTotalLabel}>
            Grand Total
          </Text>

          <Text style={styles.grandTotalValue}>
            ₹
            {Number(
              invoice.grandTotal || 0
            ).toFixed(2)}
          </Text>
        </View>

        <View style={styles.paymentMethodBox}>
          <Text style={styles.paymentMethodLabel}>
            Payment Method
          </Text>

          <Text style={styles.paymentMethodValue}>
            {String(
              invoice.paymentMethod || 'cash'
            ).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* =================================================
          NOTES
      ================================================= */}

      {invoice.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>
            Notes
          </Text>

          <Text style={styles.notesText}>
            {invoice.notes}
          </Text>
        </View>
      ) : null}

      {/* =================================================
          FOOTER
      ================================================= */}

      <View style={styles.footerCard}>
        <View style={styles.footerMark}>
          <Text style={styles.footerMarkText}>
            +
          </Text>
        </View>

        <Text style={styles.footerTitle}>
          Thank you for choosing MedTracker
        </Text>

        <Text style={styles.footerText}>
          This is a digitally generated invoice.
        </Text>
      </View>

      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.doneButtonText}>
          Back to Invoices
        </Text>
      </TouchableOpacity>

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

  // ===================================================
  // CENTER
  // ===================================================

  centerContainer: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingText: {
    marginTop: 12,
    color: '#718078',
    fontSize: 13,
  },

  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  errorIconText: {
    color: '#B33D38',
    fontSize: 25,
    fontWeight: '700',
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#29362F',
  },

  errorText: {
    fontSize: 12,
    color: '#7B8781',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  retryButton: {
    backgroundColor: '#176B52',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 18,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  backOutlineButton: {
    borderWidth: 1,
    borderColor: '#CBD8D2',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 10,
  },

  backOutlineButtonText: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '600',
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 15,
    marginBottom: 14,

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

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EDF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  backButtonText: {
    color: '#176B52',
    fontSize: 21,
    fontWeight: '600',
  },

  headerTextBox: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#17221D',
  },

  headerSubtitle: {
    fontSize: 11,
    color: '#7B8781',
    marginTop: 3,
  },

  headerMark: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerMarkText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // ===================================================
  // INVOICE HEADER
  // ===================================================

  invoiceHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE7E1',
    padding: 17,
    marginBottom: 12,

    shadowColor: '#17382B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 7,
    elevation: 1,
  },

  invoiceBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '400',
  },

  brandName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17221D',
  },

  brandSubtitle: {
    fontSize: 9,
    color: '#829089',
    marginTop: 2,
  },

  invoiceNumberSection: {
    marginTop: 19,
  },

  invoiceLabel: {
    fontSize: 9,
    color: '#8A9690',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  invoiceNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#176B52',
    marginTop: 4,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },

  dateSection: {
    position: 'absolute',
    right: 17,
    bottom: 17,
    alignItems: 'flex-end',
  },

  dateLabel: {
    fontSize: 8,
    color: '#8A9690',
    fontWeight: '600',
  },

  dateValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#29362F',
    marginTop: 3,
  },

  timeValue: {
    fontSize: 9,
    color: '#829089',
    marginTop: 2,
  },

  // ===================================================
  // SECTION CARD
  // ===================================================

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 15,
    marginBottom: 12,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#29362F',
  },

  sectionSubtitle: {
    fontSize: 10,
    color: '#829089',
    marginTop: 3,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: '#EEF1EF',
    marginVertical: 12,
  },

  // ===================================================
  // CUSTOMER
  // ===================================================

  customerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  customerColumn: {
    width: '50%',
    paddingRight: 10,
    marginBottom: 12,
  },

  customerColumnFull: {
    width: '100%',
    marginBottom: 3,
  },

  fieldLabel: {
    fontSize: 9,
    color: '#8A9690',
    marginBottom: 4,
  },

  fieldValue: {
    fontSize: 12,
    color: '#29362F',
    fontWeight: '600',
  },

  // ===================================================
  // ITEMS
  // ===================================================

  noItemsText: {
    fontSize: 11,
    color: '#829089',
    textAlign: 'center',
    paddingVertical: 15,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF',
  },

  itemCardLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },

  itemNumber: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: '#EDF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  itemNumberText: {
    color: '#176B52',
    fontSize: 10,
    fontWeight: '700',
  },

  itemMain: {
    flex: 1,
    paddingRight: 8,
  },

  itemName: {
    fontSize: 12,
    color: '#29362F',
    fontWeight: '700',
  },

  batchText: {
    fontSize: 9,
    color: '#829089',
    marginTop: 3,
  },

  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  itemMetaText: {
    fontSize: 9,
    color: '#718078',
  },

  taxText: {
    fontSize: 8,
    color: '#176B52',
    backgroundColor: '#EDF6F2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },

  itemAmountBox: {
    alignItems: 'flex-end',
  },

  itemAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#176B52',
  },

  // ===================================================
  // PAYMENT SUMMARY
  // ===================================================

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 15,
    marginBottom: 12,
  },

  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  summaryLabel: {
    fontSize: 11,
    color: '#718078',
  },

  summaryValue: {
    fontSize: 11,
    color: '#29362F',
    fontWeight: '600',
  },

  discountValue: {
    color: '#176B52',
  },

  totalDivider: {
    height: 1,
    backgroundColor: '#DDE7E1',
    marginVertical: 7,
  },

  grandTotalLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },

  grandTotalLabel: {
    fontSize: 14,
    color: '#17221D',
    fontWeight: '700',
  },

  grandTotalValue: {
    fontSize: 20,
    color: '#176B52',
    fontWeight: '800',
  },

  paymentMethodBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F4F7F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 10,
  },

  paymentMethodLabel: {
    fontSize: 10,
    color: '#718078',
  },

  paymentMethodValue: {
    fontSize: 10,
    color: '#176B52',
    fontWeight: '700',
  },

  // ===================================================
  // NOTES
  // ===================================================

  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 15,
    marginBottom: 12,
  },

  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#29362F',
    marginBottom: 6,
  },

  notesText: {
    fontSize: 11,
    color: '#718078',
    lineHeight: 17,
  },

  // ===================================================
  // FOOTER
  // ===================================================

  footerCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  footerMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  footerMarkText: {
    color: '#FFFFFF',
    fontSize: 20,
  },

  footerTitle: {
    fontSize: 11,
    color: '#29362F',
    fontWeight: '600',
  },

  footerText: {
    fontSize: 9,
    color: '#9AA49F',
    marginTop: 4,
  },

  // ===================================================
  // DONE
  // ===================================================

  doneButton: {
    height: 46,
    borderRadius: 9,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 20,
  },
});