// =============================================================
// SHIVBAEMPIRE — Donor Detail Page
// =============================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, CreditCard, Receipt, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass, formatStatus, formatPaymentMode, generateWhatsAppUrl, generatePendingWhatsAppMessage } from '../utils/helpers';

export default function DonorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/donors/${id}`)
      .then(r => setDonor(r.data.data))
      .catch(() => navigate('/donors'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!donor) return null;

  const paidPercent = donor.expected_donation > 0
    ? Math.min(100, Math.round((donor.total_paid / donor.expected_donation) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/donors')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm">
        <ArrowLeft size={16} /> Back to Donors
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Donor info card */}
        <div className="card p-6 md:col-span-2">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xs text-gray-400 font-mono mb-1">{donor.donor_code}</div>
              <h1 className="text-2xl font-bold text-gray-900">{donor.full_name}</h1>
              {donor.event_name && <div className="text-sm text-gray-500 mt-1">Event: {donor.event_name}</div>}
            </div>
            <span className={getStatusBadgeClass(donor.status)}>{formatStatus(donor.status)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-gray-400" />
              <div>
                <div className="text-xs text-gray-400">Mobile</div>
                <div className="text-sm font-medium text-gray-900">{donor.mobile}</div>
              </div>
            </div>
            {donor.village_name && (
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Village</div>
                  <div className="text-sm font-medium text-gray-900">{donor.village_name}</div>
                </div>
              </div>
            )}
            {donor.email && (
              <div className="flex items-center gap-3">
                <User size={16} className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Email</div>
                  <div className="text-sm font-medium text-gray-900">{donor.email}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <User size={16} className="text-gray-400" />
              <div>
                <div className="text-xs text-gray-400">Added On</div>
                <div className="text-sm font-medium text-gray-900">{formatDate(donor.created_at)}</div>
              </div>
            </div>
          </div>

          {donor.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">{donor.notes}</div>
          )}

          {donor.mobile && donor.status !== 'PAID' && (
            <a
              href={generateWhatsAppUrl(donor.mobile, generatePendingWhatsAppMessage({
                donorName: donor.full_name,
                expectedAmount: donor.expected_donation,
                paidAmount: donor.total_paid,
                pendingAmount: donor.pending_amount,
              }))}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-success mt-4"
            >
              <MessageCircle size={16} /> Send WhatsApp Reminder
            </a>
          )}
        </div>

        {/* Financial summary */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Expected</span>
                <span className="text-sm font-semibold">{formatCurrency(donor.expected_donation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Paid</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(donor.total_paid)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-sm font-medium text-gray-800">Pending</span>
                <span className={`text-sm font-bold ${parseFloat(donor.pending_amount) > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                  {formatCurrency(donor.pending_amount)}
                </span>
              </div>
            </div>

            {donor.expected_donation > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{paidPercent}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${paidPercent}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collections history */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <CreditCard size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-900">Collection History ({donor.collections?.length || 0})</h2>
        </div>
        {donor.collections?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No collections recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Date</th>
                  <th>Collector</th>
                </tr>
              </thead>
              <tbody>
                {donor.collections?.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-gray-600">{c.receipt_number}</td>
                    <td className="font-semibold text-green-700">{formatCurrency(c.amount)}</td>
                    <td>{formatPaymentMode(c.payment_mode)}</td>
                    <td>{formatDate(c.collection_date)}</td>
                    <td className="text-gray-500">{c.collector_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
