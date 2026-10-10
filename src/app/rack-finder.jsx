import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { getMedicines } from '../services/api';

const GREEN = '#176B52';
const LIGHT_GREEN = '#EAF5F1';
const TEXT = '#17211D';
const MUTED = '#718078';
const BORDER = '#E2E8E5';
const BG = '#F7F9F8';
const WHITE = '#FFFFFF';
const RED = '#C62828';
const LIGHT_RED = '#FDECEC';
const AMBER = '#B7791F';
const LIGHT_AMBER = '#FFF7E6';

export default function RackFinder() {
  const router = useRouter();

  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMedicines = async () => {
    try {
      setError('');

      const result = await getMedicines();

      let data = [];

      if (Array.isArray(result)) {
        data = result;
      } else if (Array.isArray(result?.medicines)) {
        data = result.medicines;
      } else if (Array.isArray(result?.data)) {
        data = result.data;
      }

      setMedicines(data);
    } catch (err) {
      console.log('Rack Finder error:', err);
      setError(err?.message || 'Failed to load medicines');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMedicines();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMedicines();
  };

  const filteredMedicines = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return medicines;
    }

    return medicines.filter((medicine) => {
      const values = [
        medicine?.name,
        medicine?.brand,
        medicine?.category,
        medicine?.batchNumber,
        medicine?.rackNumber,
        medicine?.shelfNumber,
        medicine?.boxNumber,
      ];

      return values.some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [medicines, search]);

  const getExpiryInfo = (expiryDate) => {
    if (!expiryDate) {
      return {
        text: 'Expiry not available',
        color: MUTED,
        background: BG,
      };
    }

    const expiry = new Date(expiryDate);
    const today = new Date();

    if (Number.isNaN(expiry.getTime())) {
      return {
        text: 'Invalid expiry date',
        color: MUTED,
        background: BG,
      };
    }

    const diff =
      Math.ceil(
        (expiry.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

    if (diff < 0) {
      return {
        text: 'Expired',
        color: RED,
        background: LIGHT_RED,
      };
    }

    if (diff === 0) {
      return {
        text: 'Expires today',
        color: RED,
        background: LIGHT_RED,
      };
    }

    if (diff <= 30) {
      return {
        text: `${diff} day${diff === 1 ? '' : 's'} left`,
        color: AMBER,
        background: LIGHT_AMBER,
      };
    }

    return {
      text: `${diff} days left`,
      color: GREEN,
      background: LIGHT_GREEN,
    };
  };

  const formatExpiryDate = (expiryDate) => {
    if (!expiryDate) {
      return '—';
    }

    const date = new Date(expiryDate);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderLocationValue = (label, value) => {
    const hasValue =
      value !== undefined &&
      value !== null &&
      String(value).trim() !== '';

    return (
      <View style={styles.locationItem}>
        <Text style={styles.locationLabel}>{label}</Text>

        <Text
          style={[
            styles.locationValue,
            !hasValue && styles.locationValueEmpty,
          ]}
        >
          {hasValue ? String(value) : 'Not assigned'}
        </Text>
      </View>
    );
  };

  const renderMedicine = ({ item }) => {
    const expiryInfo = getExpiryInfo(item?.expiryDate);

    return (
      <View style={styles.card}>
        {/* Medicine Header */}
        <View style={styles.cardHeader}>
          <View style={styles.medicineIcon}>
            <Text style={styles.medicineIconText}>M</Text>
          </View>

          <View style={styles.medicineTitleContainer}>
            <Text
              style={styles.medicineName}
              numberOfLines={2}
            >
              {item?.name || 'Unnamed Medicine'}
            </Text>

            {item?.brand ? (
              <Text
                style={styles.brand}
                numberOfLines={1}
              >
                {item.brand}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.stockBadge,
              Number(item?.quantity || 0) <= 0
                ? styles.stockBadgeEmpty
                : null,
            ]}
          >
            <Text
              style={[
                styles.stockBadgeText,
                Number(item?.quantity || 0) <= 0
                  ? styles.stockBadgeTextEmpty
                  : null,
              ]}
            >
              {Number(item?.quantity || 0)} units
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.locationBox}>
          <View style={styles.locationTitleRow}>
            <View style={styles.pinCircle}>
              <Text style={styles.pinText}>P</Text>
            </View>

            <View>
              <Text style={styles.locationTitle}>
                Storage Location
              </Text>

              <Text style={styles.locationSubtitle}>
                Find this medicine quickly
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            {renderLocationValue(
              'RACK',
              item?.rackNumber
            )}

            <View style={styles.locationDivider} />

            {renderLocationValue(
              'SHELF',
              item?.shelfNumber
            )}

            <View style={styles.locationDivider} />

            {renderLocationValue(
              'BOX',
              item?.boxNumber
            )}
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Batch</Text>
            <Text
              style={styles.detailValue}
              numberOfLines={1}
            >
              {item?.batchNumber || '—'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Expiry</Text>
            <Text
              style={styles.detailValue}
              numberOfLines={1}
            >
              {formatExpiryDate(item?.expiryDate)}
            </Text>
          </View>
        </View>

        {/* Expiry Status */}
        <View
          style={[
            styles.expiryBadge,
            {
              backgroundColor: expiryInfo.background,
            },
          ]}
        >
          <Text
            style={[
              styles.expiryText,
              {
                color: expiryInfo.color,
              },
            ]}
          >
            {expiryInfo.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text style={styles.stateTitle}>
            Loading medicines...
          </Text>

          <Text style={styles.stateSubtitle}>
            Getting your storage locations
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>!</Text>
          </View>

          <Text style={styles.stateTitle}>
            Something went wrong
          </Text>

          <Text style={styles.stateSubtitle}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadMedicines}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (search.trim() && filteredMedicines.length === 0) {
      return (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>?</Text>
          </View>

          <Text style={styles.stateTitle}>
            Medicine not found
          </Text>

          <Text style={styles.stateSubtitle}>
            No medicine matches "{search.trim()}"
          </Text>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearch('')}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>
              Clear Search
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!search.trim() && medicines.length === 0) {
      return (
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>M</Text>
          </View>

          <Text style={styles.stateTitle}>
            No medicines found
          </Text>

          <Text style={styles.stateSubtitle}>
            Add medicines to see their storage locations.
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Rack Finder
          </Text>

          <Text style={styles.headerSubtitle}>
            Find medicines by storage location
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIconContainer}>
          <Text style={styles.searchIcon}>⌕</Text>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search medicine, batch, rack..."
          placeholderTextColor="#9AA59F"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {search.length > 0 ? (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearch('')}
            activeOpacity={0.7}
          >
            <Text style={styles.clearSearchText}>
              ×
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Result Count */}
      {!loading && !error && (
        <View style={styles.resultHeader}>
          <View>
            <Text style={styles.resultTitle}>
              {search.trim()
                ? 'Search Results'
                : 'Medicine Locations'}
            </Text>

            <Text style={styles.resultSubtitle}>
              {filteredMedicines.length}{' '}
              {filteredMedicines.length === 1
                ? 'medicine'
                : 'medicines'}
            </Text>
          </View>

          {search.trim() ? (
            <View style={styles.searchTag}>
              <Text
                style={styles.searchTagText}
                numberOfLines={1}
              >
                "{search.trim()}"
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Medicine List */}
      <FlatList
        data={filteredMedicines}
        keyExtractor={(item, index) =>
          String(
            item?._id ||
              item?.id ||
              item?.qrCode ||
              `${item?.name || 'medicine'}-${index}`
          )
        }
        renderItem={renderMedicine}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredMedicines.length === 0
            ? styles.listEmptyContent
            : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F2F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backArrow: {
    color: TEXT,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
    marginTop: -3,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: TEXT,
  },

  headerSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 52,
  },

  searchIconContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchIcon: {
    color: GREEN,
    fontSize: 27,
    fontWeight: '600',
    marginTop: -4,
  },

  searchInput: {
    flex: 1,
    height: 50,
    color: TEXT,
    fontSize: 14,
    paddingHorizontal: 6,
  },

  clearSearchButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearSearchText: {
    color: MUTED,
    fontSize: 21,
    lineHeight: 23,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 10,
  },

  resultTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },

  resultSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
  },

  searchTag: {
    maxWidth: 150,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  searchTagText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '700',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 30,
  },

  listEmptyContent: {
    flexGrow: 1,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  medicineIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  medicineIconText: {
    color: GREEN,
    fontSize: 18,
    fontWeight: '900',
  },

  medicineTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },

  medicineName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },

  brand: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
  },

  stockBadge: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  stockBadgeEmpty: {
    backgroundColor: LIGHT_RED,
  },

  stockBadgeText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '800',
  },

  stockBadgeTextEmpty: {
    color: RED,
  },

  locationBox: {
    backgroundColor: '#F4F8F6',
    borderRadius: 13,
    marginTop: 14,
    padding: 13,
  },

  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  pinText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '900',
  },

  locationTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },

  locationSubtitle: {
    color: MUTED,
    fontSize: 10,
    marginTop: 2,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 13,
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E1EAE5',
    minHeight: 65,
  },

  locationItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  locationDivider: {
    width: 1,
    backgroundColor: '#E1EAE5',
    marginVertical: 10,
  },

  locationLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  locationValue: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'center',
  },

  locationValueEmpty: {
    color: '#A3ADA8',
    fontSize: 11,
    fontWeight: '600',
  },

  detailsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },

  detailItem: {
    flex: 1,
    backgroundColor: '#FAFBFB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#EDF0EE',
  },

  detailLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  detailValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  expiryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 10,
  },

  expiryText: {
    fontSize: 10,
    fontWeight: '800',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    minHeight: 420,
  },

  errorIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: LIGHT_RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  errorIconText: {
    color: RED,
    fontSize: 25,
    fontWeight: '900',
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyIconText: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '900',
  },

  stateTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  stateSubtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },

  retryButton: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 17,
  },

  retryButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '800',
  },

  clearButton: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 17,
  },

  clearButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },
});