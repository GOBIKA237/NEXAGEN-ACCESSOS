import axios from 'axios';
import * as mock from './mockData.js';

// Set to false to use the real backend
export const USE_MOCK = false;

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically attach JWT token to authenticated requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// =========================
// AUTHENTICATION
// =========================

export async function login(email, password) {
  if (USE_MOCK) {
    return mock.mockLoginResponse;
  }

  const { data } = await api.post('/auth/login', {
    email,
    password,
  });

  return data;
}

export async function register(name, email, password) {
  const { data } = await api.post('/auth/register', {
    name,
    email,
    password,
  });

  return data;
}

// =========================
// ADMIN - USERS
// =========================

export async function getUsers() {
  if (USE_MOCK) {
    return mock.mockUsers;
  }

  const { data } = await api.get('/admin/users');
  return data;
}

// =========================
// ADMIN - ROLES
// =========================

export async function getRoles() {
  if (USE_MOCK) {
    return mock.mockRoles;
  }

  const { data } = await api.get('/admin/roles');
  return data;
}

// =========================
// ACCESS REQUESTS
// =========================

export async function getAccessRequests() {
  if (USE_MOCK) {
    return mock.mockAccessRequests;
  }

  const { data } = await api.get(
    '/admin/access-requests?status=pending'
  );

  return data;
}

// =========================
// REQUEST ACCESS (user-facing)
// =========================

export async function requestAccess(roleId) {
  if (USE_MOCK) {
    return {
      id: Date.now(),
      status: 'pending',
    };
  }

  const { data } = await api.post('/access-requests', {
    requestedRoleId: roleId,
  });

  return data;
}

// =========================
// AUDIT LOGS
// =========================

export async function getAuditLogs() {
  if (USE_MOCK) {
    return mock.mockAuditLogs;
  }

  const { data } = await api.get('/admin/audit-logs');
  return data;
}

// =========================
// ALERTS
// =========================

export async function getAlerts() {
  if (USE_MOCK) {
    return mock.mockAlerts;
  }

  const { data } = await api.get('/admin/alerts');
  return data;
}

// =========================
// APPROVE ACCESS REQUEST
// =========================

export async function approveRequest(id) {
  if (USE_MOCK) {
    return {
      id,
      status: 'approved',
    };
  }

  const { data } = await api.put(
    `/admin/access-requests/${id}`,
    {
      status: 'approved',
    }
  );

  return data;
}

// =========================
// DENY ACCESS REQUEST
// =========================

export async function denyRequest(id) {
  if (USE_MOCK) {
    return {
      id,
      status: 'denied',
    };
  }

  const { data } = await api.put(
    `/admin/access-requests/${id}`,
    {
      status: 'denied',
    }
  );

  return data;
}
