import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { File } from 'expo-file-system';

import { useRouter } from 'expo-router';

import { parseMedicineDetails } from '../services/ocr';

const BACKEND_URL =
  'https://medtracker-1.onrender.com';

const GREEN = '#176B52';
const LIGHT_GREEN = '#EAF5F0';
const BORDER = '#E1E8E4';
const TEXT = '#17201C';
const MUTED = '#718078';
const RED = '#C62828';
const AMBER = '#B7791F';

export default function ScanMedicine() {
  const router = useRouter();

  const cameraRef = useRef(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [barcode, setBarcode] =
    useState('');

  const [barcodeType, setBarcodeType] =
    useState('');

  const [scanned, setScanned] =
    useState(false);

  const [ocrLoading, setOcrLoading] =
    useState(false);

  const [capturing, setCapturing] =
    useState(false);

  const [ocrResult, setOcrResult] =
    useState(null);

  const [torchOn, setTorchOn] =
    useState(false);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // =====================================================
  // BARCODE SCAN
  // =====================================================

  const handleBarcodeScan = ({
    type,
    data,
  }) => {
    if (scanned) {
      return;
    }

    if (!data) {
      return;
    }

    console.log(
      'Barcode detected:',
      data
    );

    setBarcode(data);
    setBarcodeType(type || 'barcode');
    setScanned(true);

    setMessage(
      'Barcode detected. Now capture the medicine box.'
    );
  };

  // =====================================================
  // CAPTURE MEDICINE IMAGE
  // =====================================================

  const captureMedicineImage =
    async () => {
      if (!cameraRef.current) {
        Alert.alert(
          'Camera Error',
          'Camera is not ready.'
        );

        return;
      }

      if (capturing || ocrLoading) {
        return;
      }

      try {
        setCapturing(true);
        setMessage(
          'Capturing medicine box...'
        );

        const photo =
          await cameraRef.current.takePictureAsync(
            {
              quality: 1,
              skipProcessing: false,
            }
          );

        if (!photo?.uri) {
          throw new Error(
            'Could not capture image'
          );
        }

        console.log(
          'Medicine image:',
          photo.uri
        );

        await runOCR(photo.uri);
      } catch (err) {
        console.log(
          'Capture error:',
          err
        );

        Alert.alert(
          'Capture Failed',
          err.message ||
            'Could not capture medicine image.'
        );

        setMessage('');
      } finally {
        setCapturing(false);
      }
    };

  // =====================================================
  // OCR
  // =====================================================

  const runOCR = async (
    imageUri
  ) => {
    try {
      setOcrLoading(true);

      setMessage(
        'Reading medicine details...'
      );

      const file =
        new File(imageUri);

      console.log(
        'OCR file:',
        file
      );

      const formData =
        new FormData();

      formData.append(
        'image',
        file
      );

      const response =
        await fetch(
          `${BACKEND_URL}/api/ocr/medicine`,
          {
            method: 'POST',
            body: formData,
          }
        );

      console.log(
        'OCR status:',
        response.status
      );

      const result =
        await response.json();

      console.log(
        'OCR response:',
        result
      );

      if (!response.ok) {
        throw new Error(
          result?.message ||
            'OCR request failed'
        );
      }

      const rawText =
        result?.rawText || '';

      if (!rawText.trim()) {
        setOcrResult({
          rawText: '',
          medicineName: '',
          brandName: '',
          category: '',
          batchNumber: '',
          mfgDate: '',
          expiryDate: '',
        });

        setMessage(
          'Barcode detected, but no readable text was found.'
        );

        return;
      }

      const details =
        parseMedicineDetails(
          rawText
        );

      console.log(
        'Parsed OCR:',
        details
      );

      const combinedResult = {
        rawText,

        medicineName:
          details.medicineName ||
          '',

        brandName:
          details.brandName ||
          '',

        category:
          details.category ||
          '',

        batchNumber:
          details.batchNumber ||
          '',

        mfgDate:
          details.mfgDate ||
          '',

        expiryDate:
          details.expiryDate ||
          '',

        barcode,
        barcodeType,
      };

      setOcrResult(
        combinedResult
      );

      setMessage(
        'Combined scan completed successfully.'
      );
    } catch (err) {
      console.log(
        'OCR error:',
        err
      );

      setMessage(
        'Barcode detected, but OCR failed.'
      );

      Alert.alert(
        'OCR Failed',
        err.message ||
          'Could not read medicine details.'
      );
    } finally {
      setOcrLoading(false);
    }
  };

  // =====================================================
  // RESCAN
  // =====================================================

  const handleRescan =
    () => {
      setBarcode('');
      setBarcodeType('');
      setScanned(false);
      setOcrResult(null);
      setMessage('');
    };

  // =====================================================
  // OPEN ADD MEDICINE
  // =====================================================

  const handleUseResult =
    () => {
      if (!ocrResult) {
        return;
      }

      router.push({
        pathname:
          '/add-medicine',

        params: {
          name:
            ocrResult.medicineName ||
            '',

          brand:
            ocrResult.brandName ||
            '',

          category:
            ocrResult.category ||
            '',

          batchNumber:
            ocrResult.batchNumber ||
            '',

          mfgDate:
            ocrResult.mfgDate ||
            '',

          expiryDate:
            ocrResult.expiryDate ||
            '',

          barcode:
            ocrResult.barcode ||
            '',
        },
      });
    };

  // =====================================================
  // PERMISSION LOADING
  // =====================================================

  if (!permission) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={styles.centerScreen}
        >
          <ActivityIndicator
            size="large"
            color={GREEN}
          />

          <Text
            style={styles.loadingText}
          >
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // PERMISSION DENIED
  // =====================================================

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={styles.permissionScreen}
        >
          <View
            style={styles.permissionIcon}
          >
            <Text
              style={styles.permissionIconText}
            >
              📷
            </Text>
          </View>

          <Text
            style={styles.permissionTitle}
          >
            Camera Permission Required
          </Text>

          <Text
            style={styles.permissionText}
          >
            Camera access is required to scan
            the medicine barcode and capture
            the medicine box for OCR.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={
              requestPermission
            }
          >
            <Text
              style={styles.primaryButtonText}
            >
              Allow Camera Access
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.secondaryButtonText}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
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
            style={styles.headerContent}
          >
            <Text
              style={styles.headerTitle}
            >
              Scan Medicine
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Barcode + OCR
            </Text>
          </View>

          <TouchableOpacity
            style={styles.torchButton}
            onPress={() =>
              setTorchOn(!torchOn)
            }
          >
            <Text
              style={styles.torchText}
            >
              {torchOn ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {/* INSTRUCTION */}

          <View
            style={styles.instructionCard}
          >
            <View
              style={styles.stepCircle}
            >
              <Text
                style={styles.stepCircleText}
              >
                1
              </Text>
            </View>

            <View
              style={styles.instructionContent}
            >
              <Text
                style={styles.instructionTitle}
              >
                Scan the medicine barcode
              </Text>

              <Text
                style={styles.instructionText}
              >
                Point the camera at the barcode
                or QR code printed on the medicine
                box.
              </Text>
            </View>
          </View>

          {/* CAMERA */}

          <View
            style={styles.cameraCard}
          >
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={
                scanned
                  ? undefined
                  : handleBarcodeScan
              }
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e',
                  'itf14',
                ],
              }}
            >
              <View
                style={styles.cameraOverlay}
              >
                <View
                  style={styles.scanFrame}
                />

                <Text
                  style={styles.cameraHint}
                >
                  {scanned
                    ? 'Barcode detected'
                    : 'Place barcode inside the frame'}
                </Text>
              </View>
            </CameraView>
          </View>

          {/* BARCODE RESULT */}

          {barcode ? (
            <View
              style={styles.barcodeCard}
            >
              <View
                style={styles.successDot}
              />

              <View
                style={styles.barcodeContent}
              >
                <Text
                  style={styles.barcodeLabel}
                >
                  BARCODE DETECTED
                </Text>

                <Text
                  style={styles.barcodeValue}
                  numberOfLines={2}
                >
                  {barcode}
                </Text>

                <Text
                  style={styles.barcodeType}
                >
                  Type: {barcodeType || 'barcode'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* CAPTURE BUTTON */}

          {!ocrResult ? (
            <View
              style={styles.captureSection}
            >
              <View
                style={styles.stepRow}
              >
                <View
                  style={styles.stepCircle}
                >
                  <Text
                    style={styles.stepCircleText}
                  >
                    2
                  </Text>
                </View>

                <View
                  style={styles.stepTextContainer}
                >
                  <Text
                    style={styles.instructionTitle}
                  >
                    Read medicine details
                  </Text>

                  <Text
                    style={styles.instructionText}
                  >
                    After the barcode is detected,
                    capture the box so OCR can read
                    the printed medicine information.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.captureButton,
                  !scanned &&
                    styles.disabledButton,
                ]}
                onPress={
                  captureMedicineImage
                }
                disabled={
                  !scanned ||
                  capturing ||
                  ocrLoading
                }
              >
                {capturing ||
                ocrLoading ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.captureButtonText
                    }
                  >
                    Capture & Read Medicine
                  </Text>
                )}
              </TouchableOpacity>

              {!scanned ? (
                <Text
                  style={
                    styles.helperText
                  }
                >
                  Scan a barcode first to
                  continue.
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* MESSAGE */}

          {message ? (
            <View
              style={styles.messageCard}
            >
              <Text
                style={styles.messageText}
              >
                {message}
              </Text>
            </View>
          ) : null}

          {/* RESULT */}

          {ocrResult ? (
            <View
              style={styles.resultCard}
            >
              <View
                style={styles.resultHeader}
              >
                <View>
                  <Text
                    style={styles.resultTitle}
                  >
                    Combined Scan Result
                  </Text>

                  <Text
                    style={styles.resultSubtitle}
                  >
                    Review before adding medicine
                  </Text>
                </View>

                <View
                  style={styles.completeBadge}
                >
                  <Text
                    style={styles.completeBadgeText}
                  >
                    READY
                  </Text>
                </View>
              </View>

              <ResultRow
                label="Medicine"
                value={
                  ocrResult.medicineName
                }
              />

              <ResultRow
                label="Brand"
                value={
                  ocrResult.brandName
                }
              />

              <ResultRow
                label="Category"
                value={
                  ocrResult.category
                }
              />

              <ResultRow
                label="Batch"
                value={
                  ocrResult.batchNumber
                }
              />

              <ResultRow
                label="Manufactured"
                value={
                  ocrResult.mfgDate
                }
              />

              <ResultRow
                label="Expiry"
                value={
                  ocrResult.expiryDate
                }
              />

              <ResultRow
                label="Barcode"
                value={
                  ocrResult.barcode
                }
              />

              <TouchableOpacity
                style={
                  styles.useResultButton
                }
                onPress={
                  handleUseResult
                }
              >
                <Text
                  style={
                    styles.useResultButtonText
                  }
                >
                  Use Details in Add Medicine
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.rescanButton
                }
                onPress={
                  handleRescan
                }
              >
                <Text
                  style={
                    styles.rescanButtonText
                  }
                >
                  Scan Another Medicine
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* RAW OCR TEXT */}

          {ocrResult?.rawText ? (
            <View
              style={styles.rawCard}
            >
              <Text
                style={styles.rawTitle}
              >
                OCR Text
              </Text>

              <Text
                style={styles.rawText}
              >
                {ocrResult.rawText}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// =====================================================
// RESULT ROW
// =====================================================

function ResultRow({
  label,
  value,
}) {
  return (
    <View
      style={styles.resultRow}
    >
      <Text
        style={styles.resultLabel}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.resultValue,
          !value &&
            styles.missingValue,
        ]}
      >
        {value || 'Not detected'}
      </Text>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F8',
  },

  container: {
    flex: 1,
  },

  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: MUTED,
  },

  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  permissionIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  permissionIconText: {
    fontSize: 32,
  },

  permissionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
  },

  permissionText: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    textAlign: 'center',
  },

  primaryButton: {
    marginTop: 22,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  secondaryButtonText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },

  header: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 32,
    color: TEXT,
    marginTop: -3,
  },

  headerContent: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: TEXT,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: MUTED,
  },

  torchButton: {
    minWidth: 48,
    height: 34,
    borderRadius: 17,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  torchText: {
    fontSize: 10,
    fontWeight: '800',
    color: GREEN,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    flexDirection: 'row',
    marginBottom: 12,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  stepCircleText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
  },

  instructionContent: {
    flex: 1,
  },

  stepTextContainer: {
    flex: 1,
  },

  instructionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
  },

  instructionText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  cameraCard: {
    height: 330,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#101513',
    marginBottom: 12,
  },

  camera: {
    flex: 1,
  },

  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  scanFrame: {
    width: 245,
    height: 150,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 14,
  },

  cameraHint: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  barcodeCard: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D2E9DF',
  },

  successDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
    marginTop: 5,
    marginRight: 10,
  },

  barcodeContent: {
    flex: 1,
  },

  barcodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: 0.7,
  },

  barcodeValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: TEXT,
  },

  barcodeType: {
    marginTop: 3,
    fontSize: 11,
    color: MUTED,
  },

  captureSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 14,
  },

  captureButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  disabledButton: {
    backgroundColor: '#B8C7C0',
  },

  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  helperText: {
    textAlign: 'center',
    color: MUTED,
    fontSize: 11,
    marginTop: 9,
  },

  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 13,
    marginBottom: 14,
  },

  messageText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
  },

  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
  },

  resultSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: MUTED,
  },

  completeBadge: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  completeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: GREEN,
  },

  resultRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F0',
    paddingVertical: 11,
  },

  resultLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  resultValue: {
    marginTop: 4,
    fontSize: 14,
    color: TEXT,
    fontWeight: '700',
  },

  missingValue: {
    color: '#9AA59F',
    fontWeight: '500',
  },

  useResultButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  useResultButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  rescanButton: {
    height: 45,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },

  rescanButtonText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
  },

  rawCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
  },

  rawTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 8,
  },

  rawText: {
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },
});