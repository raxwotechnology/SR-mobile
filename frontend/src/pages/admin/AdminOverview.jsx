import { useState, useEffect, useMemo } from 'react';
import { Users, Store as StoreIcon, Tag, ShoppingBag, DollarSign, Package, Filter, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAdminStats, getStores, getFinancialDashboard } from '../../services/api';
import { adminNavGroups as navItems } from './adminNavItems';
import useCurrencyStore from '../../store/currencyStore';
import useAdminStoreStore from '../../store/adminStoreStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month / Period filter state
  const [monthFilter, setMonthFilter] = useState('this_month'); // 'this_month' | 'last_month' | 'all' | 'custom'
  const [customMonth, setCustomMonth] = useState(''); // 'YYYY-MM'

  const { formatPrice, currency } = useCurrencyStore();
  const { selectedStoreId, setSelectedStoreId } = useAdminStoreStore();

  const filterDates = useMemo(() => {
    const now = new Date();
    if (monthFilter === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end, period: 'daily' };
    }
    if (monthFilter === 'last_month') {
      const year = now.getFullYear();
      const month = now.getMonth() - 1;
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end, period: 'daily' };
    }
    if (monthFilter === 'custom' && customMonth) {
      const [year, month] = customMonth.split('-').map(Number);
      const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end, period: 'daily' };
    }
    return { startDate: undefined, endDate: undefined, period: 'monthly' };
  }, [monthFilter, customMonth]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
        const [statsRes, storesRes, finRes] = await Promise.all([
          getAdminStats(storeParam),
          getStores(),
          getFinancialDashboard({
            period: filterDates.period,
            startDate: filterDates.startDate,
            endDate: filterDates.endDate,
            storeId: storeParam
          })
        ]);

        setStats(statsRes.data);
        setStores(storesRes.data.stores || storesRes.data);
        setFinancials(finRes.data);
      } catch (err) {
        console.error('Dashboard Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [selectedStoreId, filterDates]);

  const cards = [
    { label: 'Total Users', value: stats?.users || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Stores', value: stats?.stores || 0, icon: StoreIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Products', value: stats?.products || 0, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Revenue', value: `${currency} ${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <DashboardLayout navItems={navItems} title="Overview">
      <div className="max-w-7xl mx-auto pb-10 space-y-8">
        
        {/* Header & Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-slate-500 text-sm mt-1">View metrics and performance across your business.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Calendar size={16} className="text-slate-400 ml-1" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1 px-1"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="all">All Time</option>
                <option value="custom">Select Specific Month</option>
              </select>
            </div>

            {monthFilter === 'custom' && (
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {(Array.isArray(cards) ? cards : []).map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between h-40 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon size={24} className={card.color} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 truncate">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && financials && (
          <>
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 mb-1">Net Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">Rs. {(financials.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">Rs. {(financials.totalExpenses || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 mb-1">Other Income</p>
                <p className="text-2xl font-bold text-blue-600">Rs. {(financials.totalAdditionalIncome || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-emerald-600">Rs. {(financials.totalIncome || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="font-semibold text-slate-900 mb-4">Revenue vs Expenses</h2>
                {financials && Array.isArray(financials.series || financials.monthlyData) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financials.series || financials.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400">No chart data</div>
                )}
              </div>

              {/* Line Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="font-semibold text-slate-900 mb-4">Income Trend</h2>
                {financials && Array.isArray(financials.series || financials.monthlyData) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financials.series || financials.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Total Income" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-400">No chart data</div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AdminOverview;
