// =============================================================
// SHIVBAEMPIRE — Reports Page (All Report Types) — Marathi + English
// =============================================================
import { useState, useEffect } from 'react';
import { FileBarChart, Download, BarChart3, Users, MapPin, Calendar, UserCheck, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import { formatCurrency, formatDate, formatPaymentMode, getStatusBadgeClass, formatStatus } from '../utils/helpers';
import { useLanguage } from '../context/LanguageContext';

const COLORS = ['#1F2937', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB'];

export default function ReportsPage() {
  const { t } = useLanguage();
  const [activeReport, setActiveReport] = useState('collections');
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Report type labels use t() for Marathi/English
  const REPORT_TYPES = [
    { id: 'collections', labelKey: 'rptCollection', icon: BarChart3 },
    { id: 'expenses', labelKey: 'rptExpenses', icon: TrendingDown },
    { id: 'daily', labelKey: 'rptDaily', icon: Calendar },
    { id: 'monthly', labelKey: 'rptMonthly', icon: Clock },
    { id: 'collector-wise', labelKey: 'rptCollectorWise', icon: UserCheck },
    { id: 'village-wise', labelKey: 'rptVillageWise', icon: MapPin },
    { id: 'pending', labelKey: 'rptPending', icon: AlertTriangle },
    { id: 'final', labelKey: 'rptFinal', icon: FileBarChart },
  ];

  useEffect(() => {
    api.get('/events').then(r => {
      const evs = r.data.data || [];
      setEvents(evs);
      const active = evs.find(e => e.is_active);
      if (active) setSelectedEvent(String(active.id));
    });
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setReportData([]); setSummary(null); setFinalReport(null);
    try {
      const params = new URLSearchParams();
      if (selectedEvent) params.append('event_id', selectedEvent);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const endpoint = activeReport === 'final' ? '/reports/final'
        : activeReport === 'collector-wise' ? '/reports/collector-wise'
        : activeReport === 'village-wise' ? '/reports/village-wise'
        : activeReport === 'pending' ? '/reports/pending'
        : activeReport === 'expenses' ? '/reports/expenses'
        : `/reports/${activeReport}`;

      const { data } = await api.get(`${endpoint}?${params}`);

      if (activeReport === 'final') {
        setFinalReport(data.data);
      } else if (activeReport === 'expenses') {
        setReportData(data.data || []);
        setSummary(data.summary);
      } else {
        setReportData(data.data || []);
        setSummary(data.summary || null);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEvent || activeReport) fetchReport();
  }, [activeReport, selectedEvent]);

  const exportCSV = () => {
    if (!reportData.length && !finalReport) return;
    const data = reportData.length ? reportData : [];
    const keys = Object.keys(data[0] || {});
    const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeReport}-report.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('reportsTitle')}</h1>
          <p className="page-subtitle">{t('reportsSubtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="btn btn-secondary btn-sm">
            <Download size={14} /> {t('exportCSV')}
          </button>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {REPORT_TYPES.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveReport(id)}
            className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
              activeReport === id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            <Icon size={16} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="form-input w-full sm:w-48 text-sm" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
          <option value="">{t('allEvents')}</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <input type="date" className="form-input w-full sm:w-40 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="form-input w-full sm:w-40 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button onClick={fetchReport} className="btn btn-primary btn-sm">{t('generateReport')}</button>
      </div>

      {/* Report content */}
      {loading ? (
        <div className="card p-8"><div className="skeleton h-64 w-full rounded" /></div>
      ) : finalReport ? (
        <FinalReportView report={finalReport} t={t} />
      ) : (
        <ReportTable type={activeReport} data={reportData} summary={summary} t={t} />
      )}
    </div>
  );
}

function FinalReportView({ report, t }) {
  const { event, summary, expensesByCategory, collectorWise, villageWise } = report;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-center mb-6 pb-6 border-b border-gray-100">
          <div className="text-2xl font-bold text-gray-900">SHIVBAEMPIRE</div>
          <div className="text-gray-500">Shivba Tarun Mitra Mandal</div>
          <div className="text-lg font-semibold text-gray-800 mt-3">{event?.name} — {t('rptFinal')}</div>
          {event?.event_date && <div className="text-sm text-gray-500">{formatDate(event.event_date)}</div>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: t('totalDonors'), value: summary.totalDonors },
            { label: t('totalCollection'), value: formatCurrency(summary.totalIncome) },
            { label: t('totalExpenses'), value: formatCurrency(summary.totalExpenses) },
            { label: t('remainingBalance'), value: formatCurrency(summary.remainingBalance) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
              <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">{t('totalExpenses')}</h3>
            <div className="space-y-2">
              {expensesByCategory.map(e => (
                <div key={e.category} className="flex justify-between text-sm">
                  <span className="text-gray-600">{e.category.replace('_', ' ')}</span>
                  <span className="font-medium">{formatCurrency(e.total)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">{t('rptCollectorWise')}</h3>
            <div className="space-y-2">
              {collectorWise.map(c => (
                <div key={c.collector} className="flex justify-between text-sm">
                  <span className="text-gray-600">{c.collector}</span>
                  <span className="font-medium">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportTable({ type, data, summary, t }) {
  if (!data.length) {
    return (
      <div className="card p-12 text-center text-gray-400">
        <FileBarChart size={48} className="mx-auto mb-4 text-gray-200" />
        <div className="font-medium">{t('noDataAvail')}</div>
        <div className="text-sm mt-1">{t('adjustFilters')}</div>
      </div>
    );
  }

  const columns = {
    collections: ['receipt_number', 'donor_name', 'village_name', 'amount', 'payment_mode', 'collection_date', 'collector_name'],
    expenses: ['expense_date', 'category', 'description', 'amount', 'payment_mode', 'paid_to', 'bill_number'],
    daily: ['date', 'collections', 'total', 'cash', 'upi', 'bank'],
    monthly: ['month_label', 'collections', 'total'],
    'collector-wise': ['collector_name', 'total_collections', 'total_amount', 'cash', 'upi', 'bank', 'donors_collected_from'],
    'village-wise': ['village', 'donor_count', 'total_collected', 'total_expected', 'total_pending'],
    pending: ['donor_code', 'full_name', 'mobile', 'village_name', 'expected_donation', 'total_paid', 'pending_amount', 'status'],
  };

  const cols = columns[type] || Object.keys(data[0] || {}).slice(0, 8);

  const formatCell = (col, val) => {
    if (['amount', 'total', 'total_amount', 'total_collected', 'total_expected', 'total_pending', 'total_paid', 'expected_donation', 'pending_amount', 'cash', 'upi', 'bank', 'today_collection'].includes(col)) return formatCurrency(val);
    if (['collection_date', 'date', 'expense_date', 'last_payment_date'].includes(col)) return formatDate(val);
    if (col === 'payment_mode') return formatPaymentMode(val);
    if (col === 'category') return val?.replace('_', ' ');
    if (col === 'status') return <span className={getStatusBadgeClass(val)}>{formatStatus(val)}</span>;
    return val ?? '—';
  };

  const formatHeader = (col) => col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="card overflow-hidden">
      {summary && (
        <div className="px-6 py-4 border-b border-gray-100 flex gap-6">
          {summary.total !== undefined && <div className="text-sm"><span className="text-gray-500">Total: </span><span className="font-bold">{formatCurrency(summary.total)}</span></div>}
          {summary.count !== undefined && <div className="text-sm"><span className="text-gray-500">Count: </span><span className="font-bold">{summary.count}</span></div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>{cols.map(c => <th key={c}>{formatHeader(c)}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {cols.map(c => <td key={c}>{formatCell(c, row[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
