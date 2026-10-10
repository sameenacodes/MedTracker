import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  deleteOnlineInventory,
  getMyOnlineInventory,
  updateOnlineInventory,
} from '../services/api';

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',

  white: '#FFFFFF',
  background: '#F8FAFC',

  text: '#0F172A',
  secondary: '#64748B',
  border: '#E2E8F0',

  green: '#16A34A',
  greenLight: '#F0FDF4',

  red: '#DC2626',
  redLight: '#FEF2F2',

  orange: '#EA580C',
  orangeLight: '#FFF7ED',
};

export default function PharmacyOnlineInventory() {

  const router = useRouter();

  const [
    inventory,
    setInventory,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    selectedItem,
    setSelectedItem,
  ] = useState(null);

  const [
    editVisible,
    setEditVisible,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    price,
    setPrice,
  ] = useState('');

  const [
    quantity,
    setQuantity,
  ] = useState('');

  const [
    maxQuantity,
    setMaxQuantity,
  ] = useState('');

  const [
    onlineEnabled,
    setOnlineEnabled,
  ] = useState(false);

  const [
    prescriptionRequired,
    setPrescriptionRequired,
  ] = useState(false);

  // =====================================================
  // LOAD
  // =====================================================

  const loadInventory = async () => {

    try {

      const response =
        await getMyOnlineInventory();

      setInventory(
        response?.inventory || []
      );

    } catch (error) {

      console.log(
        'Online inventory error:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Failed to load online inventory'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [])
  );

  const refresh = () => {

    setRefreshing(true);

    loadInventory();
  };

  // =====================================================
  // EDIT
  // =====================================================

  const openEdit = (item) => {

    setSelectedItem(item);

    setPrice(
      String(
        item.sellingPrice ?? 0
      )
    );

    setQuantity(
      String(
        item.onlineQuantity ?? 0
      )
    );

    setMaxQuantity(
      String(
        item.maxOrderQuantity ?? 10
      )
    );

    setOnlineEnabled(
      Boolean(
        item.availableForOnlineOrder
      )
    );

    setPrescriptionRequired(
      Boolean(
        item.requiresPrescription
      )
    );

    setEditVisible(true);
  };

  // =====================================================
  // SAVE
  // =====================================================

  const saveChanges = async () => {

    if (!selectedItem) {
      return;
    }

    const parsedPrice =
      Number(price);

    const parsedQuantity =
      Number(quantity);

    const parsedMax =
      Number(maxQuantity);

    if (
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0
    ) {

      Alert.alert(
        'Invalid Price',
        'Enter a valid selling price.'
      );

      return;
    }

    if (
      Number.isNaN(parsedQuantity) ||
      parsedQuantity < 0
    ) {

      Alert.alert(
        'Invalid Stock',
        'Enter a valid online quantity.'
      );

      return;
    }

    if (
      Number.isNaN(parsedMax) ||
      parsedMax < 1
    ) {

      Alert.alert(
        'Invalid Quantity',
        'Maximum order quantity must be at least 1.'
      );

      return;
    }

    try {

      setSaving(true);

      await updateOnlineInventory(
        selectedItem._id,
        {
          sellingPrice:
            parsedPrice,

          onlineQuantity:
            parsedQuantity,

          maxOrderQuantity:
            parsedMax,

          availableForOnlineOrder:
            onlineEnabled,

          requiresPrescription:
            prescriptionRequired,
        }
      );

      setEditVisible(false);

      await loadInventory();

      Alert.alert(
        'Success',
        'Online inventory updated successfully.'
      );

    } catch (error) {

      Alert.alert(
        'Update Failed',
        error?.message ||
          'Could not update inventory.'
      );

    } finally {

      setSaving(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const removeItem = (item) => {

    const name =
      item.medicine?.name ||
      'this medicine';

    Alert.alert(
      'Remove Medicine',
      `Remove ${name} from online marketplace?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Remove',
          style: 'destructive',

          onPress: async () => {

            try {

              await deleteOnlineInventory(
                item._id
              );

              await loadInventory();

            } catch (error) {

              Alert.alert(
                'Error',
                error?.message ||
                  'Failed to remove medicine'
              );
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // CARD
  // =====================================================

  const renderItem = ({
    item,
  }) => {

    const medicine =
      item.medicine || {};

    const name =
      medicine.name ||
      'Medicine';

    const brand =
      medicine.brand ||
      '';

    const category =
      medicine.category ||
      '';

    const stock =
      Number(
        item.onlineQuantity || 0
      );

    const active =
      item.availableForOnlineOrder &&
      item.status === 'active' &&
      stock > 0;

    return (
      <View
        style={styles.card}
      >

        {/* TOP */}
        <View
          style={styles.cardTop}
        >

          <View
            style={styles.medicineIcon}
          >
            <Text
              style={{
                fontSize: 25,
              }}
            >
              💊
            </Text>
          </View>

          <View
            style={styles.medicineInfo}
          >

            <Text
              style={styles.medicineName}
              numberOfLines={1}
            >
              {name}
            </Text>

            {brand ? (
              <Text
                style={
                  styles.brand
                }
              >
                {brand}
              </Text>
            ) : null}

            {category ? (
              <Text
                style={
                  styles.category
                }
              >
                {category}
              </Text>
            ) : null}

          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  active
                    ? COLORS.greenLight
                    : COLORS.redLight,
              },
            ]}
          >

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    active
                      ? COLORS.green
                      : COLORS.red,
                },
              ]}
            >
              {active
                ? 'ONLINE'
                : 'OFFLINE'}
            </Text>

          </View>

        </View>

        {/* DETAILS */}
        <View
          style={styles.detailsRow}
        >

          <View
            style={styles.detailBox}
          >

            <Text
              style={
                styles.detailLabel
              }
            >
              Selling Price
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              ₹
              {Number(
                item.sellingPrice || 0
              ).toFixed(2)}
            </Text>

          </View>

          <View
            style={styles.detailBox}
          >

            <Text
              style={
                styles.detailLabel
              }
            >
              Online Stock
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {stock}
            </Text>

          </View>

          <View
            style={styles.detailBox}
          >

            <Text
              style={
                styles.detailLabel
              }
            >
              Max Order
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {item.maxOrderQuantity ||
                10}
            </Text>

          </View>

        </View>

        {/* ACTIONS */}
        <View
          style={styles.actionRow}
        >

          <TouchableOpacity
            style={
              styles.editButton
            }
            onPress={() =>
              openEdit(item)
            }
          >
            <Text
              style={
                styles.editText
              }
            >
              ✏️ Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.removeButton
            }
            onPress={() =>
              removeItem(item)
            }
          >
            <Text
              style={
                styles.removeText
              }
            >
              Remove
            </Text>
          </TouchableOpacity>

        </View>

      </View>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <SafeAreaView
        style={styles.container}
      >

        <View
          style={
            styles.loadingContainer
          }
        >

          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading online inventory...
          </Text>

        </View>

      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >

      {/* HEADER */}
      <View
        style={styles.header}
      >

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={styles.backText}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerCenter
          }
        >

          <Text
            style={
              styles.headerTitle
            }
          >
            Online Inventory
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Manage marketplace medicines
          </Text>

        </View>

        <TouchableOpacity
          style={styles.addHeaderButton}
          onPress={() =>
            router.push('/add-online-inventory')
          }
          activeOpacity={0.8}
        >
          <Text style={styles.addHeaderButtonText}>
            + Add
          </Text>
        </TouchableOpacity>

      </View>

      {/* INFO */}
      <View
        style={styles.infoBox}
      >

        <Text
          style={styles.infoIcon}
        >
          💡
        </Text>

        <Text
          style={styles.infoText}
        >
          Only medicines enabled for online
          sale will appear in the customer
          marketplace.
        </Text>

      </View>

      {/* LIST */}
      {inventory.length === 0 ? (

        <View
          style={
            styles.emptyContainer
          }
        >

          <Text
            style={styles.emptyIcon}
          >
            🛒
          </Text>

          <Text
            style={styles.emptyTitle}
          >
            No Online Medicines
          </Text>

          <Text
            style={
              styles.emptySubtitle
            }
          >
            Add medicines to your online
            inventory to start receiving
            customer orders.
          </Text>

        </View>

      ) : (

        <FlatList
          data={inventory}
          keyExtractor={(item) =>
            item._id
          }
          renderItem={renderItem}
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                refresh
              }
              colors={[
                COLORS.primary,
              ]}
            />
          }
        />

      )}

      {/* EDIT MODAL */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setEditVisible(false)
        }
      >

        <View
          style={styles.modalOverlay}
        >

          <View
            style={styles.modal}
          >

            <View
              style={styles.modalHeader}
            >

              <Text
                style={
                  styles.modalTitle
                }
              >
                Edit Online Medicine
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setEditVisible(false)
                }
              >
                <Text
                  style={
                    styles.closeText
                  }
                >
                  ✕
                </Text>
              </TouchableOpacity>

            </View>

            <Text
              style={
                styles.selectedName
              }
            >
              {selectedItem?.medicine
                ?.name ||
                'Medicine'}
            </Text>

            {/* PRICE */}
            <Text
              style={styles.inputLabel}
            >
              Selling Price
            </Text>

            <TextInput
              value={price}
              onChangeText={
                setPrice
              }
              keyboardType="decimal-pad"
              placeholder="Enter price"
              style={styles.input}
            />

            {/* STOCK */}
            <Text
              style={styles.inputLabel}
            >
              Online Stock
            </Text>

            <TextInput
              value={quantity}
              onChangeText={
                setQuantity
              }
              keyboardType="number-pad"
              placeholder="Enter stock"
              style={styles.input}
            />

            {/* MAX */}
            <Text
              style={styles.inputLabel}
            >
              Maximum Order Quantity
            </Text>

            <TextInput
              value={maxQuantity}
              onChangeText={
                setMaxQuantity
              }
              keyboardType="number-pad"
              placeholder="Example: 10"
              style={styles.input}
            />

            {/* ONLINE SWITCH */}
            <View
              style={
                styles.switchRow
              }
            >

              <View
                style={{ flex: 1 }}
              >

                <Text
                  style={
                    styles.switchTitle
                  }
                >
                  Available Online
                </Text>

                <Text
                  style={
                    styles.switchSubtitle
                  }
                >
                  Allow customers to order
                  this medicine
                </Text>

              </View>

              <Switch
                value={
                  onlineEnabled
                }
                onValueChange={
                  setOnlineEnabled
                }
                trackColor={{
                  false:
                    '#CBD5E1',
                  true:
                    COLORS.primary,
                }}
              />

            </View>

            {/* PRESCRIPTION SWITCH */}
            <View
              style={
                styles.switchRow
              }
            >

              <View
                style={{ flex: 1 }}
              >

                <Text
                  style={
                    styles.switchTitle
                  }
                >
                  Prescription Required
                </Text>

                <Text
                  style={
                    styles.switchSubtitle
                  }
                >
                  Customer must upload an approved prescription
                </Text>

              </View>

              <Switch
                value={
                  prescriptionRequired
                }
                onValueChange={
                  setPrescriptionRequired
                }
                trackColor={{
                  false:
                    '#CBD5E1',
                  true:
                    COLORS.green,
                }}
              />

            </View>

            {/* SAVE */}
            <TouchableOpacity
              style={
                styles.saveButton
              }
              disabled={saving}
              onPress={
                saveChanges
              }
            >

              {saving ? (
                <ActivityIndicator
                  color={
                    COLORS.white
                }
              />
              ) : (
                <Text
                  style={
                    styles.saveText
                  }
                >
                  Save Changes
                </Text>
              )}

            </TouchableOpacity>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 16,
  backgroundColor: '#FFFFFF',
},

headerText: {
  flex: 1,
  paddingRight: 10,
},

addButton: {
  backgroundColor: '#2563EB',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 10,
},

addButtonText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '900',
},

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: COLORS.text,
  },

  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 3,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addHeaderButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addHeaderButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },

  infoBox: {
    flexDirection: 'row',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor:
      COLORS.primaryLight,
  },

  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  infoText: {
    flex: 1,
    fontSize: 10,
    color: '#1E40AF',
    lineHeight: 16,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  card: {
    backgroundColor:
      COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  medicineIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medicineInfo: {
    flex: 1,
    marginLeft: 11,
  },

  medicineName: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
  },

  brand: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 2,
  },

  category: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },

  statusText: {
    fontSize: 8,
    fontWeight: '900',
  },

  detailsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },

  detailBox: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 9,
    color: COLORS.secondary,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 3,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },

  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor:
      COLORS.primary,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
  },

  editText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  removeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor:
      COLORS.red,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
  },

  removeText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: '800',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.secondary,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyIcon: {
    fontSize: 55,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.text,
  },

  emptySubtitle: {
    fontSize: 11,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 7,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor:
      COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
  },

  closeText: {
    fontSize: 18,
    color: COLORS.secondary,
  },

  selectedName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 15,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 8,
  },

  input: {
    height: 45,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor:
      COLORS.background,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 5,
  },

  switchTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  switchSubtitle: {
    fontSize: 9,
    color: COLORS.secondary,
    marginTop: 3,
  },

  saveButton: {
    marginTop: 20,
    backgroundColor:
      COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  saveText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },

});