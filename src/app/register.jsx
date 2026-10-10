import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { registerUser } from '../services/api';

export default function Register() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });


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
  // REGISTER
  // ================================

  const handleRegister = async () => {
    if (
      !form.name ||
      !form.email ||
      !form.password
    ) {
      showMsg(
        'All fields are required!',
        'error'
      );

      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      showMsg(
        'Passwords do not match!',
        'error'
      );

      return;
    }

    if (form.password.length < 6) {
      showMsg(
        'Password must be at least 6 characters!',
        'error'
      );

      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      console.log(
        'Register result:',
        result
      );

      if (result.message) {
        if (
          result.message
            .toLowerCase()
            .includes('success') ||
          result.message.includes('Registered') ||
          result.message.includes('registered') ||
          result.message.includes('created')
        ) {
          showMsg(
            `Account created successfully! Welcome ${form.name}!`,
            'success'
          );

          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else if (
          result.message
            .toLowerCase()
            .includes('exists') ||
          result.message
            .toLowerCase()
            .includes('already')
        ) {
          showMsg(
            'Email already registered! Please login.',
            'error'
          );
        } else {
          showMsg(
            result.message,
            'error'
          );
        }
      } else {
        showMsg(
          'Account created successfully!',
          'success'
        );

        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err) {
      console.log(
        'Register error:',
        err
      );

      showMsg(
        'Cannot connect to server! Is backend running?',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // UI
  // ================================

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Brand */}
      <View style={styles.brandSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>
            M
          </Text>
        </View>

        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Set up your MedTracker account
        </Text>
      </View>

      {/* Message */}
      {message !== '' && (
        <View
          style={[
            styles.messageBanner,
            msgType === 'success'
              ? styles.messageSuccess
              : styles.messageError,
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

          <Text style={styles.messageText}>
            {message}
          </Text>
        </View>
      )}

      {/* Form Card */}
      <View style={styles.card}>

        {/* Full Name */}
        <Text style={styles.label}>
          Full Name
          <Text style={styles.required}>
            {' '}*
          </Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#9AA59F"
          value={form.name}
          onChangeText={(value) =>
            setForm({
              ...form,
              name: value,
            })
          }
          editable={!loading}
        />

        {/* Email */}
        <Text style={styles.label}>
          Email
          <Text style={styles.required}>
            {' '}*
          </Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
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
          editable={!loading}
        />

        {/* Password */}
        <Text style={styles.label}>
          Password
          <Text style={styles.required}>
            {' '}*
          </Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Minimum 6 characters"
          placeholderTextColor="#9AA59F"
          value={form.password}
          onChangeText={(value) =>
            setForm({
              ...form,
              password: value,
            })
          }
          secureTextEntry
          editable={!loading}
        />

        {/* Confirm Password */}
        <Text style={styles.label}>
          Confirm Password
          <Text style={styles.required}>
            {' '}*
          </Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Re-enter your password"
          placeholderTextColor="#9AA59F"
          value={form.confirmPassword}
          onChangeText={(value) =>
            setForm({
              ...form,
              confirmPassword: value,
            })
          }
          secureTextEntry
          editable={!loading}
        />



        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.button,
            loading &&
              styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />

              <Text
                style={styles.buttonText}
              >
                Creating Account...
              </Text>
            </View>
          ) : (
            <Text
              style={styles.buttonText}
            >
              Create Account
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Login */}
      <View style={styles.loginSection}>
        <Text style={styles.loginText}>
          Already have an account?
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() =>
            router.push('/')
          }
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text
            style={styles.loginButtonText}
          >
            Login Here
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },

  container: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 35,
  },

  // ================================
  // BRAND
  // ================================

  brandSection: {
    alignItems: 'center',
    marginBottom: 22,
  },

  logoBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#176B52',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  title: {
    color: '#17201C',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 5,
  },

  subtitle: {
    color: '#7A8781',
    fontSize: 12,
  },

  // ================================
  // MESSAGE
  // ================================

  messageBanner: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  messageSuccess: {
    backgroundColor: '#EAF6F1',
    borderWidth: 1,
    borderColor: '#B9DDCF',
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

  successDot: {
    backgroundColor: '#176B52',
  },

  errorDot: {
    backgroundColor: '#D92D20',
  },

  messageText: {
    flex: 1,
    color: '#45534C',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 17,
  },

  // ================================
  // CARD
  // ================================

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderColor: '#E4EAE7',
  },

  // ================================
  // FORM
  // ================================

  label: {
    color: '#27322D',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },

  required: {
    color: '#D92D20',
  },

  optional: {
    color: '#9AA59F',
    fontSize: 9,
  },

  input: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#DDE5E0',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 13,
    color: '#17201C',
    marginBottom: 15,
  },



  // ================================
  // BUTTON
  // ================================

  button: {
    backgroundColor: '#176B52',
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    backgroundColor: '#AAB5AF',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // ================================
  // LOGIN
  // ================================

  loginSection: {
    alignItems: 'center',
    marginTop: 18,
  },

  loginText: {
    color: '#7A8781',
    fontSize: 11,
    marginBottom: 8,
  },

  loginButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFD4CA',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },

  loginButtonText: {
    color: '#176B52',
    fontSize: 12,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 35,
  },
});