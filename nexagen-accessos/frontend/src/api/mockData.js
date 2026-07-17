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
