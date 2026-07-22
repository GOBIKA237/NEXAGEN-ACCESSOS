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

// Only PENDING_ADMIN requests belong on the admin's queue now that requests
// flow PENDING_MANAGER -> PENDING_ADMIN -> APPROVED/REJECTED (managers
// handle PENDING_MANAGER via getManagerAccessRequests below). The
// ?status= query param already exists on GET /admin/access-requests
// (Request.routes.js), so this is just a value change, not a new param.
export async function getAccessRequests() {
  if (USE_MOCK) {
    return mock.mockAccessRequests;
  }

  const { data } = await api.get(
    '/admin/access-requests?status=PENDING_ADMIN'
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
// APPROVE ACCESS REQUEST (admin, final decision)
// =========================
// Body shape follows mockData.js's mockMyAccessRequests, which already
// documents the manager/admin decision shape as { decision, comment,
// decidedAt } — this is the clearest signal we have for what Backend Dev 2
// will land on for the PENDING_ADMIN step, ahead of manager.routes.js
// actually landing. `comment` is optional (admin can approve/reject with
// no note). Swap the body shape here only if the real contract differs —
// AdminDashboard.jsx shouldn't need to change.
export async function approveRequest(id, comment) {
  if (USE_MOCK) {
    return {
      id,
      status: 'APPROVED',
    };
  }

  const { data } = await api.put(
    `/admin/access-requests/${id}`,
    {
      decision: 'APPROVED',
      comment: comment || undefined,
    }
  );

  return data;
}

// =========================
// REJECT ACCESS REQUEST (admin, final decision)
// =========================

export async function denyRequest(id, comment) {
  if (USE_MOCK) {
    return {
      id,
      status: 'REJECTED',
    };
  }

  const { data } = await api.put(
    `/admin/access-requests/${id}`,
    {
      decision: 'REJECTED',
      comment: comment || undefined,
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

// =========================
// MANAGER DASHBOARD — Frontend Dev 2
// =========================
// Backs ManagerDashboard.jsx. Backend Dev 2 is building manager.routes.js
// (GET /manager/team, GET /manager/access-requests, PUT
// /manager/access-requests/:id) — not confirmed live yet, so everything
// below is gated on its own MANAGER_ROUTES_LIVE flag rather than the
// shared USE_MOCK (that flag is for switching the whole app to mock; this
// is specifically about these three routes not existing on the real
// backend yet). Flip it once manager.routes.js ships.
//
// Field names below (status: PENDING_MANAGER/PENDING_ADMIN/APPROVED/
// REJECTED, decision comment as `comment`, decision blocks shaped
// { decision, comment, decidedAt }) follow mockData.js's
// mockMyAccessRequests, which is the clearest existing signal for what
// Backend Dev 2 will land on — swap only the bodies below if the real
// contract ends up differing; ManagerDashboard.jsx itself shouldn't need
// to change.
const MANAGER_ROUTES_LIVE = false;

const mockManagerTeam = [
  { id: 4, name: 'Ravi Kumar', email: 'ravi@nexagen.com', roles: ['employee'], title: 'Support Engineer' },
  { id: 5, name: 'Sneha Iyer', email: 'sneha@nexagen.com', roles: ['employee'], title: 'Support Engineer' },
  { id: 6, name: 'Vikram Nair', email: 'vikram@nexagen.com', roles: ['employee', 'finance'], title: 'Analyst' },
];

const mockManagerAccessRequests = [
  {
    id: 101,
    user: { id: 4, name: 'Ravi Kumar' },
    requestedRole: { id: 3, name: 'hr' },
    requestedAt: '2026-07-20T10:15:00Z',
    status: 'PENDING_MANAGER',
  },
];

const mockApprovalHistory = [
  {
    id: 88,
    user: { id: 5, name: 'Sneha Iyer' },
    requestedRole: { id: 2, name: 'finance' },
    requestedAt: '2026-07-10T09:00:00Z',
    status: 'PENDING_ADMIN',
    managerDecision: {
      decision: 'APPROVED',
      comment: 'Needed for expense reporting.',
      decidedAt: '2026-07-11T13:00:00Z',
    },
  },
  {
    id: 77,
    user: { id: 6, name: 'Vikram Nair' },
    requestedRole: { id: 3, name: 'hr' },
    requestedAt: '2026-06-18T09:00:00Z',
    status: 'REJECTED',
    managerDecision: {
      decision: 'REJECTED',
      comment: 'Out of scope for this role.',
      decidedAt: '2026-06-19T10:00:00Z',
    },
  },
];

// GET /manager/team — the manager's direct reports.
export async function getManagerTeam() {
  if (!MANAGER_ROUTES_LIVE) {
    return mockManagerTeam;
  }

  const { data } = await api.get('/manager/team');
  return data;
}

// GET /manager/access-requests — defaults to the manager's actionable
// queue (PENDING_MANAGER). `status` lets ApprovalHistoryTab reuse this
// same call for everything that's moved past that stage; pass 'ALL' for
// the full history regardless of current status.
export async function getManagerAccessRequests(status = 'PENDING_MANAGER') {
  if (!MANAGER_ROUTES_LIVE) {
    if (status === 'PENDING_MANAGER') return mockManagerAccessRequests;
    return mockApprovalHistory.filter((r) =>
      status === 'ALL' ? true : r.status === status
    );
  }

  const { data } = await api.get(
    `/manager/access-requests?status=${encodeURIComponent(status)}`
  );
  return data;
}

// Full history for this manager's team: everything they've already
// decided on, regardless of where it ended up (PENDING_ADMIN, APPROVED,
// or REJECTED).
export async function getManagerApprovalHistory() {
  return getManagerAccessRequests('ALL');
}

// PUT /manager/access-requests/:id
// Approve moves the request to PENDING_ADMIN; reject moves it to
// REJECTED. Body shape matches admin's approveRequest/denyRequest above
// ({ decision, comment }) for consistency.
export async function reviewManagerAccessRequest(id, decision, comment) {
  if (!MANAGER_ROUTES_LIVE) {
    return { id, status: decision === 'APPROVED' ? 'PENDING_ADMIN' : 'REJECTED' };
  }

  const { data } = await api.put(`/manager/access-requests/${id}`, {
    decision,
    comment: comment || undefined,
  });
  return data;
}

export async function approveManagerAccessRequest(id, comment) {
  return reviewManagerAccessRequest(id, 'APPROVED', comment);
}

export async function rejectManagerAccessRequest(id, comment) {
  return reviewManagerAccessRequest(id, 'REJECTED', comment);
}
