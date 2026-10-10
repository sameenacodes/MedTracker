import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  confirmRemoval,
  getMedicines,
  verifyRemovalQR,
} from '../services/api';

import { getData } from '../services/storage';

export default function QRRemoval() {
  const router = useRouter();

  const [permission, requestPermission] =
    useCameraPermissions();

  const [expiredMedicines, setExpiredMedicines] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedMedicine, setSelectedMedicine] =
    useState(null);

  const [scanning, setScanning] =
    useState(false);

  const [scanned, setScanned] =
    useState(false);

  const [removing, setRemoving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [msgType, setMsgType] =
    useState('');

  const [activeTab, setActiveTab] =
    useState('list');

  // ================================
  // LOAD EXPIRED MEDICINES
  // ================================

  useEffect(() => {
    fetchExpiredMedicines();
  }, []);

  // ================================
  // MESSAGE
  // ================================

  const showMsg = (text, type) => {
    setMessage(text);
    setMsgType(type);

    setTimeout(() => {
      setMessage('');
    }, 4000);
  };

  // ================================
  // FETCH MEDICINES
  // ================================

  const fetchExpiredMedicines = async () => {
    setLoading(true);

    try {
      const result = await getMedicines();

      if (Array.isArray(result)) {
        const expired = result.filter(
          (medicine) =>
            medicine.status === 'expired' ||
            medicine.status === 'critical'
        );

        setExpiredMedicines(expired);
      } else {
        setExpiredMedicines([]);
      }
    } catch (err) {
      console.log(
        'Fetch expired medicines error:',
        err
      );

      setExpiredMedicines([]);

      showMsg(
        'Could not load medicines',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // SELECT MEDICINE
  // ================================

  const handleSelectMedicine = (medicine) => {
    setSelectedMedicine(medicine);
    setScanned(false);
    setScanning(false);
    setActiveTab('qr');
  };

  // ================================
  // START QR SCANNER
  // ================================

  const handleStartScan = async () => {
    try {
      if (!permission?.granted) {
        const result =
          await requestPermission();

        if (!result.granted) {
          showMsg(
            'Camera permission is required',
            'error'
          );

          return;
        }
      }

      setScanned(false);
      setScanning(true);
      setMessage('');
    } catch (err) {
      console.log(
        'Camera permission error:',
        err
      );

      showMsg(
        'Cannot access camera',
        'error'
      );
    }
  };

  // ================================
  // QR BARCODE SCANNED
  // ================================

  const handleBarcodeScan = async ({
    data,
  }) => {
    if (scanned) {
      return;
    }

    if (!data) {
      return;
    }

    setScanned(true);
    setScanning(false);

    showMsg(
      'Verifying QR code...',
      'warning'
    );

    try {
      const result =
        await verifyRemovalQR(data);

      // Invalid QR
      if (
        !result ||
        result.verified !== true ||
        !result.medicine
      ) {
        setScanned(false);

        showMsg(
          result?.message ||
            'Invalid medicine QR code',
          'error'
        );

        return;
      }

      const medicine =
        result.medicine;

      // Verify selected medicine
      if (
        selectedMedicine &&
        medicine._id !==
          selectedMedicine._id
      ) {
        setScanned(false);

        showMsg(
          'Wrong medicine box! QR does not match the selected medicine.',
          'error'
        );

        return;
      }

      // Verify batch
      if (
        selectedMedicine &&
        medicine.batchNumber !==
          selectedMedicine.batchNumber
      ) {
        setScanned(false);

        showMsg(
          'Batch number does not match!',
          'error'
        );

        return;
      }

      // Success
      setSelectedMedicine(medicine);
      setScanned(true);

      showMsg(
        'QR Verified! Correct medicine box.',
        'success'
      );
    } catch (err) {
      console.log(
        'QR scan verification error:',
        err
      );

      setScanned(false);

      showMsg(
        'Could not verify QR code. Check server connection.',
        'error'
      );
    }
  };

  // ================================
  // CONFIRM PHYSICAL REMOVAL
  // ================================

  const handleConfirmRemoval = async () => {
    if (!selectedMedicine) {
      showMsg(
        'Select a medicine first',
        'error'
      );

      return;
    }

    if (!scanned) {
      showMsg(
        'Scan the physical box QR first',
        'warning'
      );

      return;
    }

    const quantity =
      Number(
        selectedMedicine.quantity
      ) || 0;

    const sellingPrice =
      Number(
        selectedMedicine.sellingPrice
      ) || 0;

    const financialLoss =
      quantity * sellingPrice;

    Alert.alert(
      'Confirm Physical Removal',
      `Medicine: ${selectedMedicine.name}

Batch: ${selectedMedicine.batchNumber}

Quantity: ${quantity} units

Status: ${selectedMedicine.status.toUpperCase()}

Financial Loss: ₹${financialLoss}

The physical box must be removed from the pharmacy shelf.

Continue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Removal',
          style: 'destructive',
          onPress: performRemoval,
        },
      ]
    );
  };

  // ================================
  // PERFORM REMOVAL
  // ================================

  const performRemoval = async () => {
    setRemoving(true);

    try {
      const userData =
        await getData('user');

      let user = {};

      try {
        if (userData) {
          user =
            typeof userData === 'string'
              ? JSON.parse(userData)
              : userData;
        }
      } catch {
        user = {};
      }

      const result =
        await confirmRemoval(
          selectedMedicine._id,
          {
            medicineId:
              selectedMedicine._id,

            medicineName:
              selectedMedicine.name,

            batchNumber:
              selectedMedicine.batchNumber,

            reason: 'expired',

            removedBy:
              user?.name ||
              'Pharmacist',

            sellingPrice:
              selectedMedicine.sellingPrice,

            qrCode:
              selectedMedicine.qrCode,
          }
        );

      if (
        result &&
        result.success === true
      ) {
        const loss =
          Number(
            result.financialLoss
          ) || 0;

        showMsg(
          `${selectedMedicine.name} removed successfully! Loss recorded: ₹${loss}`,
          'success'
        );

        setExpiredMedicines(
          (previous) =>
            previous.filter(
              (medicine) =>
                medicine._id !==
                selectedMedicine._id
            )
        );

        setSelectedMedicine(null);
        setScanned(false);
        setScanning(false);
        setActiveTab('list');

        setTimeout(() => {
          fetchExpiredMedicines();
        }, 500);
      } else {
        showMsg(
          result?.message ||
            'Failed to remove medicine',
          'error'
        );
      }
    } catch (err) {
      console.log(
        'Confirm removal error:',
        err
      );

      showMsg(
        'Cannot connect to server',
        'error'
      );
    } finally {
      setRemoving(false);
    }
  };

  // ================================
  // FORMAT DATE
  // ================================

  const formatDate = (date) => {
    if (!date) {
      return 'Unknown';
    }

    try {
      return new Date(
        date
      ).toLocaleDateString('en-IN');
    } catch {
      return 'Unknown';
    }
  };

  // ================================
  // STATUS COLORS
  // ================================

  const getStatusColor = (status) => {
    return status === 'expired'
      ? '#D92D20'
      : '#B77900';
  };

  const getStatusBackground = (status) => {
    return status === 'expired'
      ? '#FEF3F2'
      : '#FFF8E7';
  };

  // ================================
  // UI
  // ================================

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>
            ←
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            QR Removal
          </Text>

          <Text style={styles.headerSubtitle}>
            Physical medicine removal
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Message */}
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
          <View
            style={[
              styles.messageDot,
              msgType === 'success'
                ? styles.dotSuccess
                : msgType === 'warning'
                ? styles.dotWarning
                : styles.dotError,
            ]}
          />

          <Text style={styles.messageText}>
            {message}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'list' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setActiveTab('list')
          }
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'list' &&
                styles.activeTabText,
            ]}
          >
            Expired List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'qr' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setActiveTab('qr')
          }
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'qr' &&
                styles.activeTabText,
            ]}
          >
            Scan & Remove
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =================================
            EXPIRED LIST
        ================================= */}

        {activeTab === 'list' && (
          <View>

            {/* Information */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIcon}>
                  i
                </Text>
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Physical removal process
                </Text>

                <Text style={styles.infoText}>
                  Select an expired or critical
                  medicine, then scan the QR
                  code attached to its physical
                  box before removal.
                </Text>
              </View>
            </View>

            {/* Loading */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator
                  color="#176B52"
                  size="large"
                />

                <Text style={styles.loadingText}>
                  Loading medicines...
                </Text>
              </View>
            ) : expiredMedicines.length === 0 ? (

              /* Empty */
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Text style={styles.emptyIcon}>
                    ✓
                  </Text>
                </View>

                <Text style={styles.emptyTitle}>
                  No Expired Medicines
                </Text>

                <Text style={styles.emptyText}>
                  There are no expired or critical
                  medicines requiring physical
                  removal.
                </Text>
              </View>

            ) : (

              /* Medicine List */
              expiredMedicines.map((med) => {
                const quantity =
                  Number(med.quantity) || 0;

                const price =
                  Number(
                    med.sellingPrice
                  ) || 0;

                const loss =
                  quantity * price;

                const statusColor =
                  getStatusColor(
                    med.status
                  );

                const statusBackground =
                  getStatusBackground(
                    med.status
                  );

                return (
                  <View
                    key={med._id}
                    style={[
                      styles.medicineCard,
                      {
                        borderLeftColor:
                          statusColor,
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.medicineTop
                      }
                    >
                      <View
                        style={
                          styles.medicineDetails
                        }
                      >
                        <Text
                          style={
                            styles.medicineName
                          }
                        >
                          {med.name}
                        </Text>

                        {med.brand && (
                          <Text
                            style={
                              styles.medicineBrand
                            }
                          >
                            {med.brand}
                          </Text>
                        )}

                        <View
                          style={
                            styles.detailRow
                          }
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
                          >
                            {med.batchNumber}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailRow
                          }
                        >
                          <Text
                            style={
                              styles.detailLabel
                            }
                          >
                            Expiry
                          </Text>

                          <Text
                            style={[
                              styles.detailValue,
                              {
                                color:
                                  statusColor,
                              },
                            ]}
                          >
                            {formatDate(
                              med.expiryDate
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailRow
                          }
                        >
                          <Text
                            style={
                              styles.detailLabel
                            }
                          >
                            Quantity
                          </Text>

                          <Text
                            style={
                              styles.detailValue
                            }
                          >
                            {quantity} units
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.medicineRight
                        }
                      >
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                statusBackground,
                              borderColor:
                                statusColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  statusColor,
                              },
                            ]}
                          >
                            {med.status ===
                            'expired'
                              ? 'EXPIRED'
                              : 'CRITICAL'}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.lossLabel
                          }
                        >
                          Loss
                        </Text>

                        <Text
                          style={[
                            styles.lossValue,
                            {
                              color:
                                statusColor,
                            },
                          ]}
                        >
                          ₹{loss}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.selectButton
                      }
                      onPress={() =>
                        handleSelectMedicine(
                          med
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={
                          styles.selectButtonText
                        }
                      >
                        Select & Scan Box QR
                      </Text>

                      <Text
                        style={
                          styles.selectArrow
                        }
                      >
                        →
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* =================================
            SCAN & REMOVE
        ================================= */}

        {activeTab === 'qr' && (
          <View>

            {!selectedMedicine ? (

              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Text style={styles.emptyIcon}>
                    QR
                  </Text>
                </View>

                <Text style={styles.emptyTitle}>
                  Select a Medicine
                </Text>

                <Text style={styles.emptyText}>
                  Go to the expired list and
                  select the medicine whose
                  physical box you want to remove.
                </Text>

                <TouchableOpacity
                  style={
                    styles.goListButton
                  }
                  onPress={() =>
                    setActiveTab('list')
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      styles.goListButtonText
                    }
                  >
                    Go to Expired List
                  </Text>
                </TouchableOpacity>
              </View>

            ) : (

              <View>

                {/* Selected Medicine */}
                <View
                  style={
                    styles.selectedCard
                  }
                >
                  <View
                    style={
                      styles.selectedHeader
                    }
                  >
                    <Text
                      style={
                        styles.selectedLabel
                      }
                    >
                      SELECTED MEDICINE
                    </Text>

                    <View
                      style={
                        styles.selectedStatus
                      }
                    >
                      <Text
                        style={
                          styles.selectedStatusText
                        }
                      >
                        {selectedMedicine.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.selectedName
                    }
                  >
                    {selectedMedicine.name}
                  </Text>

                  {selectedMedicine.brand && (
                    <Text
                      style={
                        styles.selectedBrand
                      }
                    >
                      {selectedMedicine.brand}
                    </Text>
                  )}

                  <View
                    style={
                      styles.selectedDetails
                    }
                  >
                    <View style={styles.selectedDetail}>
                      <Text
                        style={
                          styles.selectedDetailLabel
                        }
                      >
                        Batch
                      </Text>

                      <Text
                        style={
                          styles.selectedDetailValue
                        }
                      >
                        {
                          selectedMedicine.batchNumber
                        }
                      </Text>
                    </View>

                    <View style={styles.selectedDetail}>
                      <Text
                        style={
                          styles.selectedDetailLabel
                        }
                      >
                        Expiry
                      </Text>

                      <Text
                        style={
                          styles.selectedDetailValue
                        }
                      >
                        {formatDate(
                          selectedMedicine.expiryDate
                        )}
                      </Text>
                    </View>

                    <View style={styles.selectedDetail}>
                      <Text
                        style={
                          styles.selectedDetailLabel
                        }
                      >
                        Quantity
                      </Text>

                      <Text
                        style={
                          styles.selectedDetailValue
                        }
                      >
                        {
                          selectedMedicine.quantity
                        }
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Physical Box Instruction */}
                <View
                  style={
                    styles.instructionCard
                  }
                >
                  <View
                    style={
                      styles.instructionIconBox
                    }
                  >
                    <Text
                      style={
                        styles.instructionIcon
                      }
                    >
                      1
                    </Text>
                  </View>

                  <View
                    style={
                      styles.instructionContent
                    }
                  >
                    <Text
                      style={
                        styles.instructionTitle
                      }
                    >
                      Find the Physical Box
                    </Text>

                    <Text
                      style={
                        styles.instructionText
                      }
                    >
                      Find the exact medicine box
                      on the pharmacy shelf using
                      the medicine name and batch
                      number shown above.
                    </Text>

                    <Text
                      style={
                        styles.instructionText
                      }
                    >
                      Then scan the QR sticker
                      attached to that physical box.
                    </Text>
                  </View>
                </View>

                {/* Scanner Card */}
                <View
                  style={
                    styles.scannerCard
                  }
                >
                  <View
                    style={
                      styles.scannerHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.scannerTitle
                        }
                      >
                        Verify Physical Box
                      </Text>

                      <Text
                        style={
                          styles.scannerSubtitle
                        }
                      >
                        QR must match this medicine
                        and batch
                      </Text>
                    </View>

                    <View
                      style={
                        styles.scannerIconBox
                      }
                    >
                      <Text
                        style={
                          styles.scannerIcon
                        }
                      >
                        QR
                      </Text>
                    </View>
                  </View>

                  {!scanning ? (

                    <TouchableOpacity
                      style={
                        styles.scanButton
                      }
                      onPress={
                        handleStartScan
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={
                          styles.scanButtonText
                        }
                      >
                        Scan Physical Box QR
                      </Text>

                      <Text
                        style={
                          styles.scanButtonArrow
                        }
                      >
                        →
                      </Text>
                    </TouchableOpacity>

                  ) : (

                    <View
                      style={
                        styles.cameraContainer
                      }
                    >
                      <CameraView
                        style={
                          styles.camera
                        }
                        facing="back"
                        onBarcodeScanned={
                          handleBarcodeScan
                        }
                        barcodeScannerSettings={{
                          barcodeTypes:
                            ['qr'],
                        }}
                      />

                      <View
                        style={
                          styles.scanOverlay
                        }
                      >
                        <View
                          style={
                            styles.scanFrame
                          }
                        />

                        <Text
                          style={
                            styles.scanOverlayText
                          }
                        >
                          Place QR inside the frame
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={
                          styles.cancelScanButton
                        }
                        onPress={() =>
                          setScanning(false)
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={
                            styles.cancelScanText
                          }
                        >
                          Cancel Scan
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Verified */}
                  {scanned && (
                    <View
                      style={
                        styles.verifiedCard
                      }
                    >
                      <View
                        style={
                          styles.verifiedIcon
                        }
                      >
                        <Text
                          style={
                            styles.verifiedIconText
                          }
                        >
                          ✓
                        </Text>
                      </View>

                      <View
                        style={
                          styles.verifiedContent
                        }
                      >
                        <Text
                          style={
                            styles.verifiedTitle
                          }
                        >
                          QR Code Verified
                        </Text>

                        <Text
                          style={
                            styles.verifiedText
                          }
                        >
                          Correct physical medicine
                          box identified.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Confirm Removal */}
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!scanned ||
                      removing) &&
                      styles.confirmButtonDisabled,
                  ]}
                  onPress={
                    handleConfirmRemoval
                  }
                  disabled={
                    !scanned || removing
                  }
                  activeOpacity={0.8}
                >
                  {removing ? (
                    <View
                      style={
                        styles.loadingRow
                      }
                    >
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />

                      <Text
                        style={
                          styles.confirmButtonText
                        }
                      >
                        Removing...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={
                        styles.confirmButtonText
                      }
                    >
                      Confirm Physical Removal
                    </Text>
                  )}
                </TouchableOpacity>

                {!scanned && (
                  <View
                    style={
                      styles.scanHintBox
                    }
                  >
                    <Text
                      style={
                        styles.scanHintText
                      }
                    >
                      Scan and verify the physical
                      box QR before confirming removal.
                    </Text>
                  </View>
                )}

                {/* Back */}
                <TouchableOpacity
                  style={
                    styles.backToListButton
                  }
                  onPress={() => {
                    setScanning(false);
                    setScanned(false);
                    setSelectedMedicine(null);
                    setActiveTab('list');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      styles.backToListText
                    }
                  >
                    ← Choose Another Medicine
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

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

  backButton: {
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
  // MESSAGE
  // ================================

  messageBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  messageSuccess: {
    backgroundColor: '#EAF6F1',
    borderWidth: 1,
    borderColor: '#B9DDCF',
  },

  messageWarning: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0D79B',
  },

  messageError: {
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#F2C5C2',
  },

  messageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 9,
  },

  dotSuccess: {
    backgroundColor: '#176B52',
  },

  dotWarning: {
    backgroundColor: '#B77900',
  },

  dotError: {
    backgroundColor: '#D92D20',
  },

  messageText: {
    flex: 1,
    color: '#34413A',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 17,
  },

  // ================================
  // TABS
  // ================================

  tabContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    backgroundColor: '#E9EEEB',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
  },

  tab: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  tabText: {
    color: '#7B8781',
    fontSize: 11,
    fontWeight: '700',
  },

  activeTabText: {
    color: '#176B52',
  },

  // ================================
  // INFO
  // ================================

  infoCard: {
    backgroundColor: '#EAF6F1',
    borderRadius: 15,
    padding: 14,
    flexDirection: 'row',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CFE6DC',
  },

  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  infoIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },

  infoText: {
    color: '#53645B',
    fontSize: 10,
    lineHeight: 17,
  },

  // ================================
  // LOADING
  // ================================

  loadingBox: {
    alignItems: 'center',
    paddingVertical: 55,
  },

  loadingText: {
    color: '#718078',
    fontSize: 12,
    marginTop: 12,
  },

  // ================================
  // EMPTY
  // ================================

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E4EAE7',
    alignItems: 'center',
    padding: 32,
    marginTop: 4,
  },

  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyIcon: {
    color: '#176B52',
    fontSize: 19,
    fontWeight: '800',
  },

  emptyTitle: {
    color: '#17201C',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 7,
    textAlign: 'center',
  },

  emptyText: {
    color: '#7A8781',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },

  goListButton: {
    backgroundColor: '#176B52',
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 18,
  },

  goListButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // ================================
  // MEDICINE CARD
  // ================================

  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E4EAE7',
    borderRightColor: '#E4EAE7',
    borderBottomColor: '#E4EAE7',
  },

  medicineTop: {
    flexDirection: 'row',
    marginBottom: 13,
  },

  medicineDetails: {
    flex: 1,
    paddingRight: 8,
  },

  medicineName: {
    color: '#17201C',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },

  medicineBrand: {
    color: '#7A8781',
    fontSize: 10,
    marginBottom: 7,
  },

  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },

  detailLabel: {
    width: 58,
    color: '#9AA59F',
    fontSize: 9,
    fontWeight: '600',
  },

  detailValue: {
    color: '#536059',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },

  medicineRight: {
    alignItems: 'flex-end',
    minWidth: 72,
  },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 8,
    fontWeight: '800',
  },

  lossLabel: {
    color: '#9AA59F',
    fontSize: 9,
    marginTop: 10,
  },

  lossValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },

  selectButton: {
    backgroundColor: '#EAF6F1',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectButtonText: {
    color: '#176B52',
    fontSize: 11,
    fontWeight: '800',
  },

  selectArrow: {
    color: '#176B52',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 7,
  },

  // ================================
  // SELECTED MEDICINE
  // ================================

  selectedCard: {
    backgroundColor: '#176B52',
    borderRadius: 17,
    padding: 17,
    marginBottom: 14,
  },

  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectedLabel: {
    color: '#CBE5DA',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  selectedStatus: {
    backgroundColor: '#D92D20',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  selectedStatusText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },

  selectedName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 9,
  },

  selectedBrand: {
    color: '#CBE5DA',
    fontSize: 10,
    marginTop: 3,
  },

  selectedDetails: {
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
  },

  selectedDetail: {
    flex: 1,
  },

  selectedDetailLabel: {
    color: '#A9D3C4',
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 4,
  },

  selectedDetailValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // ================================
  // INSTRUCTION
  // ================================

  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4EAE7',
    flexDirection: 'row',
  },

  instructionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  instructionIcon: {
    color: '#176B52',
    fontSize: 13,
    fontWeight: '800',
  },

  instructionContent: {
    flex: 1,
  },

  instructionTitle: {
    color: '#17201C',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },

  instructionText: {
    color: '#68756E',
    fontSize: 10,
    lineHeight: 17,
    marginBottom: 6,
  },

  // ================================
  // SCANNER
  // ================================

  scannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4EAE7',
  },

  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  scannerTitle: {
    color: '#17201C',
    fontSize: 15,
    fontWeight: '800',
  },

  scannerSubtitle: {
    color: '#7A8781',
    fontSize: 10,
    marginTop: 3,
  },

  scannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scannerIcon: {
    color: '#176B52',
    fontSize: 10,
    fontWeight: '800',
  },

  scanButton: {
    backgroundColor: '#176B52',
    borderRadius: 11,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  scanButtonArrow: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 8,
  },

  cameraContainer: {
    height: 310,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#101413',
    position: 'relative',
  },

  camera: {
    flex: 1,
  },

  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanFrame: {
    width: 210,
    height: 210,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },

  scanOverlayText: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 10,
    fontWeight: '700',
  },

  cancelScanButton: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },

  cancelScanText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // ================================
  // VERIFIED
  // ================================

  verifiedCard: {
    backgroundColor: '#EAF6F1',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B9DDCF',
  },

  verifiedIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  verifiedIconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  verifiedContent: {
    flex: 1,
  },

  verifiedTitle: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '800',
  },

  verifiedText: {
    color: '#5C7066',
    fontSize: 10,
    marginTop: 3,
  },

  // ================================
  // CONFIRM
  // ================================

  confirmButton: {
    backgroundColor: '#D92D20',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  confirmButtonDisabled: {
    backgroundColor: '#B8C1BC',
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scanHintBox: {
    backgroundColor: '#FFF8E7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0D79B',
  },

  scanHintText: {
    color: '#8A6800',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
  },

  backToListButton: {
    borderWidth: 1,
    borderColor: '#C8D4CE',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },

  backToListText: {
    color: '#176B52',
    fontSize: 11,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 35,
  },
});