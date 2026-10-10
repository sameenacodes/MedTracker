import { useRouter } from 'expo-router';



import { useEffect, useState } from 'react';







import {
  ActivityIndicator,



  Alert,



  ScrollView,



  StyleSheet,



  Text,



  TextInput,



  TouchableOpacity,



  View,
} from 'react-native';







import {
  addSupplier,

  createReorderOrder,

  getAIReorderSuggestions,

  getReorderHistory,

  getSuppliers,
} from '../services/api';







const COLORS = {



  green: '#176B52',



  greenLight: '#EAF5F1',



  greenBorder: '#CFE5DE',







  white: '#FFFFFF',



  background: '#F6F8F7',







  text: '#17211D',



  muted: '#6B7772',



  border: '#E1E7E4',







  red: '#C0392B',



  redLight: '#FDEDEC',







  amber: '#A66A00',



  amberLight: '#FFF5DD',



};







export default function Suppliers() {



  const router = useRouter();







  const [suppliers, setSuppliers] = useState([]);



  const [loading, setLoading] = useState(true);



  const [search, setSearch] = useState('');



  const [showAddForm, setShowAddForm] = useState(false);



  const [adding, setAdding] = useState(false);







  const [form, setForm] = useState({



    name: '',



    contact: '',



    email: '',



    address: '',



  });







  // ============================



  // LOAD SUPPLIERS



  // ============================







  const loadSuppliers = async () => {



    try {



      setLoading(true);







      const result = await getSuppliers();







      console.log('Supplier API response:', result);







      const supplierList = Array.isArray(result)



        ? result



        : Array.isArray(result?.suppliers)



        ? result.suppliers



        : [];







      setSuppliers(supplierList);







      console.log(



        'Suppliers loaded:',



        supplierList.length



      );



    } catch (error) {



      console.log(



        'Failed to load suppliers:',



        error



      );







      Alert.alert(



        'Error',



        'Unable to load suppliers from server.'



      );







      setSuppliers([]);



    } finally {



      setLoading(false);



    }



  };







  useEffect(() => {



    loadSuppliers();



  }, []);







  // ============================



  // FILTER



  // ============================







  const filtered = suppliers.filter((supplier) => {



    const searchValue =



      search.toLowerCase().trim();







    if (!searchValue) {



      return true;



    }







    const name =



      String(supplier.name || '').toLowerCase();







    const contact =



      String(supplier.contact || '');







    const email =



      String(supplier.email || '').toLowerCase();







    return (



      name.includes(searchValue) ||



      contact.includes(searchValue) ||



      email.includes(searchValue)



    );



  });







  // ============================



  // SUMMARY



  // ============================







  const totalSuppliers = suppliers.length;







  const activeSuppliers = suppliers.filter(



    (supplier) =>



      supplier.status === 'active'



  ).length;







  const inactiveSuppliers = suppliers.filter(



    (supplier) =>



      supplier.status === 'inactive'



  ).length;







  // ============================



  // ADD SUPPLIER



  // ============================







  const handleAdd = async () => {



    if (!form.name.trim()) {



      Alert.alert(



        'Required',



        'Supplier name is required.'



      );



      return;



    }







    if (!form.contact.trim()) {



      Alert.alert(



        'Required',



        'Contact number is required.'



      );



      return;



    }







    if (adding) {



      return;



    }







    try {



      setAdding(true);







      const supplierData = {



        name: form.name.trim(),



        contact: form.contact.trim(),



        email: form.email.trim(),



        address: form.address.trim(),



        status: 'active',



      };







      console.log(



        'Adding supplier:',



        supplierData



      );







      await addSupplier(supplierData);







      await loadSuppliers();







      setForm({



        name: '',



        contact: '',



        email: '',



        address: '',



      });







      setShowAddForm(false);







      Alert.alert(



        'Success',



        `${supplierData.name} added successfully.`



      );



    } catch (error) {



      console.log(



        'Add supplier error:',



        error



      );







      Alert.alert(



        'Error',



        error?.message ||



          'Failed to add supplier.'



      );



    } finally {



      setAdding(false);



    }



  };







  // ============================



  // CONTACT



  // ============================







  const handleCall = (supplier) => {



    Alert.alert(



      'Contact Supplier',







      `${supplier.name || 'Supplier'}\n\n` +



        `Phone: ${supplier.contact || 'Not available'}\n` +



        `Email: ${



          supplier.email || 'No email provided'



        }`,







      [



        {



          text: 'Cancel',



          style: 'cancel',



        },



        {



          text: 'Call',



          onPress: () =>



            Alert.alert(



              'Calling...',



              supplier.contact ||



                'Contact number unavailable'



            ),



        },



      ]



    );



  };







  // ============================



  // REORDER



  // ============================







  const normalizeSupplierTokens = (value) => {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2);
  };

  const supplierTokenDistance = (a, b) => {
    if (a === b) return 0;
    if (!a || !b) return Math.max(a.length, b.length);

    const previous = Array.from(
      { length: b.length + 1 },
      (_, index) => index
    );

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];

      for (let j = 1; j <= b.length; j += 1) {
        const insertCost = current[j - 1] + 1;
        const deleteCost = previous[j] + 1;
        const replaceCost =
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);

        current[j] = Math.min(
          insertCost,
          deleteCost,
          replaceCost
        );
      }

      for (let j = 0; j < current.length; j += 1) {
        previous[j] = current[j];
      }
    }

    return previous[b.length];
  };

  const suppliersMatch = (supplierName, medicineSupplier) => {
    const left = String(supplierName || '').trim().toLowerCase();
    const right = String(medicineSupplier || '').trim().toLowerCase();

    if (!left || !right) return true;
    if (left === right) return true;

    const leftTokens = normalizeSupplierTokens(left);
    const rightTokens = normalizeSupplierTokens(right);

    // Exact word match.
    if (leftTokens.some((token) => rightTokens.includes(token))) {
      return true;
    }

    // Handle small spelling mistakes in supplier names.
    // Example: "Nelllai" vs "Nellai".
    return leftTokens.some((leftToken) =>
      rightTokens.some((rightToken) => {
        const maxLength = Math.max(
          leftToken.length,
          rightToken.length
        );

        if (maxLength < 4) return false;

        return (
          supplierTokenDistance(leftToken, rightToken) <= 1
        );
      })
    );
  };

  const handleReorder = async (supplier) => {
    try {
      const result = await getAIReorderSuggestions();

      const suggestions = Array.isArray(result)
        ? result
        : Array.isArray(result?.suggestions)
        ? result.suggestions
        : [];

      console.log('AI reorder suggestions:', suggestions);
      console.log('Selected supplier:', supplier?.name);

      const supplierSuggestions = suggestions.filter((item) =>
        suppliersMatch(supplier?.name, item?.supplier)
      );

      if (supplierSuggestions.length === 0) {
        Alert.alert(
          'No Reorder Needed',
          `There are currently no AI reorder suggestions for ${
            supplier?.name || 'this supplier'
          }.`
        );
        return;
      }

      const totalEstimate = supplierSuggestions.reduce(
        (total, item) => {
          const quantity = Number(item?.reorderQuantity) || 0;
          const price = Number(item?.purchasePrice) || 0;
          return total + quantity * price;
        },
        0
      );

      const suggestionText = supplierSuggestions
        .map(
          (item) =>
            `• ${item?.name || 'Medicine'} — ${
              Number(item?.reorderQuantity) || 0
            } units`
        )
        .join('\n');

      Alert.alert(
        'Place Reorder',
        `Place order with ${supplier?.name || 'this supplier'}?\n\n` +
          `AI Suggestions:\n${suggestionText}\n\n` +
          `Total Estimate: ₹${totalEstimate.toLocaleString('en-IN')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Order',
            onPress: async () => {
              try {
                let successCount = 0;

                for (const item of supplierSuggestions) {
                  const medicineId =
                    item?.medicineId ||
                    item?.medicine?._id ||
                    item?.medicine;

                  const quantity = Number(item?.reorderQuantity) || 0;
                  const priority = item?.priority || 'MEDIUM';

                  if (!medicineId || quantity <= 0) continue;

                  await createReorderOrder(
                    medicineId,
                    quantity,
                    priority
                  );

                  successCount += 1;
                }

                if (successCount === 0) {
                  Alert.alert(
                    'Order Failed',
                    'No valid reorder items were found.'
                  );
                  return;
                }

                await loadSuppliers();

                Alert.alert(
                  'Order Placed Successfully',
                  `${successCount} medicine order${
                    successCount > 1 ? 's' : ''
                  } placed with ${
                    supplier?.name || 'the supplier'
                  }.\n\nSupplier will deliver within 2-3 days.`
                );
              } catch (error) {
                console.log('Confirm reorder error:', error);
                Alert.alert(
                  'Order Failed',
                  error?.message || 'Failed to place reorder.'
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.log('Load AI reorder suggestions error:', error);
      Alert.alert(
        'Error',
        error?.message || 'Unable to load AI reorder suggestions.'
      );
    }
  };

  // HISTORY



  // ============================







  const handleHistory = async (supplier) => {
    try {
      const result = await getReorderHistory();

      const orders = Array.isArray(result)
        ? result
        : Array.isArray(result?.orders)
        ? result.orders
        : [];

      console.log('Reorder history response:', result);

      const supplierOrders = orders.filter((order) =>
        suppliersMatch(supplier?.name, order?.supplier)
      );

      if (supplierOrders.length === 0) {
        Alert.alert(
          'Order History',
          `${supplier?.name || 'Supplier'}\n\n` +
            'Last Order: No orders yet\n' +
            'Medicines: 0',
          [{ text: 'OK' }]
        );
        return;
      }

      const latestOrder = supplierOrders[0];
      const latestDate = latestOrder?.createdAt
        ? new Date(latestOrder.createdAt).toLocaleDateString('en-IN')
        : 'Unknown';

      const totalUnits = supplierOrders.reduce(
        (total, order) =>
          total + (Number(order?.quantity) || 0),
        0
      );

      Alert.alert(
        'Order History',
        `${supplier?.name || 'Supplier'}\n\n` +
          `Last Order: ${latestDate}\n` +
          `Orders: ${supplierOrders.length}\n` +
          `Units Ordered: ${totalUnits}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.log('Load reorder history error:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to load order history.'
      );
    }
  };

  return (



    <View style={styles.container}>







      {/* ============================



          HEADER



      ============================ */}







      <View style={styles.header}>







        <TouchableOpacity



          onPress={() => router.back()}



          style={styles.backButton}



          activeOpacity={0.8}



        >



          <Text style={styles.backArrow}>‹</Text>



          <Text style={styles.backText}>



            Back



          </Text>



        </TouchableOpacity>







        <View style={styles.headerCenter}>



          <Text style={styles.headerTitle}>



            Suppliers



          </Text>



          <Text style={styles.headerSubtitle}>



            Manage medicine suppliers



          </Text>



        </View>







        <TouchableOpacity



          onPress={() =>



            setShowAddForm(!showAddForm)



          }



          style={[



            styles.headerAddButton,



            showAddForm &&



              styles.headerAddButtonClose,



          ]}



          activeOpacity={0.8}



        >



          <Text



            style={[



              styles.headerAddText,



              showAddForm &&



                styles.headerAddTextClose,



            ]}



          >



            {showAddForm ? 'Close' : '+ Add'}



          </Text>



        </TouchableOpacity>







      </View>







      <ScrollView



        showsVerticalScrollIndicator={false}



        contentContainerStyle={



          styles.scrollContent



        }



      >







        {/* ============================



            ADD FORM



        ============================ */}







        {showAddForm && (



          <View style={styles.addCard}>







            <View style={styles.formHeader}>



              <View style={styles.formIcon}>



                <Text style={styles.formIconText}>



                  +



                </Text>



              </View>







              <View>



                <Text style={styles.formTitle}>



                  Add New Supplier



                </Text>







                <Text style={styles.formSubtitle}>



                  Enter supplier details



                </Text>



              </View>



            </View>







            <Text style={styles.label}>



              Supplier Name *



            </Text>







            <TextInput



              style={styles.input}



              placeholder="e.g. Chennai MediSupplies"



              placeholderTextColor="#9AA59F"



              value={form.name}



              onChangeText={(value) =>



                setForm({



                  ...form,



                  name: value,



                })



              }



            />







            <Text style={styles.label}>



              Contact Number *



            </Text>







            <TextInput



              style={styles.input}



              placeholder="e.g. 9876543210"



              placeholderTextColor="#9AA59F"



              value={form.contact}



              onChangeText={(value) =>



                setForm({



                  ...form,



                  contact: value,



                })



              }



              keyboardType="phone-pad"



            />







            <Text style={styles.label}>



              Email



            </Text>







            <TextInput



              style={styles.input}



              placeholder="supplier@email.com"



              placeholderTextColor="#9AA59F"



              value={form.email}



              onChangeText={(value) =>



                setForm({



                  ...form,



                  email: value,



                })



              }



              keyboardType="email-address"



              autoCapitalize="none"



            />







            <Text style={styles.label}>



              Address



            </Text>







            <TextInput



              style={[



                styles.input,



                styles.addressInput,



              ]}



              placeholder="Full supplier address"



              placeholderTextColor="#9AA59F"



              value={form.address}



              onChangeText={(value) =>



                setForm({



                  ...form,



                  address: value,



                })



              }



              multiline



              textAlignVertical="top"



            />







            <TouchableOpacity



              style={[



                styles.submitButton,



                adding &&



                  styles.submitButtonDisabled,



              ]}



              onPress={handleAdd}



              disabled={adding}



              activeOpacity={0.85}



            >



              {adding ? (



                <ActivityIndicator



                  size="small"



                  color={COLORS.white}



                />



              ) : (



                <Text style={styles.submitButtonText}>



                  Add Supplier



                </Text>



              )}



            </TouchableOpacity>







          </View>



        )}







        {/* ============================



            SEARCH



        ============================ */}







        <View style={styles.searchContainer}>







          <Text style={styles.searchIcon}>



            Search



          </Text>







          <TextInput



            style={styles.searchInput}



            placeholder="Search supplier, phone or email"



            placeholderTextColor="#9AA59F"



            value={search}



            onChangeText={setSearch}



          />







          {search !== '' && (



            <TouchableOpacity



              onPress={() => setSearch('')}



              style={styles.clearButton}



            >



              <Text style={styles.clearText}>



                ×



              </Text>



            </TouchableOpacity>



          )}







        </View>







        {/* ============================



            SUMMARY



        ============================ */}







        <View style={styles.summaryRow}>







          <SummaryCard



            value={totalSuppliers}



            label="Total"



            active



          />







          <SummaryCard



            value={activeSuppliers}



            label="Active"



          />







          <SummaryCard



            value={inactiveSuppliers}



            label="Inactive"



            muted



          />







        </View>







        {/* ============================



            SECTION TITLE



        ============================ */}







        <View style={styles.sectionHeader}>



          <Text style={styles.sectionTitle}>



            Suppliers



          </Text>







          <Text style={styles.resultCount}>



            {filtered.length} shown



          </Text>



        </View>







        {/* ============================



            LOADING



        ============================ */}







        {loading && (



          <View style={styles.emptyCard}>







            <ActivityIndicator



              size="small"



              color={COLORS.green}



            />







            <Text style={styles.emptyTitle}>



              Loading suppliers



            </Text>







            <Text style={styles.emptyText}>



              Please wait...



            </Text>







          </View>



        )}







        {/* ============================



            EMPTY



        ============================ */}







        {!loading &&



          filtered.length === 0 && (



            <View style={styles.emptyCard}>







              <View style={styles.emptyIcon}>



                <Text style={styles.emptyIconText}>



                  {search ? 'S' : '+'}



                </Text>



              </View>







              <Text style={styles.emptyTitle}>



                {search



                  ? 'No suppliers found'



                  : 'No suppliers yet'}



              </Text>







              <Text style={styles.emptyText}>



                {search



                  ? 'Try a different supplier name or contact number.'



                  : 'Add your first supplier using the Add button.'}



              </Text>







            </View>



          )}







        {/* ============================



            SUPPLIER CARDS



        ============================ */}







        {!loading &&



          filtered.map((supplier) => {







            const isActive =



              supplier.status === 'active';







            return (



              <View



                key={



                  supplier._id ||



                  supplier.id



                }



                style={styles.supplierCard}



              >







                {/* CARD HEADER */}







                <View style={styles.cardHeader}>







                  <View style={styles.supplierAvatar}>



                    <Text



                      style={



                        styles.supplierAvatarText



                      }



                    >



                      {String(



                        supplier.name || 'S'



                      )



                        .charAt(0)



                        .toUpperCase()}



                    </Text>



                  </View>







                  <View



                    style={styles.supplierMain}



                  >



                    <Text



                      style={styles.supplierName}



                      numberOfLines={1}



                    >



                      {supplier.name ||



                        'Unnamed Supplier'}



                    </Text>







                    <Text



                      style={styles.supplierContact}



                    >



                      {supplier.contact ||



                        'No contact number'}



                    </Text>



                  </View>







                  <View



                    style={[



                      styles.statusBadge,



                      isActive



                        ? styles.activeBadge



                        : styles.inactiveBadge,



                    ]}



                  >



                    <View



                      style={[



                        styles.statusDot,



                        {



                          backgroundColor:



                            isActive



                              ? COLORS.green



                              : COLORS.muted,



                        },



                      ]}



                    />







                    <Text



                      style={[



                        styles.statusText,



                        {



                          color: isActive



                            ? COLORS.green



                            : COLORS.muted,



                        },



                      ]}



                    >



                      {isActive



                        ? 'Active'



                        : 'Inactive'}



                    </Text>



                  </View>







                </View>







                {/* DETAILS */}







                <View style={styles.detailsBox}>







                  <View style={styles.detailRow}>



                    <Text



                      style={styles.detailLabel}



                    >



                      Email



                    </Text>







                    <Text



                      style={styles.detailValue}



                      numberOfLines={2}



                    >



                      {supplier.email ||



                        'No email provided'}



                    </Text>



                  </View>







                  <View style={styles.detailDivider} />







                  <View style={styles.detailRow}>



                    <Text



                      style={styles.detailLabel}



                    >



                      Address



                    </Text>







                    <Text



                      style={styles.detailValue}



                      numberOfLines={2}



                    >



                      {supplier.address ||



                        'No address provided'}



                    </Text>



                  </View>







                </View>







                {/* STATS */}







                <View style={styles.statsBox}>







                  <View style={styles.statItem}>



                    <Text



                      style={styles.statValue}



                    >



                      {supplier.medicines ?? 0}



                    </Text>







                    <Text



                      style={styles.statLabel}



                    >



                      Medicines



                    </Text>



                  </View>







                  <View style={styles.statDivider} />







                  <View style={styles.statItem}>



                    <Text



                      style={[



                        styles.statValue,



                        styles.lastOrderValue,



                      ]}



                      numberOfLines={1}



                    >



                      {supplier.lastOrder ||



                        'No orders'}



                    </Text>







                    <Text



                      style={styles.statLabel}



                    >



                      Last Order



                    </Text>



                  </View>







                </View>







                {/* ACTIONS */}







                <View style={styles.actionRow}>







                  <TouchableOpacity



                    style={styles.outlineAction}



                    onPress={() =>



                      handleCall(supplier)



                    }



                    activeOpacity={0.8}



                  >



                    <Text



                      style={



                        styles.outlineActionText



                      }



                    >



                      Contact



                    </Text>



                  </TouchableOpacity>







                  <TouchableOpacity



                    style={styles.primaryAction}



                    onPress={() =>



                      handleReorder(supplier)



                    }



                    activeOpacity={0.8}



                  >



                    <Text



                      style={



                        styles.primaryActionText



                      }



                    >



                      Reorder



                    </Text>



                  </TouchableOpacity>







                  <TouchableOpacity



                    style={styles.historyAction}



                    onPress={() =>



                      handleHistory(supplier)



                    }



                    activeOpacity={0.8}



                  >



                    <Text



                      style={



                        styles.historyActionText



                      }



                    >



                      History



                    </Text>



                  </TouchableOpacity>







                </View>







              </View>



            );



          })}







        <View style={styles.bottomSpace} />







      </ScrollView>







    </View>



  );



}











