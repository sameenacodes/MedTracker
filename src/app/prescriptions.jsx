import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { useCallback, useState } from 'react';

import {
  getMyPrescriptions,
  uploadPrescription,
} from '../services/api';

const BASE_URL = 'http://192.168.89.124:5000';

export default function Prescriptions() {
  const router = useRouter();

  // Pharmacy ID passed from checkout
  const { pharmacyId } = useLocalSearchParams();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // =====================================================
  // LOAD PRESCRIPTIONS
  // =====================================================

  const loadPrescriptions = async () => {
    try {
      setLoading(true);

      const data = await getMyPrescriptions();

      setPrescriptions(
        Array.isArray(data)
          ? data
          : data?.prescriptions || []
      );
    } catch (error) {
      console.log(
        'Load prescriptions error:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Unable to load prescriptions'
      );

      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions();
    }, [])
  );

  // =====================================================
  // UPLOAD FILE
  // =====================================================

  const uploadFile = async (file) => {
    try {
      setUploading(true);

      await uploadPrescription(
        file,
        pharmacyId || null
      );

      Alert.alert(
        'Uploaded',
        'Prescription uploaded successfully. It is now waiting for pharmacist verification.'
      );

      await loadPrescriptions();
    } catch (error) {
      console.log(
        'Prescription upload error:',
        error
      );

      Alert.alert(
        'Upload Failed',
        error?.message ||
          'Unable to upload prescription'
      );
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // CHOOSE IMAGE
  // =====================================================

  const chooseImage = async () => {
    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const asset = result.assets[0];

      await uploadFile({
        uri: asset.uri,
        name:
          asset.fileName ||
          `prescription-${Date.now()}.jpg`,
        mimeType:
          asset.mimeType ||
          'image/jpeg',
      });
    } catch (error) {
      console.log(
        'Choose image error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to select image.'
      );
    }
  };

  // =====================================================
  // TAKE PHOTO
  // =====================================================

  const takePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take a prescription photo.'
        );
        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const asset = result.assets[0];

      await uploadFile({
        uri: asset.uri,
        name:
          asset.fileName ||
          `prescription-${Date.now()}.jpg`,
        mimeType:
          asset.mimeType ||
          'image/jpeg',
      });
    } catch (error) {
      console.log(
        'Take photo error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to take prescription photo.'
      );
    }
  };

  // =====================================================
  // CHOOSE PDF
  // =====================================================

  const choosePDF = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset) {
        return;
      }

      await uploadFile({
        uri: asset.uri,
        name:
          asset.name ||
          `prescription-${Date.now()}.pdf`,
        mimeType:
          asset.mimeType ||
          'application/pdf',
      });
    } catch (error) {
      console.log(
        'Choose PDF error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to select PDF.'
      );
    }
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (status) => {
    if (status === 'approved') {
      return styles.approved;
    }

    if (status === 'rejected') {
      return styles.rejected;
    }

    return styles.pending;
  };

  // =====================================================
  // FILE URL
  // =====================================================

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) {
      return null;
    }

    if (
      fileUrl.startsWith('http://') ||
      fileUrl.startsWith('https://')
    ) {
      return fileUrl;
    }

    return `${BASE_URL}${fileUrl}`;
  };

  // =====================================================
  // VIEW PRESCRIPTION
  // =====================================================

  const openPrescription = async (item) => {
    try {
      const url = getFileUrl(item?.fileUrl);

      if (!url) {
        Alert.alert(
          'File unavailable',
          'Prescription file URL is missing.'
        );
        return;
      }

      const supported =
        await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          'Cannot open file',
          'This device cannot open the prescription file.'
        );
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log(
        'Open prescription error:',
        error
      );

      Alert.alert(
        'Unable to open',
        'Could not open the prescription file.'
      );
    }
  };

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loading}>
          Loading prescriptions...
        </Text>
      </View>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => router.back()}
          disabled={uploading}
        >
          <Text style={styles.back}>
            ←
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Prescriptions
        </Text>

        <View style={{ width: 30 }} />

      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ============================================
            UPLOAD CARD
        ============================================ */}

        <View style={styles.uploadCard}>

          <Text style={styles.uploadIcon}>
            📄
          </Text>

          <Text style={styles.uploadTitle}>
            Upload Prescription
          </Text>

          <Text style={styles.uploadText}>
            Upload a clear prescription image or PDF
            for pharmacist verification.
          </Text>

          {/* TAKE PHOTO */}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={takePhoto}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>
              📷 Take Photo
            </Text>
          </TouchableOpacity>

          {/* CHOOSE IMAGE */}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={chooseImage}
            disabled={uploading}
          >
            <Text style={styles.secondaryText}>
              🖼️ Choose Image
            </Text>
          </TouchableOpacity>

          {/* CHOOSE PDF */}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={choosePDF}
            disabled={uploading}
          >
            <Text style={styles.secondaryText}>
              📄 Choose PDF
            </Text>
          </TouchableOpacity>

          {/* UPLOADING */}

          {uploading && (
            <View style={styles.uploading}>

              <ActivityIndicator
                color="#2563EB"
              />

              <Text style={styles.uploadingText}>
                Uploading prescription...
              </Text>

            </View>
          )}

        </View>

        {/* ============================================
            HISTORY
        ============================================ */}

        <Text style={styles.historyTitle}>
          My Prescriptions
        </Text>

        {prescriptions.length === 0 ? (

          <View style={styles.emptyCard}>

            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              No prescriptions yet
            </Text>

            <Text style={styles.emptyText}>
              Upload your prescription to get it
              verified by the pharmacist.
            </Text>

          </View>

        ) : (

          prescriptions.map((item) => (

            <View
              key={item._id}
              style={styles.card}
            >

              {/* CARD HEADER */}

              <View style={styles.cardHeader}>

                <Text
                  style={styles.fileName}
                  numberOfLines={1}
                >
                  {item.originalName ||
                    item.fileName ||
                    'Prescription'}
                </Text>

                <View
                  style={[
                    styles.status,
                    getStatusStyle(item.status),
                  ]}
                >

                  <Text style={styles.statusText}>
                    {(item.status || 'pending')
                      .toUpperCase()}
                  </Text>

                </View>

              </View>

              {/* DATE */}

              <Text style={styles.date}>

                Uploaded:{' '}

                {item.createdAt
                  ? new Date(
                      item.createdAt
                    ).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'}

              </Text>

              {/* REJECTION REASON */}

              {item.status === 'rejected' &&
              item.rejectionReason ? (

                <View style={styles.reasonBox}>

                  <Text style={styles.reasonTitle}>
                    Rejection reason
                  </Text>

                  <Text style={styles.reasonText}>
                    {item.rejectionReason}
                  </Text>

                </View>

              ) : null}

              {/* VIEW */}

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() =>
                  openPrescription(item)
                }
              >

                <Text style={styles.viewButtonText}>
                  👁 View Prescription
                </Text>

              </TouchableOpacity>

            </View>

          ))
        )}

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
    backgroundColor: '#F7F9FC',
    paddingTop: 50,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
  },

  loading: {
    marginTop: 10,
    color: '#64748B',
  },

  header: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  back: {
    fontSize: 30,
    color: '#172033',
  },

  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#172033',
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },

  uploadIcon: {
    fontSize: 45,
  },

  uploadTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
    color: '#172033',
  },

  uploadText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 18,
  },

  primaryButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },

  secondaryText: {
    color: '#2563EB',
    fontWeight: '800',
    fontSize: 14,
  },

  uploading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  uploadingText: {
    marginLeft: 8,
    color: '#64748B',
  },

  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  fileName: {
    flex: 1,
    marginRight: 10,
    fontWeight: '700',
    color: '#172033',
  },

  status: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  pending: {
    backgroundColor: '#FEF3C7',
  },

  approved: {
    backgroundColor: '#DCFCE7',
  },

  rejected: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#172033',
  },

  date: {
    marginTop: 8,
    fontSize: 11,
    color: '#64748B',
  },

  reasonBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
  },

  reasonTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
  },

  reasonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#7F1D1D',
  },

  viewButton: {
    marginTop: 13,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    paddingVertical: 11,
    alignItems: 'center',
  },

  viewButtonText: {
    color: '#2563EB',
    fontWeight: '800',
    fontSize: 12,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '800',
    color: '#172033',
  },

  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },

});