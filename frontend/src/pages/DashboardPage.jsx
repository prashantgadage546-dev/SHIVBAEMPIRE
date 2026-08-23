// =============================================================
// SHIVBAEMPIRE — Premium Dashboard Page
// =============================================================
import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Wallet, Calendar, Clock, Target,
  IndianRupee, RefreshCw, PieChart as PieIcon, Award, TrendingDown
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { formatCurrency, formatNumber } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useEvent } from '../context/EventContext';

const KPICard = ({ title, value, subtitle, icon: Icon, loading, valueColor, iconBg, iconColor }) => (
  <div className="kpi-card p-3 sm:p-4 relative overflow-hidden">
    <div className="flex items-start justify-between gap-1.5 sm:gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">{title}</p>
        {loading ? (
          <div className="skeleton h-6 sm:h-8 w-20 sm:w-32 mt-1.5" />
        ) : (
          <p className={`text-base sm:text-xl md:text-2xl font-extrabold mt-1 tracking-tight truncate ${valueColor || 'text-gray-900'}`}>{value}</p>
        )}
        {subtitle && !loading && (
          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg || 'bg-gray-100'}`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor || 'text-gray-600'}`} />
      </div>
    </div>
  </div>
);

const PAYMENT_COLORS = {
  'Cash': '#10B981',
  'Online': '#3B82F6',
  'UPI': '#3B82F6',
  'Bank Transfer': '#8B5CF6',
  'Other': '#F59E0B'
};

const BAR_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [collectorData, setCollectorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { t } = useLanguage();
  const { events, selectedEventId, setSelectedEventId } = useEvent();

  const fetchDashboard = async (eventId = selectedEventId) => {
    setLoading(true);
    try {
      const eventParam = eventId ? `?event_id=${eventId}` : '';

      const [dashRes, collectorRes] = await Promise.all([
        api.get(`/reports/dashboard${eventParam}`),
        api.get(`/reports/collector-wise${eventParam}`),
      ]);
      setData(dashRes.data.data);
      setCollectorData(collectorRes.data.data?.slice(0, 5) || []);
    } catch (err) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedEventId);
  }, [selectedEventId]);

  const paymentModeData = data ? [
    { name: 'Cash', value: parseFloat(data.cashCollection) || 0 },
    { name: 'Online', value: (parseFloat(data.upiCollection) || 0) + (parseFloat(data.bankCollection) || 0) + (parseFloat(data.otherCollection) || 0) },
  ].filter(d => d.value > 0) : [];

  const totalModeVal = paymentModeData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{t('dashTitle')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('dashSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            className="form-input text-xs sm:text-sm w-full sm:w-48"
            value={selectedEventId}
            onChange={e => { setSelectedEventId(e.target.value); fetchDashboard(e.target.value); }}
          >
            <option value="">{t('allEvents')}</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <button onClick={() => fetchDashboard(selectedEventId)} className="btn btn-secondary btn-sm flex-shrink-0">
            <RefreshCw size={14} />
            <span className="hidden sm:inline">{t('refresh')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title={t('totalCollection')}
          value={loading ? '' : formatCurrency(data?.totalCollection)}
          subtitle={`${formatNumber(data?.totalCollections)} ${t('receiptsCount')}`}
          icon={IndianRupee}
          loading={loading}
          valueColor="text-blue-600 font-bold"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          title={t('totalExpenses')}
          value={loading ? '' : formatCurrency(data?.totalExpenses)}
          icon={TrendingDown}
          loading={loading}
          valueColor="text-red-600 font-bold"
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <KPICard
          title={t('remainingBalance')}
          value={loading ? '' : formatCurrency(data?.remainingBalance)}
          subtitle={t('incomeMinusExpenses')}
          icon={Wallet}
          loading={loading}
          valueColor="text-green-600 font-bold"
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <KPICard
          title={t('totalDonors')}
          value={loading ? '' : formatNumber(data?.totalDonors)}
          icon={Users}
          loading={loading}
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title={t('todaysCollection')}
          value={loading ? '' : formatCurrency(data?.todayCollection)}
          icon={Calendar}
          loading={loading}
        />
        <KPICard
          title="This Month"
          value={loading ? '' : formatCurrency(data?.monthCollection)}
          icon={Clock}
          loading={loading}
        />
        <KPICard
          title="Pending Donors"
          value={loading ? '' : formatNumber(data?.pendingDonors)}
          subtitle={`${formatNumber(data?.partialDonors)} partial`}
          icon={Users}
          loading={loading}
        />
        <KPICard
          title="Pending Amount"
          value={loading ? '' : formatCurrency(data?.totalPending)}
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Target Progress */}
      {data?.targetAmount > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target size={18} />
                Collection Target
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatCurrency(data.targetCollected)} of {formatCurrency(data.targetAmount)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{data.targetPercentage}%</div>
              <div className="text-xs text-gray-500">
                {formatCurrency(data.targetRemaining)} remaining
              </div>
            </div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(data.targetPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Modern Redesigned 2 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Collection by Payment Mode */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <PieIcon size={18} className="text-blue-600" />
              Collection by Payment Mode
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
              {paymentModeData.length} Modes
            </span>
          </div>

          {loading ? (
            <div className="skeleton h-60 w-full rounded-xl" />
          ) : paymentModeData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
              <div className="w-full sm:w-1/2 h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentModeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={92}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {paymentModeData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PAYMENT_COLORS[entry.name] || '#6B7280'}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [formatCurrency(v), 'Amount']}
                      contentStyle={{ borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xs font-medium text-gray-400">Total</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(totalModeVal)}</span>
                </div>
              </div>

              {/* Legend & Breakdown */}
              <div className="w-full sm:w-1/2 space-y-2.5">
                {paymentModeData.map((item) => {
                  const pct = totalModeVal > 0 ? ((item.value / totalModeVal) * 100).toFixed(1) : 0;
                  const color = PAYMENT_COLORS[item.name] || '#6B7280';
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold text-gray-700 truncate">{item.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-bold text-gray-900">{formatCurrency(item.value)}</div>
                        <div className="text-[10px] text-gray-400">{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No collections yet</div>
          )}
        </div>

        {/* Chart 2: Top Collectors */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Top Collectors
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">
              Rankings
            </span>
          </div>

          {loading ? (
            <div className="skeleton h-60 w-full rounded-xl" />
          ) : collectorData.length > 0 ? (
            <div className="h-60 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectorData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="collector_name"
                    tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }}
                    width={110}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(v), 'Total Collection']}
                    contentStyle={{ borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar
                    dataKey="total_amount"
                    radius={[0, 8, 8, 0]}
                    barSize={22}
                    name="Amount"
                  >
                    {collectorData.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No collector data</div>
          )}
        </div>
      </div>
    </div>
  );
}
