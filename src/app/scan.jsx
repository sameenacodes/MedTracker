import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMedicineByBarcode } from '../services/barcode';

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

  black: '#000000',
};

export default function BarcodeScanner() {
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarcodeScan = ({ type, data }) => {
    if (scanned) return;

    setScanned(true);

    console.log('Barcode scanned:', data);

    const result = getMedicineByBarcode(data);

    if (result.success) {
      setScanResult({
        barcode: data,
        medicine: result.medicine,
        found: true,
      });
    } else {
      setScanResult({
        barcode: data,
        found: false,
      });
    }
  };

  const handleAddMedicine = () => {
    if (scanResult?.medicine) {
      router.push({
        pathname: '/add-medicine',
        params: {
          name: scanResult.medicine.name,
          brand: scanResult.medicine.brand,
          category: scanResult.medicine.category,
          barcode: scanResult.barcode,
        },
      });
    }
  };

  const handleRescan = () => {
    setScanned(false);
    setScanResult(null);
  };

  // Camera permission loading
  if (!permission) {
    return (
      <View style={styles.permissionLoading}>
        <View style={styles.loadingIcon}>
          <Text style={styles.loadingIconText}>C</Text>
        </View>

        <Text style={styles.permissionLoadingTitle}>
          Preparing Scanner
        </Text>

        <Text style={styles.permissionLoadingText}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  // Camera permission denied
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Text style={styles.permissionIconText}>CAM</Text>
          </View>

          <Text style={styles.permissionTitle}>
            Camera Access Required
          </Text>

          <Text style={styles.permissionText}>
            Camera access is required to scan medicine
            barcodes.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              Allow Camera Access
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerSideButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Barcode Scanner
          </Text>
          <Text style={styles.headerSubtitle}>
            Scan medicine barcode
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setTorchOn(!torchOn)}
          style={[
            styles.torchButton,
            torchOn && styles.torchButtonActive,
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.torchText,
              torchOn && styles.torchTextActive,
            ]}
          >
            {torchOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera */}
      {!scanned && (
        <View style={styles.cameraContainer}>

          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torchOn}
            onBarcodeScanned={handleBarcodeScan}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'ean13',
                'ean8',
                'code128',
                'code39',
                'upc_a',
              ],
            }}
          />

          {/* Dark overlay */}
          <View
            pointerEvents="none"
            style={styles.cameraOverlay}
          >
            <View style={styles.scanFrame}>

              <View
                style={[
                  styles.corner,
                  styles.cornerTopLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.cornerTopRight,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.cornerBottomLeft,
                ]}
              />

              <View
                style={[
                  styles.corner,
                  styles.cornerBottomRight,
                ]}
              />

            </View>

            <View style={styles.scanInstruction}>
              <Text style={styles.scanInstructionTitle}>
                Position barcode inside the frame
              </Text>

              <Text style={styles.scanInstructionText}>
                Hold the medicine package steady
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Scan Result */}
      {scanned && scanResult && (
        <View style={styles.resultContainer}>

          {scanResult.found ? (

            // Medicine Found
            <View style={styles.resultCard}>

              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>

              <Text style={styles.resultTitle}>
                Medicine Found
              </Text>

              <Text style={styles.resultSubtitle}>
                Barcode matched with an existing medicine
              </Text>

              <View style={styles.medicineInfo}>

                <InfoRow
                  label="Medicine"
                  value={scanResult.medicine.name}
                />

                <InfoRow
                  label="Brand"
                  value={scanResult.medicine.brand || '-'}
                />

                <InfoRow
                  label="Category"
                  value={scanResult.medicine.category || '-'}
                />

                <InfoRow
                  label="Barcode"
                  value={scanResult.barcode}
                  last
                />

              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddMedicine}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>
                  Add This Medicine
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleRescan}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineButtonText}>
                  Scan Another
                </Text>
              </TouchableOpacity>

            </View>

          ) : (

            // Medicine Not Found
            <View style={styles.resultCard}>

              <View style={styles.notFoundIcon}>
                <Text style={styles.notFoundIconText}>!</Text>
              </View>

              <Text style={styles.resultTitle}>
                Medicine Not Found
              </Text>

              <Text style={styles.resultSubtitle}>
                This barcode is not registered in your inventory.
              </Text>

              <View style={styles.barcodeBox}>
                <Text style={styles.barcodeLabel}>
                  SCANNED BARCODE
                </Text>

                <Text style={styles.barcodeValue}>
                  {scanResult.barcode}
                </Text>
              </View>

              <Text style={styles.notFoundText}>
                You can add this medicine manually and enter
                its details.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/add-medicine')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>
                  Add Manually
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleRescan}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineButtonText}>
                  Scan Again
                </Text>
              </TouchableOpacity>

            </View>
          )}

        </View>
      )}

    </View>
  );
}


/* -----------------------------
   Reusable Info Row
------------------------------ */

function InfoRow({ label, value, last }) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.infoRowLast,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,
          label === 'Barcode' && styles.barcodeInfoValue,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}


