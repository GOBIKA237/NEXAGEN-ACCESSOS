// Owned by Frontend Dev 2 (UI built for Frontend Dev 3's request). Admin tabs:
// Users, Roles, Access Requests, Audit Log. Alerts render as a persistent
// banner above the tabs rather than as their own tab.
import { useEffect, useState } from 'react';
import {
  getUsers,
  getRoles,
  getAccessRequests,
  getAuditLogs,
  getAlerts,
  approveRequest,
  denyRequest,
} from '../api/client.js';

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'requests', label: 'Access Requests' },
  { key: 'audit', label: 'Audit Log' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatusPill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function LoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-400">
        Loading…
      </td>
    </tr>
  );
}

function ErrorRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-rose-500">
        {message}
      </td>
    </tr>
  );
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  );
}

// --- Alert banner --------------------------------------------------------

function AlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    getAlerts()
      .then((data) => {
        if (!cancelled) setAlerts(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (loading || visible.length === 0) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <ul className="divide-y divide-amber-100">
        {visible.map((alert) => {
          const high = alert.riskScore > 50;
          return (
            <li
              key={alert.id}
              className={`flex items-center justify-between gap-4 px-6 py-2.5 text-sm ${
                high ? 'bg-rose-50' : 'bg-amber-50'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                    high ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}
                  aria-hidden="true"
                >
                  !
                </span>
                <span className={`truncate ${high ? 'text-rose-800' : 'text-amber-800'}`}>
                  {alert.reason}
                </span>
                <StatusPill tone={high ? 'red' : 'amber'}>
                  Risk {alert.riskScore}
                </StatusPill>
                <span className="hidden text-xs text-slate-400 sm:inline">
                  {formatDate(alert.createdAt)}
                </span>
              </div>
              <button
                onClick={() =>
                  setDismissed((prev) => new Set(prev).add(alert.id))
                }
                className="flex-none text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Dismiss
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- Data hook ------------------------------------------------------------

function useTabData(fetcher, deps = []) {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const refetch = () => setReloadToken((t) => t + 1);

  return [data, status, refetch];
}

// --- Tabs -------------------------------------------------------------

function UsersTab() {
  const [users, status] = useTabData(getUsers);
  const colSpan = 3;

  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Email</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Roles</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {status === 'loading' && <LoadingRow colSpan={colSpan} />}
        {status === 'error' && (
          <ErrorRow colSpan={colSpan} message="Couldn't load users." />
        )}
        {status === 'ready' && users.length === 0 && (
          <EmptyRow colSpan={colSpan} message="No users found." />
        )}
        {status === 'ready' &&
          users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
              <td className="px-4 py-3 text-slate-500">{user.email}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((role) => (
                    <StatusPill key={role} tone="slate">
                      {role}
                    </StatusPill>
                  ))}
                </div>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function RolesTab() {
  const [roles, status] = useTabData(getRoles);
  const colSpan = 2;

  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Role</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Description</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {status === 'loading' && <LoadingRow colSpan={colSpan} />}
        {status === 'error' && (
          <ErrorRow colSpan={colSpan} message="Couldn't load roles." />
        )}
        {status === 'ready' && roles.length === 0 && (
          <EmptyRow colSpan={colSpan} message="No roles found." />
        )}
        {status === 'ready' &&
          roles.map((role) => (
            <tr key={role.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{role.name}</td>
              <td className="px-4 py-3 text-slate-500">{role.description}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function AccessRequestsTab() {
  const [requests, status, refetch] = useTabData(getAccessRequests);
  const [pending, setPending] = useState({}); // id -> true while request is in flight
  const [rowError, setRowError] = useState({}); // id -> error message
  const colSpan = 4;

  async function handleDecision(requestId, decision) {
    setPending((prev) => ({ ...prev, [requestId]: true }));
    setRowError((prev) => ({ ...prev, [requestId]: null }));

    try {
      if (decision === 'approved') {
        await approveRequest(requestId);
      } else {
        await denyRequest(requestId);
      }
      // Row disappears once the list re-fetches (backend only returns
      // pending requests), so there's no separate "handled" state to track.
      refetch();
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [requestId]: `Couldn't ${decision === 'approved' ? 'approve' : 'deny'} this request. Try again.`,
      }));
    } finally {
      setPending((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Requester</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Requested role</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Requested at</th>
          <th className="px-4 py-3 text-right font-medium text-slate-500">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {status === 'loading' && <LoadingRow colSpan={colSpan} />}
        {status === 'error' && (
          <ErrorRow colSpan={colSpan} message="Couldn't load access requests." />
        )}
        {status === 'ready' && requests.length === 0 && (
          <EmptyRow colSpan={colSpan} message="No pending access requests." />
        )}
        {status === 'ready' &&
          requests.map((req) => {
            const isPending = !!pending[req.id];
            const error = rowError[req.id];
            return (
              <tr key={req.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {req.user.name}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {req.requestedRole.name}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDate(req.requestedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDecision(req.id, 'approved')}
                        disabled={isPending}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDecision(req.id, 'denied')}
                        disabled={isPending}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending ? 'Denying…' : 'Deny'}
                      </button>
                    </div>
                    {error && (
                      <span className="text-xs text-rose-500">{error}</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

// The backend currently returns audit rows as raw snake_case columns with
// no joined `user` object (user_id only) — that mismatches what the API
// contract promises (`{ user, ipAddress, createdAt }`) and was the actual
// reason this tab looked empty: `log.user.name` threw on every row since
// `log.user` was undefined, so nothing rendered. These helpers accept
// either shape so the tab degrades gracefully instead of blanking out
// while that backend fix lands — see bug report.
function auditUserName(log) {
  return (
    log.user?.name ??
    log.userName ??
    (log.user_id != null ? `User #${log.user_id}` : 'Unknown user')
  );
}

function auditIp(log) {
  return log.ipAddress ?? log.ip_address ?? '—';
}

function auditCreatedAt(log) {
  return log.createdAt ?? log.created_at ?? null;
}

function AuditLogTab() {
  const [logs, status] = useTabData(getAuditLogs);
  const colSpan = 4;

  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left font-medium text-slate-500">User</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Action</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">Resource</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">IP address</th>
          <th className="px-4 py-3 text-left font-medium text-slate-500">When</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {status === 'loading' && <LoadingRow colSpan={colSpan} />}
        {status === 'error' && (
          <ErrorRow colSpan={colSpan} message="Couldn't load audit logs." />
        )}
        {status === 'ready' && logs.length === 0 && (
          <EmptyRow colSpan={colSpan} message="No audit log entries yet." />
        )}
        {status === 'ready' &&
          logs.map((log) => {
            const isDenied = log.action.toLowerCase().includes('denied');
            return (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {auditUserName(log)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={isDenied ? 'red' : 'green'}>
                    {log.action}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-slate-500">{log.resource}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {auditIp(log)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDate(auditCreatedAt(log))}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

// --- Page shell -----------------------------------------------------------

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="min-h-screen bg-slate-50">
      <AlertBanner />

      <header className="border-b border-slate-200 bg-white px-6 pt-6">
        <h1 className="text-xl font-semibold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage users, roles, and access across AccessOS.
        </p>

        <nav className="mt-5 flex gap-6 border-b border-transparent">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="px-6 py-6">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'roles' && <RolesTab />}
            {activeTab === 'requests' && <AccessRequestsTab />}
            {activeTab === 'audit' && <AuditLogTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
