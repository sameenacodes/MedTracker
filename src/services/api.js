import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  cacheMedicines,
  getCachedMedicines,
  isOnline,
} from './offlineService';
import { getData } from './storage';
// ============================================================
// SERVER URL
// ============================================================

const BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:5000/api'
    : 'http://192.168.89.124:5000/api';

// ============================================================
// TOKEN
// ============================================================

const getToken = async () => {
  try {
    const token = await getData('token');

    console.log(
      'Token found:',
      token ? 'YES' : 'NO'
    );

    return token;
  } catch (error) {
    console.log('Token error:', error);
    return null;
  }
};

// ============================================================
// AUTH HEADERS
// ============================================================

const authHeaders = async () => {
  const token = await getToken();

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================
// Some older screens use getHeaders().
// Keep it as an alias so they don't crash.

const getHeaders = authHeaders;

// ============================================================
// JSON HEADERS
// ============================================================

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
});

// ============================================================
// COMMON RESPONSE HANDLER
// ============================================================

const parseResponse = async (response) => {
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

// ============================================================
// AUTH
// ============================================================

export const registerUser = async (data) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/register`,
      {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      }
    );

    const result = await parseResponse(response);

    console.log('Register response:', result);

    return result;
  } catch (error) {
    console.log('Register error:', error);
    throw error;
  }
};

export const loginUser = async (data) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/login`,
      {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      }
    );

    const result = await parseResponse(response);

    console.log('Login response:', result);

    return result;
  } catch (error) {
    console.log('Login error:', error);
    throw error;
  }
};

// ============================================================
// USER MANAGEMENT
// ============================================================

export const getUsers = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/users`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Get users error:', error);
    throw error;
  }
};

export const createStaffUser = async (data) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/users`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Create staff user error:', error);
    throw error;
  }
};

export const updateUserRole = async (id, role) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/users/${id}/role`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ role }),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Update user role error:', error);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await fetch(
      `${BASE_URL}/auth/users/${id}`,
      {
        method: 'DELETE',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Delete user error:', error);
    throw error;
  }
};

// ============================================================
// MEDICINES
// ============================================================

export const getMedicines = async () => {
  try {
    const online = await isOnline();

    if (!online) {
      console.log(
        'Offline mode: loading cached medicines'
      );

      return await getCachedMedicines();
    }

    const response = await fetch(
      `${BASE_URL}/medicines`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    const result = await parseResponse(response);

    await cacheMedicines(result);

    console.log(
      'Online: medicines fetched and cached'
    );

    return result;
  } catch (error) {
    console.log(
      'Get medicines network error:',
      error
    );

    const cachedMedicines =
      await getCachedMedicines();

    if (
      cachedMedicines &&
      cachedMedicines.length > 0
    ) {
      console.log(
        'Backend unavailable: using cached medicines'
      );

      return cachedMedicines;
    }

    throw error;
  }
};

// ============================================================
// GET SINGLE MEDICINE
// ============================================================

export const getMedicine = async (medicineId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/medicines/${medicineId}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get medicine error:',
      error
    );

    throw error;
  }
};

// ============================================================
// ADD MEDICINE
// ============================================================

export const addMedicine = async (data) => {
  try {
    const headers = await authHeaders();

    console.log('Add Medicine Headers:', {
      ...headers,
      Authorization: headers.Authorization
        ? 'Bearer ***'
        : 'MISSING',
    });

    const response = await fetch(
      `${BASE_URL}/medicines`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Add medicine error:', error);
    throw error;
  }
};

// ============================================================
// UPDATE MEDICINE
// ============================================================

export const updateMedicine = async (
  id,
  data
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/medicines/${id}`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Update medicine error:', error);
    throw error;
  }
};

// ============================================================
// DELETE MEDICINE
// ============================================================

