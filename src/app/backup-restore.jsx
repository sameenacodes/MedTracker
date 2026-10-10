import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    downloadBackup,
    getBackupInfo,
    restoreBackup,
} from '../services/api';

import { getData } from '../services/storage';


// ============================================================
// COLORS
// ============================================================

const COLORS = {
  primary: '#176B52',
  primaryLight: '#EAF5F1',

  background: '#F7F9F8',
  white: '#FFFFFF',

  text: '#17211D',
  muted: '#6B756F',

  border: '#E2E8E4',

  red: '#D64545',
  redLight: '#FFF0F0',

  amber: '#C98200',
  amberLight: '#FFF7E6',

  green: '#176B52',
  greenLight: '#EAF5F1',
};


// ============================================================
// MAIN SCREEN
// ============================================================

export default function BackupRestore() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] =
    useState(false);

  const [restoring, setRestoring] =
    useState(false);

  const [backupInfo, setBackupInfo] =
    useState(null);

  const [selectedBackup, setSelectedBackup] =
    useState(null);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [userRole, setUserRole] =
    useState(null);


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    loadScreen();
  }, []);


  const loadScreen = async () => {

    try {

      setLoading(true);
      setError('');
      setMessage('');

      const storedUser =
        await getData('user');

      let role = null;

      if (storedUser) {

        try {

          const parsed =
            typeof storedUser === 'string'
              ? JSON.parse(storedUser)
              : storedUser;

          role =
            parsed?.role ||
            null;

        } catch {
          role = null;
        }
      }

      setUserRole(role);

      if (role !== 'admin') {

        setError(
          'Only administrators can access Backup & Restore.'
        );

        return;
      }


      const result =
        await getBackupInfo();

      setBackupInfo(result);

    } catch (err) {

      console.log(
        'Backup screen error:',
        err
      );

      setError(
        err?.message ||
        'Failed to load backup information.'
      );

    } finally {

      setLoading(false);
    }
  };


  // ==========================================================
  // DOWNLOAD BACKUP
  // ==========================================================

  const handleDownloadBackup =
    async () => {

      try {

        setDownloading(true);
        setError('');
        setMessage('');

        const backupText =
          await downloadBackup();

        if (!backupText) {
          throw new Error(
            'Backup file is empty.'
          );
        }


        const fileName =
          `medtracker-backup-${new Date()
            .toISOString()
            .slice(0, 10)}.json`;


        // ----------------------------------------------------
        // WEB
        // ----------------------------------------------------

        if (
          Platform.OS === 'web'
        ) {

          const blob =
            new Blob(
              [backupText],
              {
                type:
                  'application/json',
              }
            );

          const url =
            URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              'a'
            );

          link.href = url;
          link.download =
            fileName;

          document.body.appendChild(
            link
          );

          link.click();

          document.body.removeChild(
            link
          );

          URL.revokeObjectURL(
            url
          );

        }

        // ----------------------------------------------------
        // MOBILE
        // ----------------------------------------------------

        else {

          Alert.alert(
            'Backup Created',
            'The backup JSON was successfully generated. Use your device file-sharing/download option to save it.'
          );

          console.log(
            'Backup JSON:',
            backupText
          );
        }


        setMessage(
          'Backup created successfully.'
        );

      } catch (err) {

        console.log(
          'Backup download error:',
          err
        );

        setError(
          err?.message ||
          'Failed to create backup.'
        );

      } finally {

        setDownloading(false);
      }
    };


  // ==========================================================
  // SELECT BACKUP FILE
  // ==========================================================

  const handleSelectBackup =
    async () => {

      try {

        setError('');
        setMessage('');
        setSelectedBackup(null);


        const result =
          await DocumentPicker.getDocumentAsync({
            type:
              'application/json',
            copyToCacheDirectory:
              true,
            multiple:
              false,
          });


        if (
          result.canceled
        ) {
          return;
        }


        const file =
          result.assets?.[0];


        if (!file?.uri) {

          throw new Error(
            'Unable to read selected file.'
          );
        }


        const fileName =
          file.name ||
          'backup.json';


        if (
          !fileName
            .toLowerCase()
            .endsWith('.json')
        ) {

          throw new Error(
            'Please select a valid JSON backup file.'
          );
        }


        const response =
          await fetch(
            file.uri
          );

        const text =
          await response.text();


        if (!text) {

          throw new Error(
            'Selected backup file is empty.'
          );
        }


        let backupData;

        try {

          backupData =
            JSON.parse(text);

        } catch {

          throw new Error(
            'Invalid JSON backup file.'
          );
        }


        // ----------------------------------------------------
        // BASIC BACKUP VALIDATION
        // ----------------------------------------------------

        if (
          backupData?.app !==
          'MedTracker'
        ) {

          throw new Error(
            'This file is not a valid MedTracker backup.'
          );
        }


        if (
          backupData?.backupVersion !==
          1
        ) {

          throw new Error(
            'Unsupported MedTracker backup version.'
          );
        }


        if (
          !backupData?.collections
        ) {

          throw new Error(
            'Backup collections are missing.'
          );
        }


        const collections =
          backupData.collections;


        let totalDocuments = 0;


        Object.values(
          collections
        ).forEach(
          (items) => {

            if (
              Array.isArray(items)
            ) {
              totalDocuments +=
                items.length;
            }
          }
        );


        setSelectedBackup({
          fileName,
          backupData,
          totalDocuments,
          collections:
            Object.keys(
              collections
            ),
        });


        setMessage(
          'Backup file selected successfully.'
        );

      } catch (err) {

        console.log(
          'Select backup error:',
          err
        );

        setError(
          err?.message ||
          'Failed to read backup file.'
        );
      }
    };


  // ==========================================================
  // RESTORE BACKUP
  // ==========================================================

  const performRestore =
    async () => {

      if (
        !selectedBackup?.backupData
      ) {
        return;
      }


      try {

        setRestoring(true);
        setError('');
        setMessage('');


        const result =
          await restoreBackup(
            selectedBackup.backupData
          );


        setSelectedBackup(null);


        setMessage(
          result?.message ||
          'Backup restored successfully.'
        );


        await loadScreen();

      } catch (err) {

        console.log(
          'Restore error:',
          err
        );

        setError(
          err?.message ||
          'Failed to restore backup.'
        );

      } finally {

        setRestoring(false);
      }
    };


  // ==========================================================
  // CONFIRM RESTORE
  // ==========================================================

  const handleRestore =
    () => {

      if (
        !selectedBackup
      ) {
        return;
      }


      const confirmMessage =
        `This will replace the current MedTracker data with the selected backup.\n\n` +
        `File: ${selectedBackup.fileName}\n` +
        `Documents: ${selectedBackup.totalDocuments}\n\n` +
        `This action cannot be undone.`;


      if (
        Platform.OS === 'web'
      ) {

        const confirmed =
          window.confirm(
            confirmMessage
          );

        if (confirmed) {
          performRestore();
        }

        return;
      }


      Alert.alert(
        'Restore Backup?',
        confirmMessage,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Restore',
            style: 'destructive',
            onPress:
              performRestore,
          },
        ]
      );
    };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
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
          Loading backup information...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // ADMIN CHECK
  // ==========================================================

  if (
    userRole !== 'admin'
  ) {

    return (
      <View
        style={
          styles.centerContainer
        }
      >

        <View
          style={
            styles.accessIcon
          }
        >

          <Ionicons
            name="lock-closed-outline"
            size={30}
            color={
              COLORS.red
            }
          />

        </View>


        <Text
          style={
            styles.accessTitle
          }
        >
          Admin Access Required
        </Text>


        <Text
          style={
            styles.accessText
          }
        >
          Only administrators can
          access Backup & Restore.
        </Text>


        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >

          <Text
            style={
              styles.backButtonText
            }
          >
            Go Back
          </Text>

        </Pressable>

      </View>
    );
  }


  // ==========================================================
  // DATA HELPERS
  // ==========================================================

  const getCount = (
    key
  ) => {

    return (
      backupInfo?.collections?.[key] ??
      backupInfo?.counts?.[key] ??
      0
    );
  };


  const total =
    backupInfo?.total ??
    Object.values(
      backupInfo?.collections || {}
    ).reduce(
      (sum, value) =>
        sum +
        Number(value || 0),
      0
    );


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <ScrollView
      style={
        styles.container
      }
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
    >

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <View
        style={
          styles.header
        }
      >

        <Pressable
          style={
            styles.backIcon
          }
          onPress={() =>
            router.back()
          }
        >

          <Ionicons
            name="arrow-back"
            size={22}
            color={
              COLORS.text
            }
          />

        </Pressable>


        <View
          style={
            styles.headerText
          }
        >

          <Text
            style={
              styles.eyebrow
            }
          >
            DATA MANAGEMENT
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Backup & Restore
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Protect your important
            pharmacy data.
          </Text>

        </View>

      </View>


      {/* ================================================== */}
      {/* INFO */}
      {/* ================================================== */}

      <View
        style={
          styles.infoCard
        }
      >

        <View
          style={
            styles.infoIcon
          }
        >

          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color={
              COLORS.primary
            }
          />

        </View>


        <View
          style={
            styles.infoContent
          }
        >

          <Text
            style={
              styles.infoTitle
            }
          >
            Keep your data safe
          </Text>

          <Text
            style={
              styles.infoText
            }
          >
            Create a complete JSON backup
            of your MedTracker database and
            restore it when required.
          </Text>

        </View>

      </View>


      {/* ================================================== */}
      {/* MESSAGE */}
      {/* ================================================== */}

      {!!message && (

        <View
          style={
            styles.successMessage
          }
        >

          <Ionicons
            name="checkmark-circle"
            size={20}
            color={
              COLORS.green
            }
          />

          <Text
            style={
              styles.successText
            }
          >
            {message}
          </Text>

        </View>

      )}


      {!!error && (

        <View
          style={
            styles.errorMessage
          }
        >

          <Ionicons
            name="alert-circle"
            size={20}
            color={
              COLORS.red
            }
          />

          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>

        </View>

      )}


      {/* ================================================== */}
      {/* DATABASE SUMMARY */}
      {/* ================================================== */}

      <View
        style={
          styles.section
        }
      >

        <Text
          style={
            styles.sectionTitle
          }
        >
          Current Data
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          Records currently stored in
          MedTracker.
        </Text>


        <View
          style={
            styles.totalCard
          }
        >

          <View
            style={
              styles.totalIcon
            }
          >

            <Ionicons
              name="server-outline"
              size={24}
              color={
                COLORS.primary
              }
            />

          </View>


          <View
            style={
              styles.totalText
            }
          >

            <Text
              style={
                styles.totalLabel
              }
            >
              Total Records
            </Text>

            <Text
              style={
                styles.totalValue
              }
            >
              {total}
            </Text>

          </View>

        </View>


        <View
          style={
            styles.grid
          }
        >

          <DataCard
            icon="medkit-outline"
            label="Medicines"
            value={
              getCount(
                'medicines'
              )
            }
          />

          <DataCard
            icon="cart-outline"
            label="Sales"
            value={
              getCount(
                'sales'
              )
            }
          />

          <DataCard
            icon="people-outline"
            label="Users"
            value={
              getCount(
                'users'
              )
            }
          />

          <DataCard
            icon="receipt-outline"
            label="Invoices"
            value={
              getCount(
                'invoices'
              )
            }
          />

          <DataCard
            icon="business-outline"
            label="Suppliers"
            value={
              getCount(
                'suppliers'
              )
            }
          />

          <DataCard
            icon="notifications-outline"
            label="Alerts"
            value={
              getCount(
                'alerts'
              )
            }
          />

        </View>

      </View>


      {/* ================================================== */}
      {/* CREATE BACKUP */}
      {/* ================================================== */}

      <View
        style={
          styles.actionCard
        }
      >

        <View
          style={
            styles.actionIcon
          }
        >

          <Ionicons
            name="cloud-download-outline"
            size={26}
            color={
              COLORS.primary
            }
          />

        </View>


        <View
          style={
            styles.actionContent
          }
        >

          <Text
            style={
              styles.actionTitle
            }
          >
            Create Backup
          </Text>

          <Text
            style={
              styles.actionDescription
            }
          >
            Export your MedTracker data
            as a JSON backup file.
          </Text>

        </View>


        <Pressable
          style={[
            styles.primaryButton,
            downloading &&
              styles.disabledButton,
          ]}
          onPress={
            handleDownloadBackup
          }
          disabled={
            downloading
          }
        >

          {downloading ? (

            <ActivityIndicator
              size="small"
              color={
                COLORS.white
              }
            />

          ) : (

            <>

              <Ionicons
                name="download-outline"
                size={18}
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Backup
              </Text>

            </>

          )}

        </Pressable>

      </View>


      {/* ================================================== */}
      {/* RESTORE */}
      {/* ================================================== */}

      <View
        style={
          styles.restoreCard
        }
      >

        <View
          style={
            styles.restoreHeader
          }
        >

          <View
            style={
              styles.restoreIcon
            }
          >

            <Ionicons
              name="cloud-upload-outline"
              size={26}
              color={
                COLORS.amber
              }
            />

          </View>


          <View
            style={
              styles.actionContent
            }
          >

            <Text
              style={
                styles.actionTitle
              }
            >
              Restore Backup
            </Text>

            <Text
              style={
                styles.actionDescription
              }
            >
              Restore MedTracker using a
              previously exported JSON file.
            </Text>

          </View>

        </View>


        {/* WARNING */}

        <View
          style={
            styles.warningBox
          }
        >

          <Ionicons
            name="warning-outline"
            size={20}
            color={
              COLORS.amber
            }
          />

          <Text
            style={
              styles.warningText
            }
          >
            Restoring a backup replaces
            existing database data. Make
            sure you select the correct
            backup file.
          </Text>

        </View>


        {/* SELECT BUTTON */}

        <Pressable
          style={
            styles.secondaryButton
          }
          onPress={
            handleSelectBackup
          }
          disabled={
            restoring
          }
        >

          <Ionicons
            name="document-attach-outline"
            size={19}
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Select Backup File
          </Text>

        </Pressable>


        {/* SELECTED BACKUP */}

        {selectedBackup && (

          <View
            style={
              styles.selectedFile
            }
          >

            <View
              style={
                styles.fileIcon
              }
            >

              <Ionicons
                name="document-text-outline"
                size={22}
                color={
                  COLORS.primary
                }
              />

            </View>


            <View
              style={
                styles.fileInfo
              }
            >

              <Text
                style={
                  styles.fileName
                }
                numberOfLines={
                  1
                }
              >
                {
                  selectedBackup.fileName
                }
              </Text>

              <Text
                style={
                  styles.fileMeta
                }
              >
                {
                  selectedBackup.totalDocuments
                }{' '}
                records
              </Text>

            </View>


            <Pressable
              style={
                styles.removeFileButton
              }
              onPress={() =>
                setSelectedBackup(
                  null
                )
              }
            >

              <Ionicons
                name="close-circle"
                size={23}
                color={
                  COLORS.red
                }
              />

            </Pressable>

          </View>

        )}


        {/* RESTORE BUTTON */}

        <Pressable
          style={[
            styles.restoreButton,
            (!selectedBackup ||
              restoring) &&
              styles.disabledRestore,
          ]}
          onPress={
            handleRestore
          }
          disabled={
            !selectedBackup ||
            restoring
          }
        >

          {restoring ? (

            <ActivityIndicator
              size="small"
              color={
                COLORS.white
              }
            />

          ) : (

            <>

              <Ionicons
                name="refresh-outline"
                size={19}
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.restoreButtonText
                }
              >
                Restore Backup
              </Text>

            </>

          )}

        </Pressable>

      </View>


      {/* ================================================== */}
      {/* FOOTER NOTE */}
      {/* ================================================== */}

      <View
        style={
          styles.footerNote
        }
      >

        <Ionicons
          name="information-circle-outline"
          size={18}
          color={
            COLORS.muted
          }
        />

        <Text
          style={
            styles.footerText
          }
        >
          Backup and restore operations
          are restricted to administrators.
        </Text>

      </View>

    </ScrollView>
  );
}


