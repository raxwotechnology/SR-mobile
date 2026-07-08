import { useState, useEffect } from 'react';
import { Users, Store as StoreIcon, Tag, ShoppingBag, DollarSign, Package, Filter } from 'lucide-react';
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
  const { formatPrice, currency } = useCurrencyStore();
  const { selectedStoreId, setSelectedStoreId } = useAdminStoreStore();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
        const [statsRes, storesRes, finRes] = await Promise.all([
          getAdminStats(storeParam),
          getStores(),
          getFinancialDashboard({ period: 'monthly', storeId: storeParam })
        ]);
        console.log('Admin Dashboard Data Check:', {
          stats: statsRes.data,
          stores: storesRes.data,
          financials: finRes.data
        });

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
  }, [selectedStoreId]);

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
                <p className="text-sm font-semibold text-slate-500 mb-1">Net Profit</p>
                <p className={`text-2xl font-bold ${(financials.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Rs. {(financials.netProfit || 0).toLocaleString()}</p>
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
                <h2 className="font-semibold text-slate-900 mb-4">Profit Trend</h2>
                {financials && Array.isArray(financials.series || financials.monthlyData) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financials.series || financials.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Net Profit" />
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
