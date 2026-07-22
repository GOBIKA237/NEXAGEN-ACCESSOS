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

// Clears the local session. Exported so the logout button and the 401
// interceptor below share one definition instead of duplicating it.
export function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

// If any authenticated request comes back 401, the token is missing/expired
// — clear the session and bounce to login. Skip this for the login endpoint
// itself: a 401 there just means "wrong password" and is already handled
// as a normal form error by Login.jsx, not a dead session.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint) {
      logout();
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

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

// Backs Dashboard.jsx's refreshSession() — GET /auth/me re-reads current
// roles/permissions from the DB so an admin's approval shows up without a
// re-login. See auth.routes.js for the route.
export async function getMe() {
  const { data } = await api.get('/auth/me');
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

// Roles list for the Request Access dropdown — any logged-in user, not
// admin-only. Hits GET /roles (Request.routes.js), which is deliberately
// separate from the admin-only GET /admin/roles above so employees without
// manage_users can still see what roles exist to request.
export async function getAvailableRoles() {
  if (USE_MOCK) {
    return mock.mockRoles;
  }

  const { data } = await api.get('/roles');
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

// =========================
// MY ACCESS REQUESTS (mine) — Frontend Dev 1
// =========================
// Backs the "My requests" section in Dashboard.jsx. Backend Dev 1 is
// still building GET /access-requests/me — it isn't in
// docs/api-contract.md or Request.routes.js yet — so this is gated on
// its own flag rather than the shared USE_MOCK above (USE_MOCK is for
// switching the *whole app* to mock data; this endpoint specifically
// doesn't exist on the real backend yet regardless of that flag).
//
// Flip MY_ACCESS_REQUESTS_LIVE to true once the endpoint ships. The mock
// data in mockData.js mirrors the shape Backend Dev 1 documented
// (resource, requested access, dates, status, manager decision, admin
// decision, comments) so this swap shouldn't require any changes in
// Dashboard.jsx — only here, if the real field names end up differing.
const MY_ACCESS_REQUESTS_LIVE = false;

export async function getMyAccessRequests() {
  if (!MY_ACCESS_REQUESTS_LIVE) {
    return mock.mockMyAccessRequests;
  }

  const { data } = await api.get('/access-requests/me');
  return data;
}
