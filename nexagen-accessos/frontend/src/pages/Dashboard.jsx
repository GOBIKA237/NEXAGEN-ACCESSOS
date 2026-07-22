import { useState, useEffect } from 'react';
import { requestAccess, getRoles } from '../api/client.js';

// Static registry of dashboard features. Add new cards here as the product
// grows — each just needs the permission string that unlocks it.
const FEATURES = [
  {
    key: 'view_finance_dashboard',
    title: 'Finance Dashboard',
    description: 'View budgets, expenses, and financial reports.',
    accent: 'bg-emerald-500',
  },
  {
    key: 'view_hr_dashboard',
    title: 'HR Dashboard',
    description: 'Employee records, leave requests, and payroll.',
    accent: 'bg-sky-500',
  },
  {
    key: 'manage_users',
    title: 'User Management',
    description: 'Create, edit, and manage user roles.',
    accent: 'bg-violet-500',
  },
  {
    key: 'view_audit_log',
    title: 'Audit Log',
    description: 'Review permission checks and admin actions.',
    accent: 'bg-amber-500',
  },
];

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function FeatureCard({ title, description, accent, enabled }) {
  return (
    <div
      className={`relative rounded-xl border p-5 shadow-sm transition ${
        enabled
          ? 'border-slate-200 bg-white hover:shadow-md hover:-translate-y-0.5'
          : 'border-slate-100 bg-slate-50 opacity-60'
      }`}
    >
      <div className={`h-1.5 w-10 rounded-full ${accent} mb-4`} />
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-4">
        {enabled ? (
          <button
            type="button"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Open →
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
            🔒 Restricted
          </span>
        )}
      </div>
    </div>
  );
}

function Toast({ type, message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isError = type === 'error';

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      <span>{isError ? '⚠️' : '✅'}</span>
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 text-current opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-200" />
            </div>
          </div>
          <div className="h-9 w-36 rounded-lg bg-slate-200" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-slate-100 bg-white p-5">
              <div className="mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
              <div className="mb-2 h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestAccessModal({ roles, rolesError, onClose, onSubmit, submitting }) {
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // roles load asynchronously after the modal opens, so default the
  // selection once they arrive instead of only on mount.
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const role = roles.find((r) => String(r.id) === String(selectedRoleId));
    onSubmit(role);
  };

  const canSubmit = !rolesError && roles.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Request Access</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {rolesError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {rolesError}
            </p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-slate-500">Loading roles…</p>
          ) : (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} — {role.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }
  const [roles, setRoles] = useState([]);
  const [rolesError, setRolesError] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('user');

    if (!raw) {
      window.location.href = '/';
      return;
    }

    try {
      const parsedUser = JSON.parse(raw);
      setUser(parsedUser);
    } catch (err) {
      // Malformed JSON in sessionStorage — treat same as "not logged in"
      console.error('Failed to parse user from sessionStorage:', err);
      sessionStorage.removeItem('user');
      window.location.href = '/';
      return;
    }

    setCheckedStorage(true);
  }, []);

  const openRequestModal = async () => {
    setModalOpen(true);
    setRolesError(null);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles:', err);
      setRolesError('Could not load the list of roles. Please try again.');
    }
  };

  const handleRequestSubmit = async (role) => {
    if (!role) return;

    setSubmitting(true);

    try {
      await requestAccess(role.id);
      setModalOpen(false);
      setToast({
        type: 'success',
        message: `Access request for "${role.name}" submitted — an admin will review it.`,
      });
    } catch (err) {
      console.error('Failed to submit access request:', err);
      const message =
        err.response?.data?.error ||
        'Could not submit your request. Please try again.';
      setToast({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  // Avoid a flash of empty content until we've checked sessionStorage —
  // show a skeleton instead of nothing while that resolves.
  if (!checkedStorage || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
              {initials(user.name)}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">
                Welcome, {user.name}
              </h1>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium italic text-slate-400">
                    No roles assigned yet
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openRequestModal}
            className="self-start rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 sm:self-auto"
          >
            Request Access
          </button>
        </div>

        {/* Feature grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.key}
              title={feature.title}
              description={feature.description}
              accent={feature.accent}
              enabled={user.permissions.includes(feature.key)}
            />
          ))}
        </div>
      </div>

      {modalOpen && (
        <RequestAccessModal
          roles={roles}
          rolesError={rolesError}
          onClose={() => setModalOpen(false)}
          onSubmit={handleRequestSubmit}
          submitting={submitting}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
