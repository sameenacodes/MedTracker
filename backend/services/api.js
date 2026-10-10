const axios = require('axios');

/**
 * ============================================================
 * MedTracker Backend API Service
 * ============================================================
 *
 * This file is for BACKEND / NODE.JS use only.
 *
 * Do NOT import:
 * - react-native
 * - Platform
 * - AsyncStorage
 * - frontend storage services
 *
 * Frontend API calls belong in:
 * src/services/api.js
 * ============================================================
 */


/**
 * ------------------------------------------------------------
 * GET API BASE URL
 * ------------------------------------------------------------
 *
 * If you need to call another backend/external API,
 * set API_BASE_URL inside backend/.env
 *
 * Example:
 *
 * API_BASE_URL=https://medtracker-1.onrender.com/api
 *
 * ------------------------------------------------------------
 */

const API_BASE_URL =
  process.env.API_BASE_URL ||
  'https://medtracker-1.onrender.com/api';


/**
 * ------------------------------------------------------------
 * COMMON HEADERS
 * ------------------------------------------------------------
 */

const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};


/**
 * ------------------------------------------------------------
 * GET REQUEST
 * ------------------------------------------------------------
 */

const get = async (
  endpoint,
  token = null,
  config = {}
) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}${endpoint}`,
      {
        ...config,
        headers: {
          ...getHeaders(token),
          ...(config.headers || {}),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      'API GET Error:',
      endpoint,
      error.response?.data || error.message
    );

    throw error;
  }
};


/**
 * ------------------------------------------------------------
 * POST REQUEST
 * ------------------------------------------------------------
 */

const post = async (
  endpoint,
  data = {},
  token = null,
  config = {}
) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}${endpoint}`,
      data,
      {
        ...config,
        headers: {
          ...getHeaders(token),
          ...(config.headers || {}),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      'API POST Error:',
      endpoint,
      error.response?.data || error.message
    );

    throw error;
  }
};


/**
 * ------------------------------------------------------------
 * PUT REQUEST
 * ------------------------------------------------------------
 */

const put = async (
  endpoint,
  data = {},
  token = null,
  config = {}
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}${endpoint}`,
      data,
      {
        ...config,
        headers: {
          ...getHeaders(token),
          ...(config.headers || {}),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      'API PUT Error:',
      endpoint,
      error.response?.data || error.message
    );

    throw error;
  }
};


/**
 * ------------------------------------------------------------
 * PATCH REQUEST
 * ------------------------------------------------------------
 */

const patch = async (
  endpoint,
  data = {},
  token = null,
  config = {}
) => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}${endpoint}`,
      data,
      {
        ...config,
        headers: {
          ...getHeaders(token),
          ...(config.headers || {}),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      'API PATCH Error:',
      endpoint,
      error.response?.data || error.message
    );

    throw error;
  }
};


/**
 * ------------------------------------------------------------
 * DELETE REQUEST
 * ------------------------------------------------------------
 */

const remove = async (
  endpoint,
  token = null,
  config = {}
) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}${endpoint}`,
      {
        ...config,
        headers: {
          ...getHeaders(token),
          ...(config.headers || {}),
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      'API DELETE Error:',
      endpoint,
      error.response?.data || error.message
    );

    throw error;
  }
};


/**
 * ------------------------------------------------------------
 * REQUEST HELPER
 * ------------------------------------------------------------
 *
 * Generic function if you need any HTTP method.
 * ------------------------------------------------------------
 */

const request = async ({
  method = 'GET',
  endpoint,
  data = null,
  token = null,
  config = {},
}) => {
  try {
    const options = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      ...config,

      headers: {
        ...getHeaders(token),
        ...(config.headers || {}),
      },
    };

    if (
      data !== null &&
      data !== undefined
    ) {
      options.data = data;
    }

    const response = await axios(options);

    return response.data;
  } catch (error) {
    console.error(
      `API ${method} Error:`,
      endpoint,
      error.response?.data || error.message
    );

    throw error;
  }
};


/**
 * ------------------------------------------------------------
 * HEALTH CHECK
 * ------------------------------------------------------------
 */

const checkApiConnection = async () => {
  try {
    const response = await axios.get(
      API_BASE_URL,
      {
        timeout: 5000,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'API connection failed',
    };
  }
};


/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {
  API_BASE_URL,
  getHeaders,
  get,
  post,
  put,
  patch,
  remove,
  request,
  checkApiConnection,
};