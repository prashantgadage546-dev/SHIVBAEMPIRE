// =============================================================
// SHIVBAEMPIRE — Collections Page (Full CRUD)
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Trash2, AlertTriangle, X, MessageCircle, Download } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, formatPaymentMode, getErrorMessage, debounce, generateWhatsAppUrl, generateReceiptWhatsAppMessage } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useEvent } from '../context/EventContext';

const PAYMENT_MODES = ['CASH', 'ONLINE'];

function AddCollectionModal({ events, onClose, onSaved }) {
  const [form, setForm] = useState({
    donor_id: '', event_id: events.find(e => e.is_active)?.id || events[0]?.id || '',
    amount: '', payment_mode: 'CASH', transaction_id: '',
    collection_date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [donorSearch, setDonorSearch] = useState('');
  const [donors, setDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const searchDonors = useCallback(debounce(async (q, eid) => {
    if (!q) { setDonors([]); return; }
    const { data } = await api.get(`/donors?search=${q}&event_id=${eid}&limit=8`);
    setDonors(data.data || []);
  }, 300), []);

  useEffect(() => {
    searchDonors(donorSearch, form.event_id);
  }, [donorSearch, form.event_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedDonor) { setError('Please select a donor.'); return; }
    setLoading(true);

    let waWin = null;
    if (selectedDonor.mobile) {
      try {
        waWin = window.open('about:blank', '_blank');
      } catch (err) {
        console.warn('Popup window blocked:', err);
      }
    }

    try {
      const activeCollectorId = parseInt(localStorage.getItem('shivba_active_collector')) || 1;
      const { data } = await api.post('/collections', { ...form, donor_id: selectedDonor.id, collector_id: activeCollectorId });
      const rec = data.data;

      if (selectedDonor.mobile) {
        const selectedEv = events.find(ev => String(ev.id) === String(form.event_id));
        const waMsg = generateReceiptWhatsAppMessage({
          donorName: selectedDonor.full_name,
          amount: form.amount,
          eventName: selectedEv?.name || 'यात्रा / उत्सव',
          receiptNumber: rec?.receipt_number || 'YAT-00001',
          paymentMode: form.payment_mode,
          date: form.collection_date,
          verifyUrl: `${window.location.origin}/verify-receipt/${rec?.receipt_number}`,
        });
        const waUrl = generateWhatsAppUrl(selectedDonor.mobile, waMsg);

        if (waWin && !waWin.closed) {
          waWin.location.href = waUrl;
        } else {
          window.open(waUrl, '_blank');
        }
      }

      toast.success(`वर्गणी जमा झाली! WhatsApp पावती संदेश आपोआप उघडत आहे 📱 (${rec?.receipt_number})`);
      onSaved(rec);
    } catch (err) {
      if (waWin && !waWin.closed) waWin.close();
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Record New Collection</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event */}
          <div>
            <label className="form-label">Event *</label>
            <select className="form-input" value={form.event_id} onChange={e => setForm(f => ({...f, event_id: e.target.value}))} required>
              <option value="">Select Event</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}{ev.is_active ? ' (Active)' : ''}</option>)}
            </select>
          </div>

          {/* Donor search */}
          <div>
            <label className="form-label">Donor *</label>
            {selectedDonor ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <div className="font-medium text-sm text-gray-900">{selectedDonor.full_name}</div>
                  <div className="text-xs text-gray-500">{selectedDonor.mobile} · {selectedDonor.donor_code}</div>
                </div>
                <button type="button" onClick={() => setSelectedDonor(null)} className="text-gray-400 hover:text-gray-700">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className="form-input"
                  placeholder="Search donor by name or mobile..."
                  value={donorSearch}
                  onChange={e => setDonorSearch(e.target.value)}
                />
                {donors.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                    {donors.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                        onClick={() => { setSelectedDonor(d); setDonorSearch(''); setDonors([]); }}
                      >
                        <div className="text-sm font-medium text-gray-900">{d.full_name}</div>
                        <div className="text-xs text-gray-500">{d.mobile} · Pending: {formatCurrency(d.pending_amount)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required />
            </div>
            <div>
              <label className="form-label">Payment Mode *</label>
              <select className="form-input" value={form.payment_mode} onChange={e => setForm(f => ({...f, payment_mode: e.target.value}))}>
                <option value="CASH">Cash (नगद)</option>
                <option value="ONLINE">Online (ऑनलाइन)</option>
              </select>
            </div>
            {form.payment_mode === 'ONLINE' && (
              <div className="col-span-2">
                <label className="form-label">Transaction ID / Ref</label>
                <input className="form-input" value={form.transaction_id} onChange={e => setForm(f => ({...f, transaction_id: e.target.value}))} placeholder="UPI / UTR reference" />
              </div>
            )}
            <div>
              <label className="form-label">Collection Date *</label>
              <input className="form-input" type="date" value={form.collection_date} onChange={e => setForm(f => ({...f, collection_date: e.target.value}))} required />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Recording...' : 'Record & Generate Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [successCollection, setSuccessCollection] = useState(null);
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { selectedEventId } = useEvent();

  const fetchCollections = useCallback(async (page = 1, q = search, pm = paymentFilter, eventId = selectedEventId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, search: q, payment_mode: pm, event_id: eventId });
      const { data } = await api.get(`/collections?${params}`);
      setCollections(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load collections.');
    } finally {
      setLoading(false);
    }
  }, [search, paymentFilter, selectedEventId]);

  useEffect(() => {
    fetchCollections(1, search, paymentFilter, selectedEventId);
    api.get('/events').then(r => setEvents(r.data.data || []));
  }, [selectedEventId]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/collections/${id}`);
      toast.success('Collection cancelled.');
      setDeleteConfirm(null);
      fetchCollections();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const downloadPdf = async (receiptId, receiptNumber) => {
    try {
      toast.info?.('Receipt डाउनलोड होत आहे...');
      const response = await api.get(`/receipts/${receiptId}/pdf`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `receipt-${receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      toast.error('Receipt डाउनलोड करता आली नाही. पुन्हा प्रयत्न करा.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-subtitle">{pagination.total} total records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Record Collection
        </button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9 text-sm" placeholder="Search by donor name, receipt..." value={search} onChange={e => { setSearch(e.target.value); debounce(() => fetchCollections(1, e.target.value), 400)(); }} />
        </div>
        <select className="form-input w-full sm:w-44 text-sm" value={paymentFilter} onChange={e => { setPaymentFilter(e.target.value); fetchCollections(1, search, e.target.value); }}>
          <option value="">All Modes</option>
          {PAYMENT_MODES.map(m => <option key={m} value={m}>{formatPaymentMode(m)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Donor</th>
                <th>Village</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Collector</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="skeleton h-4 w-full rounded" /></td>)}</tr>
                ))
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="text-4xl mb-3">🧾</div>
                    <div className="font-medium">No collections found</div>
                  </td>
                </tr>
              ) : collections.map(c => (
                <tr key={c.id}>
                  <td className="font-mono text-xs text-gray-600 whitespace-nowrap">{c.receipt_number}</td>
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{c.donor_name}</div>
                    <div className="text-xs text-gray-400">{c.donor_mobile}</div>
                  </td>
                  <td className="text-gray-500 text-sm">{c.village_name || '—'}</td>
                  <td className="font-semibold text-green-700">{formatCurrency(c.amount)}</td>
                  <td>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {formatPaymentMode(c.payment_mode)}
                    </span>
                  </td>
                  <td className="text-gray-500 text-sm whitespace-nowrap">{formatDate(c.collection_date)}</td>
                  <td className="text-gray-500 text-sm">{c.collector_name}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => downloadPdf(c.receipt_id, c.receipt_number)}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="Download Receipt PDF"
                      >
                        <Download size={14} />
                      </button>
                      {c.donor_mobile && (
                        <a
                          href={generateWhatsAppUrl(c.donor_mobile, generateReceiptWhatsAppMessage({
                            donorName: c.donor_name,
                            amount: c.amount,
                            eventName: c.event_name || 'Yatra',
                            receiptNumber: c.receipt_number,
                            paymentMode: c.payment_mode,
                            date: c.collection_date,
                            verifyUrl: `${window.location.origin}/verify-receipt/${c.receipt_number}`,
                          }))}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                          title="Send via WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                      {isAdmin() && (
                        <button onClick={() => setDeleteConfirm(c)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Cancel">
                          <Trash2 size={14} />
                        </button>
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
              <button disabled={pagination.page <= 1} onClick={() => fetchCollections(pagination.page - 1)} className="btn btn-secondary btn-sm">Previous</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchCollections(pagination.page + 1)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <AddCollectionModal
          events={events}
          onClose={() => setModal(false)}
          onSaved={(data) => { setModal(false); fetchCollections(); }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6 text-center">
            <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900">Cancel Collection?</h3>
            <p className="text-gray-500 text-sm mt-2">This will cancel receipt <strong>{deleteConfirm.receipt_number}</strong> and recalculate the donor's status.</p>
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn btn-danger">Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