/* -----------------------------
   Styles
------------------------------ */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  /* Header */

  header: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,

    backgroundColor: COLORS.white,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerSideButton: {
    width: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backText: {
    fontSize: 34,
    lineHeight: 34,
    color: COLORS.green,
    fontWeight: '300',
    marginRight: 4,
  },

  backLabel: {
    fontSize: 13,
    color: COLORS.green,
    fontWeight: '700',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },

  torchButton: {
    minWidth: 52,
    height: 32,
    paddingHorizontal: 10,

    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: COLORS.background,
  },

  torchButtonActive: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.greenBorder,
  },

  torchText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
  },

  torchTextActive: {
    color: COLORS.green,
  },

  /* Camera */

  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: COLORS.black,
  },

  camera: {
    flex: 1,
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanFrame: {
    width: 280,
    height: 170,
    position: 'relative',
  },

  corner: {
    position: 'absolute',

    width: 34,
    height: 34,

    borderColor: COLORS.green,
    borderWidth: 3,
  },

  cornerTopLeft: {
    top: 0,
    left: 0,

    borderRightWidth: 0,
    borderBottomWidth: 0,
  },

  cornerTopRight: {
    top: 0,
    right: 0,

    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,

    borderRightWidth: 0,
    borderTopWidth: 0,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,

    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  scanInstruction: {
    position: 'absolute',
    bottom: 42,

    left: 20,
    right: 20,

    alignItems: 'center',

    paddingVertical: 14,
    paddingHorizontal: 18,

    borderRadius: 12,

    backgroundColor: 'rgba(0,0,0,0.62)',
  },

  scanInstructionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  scanInstructionText: {
    color: '#D5DDD9',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  /* Result */

  resultContainer: {
    flex: 1,

    backgroundColor: COLORS.background,

    padding: 18,

    justifyContent: 'center',
  },

  resultCard: {
    backgroundColor: COLORS.white,

    borderRadius: 18,

    padding: 22,

    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  successIcon: {
    width: 58,
    height: 58,

    borderRadius: 29,

    backgroundColor: COLORS.greenLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 12,
  },

  successIconText: {
    fontSize: 32,
    color: COLORS.green,
    fontWeight: '800',
  },

  notFoundIcon: {
    width: 58,
    height: 58,

    borderRadius: 29,

    backgroundColor: COLORS.redLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 12,
  },

  notFoundIconText: {
    fontSize: 28,
    color: COLORS.red,
    fontWeight: '800',
  },

  resultTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,

    textAlign: 'center',

    marginBottom: 6,
  },

  resultSubtitle: {
    fontSize: 12,
    color: COLORS.muted,

    textAlign: 'center',

    lineHeight: 18,

    marginBottom: 18,
  },

  medicineInfo: {
    width: '100%',

    backgroundColor: COLORS.background,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: COLORS.border,

    paddingHorizontal: 14,

    marginBottom: 18,
  },

  infoRow: {
    minHeight: 48,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,

    paddingVertical: 8,
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    width: '32%',

    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },

  infoValue: {
    flex: 1,

    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',

    textAlign: 'right',
  },

  barcodeInfoValue: {
    fontSize: 10,
    letterSpacing: 0.3,
  },

  barcodeBox: {
    width: '100%',

    backgroundColor: COLORS.background,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 10,

    padding: 14,

    marginBottom: 14,
  },

  barcodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,

    letterSpacing: 0.8,

    marginBottom: 6,
  },

  barcodeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,

    letterSpacing: 0.4,
  },

  notFoundText: {
    fontSize: 13,
    color: COLORS.muted,

    textAlign: 'center',

    lineHeight: 20,

    marginBottom: 18,
  },

  /* Buttons */

  primaryButton: {
    width: '100%',

    minHeight: 50,

    borderRadius: 10,

    backgroundColor: COLORS.green,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 10,
  },

  primaryButtonText: {
    color: COLORS.white,

    fontSize: 14,
    fontWeight: '800',
  },

  outlineButton: {
    width: '100%',

    minHeight: 48,

    borderRadius: 10,

    borderWidth: 1,
    borderColor: COLORS.greenBorder,

    backgroundColor: COLORS.greenLight,

    alignItems: 'center',
    justifyContent: 'center',
  },

  outlineButtonText: {
    color: COLORS.green,

    fontSize: 14,
    fontWeight: '700',
  },

  /* Permission */

  permissionContainer: {
    flex: 1,

    backgroundColor: COLORS.background,

    justifyContent: 'center',
    alignItems: 'center',

    padding: 22,
  },

  permissionCard: {
    width: '100%',

    backgroundColor: COLORS.white,

    borderRadius: 18,

    padding: 26,

    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: 'center',
  },

  permissionIcon: {
    width: 64,
    height: 64,

    borderRadius: 32,

    backgroundColor: COLORS.greenLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 16,
  },

  permissionIconText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  permissionTitle: {
    fontSize: 21,
    fontWeight: '800',

    color: COLORS.text,

    textAlign: 'center',

    marginBottom: 8,
  },

  permissionText: {
    fontSize: 13,
    color: COLORS.muted,

    textAlign: 'center',

    lineHeight: 20,

    marginBottom: 22,
  },

  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  secondaryButtonText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '700',
  },

  permissionLoading: {
    flex: 1,

    backgroundColor: COLORS.background,

    justifyContent: 'center',
    alignItems: 'center',

    padding: 24,
  },

  loadingIcon: {
    width: 56,
    height: 56,

    borderRadius: 28,

    backgroundColor: COLORS.greenLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 14,
  },

  loadingIconText: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: '900',
  },

  permissionLoadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,

    marginBottom: 6,
  },

  permissionLoadingText: {
    fontSize: 13,
    color: COLORS.muted,
  },

});