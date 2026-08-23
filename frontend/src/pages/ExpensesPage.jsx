// =============================================================
// SHIVBAEMPIRE — Expenses Page
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, getErrorMessage, debounce } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  'DECORATION', 'SOUND_DJ', 'TENT', 'PRASAD', 'PUJA_MATERIAL',
  'TRANSPORTATION', 'ELECTRICITY', 'ADVERTISEMENT', 'PRINTING',
  'FOOD', 'SECURITY', 'MISCELLANEOUS'
];

const formatCategory = (cat) => cat?.replace('_', ' ')?.replace(/\b\w/g, l => l.toUpperCase());

function ExpenseModal({ expense, events, onClose, onSaved }) {
  const [form, setForm] = useState({
    event_id: expense?.event_id || events[0]?.id || '',
    category: expense?.category || 'DECORATION',
    description: expense?.description || '',
    amount: expense?.amount || '',
    payment_mode: expense?.payment_mode || 'CASH',
    expense_date: expense?.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0],
    paid_to: expense?.paid_to || '',
    bill_number: expense?.bill_number || '',
    notes: expense?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    setLoading(true);
    try {
      if (expense) {
        await api.put(`/expenses/${expense.id}`, form);
        toast.success('Expense updated.');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense added.');
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
      <div className="modal-content max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Event *</label>
              <select className="form-input" value={form.event_id} onChange={e => setForm(f => ({...f, event_id: e.target.value}))} required>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Category *</label>
              <select className="form-input" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Description *</label>
              <input className="form-input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
            </div>
            <div>
              <label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required />
            </div>
            <div>
              <label className="form-label">Payment Mode *</label>
              <select className="form-input" value={form.payment_mode} onChange={e => setForm(f => ({...f, payment_mode: e.target.value}))}>
                {['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'].map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Expense Date *</label>
              <input className="form-input" type="date" value={form.expense_date} onChange={e => setForm(f => ({...f, expense_date: e.target.value}))} required />
            </div>
            <div>
              <label className="form-label">Paid To</label>
              <input className="form-input" value={form.paid_to} onChange={e => setForm(f => ({...f, paid_to: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Bill Number</label>
              <input className="form-input" value={form.bill_number} onChange={e => setForm(f => ({...f, bill_number: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : (expense ? 'Update' : 'Add Expense')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [events, setEvents] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { isAdmin } = useAuth();
  const toast = useToast();

  const fetchExpenses = useCallback(async (page = 1, q = search, cat = categoryFilter) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/expenses?page=${page}&limit=20&search=${q}&category=${cat}`);
      setExpenses(data.data);
      setPagination(data.pagination);
      setTotalAmount(data.totalAmount);
    } catch {
      toast.error('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchExpenses();
    api.get('/events').then(r => setEvents(r.data.data || []));
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted.');
      setDeleteConfirm(null);
      fetchExpenses();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Total: {formatCurrency(totalAmount)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9 text-sm" placeholder="Search expenses..." value={search} onChange={e => { setSearch(e.target.value); debounce(() => fetchExpenses(1, e.target.value), 400)(); }} />
        </div>
        <select className="form-input w-full sm:w-48 text-sm" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); fetchExpenses(1, search, e.target.value); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Paid To</th>
                <th>Bill No.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="skeleton h-4 w-full rounded" /></td>)}</tr>
                ))
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">No expenses recorded.</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id}>
                  <td className="text-sm text-gray-500 whitespace-nowrap">{formatDate(exp.expense_date)}</td>
                  <td>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      {formatCategory(exp.category)}
                    </span>
                  </td>
                  <td className="text-sm text-gray-800 max-w-xs truncate">{exp.description}</td>
                  <td className="font-semibold text-gray-900">{formatCurrency(exp.amount)}</td>
                  <td className="text-sm text-gray-500">{exp.payment_mode.replace('_', ' ')}</td>
                  <td className="text-sm text-gray-500">{exp.paid_to || '—'}</td>
                  <td className="text-xs text-gray-400 font-mono">{exp.bill_number || '—'}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setModal(exp)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
                      {isAdmin() && (
                        <button onClick={() => setDeleteConfirm(exp)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchExpenses(pagination.page - 1)} className="btn btn-secondary btn-sm">Previous</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchExpenses(pagination.page + 1)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {(modal === 'add' || (modal && modal.id)) && (
        <ExpenseModal
          expense={modal === 'add' ? null : modal}
          events={events}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchExpenses(); }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6 text-center">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900">Delete Expense?</h3>
            <p className="text-gray-500 text-sm mt-2"><strong>{deleteConfirm.description}</strong> — {formatCurrency(deleteConfirm.amount)}</p>
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
