// =============================================================
// SHIVBAEMPIRE — Donors Page (Streamlined without Status)
// Direct Collection & Balance Addition (Cash / Online)
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, Trash2, AlertTriangle, MessageCircle, X, Users } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, getErrorMessage, generateWhatsAppUrl, generateReceiptWhatsAppMessage, debounce } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useEvent } from '../context/EventContext';

// ---- Add/Edit Donor Modal ----
function DonorModal({ donor, events, selectedEventId, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: donor?.full_name || '',
    mobile: donor?.mobile || '',
    email: donor?.email || '',
    village_name: donor?.village_name || '',
    address: donor?.address || '',
    expected_donation: donor?.expected_donation || '',
    payment_mode: 'CASH',
    notes: donor?.notes || '',
    event_id: donor?.event_id || selectedEventId || events[0]?.id || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setDuplicateInfo(null);
    setLoading(true);

    // Pre-open window synchronously to avoid Chrome popup blocker
    let waWin = null;
    if (!donor && form.mobile) {
      try {
        waWin = window.open('about:blank', '_blank');
      } catch (err) {
        console.warn('Popup window blocked:', err);
      }
    }

    try {
      if (donor) {
        await api.put(`/donors/${donor.id}`, form);
        toast.success('Donor updated successfully.');
      } else {
        // 1. Create Donor
        const { data } = await api.post('/donors', form);
        const createdDonor = data.data;

        const amt = parseFloat(form.expected_donation);
        const activeCollectorId = parseInt(localStorage.getItem('shivba_active_collector')) || 1;
        let createdReceiptNum = createdDonor?.donor_code;

        if (amt > 0 && createdDonor?.id) {
          const colRes = await api.post('/collections', {
            donor_id: createdDonor.id,
            event_id: form.event_id,
            amount: amt,
            payment_mode: form.payment_mode || 'CASH',
            collector_id: activeCollectorId,
            collection_date: new Date().toISOString().split('T')[0],
          });
          if (colRes?.data?.data?.receipt_number) {
            createdReceiptNum = colRes.data.data.receipt_number;
          }
        }

        // Automatic WhatsApp message generation & tab open
        if (form.mobile) {
          const selectedEvent = events.find(ev => String(ev.id) === String(form.event_id));
          const waMsg = generateReceiptWhatsAppMessage({
            donorName: form.full_name,
            amount: amt || 0,
            eventName: selectedEvent?.name || 'यात्रा / उत्सव',
            receiptNumber: createdReceiptNum,
            paymentMode: form.payment_mode || 'CASH',
            date: new Date().toISOString(),
            verifyUrl: `${window.location.origin}/verify-receipt/${createdReceiptNum}`
          });
          const waUrl = generateWhatsAppUrl(form.mobile, waMsg);

          if (waWin && !waWin.closed) {
            waWin.location.href = waUrl;
          } else {
            window.open(waUrl, '_blank');
          }
          toast.success('देणगीदार जोडला! WhatsApp संदेश आपोआप पाठवला/उघडला जात आहे 📱');
        } else {
          toast.success('Donor added & amount added directly to balance!');
        }
      }
      onSaved(form.event_id);
    } catch (err) {
      if (waWin && !waWin.closed) waWin.close();
      const data = err?.response?.data;
      if (data?.isDuplicate) {
        const existingName = data.existingDonor?.full_name || 'देणगीदार';
        setError(`या मोबाईल नंबरवर (${form.mobile}) '${existingName}' या नावाने देणगीदार आधीच जोडलेला आहे! कृपया नवीन देणगीदारासाठी दुसरा मोबाईल नंबर वापरा.`);
        setDuplicateInfo(data.existingDonor);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const { t } = useLanguage();

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{donor ? t('editDonor') : t('addNewDonor')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

        {duplicateInfo && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">हा मोबाईल नंबर आधीच सेव्ह आहे!</div>
              <div className="text-xs text-amber-700 mt-0.5">
                देणगीदाराचे नाव: <strong>{duplicateInfo.full_name}</strong> ({duplicateInfo.donor_code})
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">{t('fullName')} *</label>
              <input className="form-input" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} placeholder="e.g. Ramesh Kumar" required />
            </div>
            <div>
              <label className="form-label">{t('mobileNumber')} *</label>
              <input className="form-input" value={form.mobile} onChange={e => setForm(f => ({...f, mobile: e.target.value}))} pattern="\d{10}" maxLength={10} placeholder="10-digit mobile" required disabled={!!donor} />
            </div>
            <div>
              <label className="form-label">{t('village')}</label>
              <input className="form-input" value={form.village_name} onChange={e => setForm(f => ({...f, village_name: e.target.value}))} placeholder="e.g. Satara" />
            </div>
            <div>
              <label className="form-label">{t('amount')}</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.expected_donation} onChange={e => setForm(f => ({...f, expected_donation: e.target.value}))} placeholder="Enter amount" />
            </div>
            <div>
              <label className="form-label">{t('paymentMode')} *</label>
              <select className="form-input" value={form.payment_mode} onChange={e => setForm(f => ({...f, payment_mode: e.target.value}))}>
                <option value="CASH">{t('cash')}</option>
                <option value="ONLINE">{t('online')}</option>
              </select>
            </div>
            {!donor && (
              <div className="col-span-2">
                <label className="form-label">{t('event')} *</label>
                {events.length === 0 ? (
                  <div className="form-input bg-amber-50 border-amber-300 text-amber-700 text-sm">
                    ⚠️ कोणताही Event सापडला नाही — आधी Event तयार करा.
                  </div>
                ) : (
                  <select
                    className="form-input"
                    value={form.event_id}
                    onChange={e => setForm(f => ({...f, event_id: e.target.value}))}
                    required
                  >
                    <option value="">-- Event निवडा --</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? t('saving') : (donor ? t('editDonor') : t('addDonor'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function DonorsPage() {
  const [donors, setDonors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { events, selectedEventId, setSelectedEventId } = useEvent();

  const fetchDonors = useCallback(async (page = 1, q = search, eventId = selectedEventId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, search: q, event_id: eventId });
      const { data } = await api.get(`/donors?${params}`);
      setDonors(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load donors.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedEventId]);

  useEffect(() => {
    fetchDonors(1, search, selectedEventId);
  }, [selectedEventId]);

  const debouncedSearch = useCallback(debounce((q) => fetchDonors(1, q), 400), [fetchDonors]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleDelete = async (donor) => {
    try {
      await api.delete(`/donors/${donor.id}`);
      toast.success('Donor deleted.');
      setDeleteConfirm(null);
      fetchDonors();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('donorsTitle')}</h1>
          <p className="page-subtitle">{pagination.total} {t('donorsSubtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={16} /> {t('addDonor')}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9 text-sm"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <select className="form-input w-full sm:w-48 text-sm" value={selectedEventId} onChange={e => { setSelectedEventId(e.target.value); fetchDonors(1, search, e.target.value); }}>
          <option value="">{t('allEvents')}</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('donorId')}</th>
                <th>{t('name')}</th>
                <th>{t('mobile')}</th>
                <th>{t('village')}</th>
                <th>{t('amountReceived')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : donors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Users size={40} className="mx-auto mb-3 text-gray-200" />
                    <div className="font-medium">{t('noDonorsFound')}</div>
                    <div className="text-sm mt-1">{t('addDonorToStart')}</div>
                  </td>
                </tr>
              ) : donors.map(donor => (
                <tr key={donor.id}>
                  <td className="font-mono text-xs text-gray-500">{donor.donor_code}</td>
                  <td>
                    <div className="font-medium text-gray-900">{donor.full_name}</div>
                    {donor.event_name && <div className="text-xs text-gray-400">{donor.event_name}</div>}
                  </td>
                  <td className="text-gray-600">{donor.mobile}</td>
                  <td className="text-gray-600">{donor.village_name || '—'}</td>
                  <td className="font-bold text-green-700">{formatCurrency(donor.total_paid || donor.expected_donation)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate(`/donors/${donor.id}`)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="View Details">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => setModal(donor)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      {donor.mobile && (
                        <a
                          href={generateWhatsAppUrl(donor.mobile, generateReceiptWhatsAppMessage({
                            donorName: donor.full_name,
                            amount: donor.total_paid || donor.expected_donation,
                            eventName: donor.event_name || 'यात्रा / उत्सव',
                            receiptNumber: donor.donor_code,
                            paymentMode: 'CASH',
                            date: donor.created_at || new Date().toISOString(),
                            verifyUrl: `${window.location.origin}/verify-receipt/${donor.donor_code}`
                          }))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded text-green-600 hover:text-green-700 hover:bg-green-100 bg-green-50"
                          title="Send WhatsApp Message"
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
                      <button onClick={() => setDeleteConfirm(donor)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'add' || (modal && modal.id)) && (
        <DonorModal
          donor={modal === 'add' ? null : modal}
          events={events}
          selectedEventId={selectedEventId}
          onClose={() => setModal(null)}
          onSaved={(savedEventId) => {
            setModal(null);
            if (savedEventId) {
              setSelectedEventId(savedEventId);
              fetchDonors(1, search, savedEventId);
            } else {
              fetchDonors();
            }
          }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6 text-center">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900">{t('deleteDonorConfirm')}</h3>
            <p className="text-gray-500 text-sm mt-2"><strong>{deleteConfirm.full_name}</strong> ({deleteConfirm.donor_code})</p>
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary">{t('cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