/* =========================================



   SUMMARY CARD



\========================================= */







function SummaryCard({



  value,



  label,



  active,



  muted,



}) {



  return (



    <View



      style={[



        styles.summaryCard,



        active && styles.summaryCardActive,



        muted && styles.summaryCardMuted,



      ]}



    >



      <Text



        style={[



          styles.summaryValue,



          active && {



            color: COLORS.green,



          },



          muted && {



            color: COLORS.muted,



          },



        ]}



      >



        {value}



      </Text>







      <Text style={styles.summaryLabel}>



        {label}



      </Text>



    </View>



  );



}











/* =========================================



   STYLES



\========================================= */







const styles = StyleSheet.create({







  container: {



    flex: 1,



    backgroundColor: COLORS.background,



  },







  scrollContent: {



    paddingHorizontal: 16,



    paddingBottom: 30,



  },







  /* HEADER */







  header: {



    minHeight: 78,







    paddingHorizontal: 16,



    paddingTop: 12,



    paddingBottom: 12,







    backgroundColor: COLORS.white,







    flexDirection: 'row',



    alignItems: 'center',







    borderBottomWidth: 1,



    borderBottomColor: COLORS.border,



  },







  backButton: {



    width: 72,







    flexDirection: 'row',



    alignItems: 'center',



  },







  backArrow: {



    fontSize: 32,



    lineHeight: 32,







    color: COLORS.green,







    fontWeight: '300',







    marginRight: 3,



  },







  backText: {



    fontSize: 13,



    color: COLORS.green,



    fontWeight: '700',



  },







  headerCenter: {



    flex: 1,



    alignItems: 'center',



  },







  headerTitle: {



    fontSize: 17,



    fontWeight: '800',



    color: COLORS.text,



  },







  headerSubtitle: {



    fontSize: 10,



    color: COLORS.muted,



    marginTop: 2,



  },







  headerAddButton: {



    minWidth: 58,



    height: 34,







    paddingHorizontal: 10,







    borderRadius: 9,







    backgroundColor: COLORS.greenLight,







    borderWidth: 1,



    borderColor: COLORS.greenBorder,







    alignItems: 'center',



    justifyContent: 'center',



  },







  headerAddButtonClose: {



    backgroundColor: COLORS.redLight,



    borderColor: '#F1C5C0',



  },







  headerAddText: {



    color: COLORS.green,



    fontSize: 12,



    fontWeight: '800',



  },







  headerAddTextClose: {



    color: COLORS.red,



  },







  /* ADD FORM */







  addCard: {



    backgroundColor: COLORS.white,







    borderRadius: 16,







    padding: 18,







    marginTop: 16,



    marginBottom: 16,







    borderWidth: 1,



    borderColor: COLORS.greenBorder,







    shadowColor: '#000',



    shadowOpacity: 0.04,



    shadowRadius: 8,



    elevation: 2,



  },







  formHeader: {



    flexDirection: 'row',



    alignItems: 'center',







    marginBottom: 20,



  },







  formIcon: {



    width: 42,



    height: 42,







    borderRadius: 12,







    backgroundColor: COLORS.greenLight,







    alignItems: 'center',



    justifyContent: 'center',







    marginRight: 11,



  },







  formIconText: {



    color: COLORS.green,



    fontSize: 24,



    fontWeight: '400',



  },







  formTitle: {



    fontSize: 16,



    fontWeight: '800',



    color: COLORS.text,



  },







  formSubtitle: {



    fontSize: 11,



    color: COLORS.muted,



    marginTop: 2,



  },







  label: {



    fontSize: 12,



    fontWeight: '700',



    color: COLORS.text,







    marginBottom: 7,



  },







  input: {



    minHeight: 48,







    backgroundColor: COLORS.background,







    borderWidth: 1,



    borderColor: COLORS.border,







    borderRadius: 10,







    paddingHorizontal: 13,







    fontSize: 13,



    color: COLORS.text,







    marginBottom: 14,



  },







  addressInput: {



    height: 82,



    paddingTop: 13,



    paddingBottom: 13,



  },







  submitButton: {



    minHeight: 50,







    borderRadius: 10,







    backgroundColor: COLORS.green,







    alignItems: 'center',



    justifyContent: 'center',







    marginTop: 2,



  },







  submitButtonDisabled: {



    opacity: 0.65,



  },







  submitButtonText: {



    color: COLORS.white,







    fontSize: 14,



    fontWeight: '800',



  },







  /* SEARCH */







  searchContainer: {



    minHeight: 48,







    backgroundColor: COLORS.white,







    borderWidth: 1,



    borderColor: COLORS.border,







    borderRadius: 11,







    flexDirection: 'row',



    alignItems: 'center',







    paddingHorizontal: 13,







    marginTop: 16,



    marginBottom: 14,



  },







  searchIcon: {



    color: COLORS.green,







    fontSize: 10,



    fontWeight: '800',







    marginRight: 9,







    letterSpacing: 0.4,



  },







  searchInput: {



    flex: 1,







    fontSize: 13,



    color: COLORS.text,







    paddingVertical: 0,



  },







  clearButton: {



    width: 28,



    height: 28,







    alignItems: 'center',



    justifyContent: 'center',



  },







  clearText: {



    fontSize: 22,



    color: COLORS.muted,



    fontWeight: '300',



  },







  /* SUMMARY */







  summaryRow: {



    flexDirection: 'row',







    gap: 10,







    marginBottom: 18,



  },







  summaryCard: {



    flex: 1,







    minHeight: 74,







    backgroundColor: COLORS.white,







    borderRadius: 12,







    borderWidth: 1,



    borderColor: COLORS.border,







    alignItems: 'center',



    justifyContent: 'center',







    paddingVertical: 10,



  },







  summaryCardActive: {



    borderColor: COLORS.greenBorder,



    backgroundColor: COLORS.greenLight,



  },







  summaryCardMuted: {



    backgroundColor: '#F2F4F3',



  },







  summaryValue: {



    fontSize: 21,



    fontWeight: '800',







    color: COLORS.text,







    marginBottom: 3,



  },







  summaryLabel: {



    fontSize: 10,



    color: COLORS.muted,



    fontWeight: '600',



  },







  /* SECTION */







  sectionHeader: {



    flexDirection: 'row',



    alignItems: 'center',



    justifyContent: 'space-between',







    marginBottom: 10,



  },







  sectionTitle: {



    fontSize: 15,



    fontWeight: '800',



    color: COLORS.text,



  },







  resultCount: {



    fontSize: 11,



    color: COLORS.muted,



  },







  /* EMPTY */







  emptyCard: {



    backgroundColor: COLORS.white,







    borderRadius: 16,







    padding: 30,







    alignItems: 'center',







    borderWidth: 1,



    borderColor: COLORS.border,



  },







  emptyIcon: {



    width: 50,



    height: 50,







    borderRadius: 25,







    backgroundColor: COLORS.greenLight,







    alignItems: 'center',



    justifyContent: 'center',







    marginBottom: 12,



  },







  emptyIconText: {



    color: COLORS.green,



    fontSize: 21,



    fontWeight: '800',



  },







  emptyTitle: {



    fontSize: 16,



    fontWeight: '800',



    color: COLORS.text,







    marginBottom: 5,



  },







  emptyText: {



    fontSize: 12,



    color: COLORS.muted,







    textAlign: 'center',







    lineHeight: 19,



  },







  /* SUPPLIER CARD */







  supplierCard: {



    backgroundColor: COLORS.white,







    borderRadius: 16,







    padding: 16,







    marginBottom: 14,







    borderWidth: 1,



    borderColor: COLORS.border,







    shadowColor: '#000',



    shadowOpacity: 0.035,



    shadowRadius: 8,



    elevation: 2,



  },







  cardHeader: {



    flexDirection: 'row',



    alignItems: 'center',







    marginBottom: 14,



  },







  supplierAvatar: {



    width: 46,



    height: 46,







    borderRadius: 13,







    backgroundColor: COLORS.greenLight,







    alignItems: 'center',



    justifyContent: 'center',







    marginRight: 11,



  },







  supplierAvatarText: {



    fontSize: 17,



    fontWeight: '800',



    color: COLORS.green,



  },







  supplierMain: {



    flex: 1,



  },







  supplierName: {



    fontSize: 15,



    fontWeight: '800',



    color: COLORS.text,



  },







  supplierContact: {



    fontSize: 11,



    color: COLORS.muted,







    marginTop: 3,



  },







  statusBadge: {



    flexDirection: 'row',



    alignItems: 'center',







    borderRadius: 20,







    paddingHorizontal: 8,



    paddingVertical: 5,







    borderWidth: 1,



  },







  activeBadge: {



    backgroundColor: COLORS.greenLight,



    borderColor: COLORS.greenBorder,



  },







  inactiveBadge: {



    backgroundColor: '#F3F5F4',



    borderColor: COLORS.border,



  },







  statusDot: {



    width: 6,



    height: 6,







    borderRadius: 3,







    marginRight: 5,



  },







  statusText: {



    fontSize: 9,



    fontWeight: '800',



  },







  /* DETAILS */







  detailsBox: {



    backgroundColor: COLORS.background,







    borderRadius: 11,







    paddingHorizontal: 12,



    paddingVertical: 3,







    marginBottom: 12,



  },







  detailRow: {



    flexDirection: 'row',







    paddingVertical: 10,



  },







  detailLabel: {



    width: 58,







    fontSize: 10,



    fontWeight: '700',







    color: COLORS.muted,



  },







  detailValue: {



    flex: 1,







    fontSize: 11,



    color: COLORS.text,







    lineHeight: 16,



  },







  detailDivider: {



    height: 1,



    backgroundColor: COLORS.border,



  },







  /* STATS */







  statsBox: {



    flexDirection: 'row',







    backgroundColor: COLORS.background,







    borderRadius: 11,







    minHeight: 62,







    alignItems: 'center',







    marginBottom: 12,



  },







  statItem: {



    flex: 1,







    alignItems: 'center',



    justifyContent: 'center',







    paddingHorizontal: 8,



  },







  statDivider: {



    width: 1,



    height: 30,







    backgroundColor: COLORS.border,



  },







  statValue: {



    fontSize: 15,



    fontWeight: '800',







    color: COLORS.green,







    marginBottom: 3,



  },







  lastOrderValue: {



    fontSize: 11,



    color: COLORS.text,



  },







  statLabel: {



    fontSize: 9,



    color: COLORS.muted,



    fontWeight: '600',



  },







  /* ACTIONS */







  actionRow: {



    flexDirection: 'row',







    gap: 7,



  },







  outlineAction: {



    flex: 1,







    minHeight: 40,







    borderRadius: 9,







    backgroundColor: COLORS.greenLight,







    borderWidth: 1,



    borderColor: COLORS.greenBorder,







    alignItems: 'center',



    justifyContent: 'center',



  },







  outlineActionText: {



    fontSize: 11,



    fontWeight: '700',



    color: COLORS.green,



  },







  primaryAction: {



    flex: 1,







    minHeight: 40,







    borderRadius: 9,







    backgroundColor: COLORS.green,







    alignItems: 'center',



    justifyContent: 'center',



  },







  primaryActionText: {



    fontSize: 11,



    fontWeight: '700',



    color: COLORS.white,



  },







  historyAction: {



    flex: 1,







    minHeight: 40,







    borderRadius: 9,







    backgroundColor: COLORS.white,







    borderWidth: 1,



    borderColor: COLORS.border,







    alignItems: 'center',



    justifyContent: 'center',



  },







  historyActionText: {



    fontSize: 11,



    fontWeight: '700',



    color: COLORS.muted,



  },







  bottomSpace: {



    height: 30,



  },







});