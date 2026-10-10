import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

import { getData } from '../services/storage';
import { sendWhatsAppInventoryReport } from '../services/api';

export default function WhatsAppReports() {
  const [user, setUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const storedUser = await getData('user');

      if (!storedUser) {
        router.replace('/login');
        return;
      }

      const parsedUser =
        typeof storedUser === 'string'
          ? JSON.parse(storedUser)
          : storedUser;

      setUser(parsedUser);

      if (
        parsedUser?.role !== 'admin' &&
        parsedUser?.role !== 'pharmacist'
      ) {
        Alert.alert(
          'Access Denied',
          'Only admin and pharmacist users can send WhatsApp reports.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/home'),
            },
          ]
        );
        return;
      }
    } catch (error) {
      console.log('User check error:', error);
      router.replace('/login');
    } finally {
      setCheckingUser(false);
    }
  };

  const normalizeWhatsAppNumber = (value) => {
    let number = value.trim();

    if (!number) {
      return '';
    }

    // Already in Twilio WhatsApp format
    if (number.startsWith('whatsapp:')) {
      return number;
    }

    // Remove spaces, hyphens and brackets
    number = number.replace(/[\s\-()]/g, '');

    // Indian 10-digit number
    if (/^\d{10}$/.test(number)) {
      return `whatsapp:+91${number}`;
    }

    // Indian number with +91
    if (/^\+91\d{10}$/.test(number)) {
      return `whatsapp:${number}`;
    }

    // International number
    if (/^\+\d{8,15}$/.test(number)) {
      return `whatsapp:${number}`;
    }

    return null;
  };

  const handleSendReport = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert(
        'WhatsApp Number Required',
        'Please enter a WhatsApp number.'
      );
      return;
    }

    const formattedNumber =
      normalizeWhatsAppNumber(phoneNumber);

    if (!formattedNumber) {
      Alert.alert(
        'Invalid Number',
        'Enter a valid 10-digit Indian number or international number.'
      );
      return;
    }

    try {
      setLoading(true);
      setReport(null);

      const result =
        await sendWhatsAppInventoryReport(
          formattedNumber
        );

      if (result?.success) {
        setReport(result.report || null);

        Alert.alert(
          'Report Sent',
          'Inventory report has been sent successfully through WhatsApp.'
        );
      } else {
        Alert.alert(
          'Failed',
          result?.message ||
            result?.error ||
            'Unable to send WhatsApp report.'
        );
      }
    } catch (error) {
      console.log(
        'Send WhatsApp report error:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Something went wrong while sending the report.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#176B52"
        />
        <Text style={styles.loadingText}>
          Checking access...
        </Text>
      </View>
    );
  }

  if (
    !user ||
    (user.role !== 'admin' &&
      user.role !== 'pharmacist')
  ) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              WhatsApp Reports
            </Text>

            <Text style={styles.subtitle}>
              Send your pharmacy inventory report
            </Text>
          </View>
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              WA
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Inventory Report
            </Text>

            <Text style={styles.infoText}>
              Send a summary of your pharmacy
              inventory, sales and attention
              required directly to WhatsApp.
            </Text>
          </View>
        </View>

        {/* Phone Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            WhatsApp Number
          </Text>

          <Text style={styles.label}>
            Recipient mobile number
          </Text>

          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="9876543210"
            placeholderTextColor="#9AA5A1"
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.helperText}>
            Indian numbers can be entered as 10
            digits. +91 will be added automatically.
          </Text>

          <TouchableOpacity
            style={[
              styles.sendButton,
              loading && styles.sendButtonDisabled,
            ]}
            onPress={handleSendReport}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.sendButtonText}>
                  Sending...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.sendIcon}>
                  WA
                </Text>

                <Text style={styles.sendButtonText}>
                  Send Inventory Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Report Preview */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Report Includes
          </Text>

          <ReportItem
            label="Inventory Summary"
            description="Medicines, units and inventory value"
          />

          <ReportItem
            label="Stock Status"
            description="Low-stock and out-of-stock medicines"
          />

          <ReportItem
            label="Sales Summary"
            description="Bills, units sold, revenue and profit"
          />

          <ReportItem
            label="Expiry Attention"
            description="Expiring and expired medicines"
          />

          <ReportItem
            label="Dead Stock"
            description="Medicines without recent sales"
            last
          />
        </View>

        {/* Result Summary */}
        {report && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Last Sent Report
            </Text>

            <View style={styles.summaryGrid}>
              <SummaryBox
                label="Medicines"
                value={report.totalMedicines}
              />

              <SummaryBox
                label="Units"
                value={report.totalUnits}
              />

              <SummaryBox
                label="Bills"
                value={report.totalBills}
              />

              <SummaryBox
                label="Low Stock"
                value={report.lowStockCount}
              />

              <SummaryBox
                label="Expiring"
                value={report.expiringSoon}
              />

              <SummaryBox
                label="Expired"
                value={report.expired}
              />
            </View>

            <View style={styles.moneyRow}>
              <Text style={styles.moneyLabel}>
                Revenue
              </Text>

              <Text style={styles.moneyValue}>
                ₹
                {Number(
                  report.totalRevenue || 0
                ).toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.moneyRow}>
              <Text style={styles.moneyLabel}>
                Profit
              </Text>

              <Text style={styles.moneyValue}>
                ₹
                {Number(
                  report.totalProfit || 0
                ).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* Security Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>
            Secure Report Delivery
          </Text>

          <Text style={styles.noteText}>
            The report is generated from your
            current MedTracker inventory and sales
            data before it is sent.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------------- Components ---------------- */

function ReportItem({
  label,
  description,
  last,
}) {
  return (
    <View
      style={[
        styles.reportItem,
        last && styles.reportItemLast,
      ]}
    >
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>✓</Text>
      </View>

      <View style={styles.reportItemContent}>
        <Text style={styles.reportItemTitle}>
          {label}
        </Text>

        <Text style={styles.reportItemDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function SummaryBox({ label, value }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryValue}>
        {value ?? 0}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F8',
  },

  content: {
    padding: 20,
    paddingTop: 18,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9F8',
  },

  loadingText: {
    marginTop: 10,
    color: '#64716C',
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E9E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backText: {
    fontSize: 32,
    lineHeight: 34,
    color: '#176B52',
    marginTop: -3,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#17332A',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#73817B',
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF5F0',
    borderWidth: 1,
    borderColor: '#D3E9DF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#176B52',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  infoIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#173D31',
    marginBottom: 5,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#587067',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E9E6',
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17332A',
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#52625B',
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D7E0DC',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#19372D',
    backgroundColor: '#FBFCFB',
  },

  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: '#7B8883',
    lineHeight: 18,
  },

  sendButton: {
    height: 52,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#176B52',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonDisabled: {
    opacity: 0.65,
  },

  sendIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 9,
  },

  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
  },

  reportItemLast: {
    borderBottomWidth: 0,
  },

  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E7F4EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  checkText: {
    color: '#176B52',
    fontSize: 15,
    fontWeight: '900',
  },

  reportItemContent: {
    flex: 1,
  },

  reportItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#243A32',
  },

  reportItemDescription: {
    fontSize: 12,
    color: '#78857F',
    marginTop: 3,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  summaryBox: {
    width: '31.5%',
    minHeight: 76,
    backgroundColor: '#F7F9F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4EAE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#176B52',
  },

  summaryLabel: {
    fontSize: 11,
    color: '#728079',
    marginTop: 4,
    textAlign: 'center',
  },

  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 13,
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F0',
  },

  moneyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#617069',
  },

  moneyValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17332A',
  },

  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4EAE7',
    padding: 16,
  },

  noteTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#176B52',
    marginBottom: 5,
  },

  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#718079',
  },
});