// Mirrors docs/api-contract.md response shapes exactly, so swapping mock -> real
// API later is a find-and-replace, not a rewrite.

export const mockLoginResponse = {
  token: 'mock-jwt-token',
  user: {
    id: 1,
    name: 'Priya Sharma',
    email: 'priya@nexagen.com',
    roles: ['finance'],
    permissions: ['view_finance_dashboard'],
  },
};

export const mockUsers = [
  { id: 1, name: 'Priya Sharma', email: 'priya@nexagen.com', roles: ['finance'] },
  { id: 2, name: 'Arjun Mehta', email: 'arjun@nexagen.com', roles: ['hr'] },
  { id: 3, name: 'Admin User', email: 'admin@nexagen.com', roles: ['admin'] },
];

export const mockRoles = [
  { id: 1, name: 'admin', description: 'Full system access' },
  { id: 2, name: 'finance', description: 'Finance team access' },
  { id: 3, name: 'hr', description: 'HR team access' },
  { id: 4, name: 'employee', description: 'Base employee access' },
];

export const mockAccessRequests = [
  {
    id: 1,
    user: { id: 1, name: 'Priya Sharma' },
    requestedRole: { id: 3, name: 'hr' },
    requestedAt: '2026-07-17T09:00:00Z',
  },
];

export const mockAuditLogs = [
  { id: 1, user: { name: 'Priya Sharma' }, action: 'ACCESS_GRANTED', resource: 'view_finance_dashboard', ipAddress: '10.0.0.4', createdAt: '2026-07-17T09:01:00Z' },
  { id: 2, user: { name: 'Arjun Mehta' }, action: 'ACCESS_DENIED', resource: 'manage_users', ipAddress: '10.0.0.9', createdAt: '2026-07-17T09:05:00Z' },
];

export const mockAlerts = [
  { id: 1, userId: 1, riskScore: 72, reason: 'Login from new device at unusual hour', createdAt: '2026-07-17T02:14:00Z' },
];

// --- GET /access-requests/me --------------------------------------------
// Backend Dev 1 is still building this endpoint — it's not in
// docs/api-contract.md or Request.routes.js yet, so the exact field names
// below are this frontend's best guess at the documented shape (resource,
// requested access, dates, status, manager decision, admin decision,
// comments) rather than a confirmed contract. Covers all five statuses
// (PENDING_MANAGER | PENDING_ADMIN | APPROVED | REJECTED | REVOKED) so the
// "My requests" UI in Dashboard.jsx can be exercised against every state.
// Adjust field names here (and in client.js's getMyAccessRequests) once
// the real response shape is confirmed — Dashboard.jsx itself shouldn't
// need to change.
export const mockMyAccessRequests = [
  {
    id: 1,
    resource: 'Finance Dashboard',
    requestedAccess: 'finance',
    requestedAt: '2026-07-15T09:00:00Z',
    status: 'PENDING_MANAGER',
    managerDecision: null,
    adminDecision: null,
  },
  {
    id: 2,
    resource: 'HR Dashboard',
    requestedAccess: 'hr',
    requestedAt: '2026-07-10T09:00:00Z',
    status: 'PENDING_ADMIN',
    managerDecision: {
      decision: 'APPROVED',
      comment: 'Needed for Q3 headcount planning.',
      decidedAt: '2026-07-11T14:30:00Z',
    },
    adminDecision: null,
  },
  {
    id: 3,
    resource: 'User Management',
    requestedAccess: 'admin',
    requestedAt: '2026-06-28T09:00:00Z',
    status: 'APPROVED',
    managerDecision: {
      decision: 'APPROVED',
      comment: null,
      decidedAt: '2026-06-29T10:00:00Z',
    },
    adminDecision: {
      decision: 'APPROVED',
      comment: 'Approved for the migration project.',
      decidedAt: '2026-06-30T16:45:00Z',
    },
  },
  {
    id: 4,
    resource: 'Audit Log',
    requestedAccess: 'employee',
    requestedAt: '2026-06-20T09:00:00Z',
    status: 'REJECTED',
    managerDecision: {
      decision: 'REJECTED',
      comment: 'Not required for current role.',
      decidedAt: '2026-06-21T11:15:00Z',
    },
    adminDecision: null,
  },
  {
    id: 5,
    resource: 'Finance Dashboard',
    requestedAccess: 'finance',
    requestedAt: '2026-05-02T09:00:00Z',
    status: 'REVOKED',
    managerDecision: {
      decision: 'APPROVED',
      comment: null,
      decidedAt: '2026-05-03T09:00:00Z',
    },
    adminDecision: {
      decision: 'APPROVED',
      comment: 'Access revoked after role change.',
      decidedAt: '2026-06-01T08:00:00Z',
    },
  },
];
