// =============================================================
// SHIVBAEMPIRE — Public Receipt Verification Page
// =============================================================
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, formatPaymentMode } from '../utils/helpers';

export default function VerifyReceiptPage() {
  const { receiptNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/receipts/verify/${receiptNumber}`)
      .then(r => setData(r.data.data))
      .catch(err => setError(err?.response?.data?.message || 'Receipt not found.'))
      .finally(() => setLoading(false));
  }, [receiptNumber]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-gray-900">SHIVBAEMPIRE</div>
          <div className="text-gray-500 text-sm">Shivba Tarun Mitra Mandal</div>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <Loader2 size={40} className="animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Verifying receipt...</p>
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">Invalid Receipt</h2>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
        ) : data ? (
          <div className="card p-6">
            <div className="text-center mb-6">
              {data.isValid ? (
                <>
                  <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
                  <div className="text-green-700 font-semibold">Valid Receipt</div>
                </>
              ) : (
                <>
                  <XCircle size={48} className="text-red-500 mx-auto mb-3" />
                  <div className="text-red-700 font-semibold">Cancelled Receipt</div>
                </>
              )}
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-3">
              <div className="text-center mb-4">
                <div className="text-xs text-gray-400">Receipt Number</div>
                <div className="font-mono font-bold text-gray-900 text-lg">{data.receiptNumber}</div>
              </div>

              {[
                ['Donor Name', data.donorName],
                ['Mobile', data.donorMobile],
                ['Village', data.village],
                ['Event', data.eventName],
                ['Amount', formatCurrency(data.amount)],
                ['Payment Mode', formatPaymentMode(data.paymentMode)],
                ['Date', formatDate(data.collectionDate)],
                ['Collected By', data.collectorName],
              ].map(([label, value]) => value && (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 justify-center">
              <Shield size={12} />
              Verified by SHIVBAEMPIRE — Shivba Tarun Mitra Mandal
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
