// =============================================================
// SHIVBAEMPIRE — Collectors Page (Admin only)
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, UserX, UserCheck, X, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, getErrorMessage } from '../utils/helpers';
import { useToast } from '../context/ToastContext';

function CollectorModal({ collector, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: collector?.full_name || '',
    username: collector?.username || '',
    email: collector?.email || '',
    mobile: collector?.mobile || '',
    password: '',
    status: collector?.status || 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    setLoading(true);
    try {
      if (collector) {
        await api.put(`/collectors/${collector.id}`, form);
        toast.success('Collector updated.');
      } else {
        await api.post('/collectors', form);
        toast.success('Collector created.');
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{collector ? 'Edit Collector' : 'Add Collector'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} required />
            </div>
            <div>
              <label className="form-label">Username *</label>
              <input className="form-input" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} required disabled={!!collector} />
            </div>
            <div>
              <label className="form-label">Mobile</label>
              <input className="form-input" value={form.mobile} onChange={e => setForm(f => ({...f, mobile: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="form-label">{collector ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required={!collector} minLength={8} placeholder="Min. 8 characters" />
            </div>
            {collector && (
              <div className="col-span-2">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : (collector ? 'Update' : 'Create Collector')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CollectorsPage() {
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const fetchCollectors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/collectors');
      setCollectors(data.data);
    } catch {
      toast.error('Failed to load collectors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCollectors(); }, []);

  const toggleStatus = async (collector) => {
    try {
      const newStatus = collector.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.put(`/collectors/${collector.id}`, { ...collector, status: newStatus });
      toast.success(`Collector ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      fetchCollectors();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collectors</h1>
          <p className="page-subtitle">{collectors.length} collectors</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={16} /> Add Collector
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-5"><div className="skeleton h-32 w-full rounded" /></div>
          ))
        ) : collectors.map(c => (
          <div key={c.id} className="card p-5 card-hover">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-lg mb-2">
                  {c.full_name.charAt(0)}
                </div>
                <div className="font-semibold text-gray-900">{c.full_name}</div>
                <div className="text-sm text-gray-500">@{c.username}</div>
                {c.mobile && <div className="text-xs text-gray-400 mt-0.5">{c.mobile}</div>}
              </div>
              <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                {c.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-4">
              <div>
                <div className="text-xs text-gray-400">Collections</div>
                <div className="font-semibold text-gray-900">{c.total_collections}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Total Collected</div>
                <div className="font-semibold text-green-700">{formatCurrency(c.total_amount_collected)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Donors Added</div>
                <div className="font-semibold text-gray-900">{c.donors_added}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Today</div>
                <div className="font-semibold text-gray-900">{formatCurrency(c.today_collection)}</div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setModal(c)} className="btn btn-secondary btn-sm flex-1">
                <Edit2 size={12} /> Edit
              </button>
              <button
                onClick={() => toggleStatus(c)}
                className={`btn btn-sm flex-1 ${c.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
              >
                {c.status === 'ACTIVE' ? <UserX size={12} /> : <UserCheck size={12} />}
                {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {(modal === 'add' || (modal && modal.id)) && (
        <CollectorModal
          collector={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchCollectors(); }}
        />
      )}
    </div>
  );
}
