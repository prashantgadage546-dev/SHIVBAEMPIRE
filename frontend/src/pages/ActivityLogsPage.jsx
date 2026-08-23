// =============================================================
// SHIVBAEMPIRE — Activity Logs Page (Admin)
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { Activity, Filter } from 'lucide-react';
import api from '../services/api';
import { formatDateTime } from '../utils/helpers';

const ACTION_COLORS = {
  USER_LOGIN: 'badge-active', USER_LOGOUT: 'badge-inactive',
  DONOR_CREATED: 'badge-active', DONOR_UPDATED: 'badge-pending', DONOR_DELETED: 'badge-cancelled',
  COLLECTION_CREATED: 'badge-active', COLLECTION_DELETED: 'badge-cancelled',
  EXPENSE_CREATED: 'badge-active', EXPENSE_DELETED: 'badge-cancelled',
  COLLECTOR_CREATED: 'badge-active', COLLECTOR_UPDATED: 'badge-pending',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');

  const fetchLogs = useCallback(async (page = 1, mod = moduleFilter) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/activity-logs?page=${page}&limit=50&module=${mod}`);
      setLogs(data.data);
      setPagination(data.pagination);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [moduleFilter]);

  useEffect(() => { fetchLogs(); }, []);

  const MODULES = ['', 'AUTH', 'DONOR', 'COLLECTION', 'EXPENSE', 'USER', 'EVENT', 'SYSTEM'];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{pagination.total} log entries</p>
        </div>
      </div>

      <div className="card p-4 flex gap-3">
        <select
          className="form-input w-full sm:w-44 text-sm"
          value={moduleFilter}
          onChange={e => { setModuleFilter(e.target.value); fetchLogs(1, e.target.value); }}
        >
          {MODULES.map(m => <option key={m} value={m}>{m || 'All Modules'}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Record ID</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton h-4 w-full rounded" /></td>)}</tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No audit logs found.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="text-sm font-medium text-gray-900">{log.user_name || '—'}</td>
                  <td>
                    <span className={`badge text-xs ${ACTION_COLORS[log.action] || 'badge-inactive'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500 font-mono">{log.module}</td>
                  <td className="text-xs text-gray-400 font-mono">{log.record_id || '—'}</td>
                  <td className="text-xs text-gray-400 font-mono">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)} className="btn btn-secondary btn-sm">Previous</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchLogs(pagination.page + 1)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
