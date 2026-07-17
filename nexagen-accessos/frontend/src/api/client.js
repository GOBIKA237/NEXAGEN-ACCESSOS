import axios from 'axios';
import * as mock from './mockData.js';

// Flip to false once the real backend is running and you want to test against it.
export const USE_MOCK = true;

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token'); // fine in a real app (not this artifact sandbox)
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Thin wrapper functions — call these from your components instead of `api`
// directly. Each one returns mock data today and hits the real endpoint once
// USE_MOCK is false and the backend team's routes are live. Nobody has to
// change their component code when that flip happens.

export async function login(email, password) {
  if (USE_MOCK) return mock.mockLoginResponse;
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function getUsers() {
  if (USE_MOCK) return mock.mockUsers;
  const { data } = await api.get('/admin/users');
  return data;
}

export async function getRoles() {
  if (USE_MOCK) return mock.mockRoles;
  const { data } = await api.get('/admin/roles');
  return data;
}

export async function getAccessRequests() {
  if (USE_MOCK) return mock.mockAccessRequests;
  const { data } = await api.get('/admin/access-requests?status=pending');
  return data;
}

export async function getAuditLogs() {
  if (USE_MOCK) return mock.mockAuditLogs;
  const { data } = await api.get('/admin/audit-logs');
  return data;
}

export async function getAlerts() {
  if (USE_MOCK) return mock.mockAlerts;
  const { data } = await api.get('/admin/alerts');
  return data;
}