export const deleteMedicine = async (id) => {
  try {
    const response = await fetch(
      `${BASE_URL}/medicines/${id}`,
      {
        method: 'DELETE',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Delete medicine error:', error);
    throw error;
  }
};

// ============================================================
// REMOVE MEDICINE
// ============================================================

export const removeMedicine = async (
  medicineId,
  data
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/medicines/${medicineId}/remove`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Remove medicine error:',
      error
    );
    throw error;
  }
};

// ============================================================
// SEARCH MEDICINES
// ============================================================

export const searchMedicines = async (
  query
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/medicines/search/${encodeURIComponent(
        query
      )}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Search medicines error:',
      error
    );
    throw error;
  }
};

// ============================================================
// EXPIRING MEDICINES
// ============================================================

export const getExpiringMedicines = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/medicines/expiring`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get expiring medicines error:',
      error
    );
    throw error;
  }
};

// ============================================================
// DASHBOARD STATS
// ============================================================

export const getDashboardStats = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/medicines/stats/dashboard`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get dashboard stats error:',
      error
    );

    throw error;
  }
};

// ============================================================
// SALES
// ============================================================

export const createSale = async (data) => {
  try {
    const response = await fetch(
      `${BASE_URL}/sales`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Create sale error:', error);
    throw error;
  }
};

export const getSales = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/sales`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Get sales error:', error);
    throw error;
  }
};

// ============================================================
// SALES ANALYTICS
// ============================================================

export const getSalesAnalytics = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/sales/analytics`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get sales analytics error:',
      error
    );
    throw error;
  }
};

// ============================================================
// ALERTS
// ============================================================

export const getAlerts = async () => {
  try {
    console.log('🔔 getAlerts START');

    const headers = await authHeaders();

    console.log(
      '🔔 getAlerts HEADERS READY'
    );

    const response = await fetch(
      `${BASE_URL}/alerts`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log(
      '🔔 getAlerts RESPONSE:',
      response.status
    );

    const result = await response.json();

    console.log(
      '🔔 getAlerts DATA:',
      JSON.stringify(result)
    );

    if (!response.ok) {
      throw new Error(
        result.message ||
        'Failed to fetch alerts'
      );
    }

    return result;
  } catch (error) {
    console.log(
      '❌ getAlerts FUNCTION ERROR:',
      error
    );

    console.log(
      '❌ getAlerts MESSAGE:',
      error?.message
    );

    throw error;
  }
};

// ============================================================
// GENERATE ALERTS
// ============================================================

export const generateAlerts = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/alerts/generate`,
      {
        method: 'POST',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Generate alerts error:',
      error
    );
    throw error;
  }
};

// ============================================================
// SEND EMAIL ALERT
// ============================================================

export const sendEmailAlert = async (data) => {
  try {
    const response = await fetch(
      `${BASE_URL}/alerts/send-email`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Send email alert error:',
      error
    );
    throw error;
  }
};

// ============================================================
// UNREAD ALERT COUNT
// ============================================================

export const getUnreadAlertCount = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/alerts/unread-count`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get unread alert count error:',
      error
    );
    throw error;
  }
};

// ============================================================
// MARK ALERT AS READ
// ============================================================

export const markAlertAsRead = async (
  alertId
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/alerts/${alertId}/read`,
      {
        method: 'PUT',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Mark alert as read error:',
      error
    );
    throw error;
  }
};

// ============================================================
// MARK ALL ALERTS AS READ
// ============================================================

export const markAllAlertsAsRead = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/alerts/read-all`,
      {
        method: 'PUT',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Mark all alerts as read error:',
      error
    );
    throw error;
  }
};

// ============================================================
// REMOVALS
// ============================================================

export const getRemovals = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/removals`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get removals error:',
      error
    );
    throw error;
  }
};

export const confirmRemoval = async (
  medicineId,
  data
) => {
  try {
    const requestData = {
      medicineId,
      ...data,
      qrScanned: true,
    };

    const response = await fetch(
      `${BASE_URL}/removals/confirm`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(requestData),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Confirm removal error:',
      error
    );
    throw error;
  }
};

export const verifyRemovalQR = async (
  qrCode
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/removals/verify-qr`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          qrCode,
        }),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Verify removal QR error:',
      error
    );
    throw error;
  }
};

export const getRemovalStats = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/removals/stats`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get removal stats error:',
      error
    );
    throw error;
  }
};

