import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { fetchApi } from '../../services/api';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Laptop
} from 'lucide-react';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total_logs: 0, today_logs: 0, actions_count: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', targetPage);
      params.append('per_page', '20');
      if (search.trim()) params.append('search', search.trim());
      if (actionFilter) params.append('action', actionFilter);
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetchApi(`/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data.logs || []);
        setPagination(json.data.pagination || { current_page: 1, last_page: 1, per_page: 20, total: 0 });
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, roleFilter]);

  useEffect(() => {
    loadLogs(page);
  }, [page, actionFilter, roleFilter, loadLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs(1);
  };

  const getActionBadgeColor = (action) => {
    const act = (action || '').toUpperCase();
    if (act.startsWith('AUTH')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (act.includes('DELETE') || act.includes('BAN') || act.includes('DEACTIVATE')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('APPROVE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('STATUS')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                <p className="text-sm text-text-muted">
                  System-wide audit trail of security, administrative, and data events
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => loadLogs(page)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-purple/20"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total Events</span>
              <Activity className="h-5 w-5 text-primary-purple" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{stats.total_logs ?? pagination.total}</p>
            <p className="mt-1 text-xs text-text-muted">Recorded audit entries</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Today's Activity</span>
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{stats.today_logs ?? 0}</p>
            <p className="mt-1 text-xs text-text-muted">Logged in past 24 hours</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Showing</span>
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{logs.length}</p>
            <p className="mt-1 text-xs text-text-muted">Entries on current page</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search descriptions, actions, users, IPs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-primary-purple focus:outline-none focus:ring-2 focus:ring-primary-purple/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5">
                <Filter className="h-3.5 w-3.5 text-gray-500" />
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
                >
                  <option value="">All Actions</option>
                  <option value="AUTH_LOGIN">AUTH_LOGIN</option>
                  <option value="AUTH_LOGOUT">AUTH_LOGOUT</option>
                  <option value="AUTH_REGISTER">AUTH_REGISTER</option>
                  <option value="USER_STATUS_CHANGE">USER_STATUS_CHANGE</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5">
                <User className="h-3.5 w-3.5 text-gray-500" />
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                  <option value="Customer">Customer</option>
                  <option value="System">System</option>
                </select>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-primary-purple px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-deep"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Logs Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-4">Timestamp</th>
                  <th scope="col" className="px-6 py-4">User</th>
                  <th scope="col" className="px-6 py-4">Action</th>
                  <th scope="col" className="px-6 py-4">Description</th>
                  <th scope="col" className="px-6 py-4">IP Address</th>
                  <th scope="col" className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary-purple" />
                      <p className="mt-2 text-sm">Loading audit logs...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <Shield className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-2 text-sm font-medium text-gray-700">No audit logs found</p>
                      <p className="text-xs text-text-muted">Try clearing filters or search criteria</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5 font-medium text-gray-900">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(log.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-semibold text-gray-900">{log.user_name || 'System'}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                            {log.user_role || 'System'}
                          </span>
                          {log.user?.email && (
                            <span className="text-xs text-text-muted truncate max-w-36">{log.user.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="max-w-md px-6 py-4">
                        <p className="truncate font-medium text-gray-800" title={log.description}>
                          {log.description}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs font-mono text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 px-6 py-3">
              <span className="text-xs text-gray-500">
                Page <span className="font-semibold text-gray-900">{pagination.current_page}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination.last_page}</span> ({pagination.total} entries)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.current_page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm disabled:opacity-40 hover:bg-gray-50"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Inspection Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple">
                    <Shield className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Audit Entry #{selectedLog.id}</h3>
                    <p className="text-xs text-text-muted">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/75 p-3">
                    <span className="font-semibold text-gray-500 uppercase">Actor</span>
                    <p className="mt-1 font-bold text-gray-900">{selectedLog.user_name || 'System'}</p>
                    <p className="text-gray-500">{selectedLog.user_role || 'System'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/75 p-3">
                    <span className="font-semibold text-gray-500 uppercase">Action</span>
                    <p className="mt-1">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getActionBadgeColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-gray-500">Description</label>
                  <p className="mt-1 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-sm text-gray-800">
                    {selectedLog.description}
                  </p>
                </div>

                {selectedLog.auditable_type && (
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">Target Resource</label>
                    <div className="mt-1 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs font-mono text-gray-700">
                      {selectedLog.auditable_type} #{selectedLog.auditable_id}
                    </div>
                  </div>
                )}

                {selectedLog.properties && Object.keys(selectedLog.properties).length > 0 && (
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">Metadata / Properties</label>
                    <pre className="mt-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-900 p-3 text-xs text-emerald-400">
                      {JSON.stringify(selectedLog.properties, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5" />
                    <span>IP: <code className="font-mono text-gray-800">{selectedLog.ip_address}</code></span>
                  </div>
                  <div className="truncate" title={selectedLog.user_agent}>
                    Agent: <code className="font-mono text-gray-700">{selectedLog.user_agent}</code>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-4 text-right">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAuditLogs;
