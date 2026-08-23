// =============================================================
// SHIVBAEMPIRE — Events Page (Admin)
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, X, Zap } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, getErrorMessage } from '../utils/helpers';
import { useEvent } from '../context/EventContext';
import { useToast } from '../context/ToastContext';

function EventModal({ event, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: event?.name || '',
    description: event?.description || '',
    event_date: event?.event_date ? event.event_date.split('T')[0] : '',
    end_date: event?.end_date ? event.end_date.split('T')[0] : '',
    location: event?.location || '',
    status: event?.status || 'UPCOMING',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    setLoading(true);
    try {
      if (event) { await api.put(`/events/${event.id}`, form); toast.success('Event updated.'); }
      else { await api.post('/events', form); toast.success('Event created.'); }
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{event ? 'Edit Event' : 'Create Event'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Event Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Yatra 2026" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.event_date} onChange={e => setForm(f => ({...f, event_date: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="Trimbakeshwar, Nashik" />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              <option value="UPCOMING">Upcoming</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : (event ? 'Update' : 'Create Event')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events');
      setEvents(data.data);
    } catch { toast.error('Failed to load events.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, []);

  const { setSelectedEventId, fetchEvents: refreshGlobalEvents } = useEvent();

  const setActiveEvent = async (eventId) => {
    try {
      await api.put(`/events/${eventId}`, { is_active: 1 });
      setSelectedEventId(eventId);
      toast.success('Active event updated & switched globally.');
      fetchEvents();
      refreshGlobalEvents();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const statusColors = {
    UPCOMING: 'badge-pending', ACTIVE: 'badge-active',
    COMPLETED: 'badge-paid', CANCELLED: 'badge-cancelled'
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Events / Yatra</h1>
          <p className="page-subtitle">{events.length} events</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={16} /> Create Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(2)].map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-40 w-full rounded" /></div>) :
        events.map(ev => (
          <div key={ev.id} className={`card p-5 card-hover ${ev.is_active ? 'ring-2 ring-gray-900' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                {ev.is_active && <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1"><Zap size={10} /> Active Event</div>}
                <h3 className="font-bold text-gray-900">{ev.name}</h3>
                {ev.location && <div className="text-sm text-gray-500 mt-0.5">📍 {ev.location}</div>}
              </div>
              <span className={`badge ${statusColors[ev.status] || 'badge-inactive'}`}>{ev.status}</span>
            </div>

            {ev.event_date && (
              <div className="text-sm text-gray-500 mb-4">
                {formatDate(ev.event_date)}{ev.end_date && ` — ${formatDate(ev.end_date)}`}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3 mb-4">
              <div>
                <div className="text-xs text-gray-400">Donors</div>
                <div className="font-semibold">{ev.donor_count || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Collected</div>
                <div className="font-semibold text-green-700">{formatCurrency(ev.total_collected)}</div>
              </div>
              {ev.target_amount && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">Target</div>
                  <div className="font-semibold">{formatCurrency(ev.target_amount)}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setModal(ev)} className="btn btn-secondary btn-sm flex-1"><Edit2 size={12} /> Edit</button>
              {!ev.is_active && (
                <button onClick={() => setActiveEvent(ev.id)} className="btn btn-primary btn-sm flex-1"><Zap size={12} /> Set Active</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(modal === 'add' || (modal && modal.id)) && (
        <EventModal event={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchEvents(); }} />
      )}
    </div>
  );
}