// ============================================================
// BACKUP
// ============================================================

export const getBackupInfo = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/backup/info`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get backup info error:',
      error
    );
    throw error;
  }
};

export const downloadBackup = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/backup/export`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    if (!response.ok) {
      let message =
        'Failed to create backup';

      try {
        const errorData =
          await response.json();

        message =
          errorData?.message ||
          message;
      } catch {}

      throw new Error(message);
    }

    const backupText =
      await response.text();

    if (!backupText) {
      throw new Error(
        'Backup file is empty'
      );
    }

    return backupText;
  } catch (error) {
    console.log(
      'Download backup error:',
      error
    );
    throw error;
  }
};

export const restoreBackup = async (
  backupData
) => {
  try {
    if (!backupData) {
      throw new Error(
        'Backup data is required'
      );
    }

    const response = await fetch(
      `${BASE_URL}/backup/restore`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(backupData),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Restore backup error:',
      error
    );
    throw error;
  }
};

// ============================================================
// AI PHARMACY ASSISTANT
// ============================================================

export const askAIPharmacy = async (
  message
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/ai-chat`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          message,
        }),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'AI pharmacy error:',
      error
    );
    throw error;
  }
};

// ============================================================
// STOCK FORECAST
// ============================================================

export const getStockForecast = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/stock-forecast`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Stock forecast error:',
      error
    );
    throw error;
  }
};

export const getStockForecastAttention =
  async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/stock-forecast/attention`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Stock forecast attention error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// REORDER
// ============================================================

export const getReorderSuggestions =
  async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/medicines/reorder-suggestions`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Reorder suggestions error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// ============================================================
// AI REORDER SUGGESTIONS
// ============================================================

export const getAIReorderSuggestions = async () => {
  try {
    console.log('🤖 Fetching AI reorder suggestions...');

    const response = await fetch(
      `${BASE_URL}/reorder/suggestions`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    const result = await parseResponse(response);

    console.log(
      '🤖 AI Reorder API Response:',
      result
    );

    return result;
  } catch (error) {
    console.log(
      '❌ AI Reorder API Error:',
      error
    );

    throw error;
  }
};

// ============================================================
// AUTO REORDER
// ============================================================

export const getAutoReorderSuggestions =
  async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/reorder/suggestions`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Auto reorder suggestions error:',
        error
      );
      throw error;
    }
  };

export const getReorderSuggestion =
  async (medicineId) => {
    try {
      const response = await fetch(
        `${BASE_URL}/reorder/suggestions/${medicineId}`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Reorder suggestion error:',
        error
      );
      throw error;
    }
  };

export const createReorderOrder = async (
  medicineId,
  quantity,
  priority
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/reorder/orders`,
      {
        method: 'POST',

        headers: await authHeaders(),

        body: JSON.stringify({
          medicineId: medicineId,
          quantity: Number(quantity),
          priority: priority || 'MEDIUM',
        }),
      }
    );

    const result = await response.json();

    console.log('📦 Place Reorder Response:', result);

    if (!response.ok) {
      throw new Error(
        result.message ||
        result.error ||
        `Request failed with status ${response.status}`
      );
    }

    return result;

  } catch (error) {
    console.log('❌ Create reorder order error:', error);
    throw error;
  }
};

export const placeReorder = async (
  medicineId,
  quantity,
  priority = 'MEDIUM'
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/reorder/orders`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          medicineId,
          quantity,
          priority,
        }),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Place reorder error:',
      error
    );
    throw error;
  }
};

export const getReorderOrders = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/reorder/orders`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get reorder orders error:',
      error
    );
    throw error;
  }
};

export const getReorderHistory =
  async () => {
    return await getReorderOrders();
  };

