import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { getData } from '../services/storage';

const WEB_API = 'https://medtracker-1.onrender.com/api';
const MOBILE_API = 'https://medtracker-1.onrender.com/api';

const getBaseUrl = () => {
  // React Native runs on the phone, so use the laptop IP.
  return MOBILE_API;
};

const BASE_URL = getBaseUrl();

export default function Invoices() {
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);

  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  // =====================================================
  // GET TOKEN
  // =====================================================

  const getToken = async () => {
    try {
      const token = await getData('token');
      return token || '';
    } catch (error) {
      console.log('Token error:', error);
      return '';
    }
  };

  // =====================================================
  // FETCH INVOICES
  // =====================================================

  const fetchInvoices = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      const token = await getToken();

      const response = await fetch(`${BASE_URL}/invoices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Failed to fetch invoices'
        );
      }

      const invoiceList = Array.isArray(result.invoices)
        ? result.invoices
        : [];

      setInvoices(invoiceList);
      setFilteredInvoices(invoiceList);
    } catch (error) {
      console.log('Invoice fetch error:', error);

      setError(
        error.message || 'Failed to load invoices'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // SCREEN FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
    }, [])
  );

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = (text) => {
    setSearch(text);

    const query = text.trim().toLowerCase();

    if (!query) {
      setFilteredInvoices(invoices);
      return;
    }

    const filtered = invoices.filter((invoice) => {
      const invoiceNumber =
        invoice.invoiceNumber?.toLowerCase() || '';

      const customerName =
        invoice.customer?.name?.toLowerCase() || '';

      const customerPhone =
        invoice.customer?.phone?.toLowerCase() || '';

      return (
        invoiceNumber.includes(query) ||
        customerName.includes(query) ||
        customerPhone.includes(query)
      );
    });

    setFilteredInvoices(filtered);
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvoices(false);
  };

  // =====================================================
  // CLEAR SEARCH
  // =====================================================

  const clearSearch = () => {
    setSearch('');
    setFilteredInvoices(invoices);
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'N/A';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (dateValue) => {
    if (!dateValue) {
      return '';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // =====================================================
  // PAYMENT STATUS
  // =====================================================

  const getPaymentStyle = (status) => {
    switch (status) {
      case 'paid':
        return {
          background: '#EAF6F0',
          color: '#176B52',
          label: 'Paid',
        };

      case 'pending':
        return {
          background: '#FFF7E8',
          color: '#A66A00',
          label: 'Pending',
        };

      case 'cancelled':
        return {
          background: '#FFF1F1',
          color: '#B33D38',
          label: 'Cancelled',
        };

      default:
        return {
          background: '#F1F3F2',
          color: '#66736C',
          label: status || 'Unknown',
        };
    }
  };

  // =====================================================
  // OPEN INVOICE
  // =====================================================

  const openInvoice = (invoice) => {
    if (!invoice?._id) {
      Alert.alert(
        'Invoice Error',
        'Invoice details are not available.'
      );
      return;
    }

    router.push({
      pathname: '/invoice-details',
      params: {
        id: invoice._id,
      },
    });
  };

  // =====================================================
  // EMPTY STATE
  // =====================================================

  const renderEmptyState = () => {
    if (search.trim()) {
      return (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>
              ?
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            No invoices found
          </Text>

          <Text style={styles.emptySubtitle}>
            Try another invoice number, customer name or phone
          </Text>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>
              Clear Search
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>
            ₹
          </Text>
        </View>

        <Text style={styles.emptyTitle}>
          No invoices yet
        </Text>

        <Text style={styles.emptySubtitle}>
          Completed pharmacy invoices will appear here
        </Text>
      </View>
    );
  };

  // =====================================================
  // INVOICE CARD
  // =====================================================

  const renderInvoiceCard = (invoice, index) => {
    const payment = getPaymentStyle(
      invoice.paymentStatus
    );

    const itemCount = Array.isArray(invoice.items)
      ? invoice.items.reduce(
          (total, item) =>
            total + Number(item.quantity || 0),
          0
        )
      : 0;

    return (
      <TouchableOpacity
        key={invoice._id || index}
        style={styles.invoiceCard}
        onPress={() => openInvoice(invoice)}
        activeOpacity={0.85}
      >
        {/* TOP */}

        <View style={styles.invoiceTop}>
          <View style={styles.invoiceNumberBox}>
            <Text style={styles.invoiceNumberLabel}>
              INVOICE
            </Text>

            <Text style={styles.invoiceNumber}>
              {invoice.invoiceNumber || 'N/A'}
            </Text>
          </View>

          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor: payment.background,
              },
            ]}
          >
            <Text
              style={[
                styles.paymentBadgeText,
                {
                  color: payment.color,
                },
              ]}
            >
              {payment.label}
            </Text>
          </View>
        </View>

        {/* DIVIDER */}

        <View style={styles.divider} />

        {/* CUSTOMER */}

        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>
              Customer
            </Text>

            <Text style={styles.customerName}>
              {invoice.customer?.name ||
                'Walk-in Customer'}
            </Text>

            {!!invoice.customer?.phone && (
              <Text style={styles.customerPhone}>
                {invoice.customer.phone}
              </Text>
            )}
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>
              TOTAL
            </Text>

            <Text style={styles.amountValue}>
              ₹
              {Number(
                invoice.grandTotal || 0
              ).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* BOTTOM */}

        <View style={styles.invoiceBottom}>
          <Text style={styles.dateText}>
            {formatDate(invoice.createdAt)}
          </Text>

          <Text style={styles.timeText}>
            {formatTime(invoice.createdAt)}
          </Text>

          <View style={styles.itemCountBox}>
            <Text style={styles.itemCountText}>
              {itemCount}{' '}
              {itemCount === 1
                ? 'unit'
                : 'units'}
            </Text>
          </View>

          <Text style={styles.arrow}>
            →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#176B52"
          colors={['#176B52']}
        />
      }
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
          <Text style={styles.title}>
            Digital Invoices
          </Text>

          <Text style={styles.subtitle}>
            Manage pharmacy billing records
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            ₹
          </Text>
        </View>
      </View>

      {/* =================================================
          SEARCH
      ================================================= */}

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>
          ⌕
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search invoice, customer or phone"
          placeholderTextColor="#9AA49F"
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {search.length > 0 && (
          <TouchableOpacity
            style={styles.searchClear}
            onPress={clearSearch}
            activeOpacity={0.7}
          >
            <Text style={styles.searchClearText}>
              ×
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* =================================================
          SUMMARY
      ================================================= */}

      {!loading && !error && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Invoices
            </Text>

            <Text style={styles.summaryValue}>
              {invoices.length}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Showing
            </Text>

            <Text style={styles.summaryValue}>
              {filteredInvoices.length}
            </Text>
          </View>
        </View>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error !== '' && !loading && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Unable to load invoices
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchInvoices()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="large"
            color="#176B52"
          />

          <Text style={styles.loadingText}>
            Loading invoices...
          </Text>
        </View>
      ) : error !== '' ? null : (
        <>
          {/* =================================================
              SECTION HEADER
          ================================================= */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Invoice History
              </Text>

              <Text style={styles.sectionSubtitle}>
                Latest billing transactions
              </Text>
            </View>
          </View>

          {/* =================================================
              LIST
          ================================================= */}

          {filteredInvoices.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.invoiceList}>
              {filteredInvoices.map(
                renderInvoiceCard
              )}
            </View>
          )}
        </>
      )}

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
  // HEADER
  // ===================================================

  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 16,
    marginBottom: 16,

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

  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#17221D',
  },

  subtitle: {
    fontSize: 11,
    color: '#7B8781',
    marginTop: 3,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // ===================================================
  // SEARCH
  // ===================================================

  searchBox: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DCE5E0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 13,
  },

  searchIcon: {
    fontSize: 22,
    color: '#176B52',
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: '#29362F',
    fontSize: 12,
    paddingVertical: 0,
  },

  searchClear: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchClearText: {
    color: '#718078',
    fontSize: 22,
    fontWeight: '400',
  },

  // ===================================================
  // SUMMARY
  // ===================================================

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 13,
  },

  summaryLabel: {
    fontSize: 10,
    color: '#7B8781',
    marginBottom: 5,
  },

  summaryValue: {
    fontSize: 21,
    fontWeight: '700',
    color: '#176B52',
  },

  // ===================================================
  // SECTION
  // ===================================================

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17221D',
  },

  sectionSubtitle: {
    fontSize: 11,
    color: '#829089',
    marginTop: 3,
  },

  // ===================================================
  // INVOICE CARD
  // ===================================================

  invoiceList: {
    marginBottom: 8,
  },

  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E1E8E4',
    padding: 14,
    marginBottom: 11,

    shadowColor: '#17382B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 7,
    elevation: 1,
  },

  invoiceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  invoiceNumberBox: {
    flex: 1,
  },

  invoiceNumberLabel: {
    fontSize: 9,
    color: '#8A9690',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 3,
  },

  invoiceNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#176B52',
  },

  paymentBadge: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEF1EF',
    marginVertical: 12,
  },

  // ===================================================
  // CUSTOMER
  // ===================================================

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  customerInfo: {
    flex: 1,
    paddingRight: 10,
  },

  customerLabel: {
    fontSize: 9,
    color: '#8A9690',
    marginBottom: 4,
  },

  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#29362F',
  },

  customerPhone: {
    fontSize: 10,
    color: '#7B8781',
    marginTop: 3,
  },

  amountBox: {
    alignItems: 'flex-end',
  },

  amountLabel: {
    fontSize: 9,
    color: '#8A9690',
    marginBottom: 4,
  },

  amountValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#176B52',
  },

  // ===================================================
  // INVOICE BOTTOM
  // ===================================================

  invoiceBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },

  dateText: {
    fontSize: 10,
    color: '#718078',
  },

  timeText: {
    fontSize: 10,
    color: '#9AA49F',
    marginLeft: 6,
  },

  itemCountBox: {
    marginLeft: 'auto',
    backgroundColor: '#F2F6F4',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  itemCountText: {
    fontSize: 9,
    color: '#176B52',
    fontWeight: '600',
  },

  arrow: {
    color: '#A1ACA6',
    fontSize: 17,
    marginLeft: 9,
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },

  loadingText: {
    marginTop: 12,
    color: '#718078',
    fontSize: 12,
  },

  // ===================================================
  // ERROR
  // ===================================================

  errorCard: {
    backgroundColor: '#FFF4F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0CECA',
    padding: 16,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B33D38',
    marginBottom: 5,
  },

  errorText: {
    fontSize: 11,
    color: '#7C5552',
    lineHeight: 17,
  },

  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#B33D38',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // ===================================================
  // EMPTY
  // ===================================================

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E3E9E5',
    padding: 25,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EDF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyIconText: {
    color: '#176B52',
    fontSize: 22,
    fontWeight: '700',
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#29362F',
  },

  emptySubtitle: {
    fontSize: 11,
    color: '#829089',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 17,
  },

  clearButton: {
    backgroundColor: '#176B52',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 14,
  },

  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // ===================================================
  // BOTTOM
  // ===================================================

  bottomSpace: {
    height: 25,
  },
});