// ============================================================
// DATA CARD
// ============================================================

function DataCard({
  icon,
  label,
  value,
}) {

  return (

    <View
      style={
        styles.dataCard
      }
    >

      <View
        style={
          styles.dataIcon
        }
      >

        <Ionicons
          name={icon}
          size={19}
          color={
            COLORS.primary
          }
        />

      </View>


      <View>

        <Text
          style={
            styles.dataLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.dataValue
          }
        >
          {value}
        </Text>

      </View>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color:
      COLORS.primary,
    marginBottom: 4,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color:
      COLORS.text,
  },

  subtitle: {
    fontSize: 13,
    color:
      COLORS.muted,
    marginTop: 4,
  },


  // ----------------------------------------------------------
  // INFO
  // ----------------------------------------------------------

  infoCard: {
    flexDirection: 'row',
    backgroundColor:
      COLORS.primaryLight,
    borderWidth: 1,
    borderColor:
      '#CDE6DD',
    borderRadius: 16,
    padding: 17,
    marginBottom: 22,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor:
      COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color:
      COLORS.text,
    marginBottom: 4,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color:
      COLORS.muted,
  },


  // ----------------------------------------------------------
  // MESSAGES
  // ----------------------------------------------------------

  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.greenLight,
    borderWidth: 1,
    borderColor:
      '#CDE6DD',
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },

  successText: {
    flex: 1,
    fontSize: 13,
    color:
      COLORS.green,
    marginLeft: 9,
    fontWeight: '600',
  },

  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.redLight,
    borderWidth: 1,
    borderColor:
      '#F3CCCC',
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    color:
      COLORS.red,
    marginLeft: 9,
    fontWeight: '600',
  },


  // ----------------------------------------------------------
  // SECTION
  // ----------------------------------------------------------

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color:
      COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    color:
      COLORS.muted,
    marginTop: 4,
    marginBottom: 14,
  },


  // ----------------------------------------------------------
  // TOTAL
  // ----------------------------------------------------------

  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  totalIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  totalText: {
    flex: 1,
  },

  totalLabel: {
    fontSize: 12,
    color:
      COLORS.muted,
  },

  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color:
      COLORS.text,
    marginTop: 2,
  },


  // ----------------------------------------------------------
  // GRID
  // ----------------------------------------------------------

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  dataCard: {
    width:
      Platform.OS === 'web'
        ? '31.8%'
        : '48%',
    minWidth: 130,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    padding: 13,
  },

  dataIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  dataLabel: {
    fontSize: 11,
    color:
      COLORS.muted,
  },

  dataValue: {
    fontSize: 18,
    fontWeight: '800',
    color:
      COLORS.text,
    marginTop: 2,
  },


  // ----------------------------------------------------------
  // ACTION CARDS
  // ----------------------------------------------------------

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color:
      COLORS.text,
  },

  actionDescription: {
    fontSize: 12,
    lineHeight: 17,
    color:
      COLORS.muted,
    marginTop: 4,
  },


  // ----------------------------------------------------------
  // PRIMARY BUTTON
  // ----------------------------------------------------------

  primaryButton: {
    minWidth: 105,
    height: 42,
    borderRadius: 11,
    backgroundColor:
      COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    gap: 7,
  },

  primaryButtonText: {
    color:
      COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.55,
  },


  // ----------------------------------------------------------
  // RESTORE CARD
  // ----------------------------------------------------------

  restoreCard: {
    backgroundColor:
      COLORS.white,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 16,
    padding: 17,
    marginBottom: 18,
  },

  restoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  restoreIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor:
      COLORS.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },


  // ----------------------------------------------------------
  // WARNING
  // ----------------------------------------------------------

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor:
      COLORS.amberLight,
    borderWidth: 1,
    borderColor:
      '#F0D99D',
    borderRadius: 12,
    padding: 12,
    marginTop: 17,
    marginBottom: 13,
  },

  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color:
      '#7A5700',
    marginLeft: 8,
  },


  // ----------------------------------------------------------
  // SECONDARY BUTTON
  // ----------------------------------------------------------

  secondaryButton: {
    height: 45,
    borderRadius: 11,
    borderWidth: 1,
    borderColor:
      COLORS.primary,
    backgroundColor:
      COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color:
      COLORS.primary,
  },


  // ----------------------------------------------------------
  // SELECTED FILE
  // ----------------------------------------------------------

  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.primaryLight,
    borderWidth: 1,
    borderColor:
      '#CDE6DD',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },

  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor:
      COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  fileInfo: {
    flex: 1,
  },

  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color:
      COLORS.text,
  },

  fileMeta: {
    fontSize: 11,
    color:
      COLORS.muted,
    marginTop: 3,
  },

  removeFileButton: {
    padding: 4,
  },


  // ----------------------------------------------------------
  // RESTORE BUTTON
  // ----------------------------------------------------------

  restoreButton: {
    height: 46,
    borderRadius: 11,
    backgroundColor:
      COLORS.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 13,
  },

  restoreButtonText: {
    color:
      COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  disabledRestore: {
    opacity: 0.45,
  },


  // ----------------------------------------------------------
  // FOOTER
  // ----------------------------------------------------------

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },

  footerText: {
    fontSize: 11,
    color:
      COLORS.muted,
    marginLeft: 7,
    textAlign: 'center',
  },


  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  loadingContainer: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 13,
    color:
      COLORS.muted,
    marginTop: 12,
  },


  // ----------------------------------------------------------
  // ACCESS DENIED
  // ----------------------------------------------------------

  centerContainer: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  accessIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor:
      COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  accessTitle: {
    fontSize: 20,
    fontWeight: '800',
    color:
      COLORS.text,
    textAlign: 'center',
  },

  accessText: {
    fontSize: 13,
    lineHeight: 19,
    color:
      COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },

  backButton: {
    marginTop: 20,
    backgroundColor:
      COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 11,
  },

  backButtonText: {
    color:
      COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

});