export const updateReorderOrder =
  async (id, data) => {
    try {
      const response = await fetch(
        `${BASE_URL}/reorder/orders/${id}`,
        {
          method: 'PUT',
          headers: await authHeaders(),
          body: JSON.stringify(data),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Update reorder order error:',
        error
      );
      throw error;
    }
  };

export const updateReorderStatus =
  async (orderId, status) => {
    return await updateReorderOrder(
      orderId,
      { status }
    );
  };

// ============================================================
// BATCHES
// ============================================================

export const getBatches = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/batches`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get batches error:',
      error
    );
    throw error;
  }
};

export const getMedicineBatches =
  async (medicineName) => {
    try {
      const response = await fetch(
        `${BASE_URL}/batches/medicine/${encodeURIComponent(
          medicineName
        )}`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Get medicine batches error:',
        error
      );
      throw error;
    }
  };

export const getFEFOBatch =
  async (medicineName) => {
    try {
      const response = await fetch(
        `${BASE_URL}/batches/fefo/${encodeURIComponent(
          medicineName
        )}`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Get FEFO batch error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// ANALYTICS
// ============================================================

export const getAnalytics = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/analytics`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Analytics error:',
      error
    );
    throw error;
  }
};

export const getBusinessAnalytics =
  async () => {
    return await getAnalytics();
  };

// ============================================================
// DEAD STOCK
// ============================================================

export const getDeadStock = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/dead-stock`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Dead stock error:',
      error
    );
    throw error;
  }
};

// ============================================================
// EXPIRY RISK
// ============================================================

export const getExpiryRisk = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/expiry-risk`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Expiry risk error:',
      error
    );
    throw error;
  }
};

// ============================================================
// AUDIT LOGS
// ============================================================

export const getAuditLogs = async (
  params = {}
) => {
  try {
    const query = new URLSearchParams();

    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          query.append(
            key,
            String(value)
          );
        }
      }
    );

    const queryString =
      query.toString();

    const url =
      `${BASE_URL}/audit-logs` +
      (queryString
        ? `?${queryString}`
        : '');

    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get audit logs error:',
      error
    );
    throw error;
  }
};

export const getAuditLogSummary =
  async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/audit-logs/summary`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Audit log summary error:',
        error
      );
      throw error;
    }
  };

export const getMedicineAuditHistory =
  async (medicineId) => {
    try {
      const response = await fetch(
        `${BASE_URL}/audit-logs/medicine/${medicineId}`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Medicine audit history error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// SUPPLIERS
// ============================================================

export const getSuppliers = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/suppliers`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get suppliers error:',
      error
    );
    throw error;
  }
};

export const getSupplier = async (
  id
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/suppliers/${id}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get supplier error:',
      error
    );
    throw error;
  }
};

export const createSupplier = async (
  data
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/suppliers`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Create supplier error:',
      error
    );
    throw error;
  }
};

export const addSupplier = async (
  data
) => {
  return await createSupplier(data);
};

export const updateSupplier = async (
  id,
  data
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/suppliers/${id}`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Update supplier error:',
      error
    );
    throw error;
  }
};

export const deleteSupplier = async (
  id
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/suppliers/${id}`,
      {
        method: 'DELETE',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Delete supplier error:',
      error
    );
    throw error;
  }
};

export const getSupplierStats =
  async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/suppliers/stats/summary`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Get supplier stats error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// DIGITAL INVOICE
// ============================================================

export const getInvoices = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/invoices`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get invoices error:',
      error
    );
    throw error;
  }
};

export const getInvoiceById = async (
  invoiceId
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/invoices/${invoiceId}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get invoice error:',
      error
    );
    throw error;
  }
};

export const getInvoiceByNumber =
  async (invoiceNumber) => {
    try {
      const response = await fetch(
        `${BASE_URL}/invoices/number/${encodeURIComponent(
          invoiceNumber
        )}`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Get invoice by number error:',
        error
      );
      throw error;
    }
  };

export const searchInvoices = async (
  query
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/invoices/search/${encodeURIComponent(
        query
      )}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Search invoices error:',
      error
    );
    throw error;
  }
};

export const getInvoiceSummary =
  async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/invoices/stats/summary`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Get invoice summary error:',
        error
      );
      throw error;
    }
  };

