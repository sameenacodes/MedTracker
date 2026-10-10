import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  generateMedicineQR,
  getMedicine,
} from '../services/api';

export default function MedicineQR() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const medicineId = params.id;

  const [medicine, setMedicine] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // ================================
  // LOAD MEDICINE
  // ================================

  useEffect(() => {
    if (!medicineId) {
      setError('Medicine ID not found');
      setLoading(false);
      return;
    }

    loadMedicine();
  }, [medicineId]);

  const loadMedicine = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await getMedicine(medicineId);

      if (!result) {
        setError('Medicine not found');
        return;
      }

      setMedicine(result);
      setQrCode(result.qrCode || '');
    } catch (err) {
      console.log('Load medicine QR error:', err);

      setError(
        err.message || 'Could not load medicine'
      );
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // GENERATE QR
  // ================================

  const handleGenerateQR = async () => {
    if (!medicineId) {
      Alert.alert(
        'Error',
        'Medicine ID not found'
      );
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const result =
        await generateMedicineQR(medicineId);

      if (result && result.qrCode) {
        setQrCode(result.qrCode);

        if (result.medicine) {
          setMedicine(result.medicine);
        }

        Alert.alert(
          'QR Ready',
          'QR code generated successfully!'
        );
      } else {
        throw new Error(
          'QR code was not returned by server'
        );
      }
    } catch (err) {
      console.log('Generate QR error:', err);

      setError(
        err.message ||
        'Failed to generate QR code'
      );

      Alert.alert(
        'Error',
        err.message ||
        'Failed to generate QR code'
      );
    } finally {
      setGenerating(false);
    }
  };

  // ================================
  // QR IMAGE
  // ================================

  const qrImageUrl = qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
        qrCode
      )}`
    : '';

  // ================================
  // FORMAT DATE
  // ================================

  const formatDate = (date) => {
    if (!date) {
      return '-';
    }

    try {
      return new Date(date).toLocaleDateString(
        'en-IN'
      );
    } catch {
      return '-';
    }
  };

  // ================================
  // LOADING
  // ================================

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingIcon}>
          <Text style={styles.loadingIconText}>
            QR
          </Text>
        </View>

        <ActivityIndicator
          size="small"
          color="#176B52"
        />

        <Text style={styles.loadingText}>
          Loading medicine...
        </Text>
      </View>
    );
  }

  // ================================
  // ERROR
  // ================================

  if (error && !medicine) {
    return (
      <View style={styles.errorScreen}>
        <View style={styles.errorIconBox}>
          <Text style={styles.errorIcon}>
            !
          </Text>
        </View>

        <Text style={styles.errorTitle}>
          Something went wrong
        </Text>

        <Text style={styles.errorText}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>
            ← Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ================================
  // UI
  // ================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>
            ←
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Medicine QR
          </Text>

          <Text style={styles.headerSubtitle}>
            QR identification
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Medicine Information */}
        {medicine && (
          <View style={styles.medicineCard}>
            <View style={styles.medicineHeader}>
              <View style={styles.medicineIconBox}>
                <Text style={styles.medicineIcon}>
                  M
                </Text>
              </View>

              <View style={styles.medicineHeaderText}>
                <Text style={styles.medicineName}>
                  {medicine.name}
                </Text>

                {medicine.brand ? (
                  <Text style={styles.medicineBrand}>
                    {medicine.brand}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>
                  BATCH
                </Text>

                <Text
                  style={styles.infoValue}
                  numberOfLines={1}
                >
                  {medicine.batchNumber || '-'}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>
                  EXPIRY
                </Text>

                <Text style={styles.infoValue}>
                  {formatDate(
                    medicine.expiryDate
                  )}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>
                  STOCK
                </Text>

                <Text style={styles.infoValue}>
                  {medicine.quantity ?? 0}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* QR Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <View>
              <Text style={styles.qrTitle}>
                Physical Box QR
              </Text>

              <Text style={styles.qrSubtitle}>
                Attach this code to the medicine box
              </Text>
            </View>

            <View style={styles.qrSmallIcon}>
              <Text style={styles.qrSmallIconText}>
                QR
              </Text>
            </View>
          </View>

          {qrCode ? (
            <View style={styles.qrContent}>
              <View style={styles.qrImageWrapper}>
                <Image
                  source={{
                    uri: qrImageUrl,
                  }}
                  style={styles.qrImage}
                />
              </View>

              <View style={styles.readyBadge}>
                <View style={styles.readyDot} />

                <Text style={styles.readyText}>
                  QR Code Ready
                </Text>
              </View>

              <Text style={styles.qrValueLabel}>
                QR IDENTIFIER
              </Text>

              <View style={styles.qrValueBox}>
                <Text
                  style={styles.qrValue}
                  selectable
                >
                  {qrCode}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noQrBox}>
              <View style={styles.noQrIconBox}>
                <Text style={styles.noQrIcon}>
                  QR
                </Text>
              </View>

              <Text style={styles.noQrTitle}>
                QR Not Generated
              </Text>

              <Text style={styles.noQrText}>
                Generate a unique QR code for this
                medicine and attach it to the
                physical box.
              </Text>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              generating && styles.disabledButton,
            ]}
            onPress={handleGenerateQR}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <View style={styles.buttonRow}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.generateButtonText}>
                  Generating...
                </Text>
              </View>
            ) : (
              <Text style={styles.generateButtonText}>
                {qrCode
                  ? 'Refresh QR Code'
                  : 'Generate QR Code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionHeader}>
            <View style={styles.instructionIconBox}>
              <Text style={styles.instructionIcon}>
                i
              </Text>
            </View>

            <Text style={styles.instructionTitle}>
              How to use
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>
                1
              </Text>
            </View>

            <Text style={styles.stepText}>
              Generate the QR code for this
              medicine.
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>
                2
              </Text>
            </View>

            <Text style={styles.stepText}>
              Print or display the QR code.
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>
                3
              </Text>
            </View>

            <Text style={styles.stepText}>
              Attach it to the correct physical
              medicine box.
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>
                4
              </Text>
            </View>

            <Text style={styles.stepText}>
              Scan it during the medicine removal
              process.
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>
                5
              </Text>
            </View>

            <Text style={styles.stepText}>
              The system verifies the QR against
              the medicine record.
            </Text>
          </View>
        </View>

        {/* Security */}
        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}>
            <Text style={styles.securityIcon}>
              ✓
            </Text>
          </View>

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Secure QR Identification
            </Text>

            <Text style={styles.securityText}>
              This QR uniquely identifies this
              medicine record and batch. A QR
              belonging to another medicine will
              not be accepted.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
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

  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },

  // ================================
  // LOADING
  // ================================

  loadingScreen: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  loadingIconText: {
    color: '#176B52',
    fontSize: 14,
    fontWeight: '800',
  },

  loadingText: {
    color: '#718078',
    fontSize: 13,
    marginTop: 10,
  },

  // ================================
  // ERROR
  // ================================

  errorScreen: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  errorIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FEF3F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  errorIcon: {
    color: '#D92D20',
    fontSize: 26,
    fontWeight: '800',
  },

  errorTitle: {
    color: '#17201C',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },

  errorText: {
    color: '#718078',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },

  backButton: {
    backgroundColor: '#176B52',
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ================================
  // HEADER
  // ================================

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E4EAE7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    color: '#176B52',
    fontSize: 21,
    fontWeight: '700',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: '#17201C',
    fontSize: 17,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#8A9690',
    fontSize: 10,
    marginTop: 2,
  },

  headerSpacer: {
    width: 40,
  },

  // ================================
  // MEDICINE CARD
  // ================================

  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4EAE7',
  },

  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  medicineIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  medicineIcon: {
    color: '#176B52',
    fontSize: 17,
    fontWeight: '800',
  },

  medicineHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  medicineName: {
    color: '#17201C',
    fontSize: 18,
    fontWeight: '800',
  },

  medicineBrand: {
    color: '#78847E',
    fontSize: 11,
    marginTop: 3,
  },

  infoGrid: {
    backgroundColor: '#F7F9F8',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },

  infoDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#DCE4E0',
  },

  infoLabel: {
    color: '#89948E',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  infoValue: {
    color: '#27322D',
    fontSize: 11,
    fontWeight: '700',
  },

  // ================================
  // QR CARD
  // ================================

  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4EAE7',
  },

  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  qrTitle: {
    color: '#17201C',
    fontSize: 17,
    fontWeight: '800',
  },

  qrSubtitle: {
    color: '#7A8781',
    fontSize: 10,
    marginTop: 4,
  },

  qrSmallIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrSmallIconText: {
    color: '#176B52',
    fontSize: 10,
    fontWeight: '800',
  },

  qrContent: {
    alignItems: 'center',
  },

  qrImageWrapper: {
    width: 270,
    height: 270,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EAE7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

  qrImage: {
    width: 245,
    height: 245,
  },

  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF6F1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 13,
    marginBottom: 17,
  },

  readyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#176B52',
    marginRight: 7,
  },

  readyText: {
    color: '#176B52',
    fontSize: 11,
    fontWeight: '700',
  },

  qrValueLabel: {
    alignSelf: 'flex-start',
    color: '#89948E',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  qrValueBox: {
    width: '100%',
    backgroundColor: '#F5F7F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    padding: 11,
  },

  qrValue: {
    color: '#34413A',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  noQrBox: {
    height: 270,
    borderWidth: 1.5,
    borderColor: '#D9E2DD',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginBottom: 16,
    backgroundColor: '#FAFBFA',
  },

  noQrIconBox: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  noQrIcon: {
    color: '#176B52',
    fontSize: 13,
    fontWeight: '800',
  },

  noQrTitle: {
    color: '#34413A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },

  noQrText: {
    color: '#89948E',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
  },

  generateButton: {
    width: '100%',
    backgroundColor: '#176B52',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  disabledButton: {
    opacity: 0.65,
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ================================
  // INSTRUCTIONS
  // ================================

  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4EAE7',
  },

  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  instructionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  instructionIcon: {
    color: '#176B52',
    fontSize: 15,
    fontWeight: '800',
  },

  instructionTitle: {
    color: '#17201C',
    fontSize: 15,
    fontWeight: '800',
  },

  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13,
  },

  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  stepText: {
    flex: 1,
    color: '#59665F',
    fontSize: 11,
    lineHeight: 18,
    paddingTop: 2,
  },

  // ================================
  // SECURITY
  // ================================

  securityCard: {
    backgroundColor: '#EAF6F1',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  securityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  securityIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: '#176B52',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 5,
  },

  securityText: {
    color: '#53645B',
    fontSize: 10,
    lineHeight: 17,
  },

  bottomSpace: {
    height: 35,
  },
});