import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { loginUser } from '../services/api';
import { saveData } from '../services/storage';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('');

  const showMsg = (text, type) => {
    setMessage(text);
    setMsgType(type);

    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showMsg('Please enter email and password', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser({
        email,
        password,
      });

      console.log('Login result:', result);

      if (result.token) {
        await saveData('token', result.token);
        await saveData('user', JSON.stringify(result.user));

        showMsg('Login successful', 'success');

        const role = result.user.role;

        setTimeout(() => {
          if (role === 'admin') {
            router.push('/admin-dashboard');
          } else if (role === 'pharmacist') {
            router.push('/pharmacist-dashboard');
          } else {
            router.push('/customer-dashboard');
          }
        }, 700);
      } else {
        showMsg(result.message || 'Login failed', 'error');
      }
    } catch (err) {
      console.log('Login error:', err);
      showMsg('Cannot connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>+</Text>
          </View>

          <Text style={styles.brandName}>MedTracker</Text>

          <Text style={styles.brandSubtitle}>
            Pharmacy Management System
          </Text>
        </View>

        {/* Message */}
        {message !== '' && (
          <View
            style={[
              styles.messageBox,
              msgType === 'success'
                ? styles.successBox
                : styles.errorBox,
            ]}
          >
            <View
              style={[
                styles.messageDot,
                msgType === 'success'
                  ? styles.successDot
                  : styles.errorDot,
              ]}
            />

            <Text
              style={[
                styles.messageText,
                msgType === 'success'
                  ? styles.successText
                  : styles.errorText,
              ]}
            >
              {message}
            </Text>
          </View>
        )}

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeTitle}>
            Welcome back
          </Text>

          <Text style={styles.welcomeSubtitle}>
            Sign in to manage your pharmacy
          </Text>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email address</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>@</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9AA5A1"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>●</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9AA5A1"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />

                <Text style={styles.loginButtonText}>
                  Signing in...
                </Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>
                Sign in
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Register */}
        <View style={styles.registerSection}>
          <Text style={styles.registerQuestion}>
            Don't have an account?
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/register')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLink}>
              Create an account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure pharmacy inventory management
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F6',
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 35,
  },

  /* ---------------- HEADER ---------------- */

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#147A5A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,

    shadowColor: '#147A5A',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 5,
  },

  logoIcon: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '300',
    lineHeight: 44,
  },

  brandName: {
    fontSize: 29,
    fontWeight: '700',
    color: '#17221D',
    letterSpacing: -0.5,
  },

  brandSubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: '#718078',
    letterSpacing: 0.2,
  },

  /* ---------------- MESSAGE ---------------- */

  messageBox: {
    width: '100%',
    maxWidth: 430,
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },

  successBox: {
    backgroundColor: '#F0F9F4',
    borderColor: '#C8E8D5',
  },

  errorBox: {
    backgroundColor: '#FFF5F4',
    borderColor: '#F1CDCA',
  },

  messageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },

  successDot: {
    backgroundColor: '#198754',
  },

  errorDot: {
    backgroundColor: '#D64545',
  },

  messageText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  successText: {
    color: '#176B47',
  },

  errorText: {
    color: '#B13C3C',
  },

  /* ---------------- CARD ---------------- */

  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,

    borderWidth: 1,
    borderColor: '#E3EAE6',

    shadowColor: '#1B3328',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  welcomeTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#17221D',
    marginBottom: 5,
  },

  welcomeSubtitle: {
    fontSize: 13,
    color: '#75827C',
    marginBottom: 25,
  },

  /* ---------------- INPUTS ---------------- */

  fieldContainer: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34423B',
    marginBottom: 7,
  },

  inputWrapper: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DCE5E0',
    backgroundColor: '#FBFCFB',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputIcon: {
    width: 42,
    textAlign: 'center',
    fontSize: 15,
    color: '#147A5A',
    fontWeight: '700',
  },

  input: {
    flex: 1,
    height: '100%',
    paddingRight: 14,
    fontSize: 14,
    color: '#17221D',
  },

  /* ---------------- BUTTON ---------------- */

  loginButton: {
    height: 50,
    backgroundColor: '#147A5A',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  loginButtonDisabled: {
    backgroundColor: '#8CA99D',
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  /* ---------------- REGISTER ---------------- */

  registerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  registerQuestion: {
    fontSize: 13,
    color: '#718078',
    marginRight: 5,
  },

  registerLink: {
    fontSize: 13,
    color: '#147A5A',
    fontWeight: '700',
  },

  /* ---------------- FOOTER ---------------- */

  footer: {
    marginTop: 'auto',
    paddingTop: 30,
  },

  footerText: {
    fontSize: 11,
    color: '#9AA59F',
  },
});