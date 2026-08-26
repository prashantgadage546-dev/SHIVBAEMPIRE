// =============================================================
// SHIVBAEMPIRE — Public Receipt Verification Page
// With PDF Download button for donors
// =============================================================
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Shield, Download } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, formatPaymentMode } from '../utils/helpers';

export default function VerifyReceiptPage() {
  const { receiptNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/receipts/verify/${receiptNumber}`)
      .then(r => setData(r.data.data))
      .catch(err => setError(err?.response?.data?.message || 'Receipt not found.'))
      .finally(() => setLoading(false));
  }, [receiptNumber]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/receipts/verify/${receiptNumber}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open receipt page in new tab for printing
      window.open(window.location.href, '_blank');
    } finally {
      setDownloading(false);
    }
  };

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
                  <div className="text-green-700 font-semibold">✅ पावती वैध आहे (Valid Receipt)</div>
                </>
              ) : (
                <>
                  <XCircle size={48} className="text-red-500 mx-auto mb-3" />
                  <div className="text-red-700 font-semibold">❌ रद्द पावती (Cancelled Receipt)</div>
                </>
              )}
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-3">
              <div className="text-center mb-4">
                <div className="text-xs text-gray-400">पावती क्रमांक / Receipt Number</div>
                <div className="font-mono font-bold text-gray-900 text-lg">{data.receiptNumber}</div>
              </div>

              {[
                ['देणगीदाराचे नाव / Donor Name', data.donorName],
                ['मोबाईल / Mobile', data.donorMobile],
                ['गाव / Village', data.village],
                ['कार्यक्रम / Event', data.eventName],
                ['रक्कम / Amount', formatCurrency(data.amount)],
                ['भरणा प्रकार / Payment Mode', formatPaymentMode(data.paymentMode)],
                ['तारीख / Date', formatDate(data.collectionDate)],
                ['जमा करणारे / Collected By', data.collectorName],
              ].map(([label, value]) => value && (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            {/* PDF Download Button */}
            {data.isValid && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all text-sm disabled:opacity-60"
                >
                  <Download size={18} />
                  {downloading ? 'डाऊनलोड होत आहे...' : '📄 पावती PDF डाऊनलोड करा'}
                </button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 justify-center">
              <Shield size={12} />
              Verified by SHIVBAEMPIRE — Shivba Tarun Mitra Mandal
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
