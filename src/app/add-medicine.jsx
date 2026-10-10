import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  addMedicine,
  getMedicine,
  updateMedicine,
} from '../services/api';

import {
  extractMedicineDetails,
  pickMedicineImage,
  takePhoto,
} from '../services/ocr';


const COLORS = {
  primary: '#176B52',
  primaryDark: '#11523F',
  primaryLight: '#EAF5F0',

  background: '#F6F8F7',
  white: '#FFFFFF',

  text: '#17221E',
  textSecondary: '#64736C',
  textLight: '#94A39C',

  border: '#E1E8E4',
  inputBg: '#FAFCFB',

  success: '#176B52',
  successBg: '#EAF5F0',

  warning: '#B7791F',
  warningBg: '#FFF7E6',

  danger: '#C53B3B',
  dangerBg: '#FFF0F0',
};


export default function AddMedicine() {

  const router = useRouter();

  const params = useLocalSearchParams();

  const editId =
    params.id ||
    params.medicineId ||
    null;

  const isEditMode = !!editId;


  // =====================================================
  // STATES
  // =====================================================

  const [loading, setLoading] =
    useState(false);

  const [ocrLoading, setOcrLoading] =
    useState(false);

  const [ocrImage, setOcrImage] =
    useState(null);

  const [ocrResult, setOcrResult] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [msgType, setMsgType] =
    useState('');

  const [selectedCategory, setSelectedCategory] =
    useState('');


  // =====================================================
  // FORM
  // =====================================================

  const [form, setForm] = useState({

    name: '',
    brand: '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    supplier: '',

    // Barcode
    barcode: '',

    // Storage Location
    rackNumber: '',
    shelfNumber: '',
    boxNumber: '',

  });


  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = [

    'Painkiller',
    'Antibiotic',
    'Vitamin',
    'Antacid',
    'Cough Syrup',
    'Other',

  ];


  // =====================================================
  // MESSAGE
  // =====================================================

  const showMsg = (text, type) => {

    setMessage(text);
    setMsgType(type);

    setTimeout(() => {
      setMessage('');
    }, 4000);

  };


  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (
    key,
    value
  ) => {

    setForm((prev) => ({

      ...prev,
      [key]: value,

    }));

  };


  // =====================================================
  // NORMALIZE EXPIRY
  // =====================================================

  const normalizeExpiry = (value) => {

    if (!value) {
      return null;
    }

    let clean =
      String(value).trim();

    clean =
      clean.replace(/-/g, '/');

    clean =
      clean.replace(/\s/g, '');

    const parts =
      clean.split('/');

    if (parts.length !== 2) {
      return null;
    }

    const month =
      parts[0];

    const year =
      parts[1];

    const monthNumber =
      parseInt(month, 10);

    const yearNumber =
      parseInt(year, 10);

    if (
      isNaN(monthNumber) ||
      isNaN(yearNumber)
    ) {
      return null;
    }

    if (
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return null;
    }

    if (year.length !== 4) {
      return null;
    }

    const formattedMonth =
      String(monthNumber)
        .padStart(2, '0');

    return {

      display:
        `${formattedMonth}/${yearNumber}`,

      date:
        new Date(
          yearNumber,
          monthNumber - 1,
          1
        ),

    };

  };


  // =====================================================
  // CONVERT DATABASE DATE TO MM/YYYY
  // =====================================================

  const formatExpiryDate = (value) => {

    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      isNaN(date.getTime())
    ) {
      return '';
    }

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const year =
      date.getFullYear();

    return `${month}/${year}`;

  };


  // =====================================================
  // LOAD MEDICINE FOR EDIT
  // =====================================================

  useEffect(() => {

    if (!editId) {
      return;
    }

    const loadMedicine = async () => {

      setLoading(true);

      try {

        console.log('EDIT MODE');
        console.log('Medicine ID:', editId);

        const result =
          await getMedicine(editId);

        const medicine =
          result?.medicine ||
          result;

        if (!medicine) {

          showMsg(
            'Medicine not found',
            'error'
          );

          return;
        }

        setForm({

          name:
            medicine.name || '',

          brand:
            medicine.brand || '',

          batchNumber:
            medicine.batchNumber || '',

          mfgDate:
            medicine.mfgDate || '',

          expiryDate:
            formatExpiryDate(
              medicine.expiryDate
            ),

          quantity:
            medicine.quantity !== undefined &&
            medicine.quantity !== null
              ? String(medicine.quantity)
              : '',

          purchasePrice:
            medicine.purchasePrice !== undefined &&
            medicine.purchasePrice !== null
              ? String(medicine.purchasePrice)
              : '',

          sellingPrice:
            medicine.sellingPrice !== undefined &&
            medicine.sellingPrice !== null
              ? String(medicine.sellingPrice)
              : '',

          supplier:
            medicine.supplier || '',

          // Barcode
          barcode:
            medicine.barcode || '',

          // Storage Location
          rackNumber:
            medicine.rackNumber || '',

          shelfNumber:
            medicine.shelfNumber || '',

          boxNumber:
            medicine.boxNumber || '',

        });

        setSelectedCategory(
          medicine.category || ''
        );

      } catch (err) {

        console.log(
          'Load medicine error:',
          err
        );

        showMsg(
          'Failed to load medicine details',
          'error'
        );

      } finally {

        setLoading(false);

      }

    };


    loadMedicine();

  }, [editId]);


  // =====================================================
  // AUTO-FILL BARCODE SCANNER DATA
  // =====================================================

  useEffect(() => {
    // Never overwrite an existing medicine while editing.
    if (editId) {
      return;
    }

    const getParam = (value) => {
      if (Array.isArray(value)) {
        return value[0] || '';
      }

      return value || '';
    };

    const scannedName = getParam(params.name);
    const scannedBrand = getParam(params.brand);
    const scannedCategory = getParam(params.category);
    const scannedBarcode = getParam(params.barcode);

    if (
      !scannedName &&
      !scannedBrand &&
      !scannedCategory &&
      !scannedBarcode
    ) {
      return;
    }

    console.log('BARCODE SCANNER DATA:', {
      name: scannedName,
      brand: scannedBrand,
      category: scannedCategory,
      barcode: scannedBarcode,
    });

    setForm((prev) => ({
      ...prev,
      name: scannedName || prev.name,
      brand: scannedBrand || prev.brand,
      barcode: scannedBarcode || prev.barcode,
    }));

    if (scannedCategory) {
      setSelectedCategory(scannedCategory);
    }

    showMsg(
      'Barcode medicine details filled automatically.',
      'success'
    );
  }, [
    editId,
    params.name,
    params.brand,
    params.category,
    params.barcode,
  ]);


  // =====================================================
  // AUTO-FILL OCR DATA
  // =====================================================

  const fillOCRData = (result) => {

    console.log(
      'AUTO FILLING OCR DATA',
      result
    );


    // NAME
    if (result.medicineName) {

      handleChange(
        'name',
        result.medicineName
      );

    }


    // BRAND
    let detectedBrand =
      result.brandName || '';


    if (
      !detectedBrand &&
      result.medicineName &&
      result.medicineName
        .toUpperCase()
        .includes('MOXIKLAV')
    ) {

      detectedBrand =
        'Alkem';

    }


    if (detectedBrand) {

      handleChange(
        'brand',
        detectedBrand
      );

    }


    // CATEGORY
    if (result.category) {

      setSelectedCategory(
        result.category
      );

    }


    // BATCH
    if (result.batchNumber) {

      handleChange(
        'batchNumber',
        result.batchNumber
      );

    }


    // MFG
    if (result.mfgDate) {

      handleChange(
        'mfgDate',
        result.mfgDate
      );

    }


    // EXPIRY
    if (result.expiryDate) {

      const normalized =
        normalizeExpiry(
          result.expiryDate
        );

      if (normalized) {

        handleChange(
          'expiryDate',
          normalized.display
        );

      }

    }

  };


  // =====================================================
  // HANDLE OCR RESULT
  // =====================================================

  const processOCRResult = (result) => {

    console.log(
      'COMPLETE OCR RESULT:',
      result
    );

    fillOCRData(result);

    const filledFields = [];


    if (result.medicineName) {
      filledFields.push('Name');
    }

    if (result.brandName) {

      filledFields.push('Brand');

    } else if (
      result.medicineName &&
      result.medicineName
        .toUpperCase()
        .includes('MOXIKLAV')
    ) {

      filledFields.push('Brand');

    }

    if (result.category) {
      filledFields.push('Category');
    }

    if (result.batchNumber) {
      filledFields.push('Batch');
    }

    if (result.mfgDate) {
      filledFields.push('Mfg');
    }

    if (result.expiryDate) {
      filledFields.push('Expiry');
    }


    if (filledFields.length > 0) {

      setOcrResult(
        `OCR completed • Auto-filled: ${filledFields.join(', ')}`
      );

      showMsg(
        'Medicine details detected and filled automatically.',
        'success'
      );

    } else {

      setOcrResult(
        `Could not detect medicine details.\n${
          result.rawText?.substring(0, 200) ||
          'No text found'
        }`
      );

      showMsg(
        'Could not read medicine details. Please enter manually.',
        'warning'
      );

    }

  };


  // =====================================================
  // HANDLE OCR UPLOAD
  // =====================================================

  const handleOCRUpload = async () => {

    if (
      ocrLoading ||
      loading
    ) {
      return;
    }

    setOcrLoading(true);
    setOcrResult('');

    try {

      const imageUri =
        await pickMedicineImage();

      if (!imageUri) {

        setOcrLoading(false);
        return;

      }

      setOcrImage(imageUri);

      setOcrResult(
        'Reading medicine box...'
      );

      const result =
        await extractMedicineDetails(
          imageUri
        );

      processOCRResult(result);

    } catch (err) {

      console.log(
        'OCR Upload Error:',
        err
      );

      setOcrResult(
        'OCR failed. Please try again.'
      );

      showMsg(
        'OCR failed. Please try again.',
        'error'
      );

    } finally {

      setOcrLoading(false);

    }

  };


  // =====================================================
  // HANDLE CAMERA OCR
  // =====================================================

  const handleOCRCamera = async () => {

    if (
      ocrLoading ||
      loading
    ) {
      return;
    }

    setOcrLoading(true);
    setOcrResult('');

    try {

      const imageUri =
        await takePhoto();

      if (!imageUri) {

        setOcrLoading(false);
        return;

      }

      setOcrImage(imageUri);

      setOcrResult(
        'Reading medicine box from camera...'
      );

      const result =
        await extractMedicineDetails(
          imageUri
        );

      processOCRResult(result);

    } catch (err) {

      console.log(
        'Camera OCR Error:',
        err
      );

      setOcrResult(
        'Camera OCR failed. Please try again.'
      );

      showMsg(
        'Camera OCR failed. Please try again.',
        'error'
      );

    } finally {

      setOcrLoading(false);

    }

  };


  // =====================================================
  // SUBMIT MEDICINE
  // =====================================================

  const handleSubmit = async () => {

    // REQUIRED FIELDS
    if (
      !form.name.trim() ||
      !form.batchNumber.trim() ||
      !form.expiryDate.trim() ||
      !form.quantity.trim()
    ) {

      showMsg(
        'Fill Name, Batch No, Expiry Date and Quantity.',
        'error'
      );

      return;

    }


    // NORMALIZE EXPIRY
    const normalizedExpiry =
      normalizeExpiry(
        form.expiryDate
      );


    if (!normalizedExpiry) {

      showMsg(
        'Enter expiry as MM/YYYY (e.g. 01/2027).',
        'error'
      );

      return;

    }


    // QUANTITY
    const quantity =
      parseInt(
        form.quantity,
        10
      );


    if (
      isNaN(quantity) ||
      quantity <= 0
    ) {

      showMsg(
        'Quantity must be greater than 0.',
        'error'
      );

      return;

    }


    // PRICE
    const purchasePrice =
      parseFloat(
        form.purchasePrice
      ) || 0;

    const sellingPrice =
      parseFloat(
        form.sellingPrice
      ) || 0;


    setLoading(true);


    try {

      const expiryDate =
        normalizedExpiry.date;


      const medicineData = {

        name:
          form.name.trim(),

        brand:
          form.brand.trim(),

        category:
          selectedCategory || 'Other',

        batchNumber:
          form.batchNumber.trim(),

        mfgDate:
          form.mfgDate.trim(),

        expiryDate:
          expiryDate,

        quantity:
          quantity,

        purchasePrice:
          purchasePrice,

        sellingPrice:
          sellingPrice,

        supplier:
          form.supplier.trim(),

        // Barcode
        barcode:
          form.barcode.trim(),

        // Storage Location
        rackNumber:
          form.rackNumber.trim(),

        shelfNumber:
          form.shelfNumber.trim(),

        boxNumber:
          form.boxNumber.trim(),

      };


      console.log(
        'Sending medicine:',
        medicineData
      );


      let result;


      if (isEditMode) {

        result =
          await updateMedicine(
            editId,
            medicineData
          );

      } else {

        result =
          await addMedicine(
            medicineData
          );

      }


      const success =
        result &&
        (
          result.medicine ||
          result.success === true ||
          (
            result.message &&
            (
              result.message
                .toLowerCase()
                .includes('added') ||

              result.message
                .toLowerCase()
                .includes('updated') ||

              result.message
                .toLowerCase()
                .includes('success')
            )
          )
        );


      if (success) {

        showMsg(

          isEditMode
            ? `${form.name} updated successfully.`
            : `${form.name} added successfully.`,

          'success'

        );


        setTimeout(() => {

          router.replace(
            '/medicines'
          );

        }, 1000);


      } else {

        showMsg(

          result?.message ||

          (
            isEditMode
              ? 'Failed to update medicine.'
              : 'Failed to add medicine.'
          ),

          'error'

        );

      }


    } catch (err) {

      console.log(
        'Submit medicine error:',
        err
      );

      showMsg(
        'Cannot connect to server.',
        'error'
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // UI
  // =====================================================

  return (

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >

      {/* HEADER */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
          activeOpacity={0.7}
        >

          <Text style={styles.backIcon}>
            ‹
          </Text>

          <Text style={styles.backText}>
            Back
          </Text>

        </TouchableOpacity>


        <View style={styles.headerCenter}>

          <View style={styles.headerIcon}>

            <Text style={styles.headerIconText}>
              {isEditMode ? '✎' : '+'}
            </Text>

          </View>

          <View>

            <Text style={styles.headerTitle}>
              {isEditMode
                ? 'Edit Medicine'
                : 'Add Medicine'}
            </Text>

            <Text style={styles.headerSubtitle}>
              {isEditMode
                ? 'Update medicine details'
                : 'Add a new medicine to stock'}
            </Text>

          </View>

        </View>


        <View style={styles.headerSpacer} />

      </View>


      {/* MESSAGE */}

      {message !== '' && (

        <View
          style={[
            styles.messageBanner,

            msgType === 'success'
              ? styles.messageSuccess

              : msgType === 'warning'
              ? styles.messageWarning

              : styles.messageError,

          ]}
        >

          <View style={styles.messageDot} />

          <Text style={styles.messageText}>
            {message}
          </Text>

        </View>

      )}


      {/* SMART SCAN */}

      <View style={styles.scanCard}>

        <View style={styles.scanHeader}>

          <View style={styles.scanIconBox}>

            <Text style={styles.scanIcon}>
              AI
            </Text>

          </View>

          <View style={styles.scanHeaderText}>

            <Text style={styles.scanTitle}>
              Smart Scan
            </Text>

            <Text style={styles.scanSubtitle}>
              Automatically read details from the medicine box
            </Text>

          </View>

        </View>


        <View style={styles.scanButtons}>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleOCRUpload}
            disabled={
              ocrLoading ||
              loading
            }
            activeOpacity={0.8}
          >

            {ocrLoading ? (

              <ActivityIndicator
                color={COLORS.primary}
                size="small"
              />

            ) : (

              <Text style={styles.scanButtonIcon}>
                □
              </Text>

            )}

            <Text style={styles.scanButtonText}>
              Upload Photo
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleOCRCamera}
            disabled={
              ocrLoading ||
              loading
            }
            activeOpacity={0.8}
          >

            <Text style={styles.scanButtonIcon}>
              ○
            </Text>

            <Text style={styles.scanButtonText}>
              Camera
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            style={styles.scanButton}
            onPress={() =>
              router.push('/scan')
            }
            disabled={
              ocrLoading ||
              loading
            }
            activeOpacity={0.8}
          >

            <Text style={styles.scanButtonIcon}>
              ▦
            </Text>

            <Text style={styles.scanButtonText}>
              Barcode
            </Text>

          </TouchableOpacity>

        </View>


        {ocrLoading && (

          <View style={styles.ocrLoading}>

            <ActivityIndicator
              color={COLORS.primary}
              size="small"
            />

            <View style={styles.ocrLoadingTextBox}>

              <Text style={styles.ocrLoadingTitle}>
                Reading medicine details
              </Text>

              <Text style={styles.ocrLoadingSubtitle}>
                Please wait...
              </Text>

            </View>

          </View>

        )}


        {ocrImage &&
          !ocrLoading && (

          <View style={styles.ocrPreview}>

            <Image
              source={{
                uri: ocrImage,
              }}
              style={styles.ocrImage}
              resizeMode="cover"
            />


            {ocrResult !== '' && (

              <View style={styles.ocrResultBox}>

                <View
                  style={[
                    styles.resultIndicator,

                    ocrResult.includes('completed')
                      ? styles.resultSuccess

                      : ocrResult.includes('Could')
                      ? styles.resultWarning

                      : styles.resultError,

                  ]}
                />

                <Text style={styles.ocrResultText}>
                  {ocrResult}
                </Text>

              </View>

            )}

          </View>

        )}

      </View>


      {/* MANUAL DIVIDER */}

      <View style={styles.dividerRow}>

        <View style={styles.divider} />

        <Text style={styles.dividerText}>
          MEDICINE INFORMATION
        </Text>

        <View style={styles.divider} />

      </View>


      {/* MEDICINE DETAILS */}

      <View style={styles.card}>

        <View style={styles.sectionHeader}>

          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>
              01
            </Text>
          </View>

          <View>

            <Text style={styles.sectionTitle}>
              Medicine Details
            </Text>

            <Text style={styles.sectionSubtitle}>
              Basic information about the medicine
            </Text>

          </View>

        </View>


        {/* NAME */}

        <FieldLabel
          label="Medicine Name"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="e.g. Dolo 650mg"
          placeholderTextColor={COLORS.textLight}
          value={form.name}
          onChangeText={(v) =>
            handleChange(
              'name',
              v
            )
          }
          editable={!loading}
        />


        {/* BRAND */}

        <FieldLabel label="Brand Name" />

        <TextInput
          style={styles.input}
          placeholder="e.g. Micro Labs"
          placeholderTextColor={COLORS.textLight}
          value={form.brand}
          onChangeText={(v) =>
            handleChange(
              'brand',
              v
            )
          }
          editable={!loading}
        />


        {/* CATEGORY */}

        <FieldLabel label="Category" />

        <View style={styles.categoryRow}>

          {categories.map((cat) => (

            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,

                selectedCategory === cat &&
                  styles.categoryChipActive,

              ]}
              onPress={() =>
                setSelectedCategory(cat)
              }
              disabled={loading}
              activeOpacity={0.7}
            >

              <Text
                style={[
                  styles.categoryText,

                  selectedCategory === cat &&
                    styles.categoryTextActive,

                ]}
              >
                {cat}
              </Text>

            </TouchableOpacity>

          ))}

        </View>


        {/* BARCODE */}

        <FieldLabel label="Barcode" />

        <TextInput
          style={styles.input}
          placeholder="e.g. 8901234567890"
          placeholderTextColor={COLORS.textLight}
          value={form.barcode}
          onChangeText={(v) =>
            handleChange(
              'barcode',
              v
            )
          }
          keyboardType="numeric"
          editable={!loading}
        />


        {/* BATCH */}

        <FieldLabel
          label="Batch Number"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="e.g. BT2024-0892"
          placeholderTextColor={COLORS.textLight}
          value={form.batchNumber}
          onChangeText={(v) =>
            handleChange(
              'batchNumber',
              v
            )
          }
          editable={!loading}
        />


        {/* DATES */}

        <View style={styles.row}>

          <View style={styles.half}>

            <FieldLabel label="Mfg Date" />

            <TextInput
              style={styles.input}
              placeholder="MM/YYYY"
              placeholderTextColor={COLORS.textLight}
              value={form.mfgDate}
              onChangeText={(v) =>
                handleChange(
                  'mfgDate',
                  v
                )
              }
              editable={!loading}
            />

          </View>


          <View style={styles.half}>

            <FieldLabel
              label="Expiry Date"
              required
            />

            <TextInput
              style={[
                styles.input,

                form.expiryDate !== '' &&
                  styles.expiryInput,

              ]}
              placeholder="MM/YYYY"
              placeholderTextColor={COLORS.textLight}
              value={form.expiryDate}
              onChangeText={(v) =>
                handleChange(
                  'expiryDate',
                  v
                )
              }
              editable={!loading}
              keyboardType="numbers-and-punctuation"
            />

          </View>

        </View>


        {form.expiryDate !== '' && (

          <View style={styles.expiryInfo}>

            <View style={styles.expiryDot} />

            <Text style={styles.expiryInfoText}>
              Expiry: {form.expiryDate}
            </Text>

          </View>

        )}

      </View>


      {/* STOCK DETAILS */}

      <View style={styles.card}>

        <View style={styles.sectionHeader}>

          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>
              02
            </Text>
          </View>

          <View>

            <Text style={styles.sectionTitle}>
              Stock & Pricing
            </Text>

            <Text style={styles.sectionSubtitle}>
              Quantity and medicine pricing
            </Text>

          </View>

        </View>


        <FieldLabel
          label="Quantity"
          required
        />

        <TextInput
          style={styles.input}
          placeholder="e.g. 100"
          placeholderTextColor={COLORS.textLight}
          value={form.quantity}
          onChangeText={(v) =>
            handleChange(
              'quantity',
              v
            )
          }
          keyboardType="numeric"
          editable={!loading}
        />


        <View style={styles.row}>

          <View style={styles.half}>

            <FieldLabel label="Purchase Price" />

            <View style={styles.priceInputWrapper}>

              <Text style={styles.currency}>
                ₹
              </Text>

              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textLight}
                value={form.purchasePrice}
                onChangeText={(v) =>
                  handleChange(
                    'purchasePrice',
                    v
                  )
                }
                keyboardType="numeric"
                editable={!loading}
              />

            </View>

          </View>


          <View style={styles.half}>

            <FieldLabel label="Selling Price" />

            <View style={styles.priceInputWrapper}>

              <Text style={styles.currency}>
                ₹
              </Text>

              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textLight}
                value={form.sellingPrice}
                onChangeText={(v) =>
                  handleChange(
                    'sellingPrice',
                    v
                  )
                }
                keyboardType="numeric"
                editable={!loading}
              />

            </View>

          </View>

        </View>

      </View>


      {/* SUPPLIER */}

      <View style={styles.card}>

        <View style={styles.sectionHeader}>

          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>
              03
            </Text>
          </View>

          <View>

            <Text style={styles.sectionTitle}>
              Supplier Details
            </Text>

            <Text style={styles.sectionSubtitle}>
              Supplier information
            </Text>

          </View>

        </View>


        <FieldLabel label="Supplier Name" />

        <TextInput
          style={styles.input}
          placeholder="e.g. Chennai MediSupplies"
          placeholderTextColor={COLORS.textLight}
          value={form.supplier}
          onChangeText={(v) =>
            handleChange(
              'supplier',
              v
            )
          }
          editable={!loading}
        />

      </View>


      {/* PHYSICAL STORAGE LOCATION */}

      <View style={styles.card}>

        <View style={styles.sectionHeader}>

          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>
              04
            </Text>
          </View>

          <View>

            <Text style={styles.sectionTitle}>
              Storage Location
            </Text>

            <Text style={styles.sectionSubtitle}>
              Physical location of the medicine
            </Text>

          </View>

        </View>


        {/* RACK NUMBER */}

        <FieldLabel label="Rack Number" />

        <TextInput
          style={styles.input}
          placeholder="e.g. R01"
          placeholderTextColor={COLORS.textLight}
          value={form.rackNumber}
          onChangeText={(v) =>
            handleChange(
              'rackNumber',
              v
            )
          }
          editable={!loading}
        />


        {/* SHELF NUMBER */}

        <FieldLabel label="Shelf Number" />

        <TextInput
          style={styles.input}
          placeholder="e.g. S01"
          placeholderTextColor={COLORS.textLight}
          value={form.shelfNumber}
          onChangeText={(v) =>
            handleChange(
              'shelfNumber',
              v
            )
          }
          editable={!loading}
        />


        {/* BOX NUMBER */}

        <FieldLabel label="Box Number" />

        <TextInput
          style={styles.input}
          placeholder="e.g. B01"
          placeholderTextColor={COLORS.textLight}
          value={form.boxNumber}
          onChangeText={(v) =>
            handleChange(
              'boxNumber',
              v
            )
          }
          editable={!loading}
        />

      </View>


      {/* REQUIRED INFO */}

      <View style={styles.requiredInfo}>

        <Text style={styles.requiredStar}>
          *
        </Text>

        <Text style={styles.requiredText}>
          Required fields
        </Text>

      </View>


      {/* SUBMIT */}

      <TouchableOpacity
        style={[
          styles.submitButton,

          loading &&
            styles.submitButtonDisabled,

        ]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >

        {loading ? (

          <View style={styles.loadingRow}>

            <ActivityIndicator
              color="#FFFFFF"
              size="small"
            />

            <Text style={styles.submitText}>
              {isEditMode
                ? 'Updating Medicine...'
                : 'Saving Medicine...'}
            </Text>

          </View>

        ) : (

          <Text style={styles.submitText}>
            {isEditMode
              ? 'Update Medicine'
              : 'Save Medicine'}
          </Text>

        )}

      </TouchableOpacity>


      <View style={styles.bottomSpace} />

    </ScrollView>

  );

}


