import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    createStaffUser,
    deleteUser,
    getUsers,
    updateUserRole,
} from '../services/api';

import {
    clearAll,
    getData,
} from '../services/storage';

export default function UserManagement() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');

  const [currentUser, setCurrentUser] = useState(null);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'pharmacist',
  });

  // =====================================================
  // LOAD USER
  // =====================================================

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const storedUser =
        await getData('user');

      if (!storedUser) {
        router.replace('/');
        return;
      }

      const parsedUser =
        JSON.parse(storedUser);

      setCurrentUser(parsedUser);

      if (parsedUser.role !== 'admin') {
        Alert.alert(
          'Access Denied',
          'Only administrators can access User Management.',
          [
            {
              text: 'OK',
              onPress: () =>
                router.replace('/'),
            },
          ]
        );

        return;
      }

      await loadUsers();

    } catch (error) {
      console.log(
        'Admin check error:',
        error
      );

      router.replace('/');
    }
  };

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers = async (
    showLoader = true
  ) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const result =
        await getUsers();

      if (
        result &&
        Array.isArray(result.users)
      ) {
        setUsers(result.users);
      } else {
        setUsers([]);
      }

    } catch (error) {
      console.log(
        'Load users error:',
        error
      );

      Alert.alert(
        'Error',
        error.message ||
          'Failed to load users'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers(false);
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredUsers = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.name
          ?.toLowerCase()
          .includes(query) ||
        user.email
          ?.toLowerCase()
          .includes(query) ||
        user.role
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [users, search]);

  // =====================================================
  // CREATE USER
  // =====================================================

  const handleCreateUser = async () => {
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      Alert.alert(
        'Missing Details',
        'Please fill all fields.'
      );
      return;
    }

    if (form.password.length < 6) {
      Alert.alert(
        'Invalid Password',
        'Password must be at least 6 characters.'
      );
      return;
    }

    try {
      setSaving(true);

      await createStaffUser({
        name: form.name.trim(),
        email: form.email
          .trim()
          .toLowerCase(),
        password: form.password,
        role: form.role,
      });

      Alert.alert(
        'Success',
        `${
          form.role === 'admin'
            ? 'Admin'
            : 'Pharmacist'
        } account created successfully.`
      );

      setForm({
        name: '',
        email: '',
        password: '',
        role: 'pharmacist',
      });

      setShowCreateModal(false);

      await loadUsers();

    } catch (error) {
      console.log(
        'Create user error:',
        error
      );

      Alert.alert(
        'Failed',
        error.message ||
          'Could not create user.'
      );

    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // CHANGE ROLE
  // =====================================================

  const handleChangeRole = (
    user
  ) => {
    if (
      String(currentUser?.id) ===
      String(user._id || user.id)
    ) {
      Alert.alert(
        'Not Allowed',
        'You cannot change your own role.'
      );
      return;
    }

    const userId =
      user._id || user.id;

    const options = [
      {
        text: 'Admin',
        onPress: () =>
          changeRole(
            userId,
            'admin'
          ),
      },
      {
        text: 'Pharmacist',
        onPress: () =>
          changeRole(
            userId,
            'pharmacist'
          ),
      },
      {
        text: 'Customer',
        onPress: () =>
          changeRole(
            userId,
            'customer'
          ),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ];

    Alert.alert(
      'Change User Role',
      `Select a new role for ${user.name}`,
      options
    );
  };

  const changeRole = async (
    id,
    role
  ) => {
    try {
      await updateUserRole(
        id,
        role
      );

      Alert.alert(
        'Updated',
        'User role updated successfully.'
      );

      await loadUsers();

    } catch (error) {
      Alert.alert(
        'Failed',
        error.message ||
          'Could not update role.'
      );
    }
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const handleDeleteUser = (
    user
  ) => {
    const userId =
      user._id || user.id;

    if (
      String(currentUser?.id) ===
      String(userId)
    ) {
      Alert.alert(
        'Not Allowed',
        'You cannot delete your own account.'
      );
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            confirmDelete(userId),
        },
      ]
    );
  };

  const confirmDelete = async (
    id
  ) => {
    try {
      await deleteUser(id);

      Alert.alert(
        'Deleted',
        'User deleted successfully.'
      );

      await loadUsers();

    } catch (error) {
      Alert.alert(
        'Failed',
        error.message ||
          'Could not delete user.'
      );
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    await clearAll();
    router.replace('/');
  };

  // =====================================================
  // ROLE UI
  // =====================================================

  const getRoleConfig = (
    role
  ) => {
    if (role === 'admin') {
      return {
        label: 'ADMIN',
        background: '#EAF6F1',
        color: '#176B52',
      };
    }

    if (role === 'pharmacist') {
      return {
        label: 'PHARMACIST',
        background: '#EEF5F2',
        color: '#2E6654',
      };
    }

    return {
      label: 'CUSTOMER',
      background: '#F3F5F4',
      color: '#65736C',
    };
  };

  // =====================================================
  // USER CARD
  // =====================================================

  const renderUser = ({
    item,
  }) => {
    const role =
      getRoleConfig(item.role);

    const userId =
      item._id || item.id;

    const isCurrentUser =
      String(currentUser?.id) ===
      String(userId);

    return (
      <View style={styles.userCard}>

        <View style={styles.userTop}>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name
                ?.charAt(0)
                ?.toUpperCase() || 'U'}
            </Text>
          </View>

          <View style={styles.userMain}>
            <Text
              style={styles.userName}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            <Text
              style={styles.userEmail}
              numberOfLines={1}
            >
              {item.email}
            </Text>
          </View>

          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  role.background,
              },
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                {
                  color: role.color,
                },
              ]}
            >
              {role.label}
            </Text>
          </View>

        </View>

        <View style={styles.divider} />

        <View style={styles.userBottom}>

          <Text style={styles.createdText}>
            {item.createdAt
              ? `Joined ${new Date(
                  item.createdAt
                ).toLocaleDateString()}`
              : 'User account'}
          </Text>

          {!isCurrentUser && (
            <View style={styles.actionRow}>

              <TouchableOpacity
                style={styles.roleButton}
                onPress={() =>
                  handleChangeRole(item)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.roleButtonText
                  }
                >
                  Change Role
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  handleDeleteUser(item)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.deleteButtonText
                  }
                >
                  Delete
                </Text>
              </TouchableOpacity>

            </View>
          )}

          {isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youText}>
                YOU
              </Text>
            </View>
          )}

        </View>

      </View>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color="#176B52"
        />

        <Text style={styles.loadingText}>
          Loading users...
        </Text>
      </View>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <View style={styles.screen}>

      {/* HEADER */}

      <View style={styles.header}>

        <View style={styles.headerLeft}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              User Management
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage pharmacy accounts
            </Text>
          </View>

        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

      </View>

      {/* CONTENT */}

      <View style={styles.content}>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>

          <View>
            <Text style={styles.summaryLabel}>
              Total Users
            </Text>

            <Text style={styles.summaryValue}>
              {users.length}
            </Text>
          </View>

          <View style={styles.summaryStats}>

            <View style={styles.miniStat}>
              <Text style={styles.miniValue}>
                {
                  users.filter(
                    (u) =>
                      u.role === 'admin'
                  ).length
                }
              </Text>

              <Text style={styles.miniLabel}>
                Admin
              </Text>
            </View>

            <View style={styles.miniStat}>
              <Text style={styles.miniValue}>
                {
                  users.filter(
                    (u) =>
                      u.role ===
                      'pharmacist'
                  ).length
                }
              </Text>

              <Text style={styles.miniLabel}>
                Pharmacist
              </Text>
            </View>

            <View style={styles.miniStat}>
              <Text style={styles.miniValue}>
                {
                  users.filter(
                    (u) =>
                      u.role ===
                      'customer'
                  ).length
                }
              </Text>

              <Text style={styles.miniLabel}>
                Customer
              </Text>
            </View>

          </View>

        </View>

        {/* SEARCH */}

        <TextInput
          style={styles.searchInput}
          placeholder="Search name, email or role..."
          placeholderTextColor="#9AA59F"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        {/* CREATE */}

        <TouchableOpacity
          style={styles.createButton}
          onPress={() =>
            setShowCreateModal(true)
          }
          activeOpacity={0.85}
        >
          <Text style={styles.createIcon}>
            +
          </Text>

          <Text style={styles.createText}>
            Create Staff Account
          </Text>
        </TouchableOpacity>

        {/* LIST */}

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) =>
            String(
              item._id ||
                item.id
            )
          }
          renderItem={renderUser}
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={
                handleRefresh
              }
              tintColor="#176B52"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                No users found
              </Text>

              <Text style={styles.emptyText}>
                Try a different search.
              </Text>
            </View>
          }
        />

      </View>

      {/* CREATE MODAL */}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowCreateModal(false)
        }
      >

        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >

          <View style={styles.modalCard}>

            <View style={styles.modalHeader}>

              <View>
                <Text style={styles.modalTitle}>
                  Create Staff Account
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Add an admin or pharmacist
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setShowCreateModal(
                    false
                  )
                }
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>
                  ×
                </Text>
              </TouchableOpacity>

            </View>

            {/* NAME */}

            <Text style={styles.inputLabel}>
              Full Name
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter full name"
              placeholderTextColor="#9AA59F"
              value={form.name}
              onChangeText={(value) =>
                setForm({
                  ...form,
                  name: value,
                })
              }
              editable={!saving}
            />

            {/* EMAIL */}

            <Text style={styles.inputLabel}>
              Email
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter email"
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
              editable={!saving}
            />

            {/* PASSWORD */}

            <Text style={styles.inputLabel}>
              Temporary Password
            </Text>

            <TextInput
              style={styles.modalInput}
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
              editable={!saving}
            />

            {/* ROLE */}

            <Text style={styles.inputLabel}>
              Role
            </Text>

            <View style={styles.roleSelectRow}>

              <TouchableOpacity
                style={[
                  styles.roleSelect,
                  form.role ===
                    'pharmacist' &&
                    styles.roleSelectActive,
                ]}
                onPress={() =>
                  setForm({
                    ...form,
                    role: 'pharmacist',
                  })
                }
                disabled={saving}
              >
                <Text
                  style={[
                    styles.roleSelectText,
                    form.role ===
                      'pharmacist' &&
                      styles.roleSelectTextActive,
                  ]}
                >
                  Pharmacist
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleSelect,
                  form.role === 'admin' &&
                    styles.roleSelectActive,
                ]}
                onPress={() =>
                  setForm({
                    ...form,
                    role: 'admin',
                  })
                }
                disabled={saving}
              >
                <Text
                  style={[
                    styles.roleSelectText,
                    form.role ===
                      'admin' &&
                      styles.roleSelectTextActive,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>

            </View>

            {/* SAVE */}

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving &&
                  styles.saveButtonDisabled,
              ]}
              onPress={
                handleCreateUser
              }
              disabled={saving}
            >
              {saving ? (
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
                      styles.saveButtonText
                    }
                  >
                    Creating...
                  </Text>
                </View>
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

          </View>

        </KeyboardAvoidingView>

      </Modal>

    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#F6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#66756D',
    fontSize: 12,
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EAE6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#F1F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  backText: {
    color: '#176B52',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
  },

  headerTitle: {
    color: '#17201C',
    fontSize: 18,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#7A8781',
    fontSize: 10,
    marginTop: 2,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: '#E7C8C5',
    backgroundColor: '#FFF7F6',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  logoutText: {
    color: '#C62828',
    fontSize: 10,
    fontWeight: '700',
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 15,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E8E4',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  summaryLabel: {
    color: '#7A8781',
    fontSize: 10,
    fontWeight: '600',
  },

  summaryValue: {
    color: '#176B52',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 2,
  },

  summaryStats: {
    flexDirection: 'row',
    gap: 14,
  },

  miniStat: {
    alignItems: 'center',
  },

  miniValue: {
    color: '#27322D',
    fontSize: 16,
    fontWeight: '800',
  },

  miniLabel: {
    color: '#8A968F',
    fontSize: 8,
    marginTop: 2,
  },

  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5E0',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 12,
    color: '#17201C',
    marginBottom: 10,
  },

  createButton: {
    backgroundColor: '#176B52',
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },

  createIcon: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '500',
    marginRight: 7,
  },

  createText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  listContent: {
    paddingBottom: 30,
  },

  userCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8E4',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },

  userTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EAF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  avatarText: {
    color: '#176B52',
    fontSize: 17,
    fontWeight: '800',
  },

  userMain: {
    flex: 1,
    marginRight: 7,
  },

  userName: {
    color: '#26322C',
    fontSize: 13,
    fontWeight: '800',
  },

  userEmail: {
    color: '#7C8982',
    fontSize: 10,
    marginTop: 3,
  },

  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },

  roleBadgeText: {
    fontSize: 7,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEF2F0',
    marginVertical: 11,
  },

  userBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  createdText: {
    color: '#9AA59F',
    fontSize: 9,
    flex: 1,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  roleButton: {
    backgroundColor: '#F0F6F3',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginRight: 6,
  },

  roleButtonText: {
    color: '#176B52',
    fontSize: 9,
    fontWeight: '700',
  },

  deleteButton: {
    backgroundColor: '#FFF4F3',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  deleteButtonText: {
    color: '#C62828',
    fontSize: 9,
    fontWeight: '700',
  },

  youBadge: {
    backgroundColor: '#EAF6F1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },

  youText: {
    color: '#176B52',
    fontSize: 7,
    fontWeight: '800',
  },

  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8E4',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginTop: 5,
  },

  emptyTitle: {
    color: '#34423B',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyText: {
    color: '#8A968F',
    fontSize: 10,
    marginTop: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 30, 25, 0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalTitle: {
    color: '#17201C',
    fontSize: 18,
    fontWeight: '800',
  },

  modalSubtitle: {
    color: '#7A8781',
    fontSize: 10,
    marginTop: 3,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#F2F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    color: '#53645B',
    fontSize: 22,
    lineHeight: 23,
  },

  inputLabel: {
    color: '#27322D',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },

  modalInput: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#DDE5E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 12,
    color: '#17201C',
    marginBottom: 13,
  },

  roleSelectRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },

  roleSelect: {
    flex: 1,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#DDE5E0',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },

  roleSelectActive: {
    backgroundColor: '#EAF6F1',
    borderColor: '#176B52',
  },

  roleSelectText: {
    color: '#68766F',
    fontSize: 11,
    fontWeight: '700',
  },

  roleSelectTextActive: {
    color: '#176B52',
  },

  saveButton: {
    backgroundColor: '#176B52',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonDisabled: {
    backgroundColor: '#AAB5AF',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 7,
  },

});