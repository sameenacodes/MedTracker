import { useRouter } from 'expo-router';

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,
} from 'react-native';

import { searchMarketplaceMedicines } from '../services/api';

import { clearAll, getData } from '../services/storage';

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

};

export default function CustomerDashboard() {

  const router = useRouter();

  const [user, setUser] = useState({});

  const [search, setSearch] = useState('');

  const [medicines, setMedicines] = useState([]);

  const [loading, setLoading] = useState(false);

  // =====================================================

  // LOAD DATA

  // =====================================================

  useEffect(() => {

    initializeDashboard();

  }, []);

  const initializeDashboard = async () => {

    try {

      const userData = await getData('user');

      if (!userData) {

        router.replace('/');

        return;

      }

      const parsedUser =

        typeof userData === 'string'

          ? JSON.parse(userData)

          : userData;

      if (parsedUser.role !== 'customer') {

        if (parsedUser.role === 'admin') {

          router.replace('/admin-dashboard');

        } else if (parsedUser.role === 'pharmacist') {

          router.replace('/pharmacist-dashboard');

        } else {

          router.replace('/');

        }

        return;

      }

      setUser(parsedUser);

      setLoading(false);

    } catch (error) {

      console.log(

        'Dashboard initialization error:',

        error

      );

      router.replace('/');

    }

  };

  const searchMarketplace = async (query) => {

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {

      setMedicines([]);

      setLoading(false);

      return;

    }

    setLoading(true);

    try {

      const result = await searchMarketplaceMedicines(trimmedQuery);

      const results = Array.isArray(result)

        ? result

        : Array.isArray(result?.results)

          ? result.results

          : [];

      const normalized = results.map((item) => ({

        _id: item._id,

        id: item._id,

        name: item.medicine?.name || item.name || 'Medicine',

        brand: item.medicine?.brand || item.brand || 'Generic medicine',

        category: item.medicine?.category || item.category || '',

        quantity: Number(item.onlineQuantity ?? item.quantity ?? 0),

        onlineQuantity: Number(item.onlineQuantity ?? item.quantity ?? 0),

        sellingPrice: item.sellingPrice ?? item.price ?? 0,

        price: item.sellingPrice ?? item.price ?? 0,

        batchNumber: item.medicine?.batchNumber || item.batchNumber || item.batch || '-',

        expiryDate: item.medicine?.expiryDate || item.expiryDate || item.expiry || null,

        pharmacy: item.pharmacy || null,

        pharmacyName: item.pharmacy?.name || 'Pharmacy',

        inventoryId: item._id,

      }));

      setMedicines(normalized);

    } catch (error) {

      console.log('Customer medicine search error:', error);

      setMedicines([]);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    const query = search.trim();

    if (!query) {

      setMedicines([]);

      setLoading(false);

      return;

    }

    const timer = setTimeout(() => {

      searchMarketplace(query);

    }, 400);

    return () => clearTimeout(timer);

  }, [search]);

  // =====================================================

  // LOGOUT

  // =====================================================

  const handleLogout = async () => {

    await clearAll();

    router.push('/');

  };

  // =====================================================

  // SEARCH

  // =====================================================

  const filtered = medicines;

  // =====================================================

  // FORMAT EXPIRY DATE

  // =====================================================

  const formatExpiryDate = (date) => {

    if (!date) {

      return '-';

    }

    try {

      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {

        return String(date);

      }

      return parsedDate.toLocaleDateString('en-IN');

    } catch {

      return String(date);

    }

  };

  // =====================================================

  // FORMAT PRICE

  // =====================================================

  const formatPrice = (price) => {

    const value = Number(price);

    if (Number.isNaN(value)) {

      return '₹0.00';

    }

    return `₹${value.toFixed(2)}`;

  };

  // =====================================================

  // UI

  // =====================================================

  return (

    <View style={styles.screen}>

      <ScrollView

        style={styles.container}

        contentContainerStyle={

          styles.contentContainer

        }

        showsVerticalScrollIndicator={false}

      >

        {/* =================================================

            HEADER

        ================================================= */}

        <View style={styles.header}>

          <View style={styles.headerLeft}>

            <View style={styles.profileIcon}>

              <Text style={styles.profileIconText}>

                C

              </Text>

            </View>

            <View style={styles.headerInfo}>

              <Text style={styles.role}>

                CUSTOMER

              </Text>

              <Text style={styles.name}>

                Hello, {user.name || 'Customer'}

              </Text>

              <Text style={styles.subtitle}>

                Check medicine availability

              </Text>

            </View>

          </View>

          <TouchableOpacity

            style={styles.logoutButton}

            onPress={handleLogout}

            activeOpacity={0.8}

          >

            <Text style={styles.logoutText}>

              Logout

            </Text>

          </TouchableOpacity>

        </View>

        {/* =================================================

            SEARCH SECTION

        ================================================= */}

        <View style={styles.sectionHeader}>

          <View>

            <Text style={styles.sectionTitle}>

              Find Medicine

            </Text>

            <Text style={styles.sectionSubtitle}>

              Search medicines currently available

            </Text>

          </View>

        </View>

        <View style={styles.searchBar}>

          <View style={styles.searchIconBox}>

            <Text style={styles.searchIcon}>

              ⌕

            </Text>

          </View>

          <TextInput

            style={styles.searchInput}

            placeholder="Search medicine name..."

            placeholderTextColor="#9AA6A1"

            value={search}

            onChangeText={setSearch}

          />

          {search !== '' && (

            <TouchableOpacity

              style={styles.clearButton}

              onPress={() => setSearch('')}

              activeOpacity={0.7}

            >

              <Text style={styles.clearText}>

                ×

              </Text>

            </TouchableOpacity>

          )}

        </View>

        {/* =================================================

    MARKETPLACE QUICK ACTIONS

================================================= */}

<View style={styles.quickActions}>

  <TouchableOpacity

    style={styles.quickCard}

    onPress={() => router.push('/marketplace')}

  >

    <Text style={styles.quickIcon}>🛍️</Text>

    <Text style={styles.quickTitle}>

      Marketplace

    </Text>

    <Text style={styles.quickSubtitle}>

      Find & order medicines

    </Text>

  </TouchableOpacity>

  <TouchableOpacity

    style={styles.quickCard}

    onPress={() => router.push('/cart')}

  >

    <Text style={styles.quickIcon}>🛒</Text>

    <Text style={styles.quickTitle}>

      My Cart

    </Text>

    <Text style={styles.quickSubtitle}>

      View selected medicines

    </Text>

  </TouchableOpacity>

  <TouchableOpacity

    style={styles.quickCard}

    onPress={() => router.push('/customer-orders')}

  >

    <Text style={styles.quickIcon}>📦</Text>

    <Text style={styles.quickTitle}>

      My Orders

    </Text>

    <Text style={styles.quickSubtitle}>

      Track your orders

    </Text>

  </TouchableOpacity>

  <TouchableOpacity

    style={styles.quickCard}

    onPress={() => router.push('/pharmacy-list')}

  >

    <Text style={styles.quickIcon}>🏥</Text>

    <Text style={styles.quickTitle}>

      Pharmacies

    </Text>

    <Text style={styles.quickSubtitle}>

      Browse pharmacies

    </Text>

  </TouchableOpacity>

  <TouchableOpacity

    style={styles.quickCard}

    onPress={() => router.push('/prescriptions')}

  >

    <Text style={styles.quickIcon}>📄</Text>

    <Text style={styles.quickTitle}>

      Prescriptions

    </Text>

    <Text style={styles.quickSubtitle}>

      Upload & verify

    </Text>

  </TouchableOpacity>

</View>

        {/* =================================================

            LOADING

        ================================================= */}

        {loading ? (

          <View style={styles.loadingBox}>

            <View style={styles.loadingIcon}>

              <ActivityIndicator

                color={COLORS.green}

                size="small"

              />

            </View>

            <Text style={styles.loadingTitle}>

              Loading medicines

            </Text>

            <Text style={styles.loadingText}>

              Checking current stock...

            </Text>

          </View>

        ) : (

          <>

            {/* =================================================

                RESULT COUNT

            ================================================= */}

            <View style={styles.resultHeader}>

              <View>

                <Text style={styles.resultTitle}>

                  Available Medicines

                </Text>

                <Text style={styles.resultSubtitle}>

                  {filtered.length}{' '}

                  {filtered.length === 1

                    ? 'medicine'

                    : 'medicines'}{' '}

                  found

                </Text>

              </View>

              <View style={styles.countBadge}>

                <Text style={styles.countText}>

                  {filtered.length}

                </Text>

              </View>

            </View>

            {/* =================================================

                EMPTY

            ================================================= */}

            {filtered.length === 0 ? (

              <View style={styles.emptyBox}>

                <View style={styles.emptyIcon}>

                  <Text style={styles.emptyIconText}>

                    ⌕

                  </Text>

                </View>

                <Text style={styles.emptyTitle}>

                  {search !== ''

                    ? 'No medicine found'

                    : 'No medicines available'}

                </Text>

                <Text style={styles.emptyText}>

                  {search !== ''

                    ? 'Try searching with another medicine name.'

                    : 'There are currently no medicines in stock.'}

                </Text>

              </View>

            ) : (

              /* =================================================

                  MEDICINE LIST

              ================================================= */

              <View style={styles.medicineList}>

                {filtered.map((med, index) => {

                  const inStock =

                    Number(med.quantity || 0) > 0;

                  const batchNumber =

                    med.batchNumber ||

                    med.batch ||

                    '-';

                  const expiryDate =

                    med.expiryDate ||

                    med.expiry ||

                    null;

                  const sellingPrice =

                    med.sellingPrice ??

                    med.price ??

                    0;

                  return (

                    <View

                      key={

                        med._id ||

                        med.id ||

                        index

                      }

                      style={styles.medCard}

                    >

                      <View style={styles.medMain}>

                        <View

                          style={styles.medicineIcon}

                        >

                          <Text

                            style={

                              styles.medicineIconText

                            }

                          >

                            +

                          </Text>

                        </View>

                        <View style={styles.medInfo}>

                          <Text

                            style={styles.medName}

                            numberOfLines={1}

                          >

                            {med.name}

                          </Text>

                          <Text

                            style={styles.medBrand}

                          >

                            {med.brand ||

                              'Generic medicine'}

                          </Text>

                          <View

                            style={styles.stockRow}

                          >

                            <View

                              style={[

                                styles.stockDot,

                                inStock

                                  ? styles.stockDotGreen

                                  : styles.stockDotRed,

                              ]}

                            />

                            <Text

                              style={[

                                styles.medStock,

                                inStock

                                  ? styles.stockAvailable

                                  : styles.stockUnavailable,

                              ]}

                            >

                              {inStock

                                ? `${med.quantity} units available`

                                : 'Out of Stock'}

                            </Text>

                          </View>

                          {/* =================================================

                              MEDICINE DETAILS

                          ================================================= */}

                          <View

                            style={

                              styles.medicineDetails

                            }

                          >

                            <View

                              style={styles.detailItem}

                            >

                              <Text

                                style={

                                  styles.detailLabel

                                }

                              >

                                Batch

                              </Text>

                              <Text

                                style={

                                  styles.detailValue

                                }

                                numberOfLines={1}

                              >

                                {batchNumber}

                              </Text>

                            </View>

                            <View

                              style={

                                styles.detailDivider

                              }

                            />

                            <View

                              style={styles.detailItem}

                            >

                              <Text

                                style={

                                  styles.detailLabel

                                }

                              >

                                Expiry

                              </Text>

                              <Text

                                style={

                                  styles.detailValue

                                }

                                numberOfLines={1}

                              >

                                {formatExpiryDate(

                                  expiryDate

                                )}

                              </Text>

                            </View>

                            <View

                              style={

                                styles.detailDivider

                              }

                            />

                            <View

                              style={styles.detailItem}

                            >

                              <Text

                                style={

                                  styles.detailLabel

                                }

                              >

                                Price

                              </Text>

                              <Text

                                style={

                                  styles.detailPrice

                                }

                                numberOfLines={1}

                              >

                                {formatPrice(

                                  sellingPrice

                                )}

                              </Text>

                            </View>

                          </View>

                        </View>

                      </View>

                      {/* =================================================

                          STATUS

                      ================================================= */}

                      <View

                        style={[

                          styles.statusBadge,

                          inStock

                            ? styles.statusInStock

                            : styles.statusOutStock,

                        ]}

                      >

                        <Text

                          style={[

                            styles.statusText,

                            inStock

                              ? styles.statusInStockText

                              : styles.statusOutStockText,

                          ]}

                        >

                          {inStock

                            ? 'IN STOCK'

                            : 'OUT OF STOCK'}

                        </Text>

                      </View>

                    </View>

                  );

                })}

              </View>

            )}

          </>

        )}

        {/* =================================================

            PHARMACY INFORMATION

        ================================================= */}

        <View style={styles.pharmacyCard}>

          <View style={styles.pharmacyHeader}>

            <View style={styles.pharmacyIcon}>

              <Text

                style={styles.pharmacyIconText}

              >

                +

              </Text>

            </View>

            <View style={styles.pharmacyHeaderText}>

              <Text style={styles.infoTitle}>

                Sameena Pharmacy

              </Text>

              <Text style={styles.infoSubtitle}>

                Your local pharmacy

              </Text>

            </View>

          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>

            <View style={styles.infoLabelBox}>

              <Text style={styles.infoLabel}>

                Phone

              </Text>

            </View>

            <Text style={styles.infoValue}>

              93859 93021

            </Text>

          </View>

          <View style={styles.infoRow}>

            <View style={styles.infoLabelBox}>

              <Text style={styles.infoLabel}>

                Hours

              </Text>

            </View>

            <Text style={styles.infoValue}>

              8 AM — 10 PM

            </Text>

          </View>

          <View style={styles.infoRow}>

            <View style={styles.infoLabelBox}>

              <Text style={styles.infoLabel}>

                Location

              </Text>

            </View>

            <Text style={styles.infoValue}>

              Kovilpatti

            </Text>

          </View>

        </View>

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

  container: {

    flex: 1,

  },

  contentContainer: {

    paddingHorizontal: 16,

    paddingTop: 16,

    paddingBottom: 30,

  },

  // =======================================================

  // HEADER

  // =======================================================

  header: {

    backgroundColor: COLORS.white,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: COLORS.border,

    padding: 16,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 22,

    shadowColor: '#000000',

    shadowOpacity: 0.03,

    shadowRadius: 8,

    shadowOffset: {

      width: 0,

      height: 3,

    },

    elevation: 2,

  },

  headerLeft: {

    flexDirection: 'row',

    alignItems: 'center',

    flex: 1,

  },

  profileIcon: {

    width: 48,

    height: 48,

    borderRadius: 14,

    backgroundColor: COLORS.green,

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 12,

  },

  profileIconText: {

    color: COLORS.white,

    fontSize: 18,

    fontWeight: '900',

  },

  headerInfo: {

    flex: 1,

  },

  role: {

    fontSize: 9,

    fontWeight: '900',

    color: COLORS.green,

    letterSpacing: 1,

  },

  name: {

    marginTop: 3,

    fontSize: 18,

    fontWeight: '800',

    color: COLORS.text,

  },

  subtitle: {

    marginTop: 3,

    fontSize: 10,

    color: COLORS.textSecondary,

  },

  logoutButton: {

    backgroundColor: COLORS.redLight,

    borderRadius: 9,

    paddingHorizontal: 11,

    paddingVertical: 8,

    marginLeft: 8,

  },

  logoutText: {

    color: COLORS.red,

    fontSize: 11,

    fontWeight: '800',

  },

  // =======================================================

  // SECTION

  // =======================================================

  sectionHeader: {

    marginBottom: 12,

  },

  sectionTitle: {

    fontSize: 18,

    fontWeight: '900',

    color: COLORS.text,

  },

  sectionSubtitle: {

    marginTop: 3,

    fontSize: 11,

    color: COLORS.textSecondary,

  },

  // =======================================================

  // SEARCH

  // =======================================================

  searchBar: {

    height: 52,

    backgroundColor: COLORS.white,

    borderRadius: 13,

    borderWidth: 1,

    borderColor: COLORS.border,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 10,

    marginBottom: 20,

  },

  searchIconBox: {

    width: 34,

    height: 34,

    borderRadius: 10,

    backgroundColor: COLORS.greenLight,

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 8,

  },

  searchIcon: {

    fontSize: 22,

    color: COLORS.green,

    marginTop: -3,

  },

  searchInput: {

    flex: 1,

    height: 50,

    fontSize: 14,

    color: COLORS.text,

  },

  clearButton: {

    width: 30,

    height: 30,

    justifyContent: 'center',

    alignItems: 'center',

  },

  clearText: {

    fontSize: 21,

    color: COLORS.textSecondary,

  },

  // =======================================================

  // LOADING

  // =======================================================

  loadingBox: {

    backgroundColor: COLORS.white,

    borderRadius: 15,

    borderWidth: 1,

    borderColor: COLORS.border,

    paddingVertical: 42,

    alignItems: 'center',

    marginBottom: 20,

  },

  loadingIcon: {

    width: 48,

    height: 48,

    borderRadius: 14,

    backgroundColor: COLORS.greenLight,

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom: 11,

  },

  loadingTitle: {

    fontSize: 14,

    fontWeight: '800',

    color: COLORS.text,

  },

  loadingText: {

    marginTop: 4,

    fontSize: 10,

    color: COLORS.textSecondary,

  },

  // =======================================================

  // RESULT HEADER

  // =======================================================

  resultHeader: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 12,

  },

  resultTitle: {

    fontSize: 16,

    fontWeight: '900',

    color: COLORS.text,

  },

  resultSubtitle: {

    marginTop: 3,

    fontSize: 10,

    color: COLORS.textSecondary,

  },

  countBadge: {

    minWidth: 34,

    height: 30,

    borderRadius: 9,

    backgroundColor: COLORS.greenLight,

    justifyContent: 'center',

    alignItems: 'center',

    paddingHorizontal: 8,

  },

  countText: {

    fontSize: 12,

    fontWeight: '900',

    color: COLORS.green,

  },

  // =======================================================

  // MEDICINE LIST

  // =======================================================

  medicineList: {

    marginBottom: 20,

  },

  medCard: {

    backgroundColor: COLORS.white,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: COLORS.border,

    padding: 14,

    marginBottom: 10,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    shadowColor: '#000000',

    shadowOpacity: 0.025,

    shadowRadius: 7,

    shadowOffset: {

      width: 0,

      height: 2,

    },

    elevation: 1,

  },

  medMain: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    flex: 1,

    minWidth: 0,

  },

  medicineIcon: {

    width: 43,

    height: 43,

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

  medInfo: {

    flex: 1,

    minWidth: 0,

  },

  medName: {

    fontSize: 14,

    fontWeight: '900',

    color: COLORS.text,

  },

  medBrand: {

    fontSize: 10,

    color: COLORS.textSecondary,

    marginTop: 3,

  },

  stockRow: {

    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 7,

  },

  stockDot: {

    width: 6,

    height: 6,

    borderRadius: 3,

    marginRight: 6,

  },

  stockDotGreen: {

    backgroundColor: COLORS.green,

  },

  stockDotRed: {

    backgroundColor: COLORS.red,

  },

  medStock: {

    fontSize: 10,

    fontWeight: '700',

  },

  stockAvailable: {

    color: COLORS.green,

  },

  stockUnavailable: {

    color: COLORS.red,

  },

  // =======================================================

  // MEDICINE DETAILS

  // =======================================================

  medicineDetails: {

    marginTop: 9,

    paddingTop: 9,

    borderTopWidth: 1,

    borderTopColor: '#EEF2F0',

    flexDirection: 'row',

    alignItems: 'center',

  },

  detailItem: {

    flex: 1,

    minWidth: 0,

  },

  detailLabel: {

    fontSize: 8,

    color: COLORS.textSecondary,

    fontWeight: '600',

    marginBottom: 3,

  },

  detailValue: {

    fontSize: 9,

    color: COLORS.text,

    fontWeight: '800',

  },

  detailPrice: {

    fontSize: 10,

    color: COLORS.green,

    fontWeight: '900',

  },

  detailDivider: {

    width: 1,

    height: 25,

    backgroundColor: COLORS.border,

    marginHorizontal: 7,

  },

  // =======================================================

  // STATUS BADGE

  // =======================================================

  statusBadge: {

    borderRadius: 8,

    paddingHorizontal: 9,

    paddingVertical: 6,

    marginLeft: 9,

    alignSelf: 'flex-start',

  },

  statusInStock: {

    backgroundColor: COLORS.greenLight,

  },

  statusOutStock: {

    backgroundColor: COLORS.redLight,

  },

  statusText: {

    fontSize: 8,

    fontWeight: '900',

    letterSpacing: 0.4,

  },

  statusInStockText: {

    color: COLORS.green,

  },

  statusOutStockText: {

    color: COLORS.red,

  },

  // =======================================================

  // EMPTY

  // =======================================================

  emptyBox: {

    backgroundColor: COLORS.white,

    borderRadius: 15,

    borderWidth: 1,

    borderColor: COLORS.border,

    paddingVertical: 45,

    paddingHorizontal: 25,

    alignItems: 'center',

    marginBottom: 20,

  },

  emptyIcon: {

    width: 52,

    height: 52,

    borderRadius: 15,

    backgroundColor: COLORS.muted,

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom: 12,

  },

  emptyIconText: {

    fontSize: 24,

    color: COLORS.textSecondary,

  },

  emptyTitle: {

    fontSize: 16,

    fontWeight: '900',

    color: COLORS.text,

    textAlign: 'center',

  },

  emptyText: {

    marginTop: 5,

    fontSize: 11,

    color: COLORS.textSecondary,

    textAlign: 'center',

    lineHeight: 17,

  },

  quickActions: {

  flexDirection: 'row',

  flexWrap: 'wrap',

  justifyContent: 'space-between',

  marginBottom: 20,

},

quickCard: {

  width: '48%',

  backgroundColor: COLORS.white,

  borderRadius: 14,

  borderWidth: 1,

  borderColor: COLORS.border,

  padding: 14,

  marginBottom: 10,

  elevation: 1,

},

quickIcon: {

  fontSize: 25,

  marginBottom: 8,

},

quickTitle: {

  fontSize: 14,

  fontWeight: '900',

  color: COLORS.text,

},

quickSubtitle: {

  fontSize: 9,

  color: COLORS.textSecondary,

  marginTop: 4,

},

  // =======================================================

  // PHARMACY INFO

  // =======================================================

  pharmacyCard: {

    backgroundColor: COLORS.green,

    borderRadius: 16,

    padding: 17,

    marginTop: 3,

  },

  pharmacyHeader: {

    flexDirection: 'row',

    alignItems: 'center',

  },

  pharmacyIcon: {

    width: 43,

    height: 43,

    borderRadius: 12,

    backgroundColor: 'rgba(255,255,255,0.14)',

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 11,

  },

  pharmacyIconText: {

    color: COLORS.white,

    fontSize: 24,

    fontWeight: '400',

  },

  pharmacyHeaderText: {

    flex: 1,

  },

  infoTitle: {

    color: COLORS.white,

    fontSize: 15,

    fontWeight: '900',

  },

  infoSubtitle: {

    color: '#D5E9E2',

    fontSize: 9,

    marginTop: 3,

  },

  infoDivider: {

    height: 1,

    backgroundColor: 'rgba(255,255,255,0.15)',

    marginVertical: 14,

  },

  infoRow: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 9,

  },

  infoLabelBox: {

    width: 65,

  },

  infoLabel: {

    color: '#BBDDD2',

    fontSize: 9,

    fontWeight: '700',

  },

  infoValue: {

    color: COLORS.white,

    fontSize: 11,

    fontWeight: '700',

  },

  bottomSpace: {

    height: 15,

  },

});