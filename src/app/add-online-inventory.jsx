import { useRouter } from 'expo-router';

import { useEffect, useState } from 'react';



import {
  ActivityIndicator,

  Alert,

  FlatList,

  Modal,

  RefreshControl,

  StyleSheet,

  Switch,

  Text,

  TextInput,

  TouchableOpacity,

  View,
} from 'react-native';



import {
  addOnlineInventory,

  getMedicines,
} from '../services/api';



export default function AddOnlineInventory() {

  const router = useRouter();



  const [medicines, setMedicines] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);



  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);



  const [sellingPrice, setSellingPrice] = useState('');

  const [onlineQuantity, setOnlineQuantity] = useState('');

  const [maxOrderQuantity, setMaxOrderQuantity] = useState('10');



  const [availableForOnlineOrder, setAvailableForOnlineOrder] =

    useState(true);



  // NEW

  const [requiresPrescription, setRequiresPrescription] =

    useState(false);



  const isExpiredMedicine = (medicine) => {
    if (!medicine) return true;

    if (
      medicine.status === 'expired' ||
      medicine.status === 'removed'
    ) {
      return true;
    }

    if (!medicine.expiryDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(medicine.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    return expiry <= today;
  };

  const loadMedicines = async () => {

    try {

      setLoading(true);



      const response = await getMedicines();



      const data =

        response?.medicines ||

        response?.data ||

        response ||

        [];



      const medicineList = Array.isArray(data) ? data : [];

      // Never show expired or removed medicines in online marketplace setup.
      const availableMedicines = medicineList.filter(
        (medicine) => !isExpiredMedicine(medicine)
      );

      setMedicines(availableMedicines);

    } catch (error) {

      console.log('Load medicines error:', error);



      Alert.alert(

        'Error',

        error?.message || 'Failed to load medicines'

      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  };



  useEffect(() => {

    loadMedicines();

  }, []);



  const openAddModal = (medicine) => {

    setSelectedMedicine(medicine);



    setSellingPrice(

      String(

        medicine?.sellingPrice ||

        medicine?.price ||

        ''

      )

    );



    setOnlineQuantity(

      String(

        medicine?.stockQuantity ??

        medicine?.quantity ??

        medicine?.stock ??

        0

      )

    );



    setMaxOrderQuantity('10');



    setAvailableForOnlineOrder(true);



    // NEW

    setRequiresPrescription(false);



    setModalVisible(true);

  };



  const handleAdd = async () => {

    if (!selectedMedicine?._id) {

      Alert.alert('Error', 'Medicine not selected');

      return;

    }



    // Final safety check: expired/removed medicines cannot be added.
    if (isExpiredMedicine(selectedMedicine)) {
      Alert.alert(
        'Expired Medicine',
        'Expired or removed medicines cannot be added to the online marketplace.'
      );
      return;
    }

    const price = Number(sellingPrice);

    const quantity = Number(onlineQuantity);

    const maxQty = Number(maxOrderQuantity);



    if (

      !sellingPrice ||

      Number.isNaN(price) ||

      price < 0

    ) {

      Alert.alert(

        'Invalid Price',

        'Enter a valid selling price'

      );

      return;

    }



    if (

      !onlineQuantity ||

      Number.isNaN(quantity) ||

      quantity < 0

    ) {

      Alert.alert(

        'Invalid Stock',

        'Enter a valid online quantity'

      );

      return;

    }



    if (

      !maxOrderQuantity ||

      Number.isNaN(maxQty) ||

      maxQty < 1

    ) {

      Alert.alert(

        'Invalid Quantity',

        'Maximum order quantity must be at least 1'

      );

      return;

    }



    try {

      const result = await addOnlineInventory({

        medicineId: selectedMedicine._id,

        sellingPrice: price,

        onlineQuantity: quantity,

        availableForOnlineOrder,



        // NEW

        requiresPrescription,



        maxOrderQuantity: maxQty,

      });



      setModalVisible(false);



      Alert.alert(

        'Success',

        result?.message ||

          'Medicine added to online inventory'

      );



      setSelectedMedicine(null);

      setRequiresPrescription(false);



    } catch (error) {

      console.log(

        'Add online inventory error:',

        error

      );



      Alert.alert(

        'Failed',

        error?.message ||

          'Could not add medicine to online inventory'

      );

    }

  };



  const renderMedicine = ({ item }) => {

    const medicineName =

      item.medicineName ||

      item.name ||

      item.medicine ||

      'Unknown Medicine';



    const manufacturer =

      item.manufacturer ||

      item.company ||

      item.brand ||

      '';



    const stock =

      item.stockQuantity ??

      item.quantity ??

      item.stock ??

      0;



    return (

      <View style={styles.card}>

        <View style={styles.cardTop}>



          <View style={styles.info}>



            <Text style={styles.medicineName}>

              {medicineName}

            </Text>



            {manufacturer ? (

              <Text style={styles.manufacturer}>

                {manufacturer}

              </Text>

            ) : null}



            <Text style={styles.stock}>

              Current Stock: {stock}

            </Text>



          </View>



          <TouchableOpacity

            style={styles.addButton}

            onPress={() => openAddModal(item)}

          >

            <Text style={styles.addButtonText}>

              + Add

            </Text>

          </TouchableOpacity>



        </View>

      </View>

    );

  };



  if (loading) {

    return (

      <View style={styles.loadingContainer}>



        <ActivityIndicator

          size="large"

          color="#2563EB"

        />



        <Text style={styles.loadingText}>

          Loading medicines...

        </Text>



      </View>

    );

  }



  return (

    <View style={styles.container}>



      {/* HEADER */}



      <View style={styles.header}>



        <TouchableOpacity

          onPress={() => router.back()}

          style={styles.backButton}

        >

          <Text style={styles.backText}>

            ‹

          </Text>

        </TouchableOpacity>



        <View>

          <Text style={styles.title}>

            Add Online Inventory

          </Text>



          <Text style={styles.subtitle}>

            Select medicines for marketplace

          </Text>

        </View>



      </View>



      {/* LIST */}



      {medicines.length === 0 ? (



        <View style={styles.empty}>



          <Text style={styles.emptyIcon}>

            💊

          </Text>



          <Text style={styles.emptyTitle}>

            No medicines found

          </Text>



          <Text style={styles.emptyText}>

            Add medicines to your pharmacy inventory

            first.

          </Text>



          <TouchableOpacity

            style={styles.primaryButton}

            onPress={() =>

              router.push('/add-medicine')

            }

          >

            <Text style={styles.primaryButtonText}>

              + Add Medicine

            </Text>

          </TouchableOpacity>



        </View>



      ) : (



        <FlatList

          data={medicines}

          keyExtractor={(item) =>

            String(item._id)

          }

          renderItem={renderMedicine}

          contentContainerStyle={styles.list}

          refreshControl={

            <RefreshControl

              refreshing={refreshing}

              onRefresh={() => {

                setRefreshing(true);

                loadMedicines();

              }}

            />

          }

          showsVerticalScrollIndicator={false}

        />



      )}



      {/* ADD MODAL */}



      <Modal

        visible={modalVisible}

        transparent

        animationType="slide"

        onRequestClose={() =>

          setModalVisible(false)

        }

      >



        <View style={styles.modalOverlay}>



          <View style={styles.modal}>



            <Text style={styles.modalTitle}>

              Add to Online Inventory

            </Text>



            <Text style={styles.selectedName}>

              {selectedMedicine?.medicineName ||

                selectedMedicine?.name ||

                'Medicine'}

            </Text>



            {/* PRICE */}



            <Text style={styles.label}>

              Selling Price

            </Text>



            <TextInput

              style={styles.input}

              value={sellingPrice}

              onChangeText={setSellingPrice}

              placeholder="Enter selling price"

              keyboardType="decimal-pad"

            />



            {/* STOCK */}



            <Text style={styles.label}>

              Online Quantity

            </Text>



            <TextInput

              style={styles.input}

              value={onlineQuantity}

              onChangeText={setOnlineQuantity}

              placeholder="Enter online stock"

              keyboardType="number-pad"

            />



            {/* MAX ORDER */}



            <Text style={styles.label}>

              Maximum Order Quantity

            </Text>



            <TextInput

              style={styles.input}

              value={maxOrderQuantity}

              onChangeText={setMaxOrderQuantity}

              placeholder="Example: 10"

              keyboardType="number-pad"

            />



            {/* AVAILABILITY */}



            <View style={styles.switchRow}>



              <View style={{ flex: 1 }}>



                <Text style={styles.switchTitle}>

                  Available for Online Orders

                </Text>



                <Text style={styles.switchSubtitle}>

                  Customers can purchase this medicine

                </Text>



              </View>



              <Switch

                value={availableForOnlineOrder}

                onValueChange={

                  setAvailableForOnlineOrder

                }

                trackColor={{

                  false: '#CBD5E1',

                  true: '#2563EB',

                }}

              />



            </View>



            {/* PRESCRIPTION REQUIRED */}



            <View style={styles.switchRow}>



              <View style={{ flex: 1 }}>



                <Text style={styles.switchTitle}>

                  Prescription Required

                </Text>



                <Text style={styles.switchSubtitle}>

                  Customer must upload an approved prescription

                </Text>



              </View>



              <Switch

                value={requiresPrescription}

                onValueChange={setRequiresPrescription}

                trackColor={{

                  false: '#CBD5E1',

                  true: '#16A34A',

                }}

              />



            </View>



            {/* BUTTONS */}



            <View style={styles.modalButtons}>



              <TouchableOpacity

                style={styles.cancelButton}

                onPress={() =>

                  setModalVisible(false)

                }

              >

                <Text style={styles.cancelText}>

                  Cancel

                </Text>

              </TouchableOpacity>



              <TouchableOpacity

                style={styles.saveButton}

                onPress={handleAdd}

              >

                <Text style={styles.saveText}>

                  Add to Marketplace

                </Text>

              </TouchableOpacity>



            </View>



          </View>



        </View>



      </Modal>



    </View>

  );

}



const styles = StyleSheet.create({



  container: {

    flex: 1,

    backgroundColor: '#F5F7FB',

  },



  loadingContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: '#F5F7FB',

  },



  loadingText: {

    marginTop: 10,

    color: '#64748B',

  },



  header: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 18,

    paddingTop: 20,

    paddingBottom: 16,

    backgroundColor: '#FFFFFF',

    borderBottomWidth: 1,

    borderBottomColor: '#E2E8F0',

  },



  backButton: {

    width: 42,

    height: 42,

    borderRadius: 12,

    backgroundColor: '#EFF6FF',

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 12,

  },



  backText: {

    fontSize: 30,

    color: '#2563EB',

    marginTop: -3,

  },



  title: {

    fontSize: 20,

    fontWeight: '900',

    color: '#0F172A',

  },



  subtitle: {

    fontSize: 12,

    color: '#64748B',

    marginTop: 3,

  },



  list: {

    padding: 16,

    paddingBottom: 30,

  },



  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    padding: 16,

    marginBottom: 12,

    borderWidth: 1,

    borderColor: '#E2E8F0',

    elevation: 2,

  },



  cardTop: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

  },



  info: {

    flex: 1,

    paddingRight: 12,

  },



  medicineName: {

    fontSize: 16,

    fontWeight: '900',

    color: '#0F172A',

  },



  manufacturer: {

    fontSize: 12,

    color: '#64748B',

    marginTop: 4,

  },



  stock: {

    fontSize: 12,

    color: '#2563EB',

    fontWeight: '700',

    marginTop: 7,

  },



  addButton: {

    backgroundColor: '#2563EB',

    paddingHorizontal: 16,

    paddingVertical: 11,

    borderRadius: 10,

  },



  addButtonText: {

    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '900',

  },



  empty: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    paddingHorizontal: 30,

  },



  emptyIcon: {

    fontSize: 55,

    marginBottom: 12,

  },



  emptyTitle: {

    fontSize: 20,

    fontWeight: '900',

    color: '#0F172A',

  },



  emptyText: {

    textAlign: 'center',

    color: '#64748B',

    marginTop: 7,

    lineHeight: 20,

  },



  primaryButton: {

    backgroundColor: '#2563EB',

    paddingHorizontal: 20,

    paddingVertical: 13,

    borderRadius: 11,

    marginTop: 20,

  },



  primaryButtonText: {

    color: '#FFFFFF',

    fontWeight: '900',

  },



  modalOverlay: {

    flex: 1,

    backgroundColor: 'rgba(0,0,0,0.45)',

    justifyContent: 'flex-end',

  },



  modal: {

    backgroundColor: '#FFFFFF',

    borderTopLeftRadius: 24,

    borderTopRightRadius: 24,

    padding: 20,

    paddingBottom: 30,

  },



  modalTitle: {

    fontSize: 21,

    fontWeight: '900',

    color: '#0F172A',

  },



  selectedName: {

    fontSize: 14,

    color: '#2563EB',

    fontWeight: '800',

    marginTop: 5,

    marginBottom: 18,

  },



  label: {

    fontSize: 13,

    fontWeight: '800',

    color: '#334155',

    marginBottom: 7,

    marginTop: 10,

  },



  input: {

    height: 48,

    borderWidth: 1,

    borderColor: '#CBD5E1',

    borderRadius: 10,

    paddingHorizontal: 14,

    fontSize: 14,

    color: '#0F172A',

    backgroundColor: '#F8FAFC',

  },



  switchRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: 18,

    paddingVertical: 8,

  },



  switchTitle: {

    fontSize: 13,

    fontWeight: '800',

    color: '#0F172A',

  },



  switchSubtitle: {

    fontSize: 10,

    color: '#64748B',

    marginTop: 3,

    paddingRight: 10,

  },



  modalButtons: {

    flexDirection: 'row',

    gap: 10,

    marginTop: 20,

  },



  cancelButton: {

    flex: 1,

    height: 48,

    borderRadius: 11,

    borderWidth: 1,

    borderColor: '#CBD5E1',

    justifyContent: 'center',

    alignItems: 'center',

  },



  cancelText: {

    color: '#475569',

    fontWeight: '800',

  },



  saveButton: {

    flex: 1.5,

    height: 48,

    borderRadius: 11,

    backgroundColor: '#2563EB',

    justifyContent: 'center',

    alignItems: 'center',

  },



  saveText: {

    color: '#FFFFFF',

    fontWeight: '900',

    fontSize: 13,

  },



});