export const createInvoice = async (
  invoiceData
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/invoices`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(invoiceData),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Create invoice error:',
      error
    );
    throw error;
  }
};

// ============================================================
// CREATE DIGITAL INVOICE FROM EXISTING SALE
// ============================================================

export const createInvoiceFromSale =
  async (invoiceData) => {
    try {
      const response = await fetch(
        `${BASE_URL}/invoices/from-sale`,
        {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify(invoiceData),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Create invoice from sale error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// WHATSAPP INVENTORY REPORT
// ============================================================

export const sendWhatsAppInventoryReport =
  async (toNumber) => {
    try {
      if (!toNumber) {
        throw new Error(
          'WhatsApp number is required'
        );
      }

      const response = await fetch(
        `${BASE_URL}/whatsapp-reports/inventory`,
        {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({
            toNumber,
          }),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'WhatsApp inventory report error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// QR / BARCODE
// ============================================================

export const generateMedicineQR =
  async (medicineId) => {
    try {
      const response = await fetch(
        `${BASE_URL}/medicines/${medicineId}/generate-qr`,
        {
          method: 'POST',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Generate QR error:',
        error
      );
      throw error;
    }
  };

export const getMedicineByQR =
  async (qrCode) => {
    try {
      const response = await fetch(
        `${BASE_URL}/medicines/qr/${encodeURIComponent(
          qrCode
        )}`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Get medicine by QR error:',
        error
      );
      throw error;
    }
  };

export const getMedicineByBarcode =
  async (barcode) => {
    try {
      const response = await fetch(
        `${BASE_URL}/medicines/barcode/${encodeURIComponent(
          barcode
        )}`,
        {
          method: 'GET',
          headers: await authHeaders(),
        }
      );

      return await parseResponse(response);
    } catch (error) {
      console.log(
        'Get medicine by barcode error:',
        error
      );
      throw error;
    }
  };

// ============================================================
// OCR
// ============================================================

export const scanMedicineOCR = async (
  formData
) => {
  try {
    const token = await getToken();

    const headers = {};

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const response = await fetch(
      `${BASE_URL}/ocr/medicine`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'OCR error:',
      error
    );
    throw error;
  }
};

// ============================================================
// MARKETPLACE
// ============================================================

export const searchMarketplaceMedicines = async (query) => {
  try {
    const response = await fetch(
      `${BASE_URL}/pharmacy-inventory/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Marketplace search error:', error);
    throw error;
  }
};







export const getMarketplaceMedicine = async (
  inventoryId
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/pharmacy-inventory/${inventoryId}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);

  } catch (error) {
    console.log(
      'Get marketplace medicine error:',
      error
    );

    throw error;
  }
};

// ============================================================
// MARKETPLACE - CART
// ============================================================

export const getCart = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/cart`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Get cart error:', error);
    throw error;
  }
};

// =====================================================
// UPDATE CART DELIVERY ADDRESS
// =====================================================

export const updateCartDeliveryAddress = async (deliveryAddress) => {
  try {
    const response = await fetch(
      `${BASE_URL}/cart/delivery-address`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({
          deliveryAddress,
        }),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Update cart delivery address error:',
      error
    );

    throw error;
  }
};


export const addToCart = async (
  inventoryId,
  quantity = 1
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/cart/items`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          inventoryId,
          quantity: Number(quantity),
        }),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Add to cart error:', error);
    throw error;
  }
};


export const updateCartItem = async (
  itemId,
  quantity
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/cart/items/${itemId}`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({
          quantity: Number(quantity),
        }),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Update cart item error:',
      error
    );
    throw error;
  }
};


export const removeCartItem = async (
  itemId
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/cart/items/${itemId}`,
      {
        method: 'DELETE',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Remove cart item error:',
      error
    );
    throw error;
  }
};


export const clearCart = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/cart`,
      {
        method: 'DELETE',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log('Clear cart error:', error);
    throw error;
  }
};

// ============================================================
// MARKETPLACE - CUSTOMER ORDER
// ============================================================

export const createCustomerOrder = async (orderData) => {
  try {
    const response = await fetch(
      `${BASE_URL}/customer-orders`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(orderData),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Create customer order error:',
      error
    );
    throw error;
  }
};

// ============================================================
// CUSTOMER ORDERS
// ============================================================

export const getCustomerOrders = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/customer-orders/my`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get customer orders error:',
      error
    );
    throw error;
  }
};


