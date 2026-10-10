import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  deleteMedicine,
  getMedicines,
} from '../services/api';

export default function Medicines() {
  const router = useRouter();

  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =========================
  // LOAD MEDICINES
  // =========================

  const loadMedicines = async () => {
    try {
      setLoading(true);

      const data = await getMedicines();

      setMedicines(data || []);
      setFilteredMedicines(data || []);
    } catch (error) {
      console.log('Load medicines error:', error);

      Alert.alert(
        'Error',
        error.message || 'Failed to load medicines'
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SCREEN FOCUS
  // =========================

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
    }, [])
  );

  // =========================
  // REFRESH
  // =========================

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      const data = await getMedicines();

      setMedicines(data || []);

      applyFilters(
        data || [],
        search,
        selectedFilter
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to refresh medicines'
      );
    } finally {
      setRefreshing(false);
    }
  };

  // =========================
  // FILTER LOGIC
  // =========================

  const applyFilters = (
    data,
    searchText = search,
    filter = selectedFilter
  ) => {
    let result = [...data];

    // Search
    if (searchText.trim()) {
      const text = searchText.toLowerCase().trim();

      result = result.filter((medicine) => {
        return (
          medicine.name
            ?.toLowerCase()
            .includes(text) ||
          medicine.brand
            ?.toLowerCase()
            .includes(text) ||
          medicine.batchNumber
            ?.toLowerCase()
            .includes(text)
        );
      });
    }

    // Status filter
    if (filter !== 'all') {
      result = result.filter(
        (medicine) =>
          medicine.status === filter
      );
    }

    setFilteredMedicines(result);
  };

  // =========================
  // SEARCH
  // =========================

  const handleSearch = (text) => {
    setSearch(text);

    applyFilters(
      medicines,
      text,
      selectedFilter
    );
  };

  // =========================
  // STATUS FILTER
  // =========================

  const handleFilter = (filter) => {
    setSelectedFilter(filter);

    applyFilters(
      medicines,
      search,
      filter
    );
  };

  // =========================
  // DELETE MEDICINE
  // =========================

  const handleDelete = (medicine) => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete ${medicine.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedicine(medicine._id);

              Alert.alert(
                'Success',
                'Medicine deleted successfully!'
              );

              loadMedicines();
            } catch (error) {
              console.log(
                'Delete error:',
                error
              );

              Alert.alert(
                'Error',
                error.message ||
                  'Failed to delete medicine'
              );
            }
          },
        },
      ]
    );
  };

  // =========================
  // STATUS COLORS
  // =========================

  const getStatusStyle = (status) => {
    switch (status) {
      case 'safe':
        return {
          color: '#176B52',
          background: '#EDF6F2',
          label: 'SAFE',
        };

      case 'caution':
        return {
          color: '#9A6700',
          background: '#FFF8E7',
          label: 'CAUTION',
        };

      case 'warning':
        return {
          color: '#A45A00',
          background: '#FFF3E5',
          label: 'WARNING',
        };

      case 'critical':
        return {
          color: '#B33D38',
          background: '#FFF1F0',
          label: 'CRITICAL',
        };

      case 'expired':
        return {
          color: '#A62F2A',
          background: '#FDEDEC',
          label: 'EXPIRED',
        };

      case 'removed':
        return {
          color: '#68736E',
          background: '#F0F2F1',
          label: 'REMOVED',
        };

      default:
        return {
          color: '#68736E',
          background: '#F0F2F1',
          label: 'UNKNOWN',
        };
    }
  };

  // =========================
  // FORMAT DATE
  // =========================

  const formatDate = (date) => {
    if (!date) return 'N/A';

    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  // =========================
  // MEDICINE CARD
  // =========================

  const renderMedicine = ({ item }) => {
    const status = getStatusStyle(item.status);

    return (
      <View style={styles.card}>

        {/* CARD HEADER */}

        <View style={styles.cardHeader}>

          <View style={styles.medicineIdentity}>

            <View style={styles.medicineIcon}>
              <Text style={styles.medicineIconText}>
                +
              </Text>
            </View>

            <View style={styles.nameContainer}>
              <Text
                style={styles.medicineName}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {item.brand ? (
                <Text
                  style={styles.brand}
                  numberOfLines={1}
                >
                  {item.brand}
                </Text>
              ) : null}
            </View>

          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: status.color,
                },
              ]}
            >
              {status.label}
            </Text>
          </View>

        </View>

        {/* DETAILS */}

        <View style={styles.detailsContainer}>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              Batch
            </Text>

            <Text
              style={styles.detailValue}
              numberOfLines={1}
            >
              {item.batchNumber || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              Expiry
            </Text>

            <Text
              style={[
                styles.detailValue,
                item.status === 'expired' &&
                  styles.expiredText,
              ]}
            >
              {formatDate(item.expiryDate)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>
              Stock
            </Text>

            <Text
              style={[
                styles.detailValue,
                item.quantity < 20 &&
                  styles.lowStockText,
              ]}
            >
              {item.quantity}
              {item.quantity < 20
                ? '  Low'
                : ''}
            </Text>
          </View>

          {item.sellingPrice !== undefined && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                Price
              </Text>

              <Text style={styles.detailValue}>
                ₹
                {Number(
                  item.sellingPrice || 0
                ).toFixed(2)}
              </Text>
            </View>
          )}

          {item.supplier ? (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                Supplier
              </Text>

              <Text
                style={styles.detailValue}
                numberOfLines={1}
              >
                {item.supplier}
              </Text>
            </View>
          ) : null}

        </View>

        {/* PRIMARY ACTIONS */}

        <View style={styles.actionRow}>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push(
                `/add-medicine?id=${item._id}`
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push(
                `/medicine-qr?id=${item._id}`
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() =>
              handleDelete(item)
            }
            activeOpacity={0.8}
          >
            <Text style={styles.deleteButtonText}>
              Delete
            </Text>
          </TouchableOpacity>

        </View>

        {/* CONTEXTUAL ACTION */}

        <View style={styles.secondaryActionRow}>

          {item.status === 'expired' ||
          item.status === 'critical' ? (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() =>
                router.push('/qr-removal')
              }
              activeOpacity={0.8}
            >
              <Text style={styles.removeButtonText}>
                Remove Stock
              </Text>

              <Text style={styles.actionArrow}>
                →
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.billingButton}
              onPress={() =>
                router.push(
                  `/billing?medicineId=${item._id}`
                )
              }
              activeOpacity={0.8}
            >
              <Text style={styles.billingButtonText}>
                Add to Billing
              </Text>

              <Text style={styles.actionArrowGreen}>
                →
              </Text>
            </TouchableOpacity>
          )}

        </View>

      </View>
    );
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>

        <ActivityIndicator
          size="large"
          color="#176B52"
        />

        <Text style={styles.loadingText}>
          Loading medicines...
        </Text>

      </View>
    );
  }

  // =========================
  // MAIN UI
  // =========================

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.pageHeader}>

        <View style={styles.headerTitleRow}>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>
              +
            </Text>
          </View>

          <View>
            <Text style={styles.title}>
              Medicines
            </Text>

            <Text style={styles.subtitle}>
              Manage pharmacy inventory
            </Text>
          </View>

        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push('/add-medicine')
          }
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>
            + Add
          </Text>
        </TouchableOpacity>

      </View>

      {/* SEARCH */}

      <View style={styles.searchWrapper}>

        <Text style={styles.searchIcon}>
          🔍
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search medicine, brand or batch"
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#9AA59F"
          autoCapitalize="none"
        />

        {search.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              handleSearch('')
            }
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>
              ×
            </Text>
          </TouchableOpacity>
        )}

      </View>

      {/* FILTERS */}

      <View style={styles.filterSection}>

        <Text style={styles.filterHeading}>
          Filter by status
        </Text>

        <FlatList
          horizontal
          data={[
            'all',
            'safe',
            'caution',
            'warning',
            'critical',
            'expired',
          ]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.filterList
          }
          renderItem={({ item }) => {

            const selected =
              selectedFilter === item;

            return (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selected &&
                    styles.selectedFilter,
                ]}
                onPress={() =>
                  handleFilter(item)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected &&
                      styles.selectedFilterText,
                  ]}
                >
                  {item === 'all'
                    ? 'All'
                    : item
                        .charAt(0)
                        .toUpperCase() +
                      item.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

      </View>

      {/* COUNT */}

      <View style={styles.countRow}>

        <Text style={styles.countText}>
          {filteredMedicines.length}{' '}
          {filteredMedicines.length === 1
            ? 'medicine'
            : 'medicines'}
        </Text>

        <TouchableOpacity
          onPress={onRefresh}
          disabled={refreshing}
          style={styles.refreshSmallButton}
        >
          {refreshing ? (
            <ActivityIndicator
              size="small"
              color="#176B52"
            />
          ) : (
            <Text
              style={styles.refreshSmallText}
            >
              Refresh
            </Text>
          )}
        </TouchableOpacity>

      </View>

      {/* EMPTY STATE */}

      {filteredMedicines.length === 0 ? (
        <View style={styles.emptyContainer}>

          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIconText}>
              +
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            No medicines found
          </Text>

          <Text style={styles.emptyText}>
            Try changing your search or filter.
          </Text>

          {medicines.length === 0 && (
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() =>
                router.push('/add-medicine')
              }
              activeOpacity={0.8}
            >
              <Text
                style={styles.emptyAddButtonText}
              >
                Add Medicine
              </Text>
            </TouchableOpacity>
          )}

        </View>
      ) : (

        /* MEDICINE LIST */

        <FlatList
          data={filteredMedicines}
          keyExtractor={(item) =>
            item._id?.toString()
          }
          renderItem={renderMedicine}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#176B52"
              colors={['#176B52']}
            />
          }
        />

      )}

    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  // =========================
  // CONTAINER
  // =========================

  container: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  // =========================
  // PAGE HEADER
  // =========================

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  headerIconText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '300',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#17221D',
  },

  subtitle: {
    fontSize: 11,
    color: '#7B8781',
    marginTop: 3,
  },

  addButton: {
    backgroundColor: '#176B52',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // =========================
  // SEARCH
  // =========================

  searchWrapper: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE5E0',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 12,
    marginBottom: 17,
  },

  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#26342D',
  },

  clearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearText: {
    color: '#66736C',
    fontSize: 20,
    lineHeight: 21,
  },

  // =========================
  // FILTER
  // =========================

  filterSection: {
    marginBottom: 13,
  },

  filterHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: '#68756E',
    marginBottom: 8,
  },

  filterList: {
    paddingRight: 10,
  },

  filterButton: {
    borderWidth: 1,
    borderColor: '#D9E2DD',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,

    paddingHorizontal: 13,
    paddingVertical: 7,

    marginRight: 7,
  },

  selectedFilter: {
    backgroundColor: '#176B52',
    borderColor: '#176B52',
  },

  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#65716B',
  },

  selectedFilterText: {
    color: '#FFFFFF',
  },

  // =========================
  // COUNT
  // =========================

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  countText: {
    fontSize: 12,
    color: '#69766F',
    fontWeight: '600',
  },

  refreshSmallButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  refreshSmallText: {
    fontSize: 11,
    color: '#176B52',
    fontWeight: '600',
  },

  // =========================
  // LIST
  // =========================

  listContainer: {
    paddingBottom: 30,
  },

  // =========================
  // MEDICINE CARD
  // =========================

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E0E7E3',

    padding: 15,
    marginBottom: 11,

    shadowColor: '#17382B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  // =========================
  // CARD HEADER
  // =========================

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  medicineIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  medicineIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EDF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  medicineIconText: {
    color: '#176B52',
    fontSize: 23,
    fontWeight: '300',
  },

  nameContainer: {
    flex: 1,
  },

  medicineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#26342D',
  },

  brand: {
    fontSize: 11,
    color: '#7D8983',
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // =========================
  // DETAILS
  // =========================

  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1EF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF',

    paddingVertical: 10,
    marginBottom: 11,
  },

  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingVertical: 4,
  },

  detailLabel: {
    fontSize: 11,
    color: '#87918C',
  },

  detailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#35423B',
    maxWidth: '58%',
    textAlign: 'right',
  },

  expiredText: {
    color: '#B33D38',
  },

  lowStockText: {
    color: '#A45A00',
  },

  // =========================
  // PRIMARY ACTIONS
  // =========================

  actionRow: {
    flexDirection: 'row',
    gap: 7,
  },

  secondaryButton: {
    flex: 1,
    height: 37,

    backgroundColor: '#F7F9F8',
    borderWidth: 1,
    borderColor: '#DCE5E0',

    borderRadius: 8,

    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#46544D',
    fontSize: 11,
    fontWeight: '600',
  },

  deleteButton: {
    flex: 1,
    height: 37,

    backgroundColor: '#FFF6F5',
    borderWidth: 1,
    borderColor: '#F0D4D1',

    borderRadius: 8,

    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: {
    color: '#B33D38',
    fontSize: 11,
    fontWeight: '600',
  },

  // =========================
  // SECONDARY ACTION
  // =========================

  secondaryActionRow: {
    marginTop: 7,
  },

  billingButton: {
    minHeight: 39,
    borderRadius: 8,

    backgroundColor: '#EDF6F2',
    borderWidth: 1,
    borderColor: '#CFE4DA',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  billingButtonText: {
    color: '#176B52',
    fontSize: 11,
    fontWeight: '700',
  },

  actionArrowGreen: {
    color: '#176B52',
    fontSize: 15,
    marginLeft: 7,
  },

  removeButton: {
    minHeight: 39,
    borderRadius: 8,

    backgroundColor: '#FFF6EA',
    borderWidth: 1,
    borderColor: '#EBD8B8',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeButtonText: {
    color: '#9A5B00',
    fontSize: 11,
    fontWeight: '700',
  },

  actionArrow: {
    color: '#9A5B00',
    fontSize: 15,
    marginLeft: 7,
  },

  // =========================
  // LOADING
  // =========================

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8F7',
  },

  loadingText: {
    marginTop: 11,
    fontSize: 13,
    color: '#718078',
  },

  // =========================
  // EMPTY STATE
  // =========================

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80,
  },

  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#EDF6F2',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 14,
  },

  emptyIconText: {
    color: '#176B52',
    fontSize: 32,
    fontWeight: '300',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#29362F',
  },

  emptyText: {
    fontSize: 12,
    color: '#84908A',
    marginTop: 5,
    textAlign: 'center',
  },

  emptyAddButton: {
    marginTop: 18,
    backgroundColor: '#176B52',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});