// =============================================================
// SHIVBAEMPIRE — Receipts Page
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, MessageCircle, QrCode, Eye } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, formatPaymentMode, debounce, generateWhatsAppUrl, generateReceiptWhatsAppMessage } from '../utils/helpers';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewReceipt, setPreviewReceipt] = useState(null);

  const fetchReceipts = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/receipts?page=${page}&limit=20&search=${q}`);
      setReceipts(data.data);
      setPagination(data.pagination);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchReceipts(); }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Receipts</h1>
          <p className="page-subtitle">{pagination.total} receipts generated</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9 text-sm"
            placeholder="Search by receipt number or donor name..."
            value={search}
            onChange={e => { setSearch(e.target.value); debounce(() => fetchReceipts(1, e.target.value), 400)(); }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Donor</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Event</th>
                <th>Collector</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="skeleton h-4 w-full rounded" /></td>)}</tr>
                ))
              ) : receipts.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">No receipts found.</td></tr>
              ) : receipts.map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-xs font-semibold text-gray-800">{r.receipt_number}</td>
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{r.donor_name}</div>
                    <div className="text-xs text-gray-400">{r.donor_mobile}</div>
                  </td>
                  <td className="font-bold text-green-700">{formatCurrency(r.amount)}</td>
                  <td className="text-sm">{formatPaymentMode(r.payment_mode)}</td>
                  <td className="text-sm text-gray-500 whitespace-nowrap">{formatDate(r.collection_date)}</td>
                  <td className="text-sm text-gray-500">{r.event_name}</td>
                  <td className="text-sm text-gray-500">{r.collector_name}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/verify-receipt/${r.receipt_number}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="Verify Receipt"
                      >
                        <Eye size={14} />
                      </a>
                      <a
                        href={`/api/receipts/${r.id}/pdf`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </a>
                      {r.donor_mobile && (
                        <a
                          href={generateWhatsAppUrl(r.donor_mobile, generateReceiptWhatsAppMessage({
                            donorName: r.donor_name,
                            amount: r.amount,
                            eventName: r.event_name || 'Yatra',
                            receiptNumber: r.receipt_number,
                            paymentMode: r.payment_mode,
                            date: r.collection_date,
                            verifyUrl: `${window.location.origin}/verify-receipt/${r.receipt_number}`,
                          }))}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                          title="Send via WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
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
              <button disabled={pagination.page <= 1} onClick={() => fetchReceipts(pagination.page - 1)} className="btn btn-secondary btn-sm">Previous</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchReceipts(pagination.page + 1)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