export const getCustomerOrder = async (orderId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/customer-orders/${orderId}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get customer order error:',
      error
    );
    throw error;
  }
};

// ============================================================
// CANCEL CUSTOMER ORDER
// ============================================================

export const cancelCustomerOrder = async (
  orderId,
  reason = 'Cancelled by customer'
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/customer-orders/${orderId}/cancel`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({
          reason,
        }),
      }
    );

    return await parseResponse(response);

  } catch (error) {
    console.log(
      'Cancel customer order error:',
      error
    );

    throw error;
  }
};

// ============================================================
// PHARMACY - ONLINE CUSTOMER ORDERS
// ============================================================

export const getPharmacyOrders = async (
  pharmacyId
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/customer-orders/pharmacy/${pharmacyId}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);

  } catch (error) {
    console.log(
      'Get pharmacy orders error:',
      error
    );

    throw error;
  }
};


export const updateCustomerOrderStatus = async (
  orderId,
  status,
  cancellationReason = ''
) => {
  try {
    const response = await fetch(
      `${BASE_URL}/customer-orders/${orderId}/status`,
      {
        method: 'PUT',
        headers: await authHeaders(),

        body: JSON.stringify({
          status,
          cancellationReason,
        }),
      }
    );

    return await parseResponse(response);

  } catch (error) {
    console.log(
      'Update customer order status error:',
      error
    );

    throw error;
  }
};

// ============================================================
// PHARMACY ONLINE INVENTORY
// ============================================================

export const getMyOnlineInventory = async () => {
  try {

    const response = await fetch(
      `${BASE_URL}/pharmacy-inventory/my`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(
      response
    );

  } catch (error) {

    console.log(
      'Get online inventory error:',
      error
    );

    throw error;
  }
};


// ============================================================
// ADD MEDICINE TO ONLINE INVENTORY
// ============================================================

export const addOnlineInventory = async (
  data
) => {

  try {

    const response = await fetch(
      `${BASE_URL}/pharmacy-inventory`,
      {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(
      response
    );

  } catch (error) {

    console.log(
      'Add online inventory error:',
      error
    );

    throw error;
  }
};


// ============================================================
// UPDATE ONLINE INVENTORY
// ============================================================

export const updateOnlineInventory = async (
  inventoryId,
  data
) => {

  try {

    const response = await fetch(
      `${BASE_URL}/pharmacy-inventory/${inventoryId}`,
      {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(
      response
    );

  } catch (error) {

    console.log(
      'Update online inventory error:',
      error
    );

    throw error;
  }
};


// ============================================================
// DELETE ONLINE INVENTORY
// ============================================================

export const deleteOnlineInventory = async (
  inventoryId
) => {

  try {

    const response = await fetch(
      `${BASE_URL}/pharmacy-inventory/${inventoryId}`,
      {
        method: 'DELETE',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(
      response
    );

  } catch (error) {

    console.log(
      'Delete online inventory error:',
      error
    );

    throw error;
  }
};
// ============================================================
// PHARMACY - CURRENT USER'S PHARMACY
// ============================================================

export const getMyPharmacy = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}/pharmacies/my`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    console.log(
      'Get my pharmacy error:',
      error
    );
    throw error;
  }
};

// ============================================================
// RAZORPAY PAYMENT
// ============================================================

export const createRazorpayOrder = async (
  orderData
) => {
  try {

    const response =
      await fetch(
        `${BASE_URL}/payments/create-order`,
        {
          method: 'POST',

          headers:
            await authHeaders(),

          body:
            JSON.stringify(orderData),
        }
      );

    return await parseResponse(
      response
    );

  } catch (error) {

    console.log(
      'Create Razorpay order error:',
      error
    );

    throw error;
  }
};