// =====================================================
// FIELD LABEL COMPONENT
// =====================================================

const FieldLabel = ({
  label,
  required = false,
}) => {

  return (

    <Text style={styles.label}>

      {label}

      {required && (
        <Text style={styles.requiredMark}>
          {' '}*
        </Text>
      )}

    </Text>

  );

};


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  contentContainer: {
    padding: 16,
    paddingTop: 10,
  },


  // ===================================================
  // HEADER
  // ===================================================

  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  backButton: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backIcon: {
    fontSize: 28,
    lineHeight: 28,
    color: COLORS.primary,
    marginRight: 3,
  },

  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  headerIconText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  headerSpacer: {
    width: 72,
  },


  // ===================================================
  // MESSAGE
  // ===================================================

  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
  },

  messageSuccess: {
    backgroundColor: COLORS.successBg,
    borderColor: '#C9E7DA',
  },

  messageWarning: {
    backgroundColor: COLORS.warningBg,
    borderColor: '#F0D89B',
  },

  messageError: {
    backgroundColor: COLORS.dangerBg,
    borderColor: '#F2C7C7',
  },

  messageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 9,
  },

  messageText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },


  // ===================================================
  // SMART SCAN
  // ===================================================

  scanCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
  },

  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  scanIconBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  scanIcon: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  scanHeaderText: {
    flex: 1,
  },

  scanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  scanSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },

  scanButtons: {
    flexDirection: 'row',
    gap: 8,
  },

  scanButton: {
    flex: 1,
    minHeight: 68,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  scanButtonIcon: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 5,
  },

  scanButtonText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  ocrLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  ocrLoadingTextBox: {
    marginLeft: 10,
  },

  ocrLoadingTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  ocrLoadingSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  ocrPreview: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  ocrImage: {
    width: '100%',
    height: 170,
  },

  ocrResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFB',
    padding: 11,
  },

  resultIndicator: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
    marginRight: 9,
  },

  resultSuccess: {
    backgroundColor: COLORS.success,
  },

  resultWarning: {
    backgroundColor: COLORS.warning,
  },

  resultError: {
    backgroundColor: COLORS.danger,
  },

  ocrResultText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },


  // ===================================================
  // DIVIDER
  // ===================================================

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    color: COLORS.textLight,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginHorizontal: 10,
  },


  // ===================================================
  // CARDS
  // ===================================================

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sectionNumberText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },


  // ===================================================
  // FORM
  // ===================================================

  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },

  requiredMark: {
    color: COLORS.danger,
  },

  input: {
    height: 47,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 13,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 15,
  },

  expiryInput: {
    borderColor: '#A8CFC0',
    backgroundColor: '#F5FAF7',
  },

  row: {
    flexDirection: 'row',
    gap: 11,
  },

  half: {
    flex: 1,
  },


  // ===================================================
  // CATEGORY
  // ===================================================

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 15,
  },

  categoryChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFCFB',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  categoryChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: '#A8CFC0',
  },

  categoryText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },


  // ===================================================
  // EXPIRY
  // ===================================================

  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: -3,
    marginBottom: 5,
  },

  expiryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 7,
  },

  expiryInfoText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },


  // ===================================================
  // PRICE
  // ===================================================

  priceInputWrapper: {
    height: 47,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    marginBottom: 15,
  },

  currency: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
  },

  priceInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 7,
    fontSize: 13,
    color: COLORS.text,
  },


  // ===================================================
  // REQUIRED
  // ===================================================

  requiredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 3,
  },

  requiredStar: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 5,
  },

  requiredText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },


  // ===================================================
  // SUBMIT
  // ===================================================

  submitButton: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  submitButtonDisabled: {
    backgroundColor: '#9AA9A2',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  submitText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },

  bottomSpace: {
    height: 40,
  },

});