import NetInfo from '@react-native-community/netinfo';

import {
    getData,
    saveData,
} from './storage';


// ============================================================
// STORAGE KEYS
// ============================================================

const CACHE_KEYS = {
  MEDICINES: 'offline_medicines',
  SALES: 'offline_sales',
  ALERTS: 'offline_alerts',
  USERS: 'offline_users',
  LAST_SYNC: 'offline_last_sync',
  PENDING_ACTIONS: 'offline_pending_actions',
};


// ============================================================
// NETWORK STATUS
// ============================================================

export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();

    return Boolean(
      state.isConnected &&
      state.isInternetReachable !== false
    );

  } catch (error) {
    console.log(
      'Network status error:',
      error
    );

    return false;
  }
};


// ============================================================
// SAVE OFFLINE DATA
// ============================================================

export const saveOfflineData = async (
  key,
  data
) => {
  try {
    await saveData(
      key,
      data
    );

    return true;

  } catch (error) {
    console.log(
      'Offline cache save error:',
      error
    );

    return false;
  }
};


// ============================================================
// GET OFFLINE DATA
// ============================================================

export const getOfflineData = async (
  key,
  fallback = []
) => {
  try {
    const data =
      await getData(key);

    if (
      data === null ||
      data === undefined
    ) {
      return fallback;
    }

    return data;

  } catch (error) {
    console.log(
      'Offline cache read error:',
      error
    );

    return fallback;
  }
};


// ============================================================
// MEDICINES CACHE
// ============================================================

export const cacheMedicines = async (
  medicines
) => {
  return saveOfflineData(
    CACHE_KEYS.MEDICINES,
    medicines || []
  );
};


export const getCachedMedicines =
  async () => {
    return getOfflineData(
      CACHE_KEYS.MEDICINES,
      []
    );
  };


// ============================================================
// SALES CACHE
// ============================================================

export const cacheSales = async (
  sales
) => {
  return saveOfflineData(
    CACHE_KEYS.SALES,
    sales || []
  );
};


export const getCachedSales =
  async () => {
    return getOfflineData(
      CACHE_KEYS.SALES,
      []
    );
  };


// ============================================================
// ALERTS CACHE
// ============================================================

export const cacheAlerts = async (
  alerts
) => {
  return saveOfflineData(
    CACHE_KEYS.ALERTS,
    alerts || []
  );
};


export const getCachedAlerts =
  async () => {
    return getOfflineData(
      CACHE_KEYS.ALERTS,
      []
    );
  };


// ============================================================
// USERS CACHE
// ============================================================

export const cacheUsers = async (
  users
) => {
  return saveOfflineData(
    CACHE_KEYS.USERS,
    users || []
  );
};


export const getCachedUsers =
  async () => {
    return getOfflineData(
      CACHE_KEYS.USERS,
      []
    );
  };


// ============================================================
// LAST SYNC
// ============================================================

export const saveLastSync =
  async () => {
    try {

      await saveData(
        CACHE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );

      return true;

    } catch (error) {

      console.log(
        'Save last sync error:',
        error
      );

      return false;
    }
  };


export const getLastSync =
  async () => {
    try {

      return await getData(
        CACHE_KEYS.LAST_SYNC
      );

    } catch (error) {

      console.log(
        'Get last sync error:',
        error
      );

      return null;
    }
  };


// ============================================================
// PENDING ACTIONS
// ============================================================

export const getPendingActions =
  async () => {

    return getOfflineData(
      CACHE_KEYS.PENDING_ACTIONS,
      []
    );
  };


export const addPendingAction =
  async (action) => {

    try {

      const existing =
        await getPendingActions();


      const newAction = {
        id:
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,

        createdAt:
          new Date().toISOString(),

        ...action,
      };


      const updated = [
        ...existing,
        newAction,
      ];


      await saveOfflineData(
        CACHE_KEYS.PENDING_ACTIONS,
        updated
      );


      return newAction;

    } catch (error) {

      console.log(
        'Add pending action error:',
        error
      );

      throw error;
    }
  };


export const removePendingAction =
  async (actionId) => {

    try {

      const existing =
        await getPendingActions();


      const updated =
        existing.filter(
          (item) =>
            item.id !== actionId
        );


      await saveOfflineData(
        CACHE_KEYS.PENDING_ACTIONS,
        updated
      );


      return true;

    } catch (error) {

      console.log(
        'Remove pending action error:',
        error
      );

      return false;
    }
  };


// ============================================================
// CLEAR OFFLINE CACHE
// ============================================================

export const clearOfflineCache =
  async () => {

    try {

      await saveData(
        CACHE_KEYS.MEDICINES,
        []
      );

      await saveData(
        CACHE_KEYS.SALES,
        []
      );

      await saveData(
        CACHE_KEYS.ALERTS,
        []
      );

      await saveData(
        CACHE_KEYS.USERS,
        []
      );

      await saveData(
        CACHE_KEYS.PENDING_ACTIONS,
        []
      );

      await saveData(
        CACHE_KEYS.LAST_SYNC,
        null
      );

      return true;

    } catch (error) {

      console.log(
        'Clear offline cache error:',
        error
      );

      return false;
    }
  };


// ============================================================
// EXPORT KEYS
// ============================================================

export {
    CACHE_KEYS
};