export const verifyRazorpayPayment =
  async (paymentData) => {

    try {

      const response =
        await fetch(
          `${BASE_URL}/payments/verify`,
          {
            method: 'POST',

            headers:
              await authHeaders(),

            body:
              JSON.stringify(
                paymentData
              ),
          }
        );

      return await parseResponse(
        response
      );

    } catch (error) {

      console.log(
        'Verify Razorpay payment error:',
        error
      );

      throw error;
    }
  };

  export const demoPay = async (
  paymentSessionId,
  result = 'success'
) => {
  try {

    const response = await fetch(
      `${BASE_URL}/payments/demo-pay`,
      {
        method: 'POST',

        headers: await authHeaders(),

        body: JSON.stringify({
          paymentSessionId,
          result,
        }),
      }
    );

    return await parseResponse(response);

  } catch (error) {

    console.log(
      'Demo payment error:',
      error
    );

    throw error;
  }
};

// =====================================================
// PRESCRIPTION UPLOAD
// =====================================================

// =====================================================
// PRESCRIPTION UPLOAD
// =====================================================

export const uploadPrescription = async (
  file,
  pharmacyId = null
) => {
  try {
    const token = await getToken();

    if (!token) {
      throw new Error('Authentication token not found');
    }

    if (!file?.uri) {
      throw new Error('Prescription file URI not found');
    }

    const fileName =
      file.name ||
      file.fileName ||
      `prescription-${Date.now()}.jpg`;

    const mimeType =
      file.mimeType ||
      file.type ||
      'image/jpeg';

    console.log('Uploading prescription:', {
      uri: file.uri,
      name: fileName,
      type: mimeType,
    });

    const uploadUrl =
      `${BASE_URL}/prescriptions/upload`;

    const result = await FileSystem.uploadAsync(
      uploadUrl,
      file.uri,
      {
        httpMethod: 'POST',

        uploadType:
          FileSystem.FileSystemUploadType.MULTIPART,

        fieldName: 'prescription',

        mimeType: mimeType,

        headers: {
          Authorization: `Bearer ${token}`,
        },

        parameters: pharmacyId
          ? {
              pharmacyId: String(pharmacyId),
            }
          : {},
      }
    );

    console.log(
      'Prescription upload response:',
      result.status,
      result.body
    );

    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        result.body || 'Prescription upload failed'
      );
    }

    try {
      return JSON.parse(result.body);
    } catch {
      return {
        success: true,
        body: result.body,
      };
    }

  } catch (error) {
    console.log(
      'Upload prescription error:',
      error
    );

    throw error;
  }
};

// =====================================================
// MY PRESCRIPTIONS
// =====================================================

export const getMyPrescriptions =
  async () => {
    try {

      const response =
        await fetch(
          `${BASE_URL}/prescriptions/my`,
          {
            method: 'GET',
            headers:
              await authHeaders(),
          }
        );

      return await parseResponse(
        response
      );

    } catch (error) {

      console.log(
        'Get my prescriptions error:',
        error
      );

      throw error;
    }
  };


// =====================================================
// PHARMACY PRESCRIPTIONS
// =====================================================

export const getPharmacyPrescriptions =
  async () => {
    try {

      const response =
        await fetch(
          `${BASE_URL}/prescriptions/pharmacy`,
          {
            method: 'GET',
            headers:
              await authHeaders(),
          }
        );

      return await parseResponse(
        response
      );

    } catch (error) {

      console.log(
        'Get pharmacy prescriptions error:',
        error
      );

      throw error;
    }
  };


// =====================================================
// VERIFY PRESCRIPTION
// =====================================================

export const verifyPrescription =
  async (
    prescriptionId,
    status,
    rejectionReason = ''
  ) => {
    try {

      const response =
        await fetch(
          `${BASE_URL}/prescriptions/${prescriptionId}/verify`,
          {
            method: 'PUT',

            headers:
              await authHeaders(),

            body:
              JSON.stringify({
                status,
                rejectionReason,
              }),
          }
        );

      return await parseResponse(
        response
      );

    } catch (error) {

      console.log(
        'Verify prescription error:',
        error
      );

      throw error;
    }
  };



// ============================================================
// EXPORT
// ============================================================

export {
  authHeaders, BASE_URL, getHeaders, getToken
};
