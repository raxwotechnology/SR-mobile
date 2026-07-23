import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, FileText, Plus, Search } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import {
  getFinancialDashboard,
  getTransactions,
  getPettyCashLog,
  createPettyCashEntry,
  getTaxPayments,
  createTaxPayment,
  getAccounts,
  getProfitReport,
  getCategories
} from '../../services/api';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';

const PIE_COLORS = ['#d946a0', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#a855f7', '#64748b', '#e11d48', '#0ea5e9', '#d946ef'];
const BRANDS_LIST = ['all', 'Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Huawei', 'OnePlus', 'Anker', 'JBL', 'Baseus'];

const AdminFinancials = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview | petty-cash | tax | profit
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly'); // daily | monthly | yearly
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const { selectedStoreId } = useAdminStoreStore();
  const [transactions, setTransactions] = useState([]);

  // Accounts list (for petty cash bank transfer option)
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Petty Cash states
  const [pettyCashLogs, setPettyCashLogs] = useState([]);
  const [pettyLoading, setPettyLoading] = useState(false);
  const [pettyForm, setPettyForm] = useState({
    type: 'out', // in | out
    amount: '',
    description: '',
    referenceNo: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Income Tax states
  const [taxPayments, setTaxPayments] = useState([]);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxForm, setTaxForm] = useState({
    year: new Date().getFullYear(),
    period: 'Yearly',
    amount: '',
    referenceNo: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  // Profit Analysis states
  const [profitData, setProfitData] = useState(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [profitCategory, setProfitCategory] = useState('all');
  const [profitBrand, setProfitBrand] = useState('all');
  const [profitStartDate, setProfitStartDate] = useState('');
  const [profitEndDate, setProfitEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        period,
        ...(range.startDate ? { startDate: range.startDate } : {}),
        ...(range.endDate ? { endDate: range.endDate } : {}),
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const { data } = await getFinancialDashboard(params);
      setDashboard(data);
      const { data: txData } = await getTransactions(params);
      setTransactions(txData?.transactions || []);
    } catch (err) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const { data } = await getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      const { data } = await getAccounts(storeParam ? { storeId: storeParam } : {});
      setAccounts(data || []);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  const fetchPettyCash = async () => {
    try {
      setPettyLoading(true);
      const params = {
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const { data } = await getPettyCashLog(params);
      setPettyCashLogs(data || []);
    } catch (err) {
      toast.error('Failed to load petty cash logs');
    } finally {
      setPettyLoading(false);
    }
  };

  const fetchTaxPayments = async () => {
    try {
      setTaxLoading(true);
      const params = {
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const { data } = await getTaxPayments(params);
      setTaxPayments(data || []);
    } catch (err) {
      toast.error('Failed to load tax payments');
    } finally {
      setTaxLoading(false);
    }
  };

  const fetchProfitReportData = async () => {
    try {
      setProfitLoading(true);
      const params = {
        category: profitCategory,
        brand: profitBrand,
        startDate: profitStartDate,
        endDate: profitEndDate,
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const { data } = await getProfitReport(params);
      setProfitData(data);
    } catch (err) {
      toast.error('Failed to load profit analysis');
    } finally {
      setProfitLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchData();
    } else if (activeTab === 'petty-cash') {
      fetchPettyCash();
      fetchAccounts();
    } else if (activeTab === 'tax') {
      fetchTaxPayments();
    } else if (activeTab === 'profit') {
      fetchProfitReportData();
    }
  }, [
    period,
    range.startDate,
    range.endDate,
    selectedStoreId,
    activeTab,
    profitCategory,
    profitBrand,
    profitStartDate,
    profitEndDate
  ]);

  const handlePettySubmit = async (e) => {
    e.preventDefault();
    if (!pettyForm.amount || Number(pettyForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!pettyForm.description) {
      toast.error('Description is required');
      return;
    }
    if (pettyForm.type === 'in' && !pettyForm.accountId) {
      toast.error('Please select a source bank account for transfer');
      return;
    }

    try {
      const payload = {
        ...pettyForm,
        amount: Number(pettyForm.amount),
        storeId: selectedStoreId !== 'all' ? selectedStoreId : undefined
      };
      await createPettyCashEntry(payload);
      toast.success('Petty cash logged successfully');
      setPettyForm({
        type: 'out',
        amount: '',
        description: '',
        referenceNo: '',
        accountId: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchPettyCash();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record petty cash entry');
    }
  };

  const handleTaxSubmit = async (e) => {
    e.preventDefault();
    if (!taxForm.amount || Number(taxForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!taxForm.year || !taxForm.period) {
      toast.error('Year and period are required');
      return;
    }

    try {
      const payload = {
        ...taxForm,
        amount: Number(taxForm.amount),
        year: Number(taxForm.year),
        storeId: selectedStoreId !== 'all' ? selectedStoreId : undefined
      };
      await createTaxPayment(payload);
      toast.success('Tax payment recorded successfully');
      setTaxForm({
        year: new Date().getFullYear(),
        period: 'Yearly',
        amount: '',
        referenceNo: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
      });
      fetchTaxPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record tax payment');
    }
  };

  if (loading && activeTab === 'overview') {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const d = dashboard || {};
  const profitPositive = (d.netProfit || 0) >= 0;

  // Segment Profitability Data
  const segmentChartData = [
    {
      name: 'Mobiles',
      Revenue: d.profitSegments?.mobiles?.revenue || 0,
      Profit: d.profitSegments?.mobiles?.profit || 0
    },
    {
      name: 'Accessories',
      Revenue: d.profitSegments?.accessories?.revenue || 0,
      Profit: d.profitSegments?.accessories?.profit || 0
    }
  ];

  // Prepare pie chart data from expense categories
  const pieData = d.expenseByCategory
    ? Object.entries(d.expenseByCategory).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }))
    : [];

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">📊 Store Financials & Accounts</h1>
            <p className="text-muted-text text-sm mt-1">Manage overview analytics, petty cash flow, and tax reports</p>
          </div>

          {activeTab === 'overview' && (
            <div className="flex gap-2 flex-wrap">
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white">
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input type="date" value={range.startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white" />
              <input type="date" value={range.endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white" />
              <button onClick={() => {
                const monthlyExportCols = [
                  { label: 'Month', accessor: 'month' },
                  { label: 'Revenue (Rs.)', accessor: (r) => r.revenue?.toLocaleString() },
                  { label: 'Expenses (Rs.)', accessor: (r) => r.expenses?.toLocaleString() },
                  { label: 'Profit (Rs.)', accessor: (r) => r.profit?.toLocaleString() },
                ];
                exportToPDF(d.series || d.monthlyData || [], monthlyExportCols, 'Financial Report');
              }} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1 shadow-sm">
                <FileText size={14} /> PDF
              </button>
            </div>
          )}

          {activeTab === 'petty-cash' && (
            <div className="flex gap-2">
              <button onClick={() => {
                const pettyCols = [
                  { label: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
                  { label: 'Type', accessor: (r) => r.type === 'in' ? 'Cash In (Bank Transfer)' : 'Cash Out (Expense)' },
                  { label: 'Amount (Rs.)', accessor: (r) => r.amount?.toLocaleString() },
                  { label: 'Description', accessor: 'description' },
                  { label: 'Ref No', accessor: (r) => r.referenceNo || '-' },

                  { label: 'Linked Account', accessor: (r) => r.accountId?.name || '-' },
                  { label: 'Logged By', accessor: (r) => r.loggedBy?.name || 'System' }
                ];
                exportToPDF(pettyCashLogs, pettyCols, 'Petty Cash Log');
              }} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1 shadow-sm">
                <FileText size={14} /> PDF
              </button>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="flex gap-2">
              <button onClick={() => {
                const taxCols = [
                  { label: 'Date', accessor: (r) => new Date(r.paymentDate).toLocaleDateString() },
                  { label: 'Year', accessor: 'year' },
                  { label: 'Period', accessor: 'period' },
                  { label: 'Amount (Rs.)', accessor: (r) => r.amount?.toLocaleString() },
                  { label: 'Ref No', accessor: (r) => r.referenceNo || '-' },
                  { label: 'Notes', accessor: (r) => r.notes || '-' }

                ];
                exportToPDF(taxPayments, taxCols, 'Income Tax Payments');
              }} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1 shadow-sm">
                <FileText size={14} /> PDF
              </button>
            </div>
          )}

          {activeTab === 'profit' && (
            <div className="flex gap-2">
              <button onClick={() => {
                const profitCols = [
                  { label: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
                  { label: 'Invoice No', accessor: 'invoiceNumber' },
                  { label: 'Item Name', accessor: 'name' },
                  { label: 'Category', accessor: 'category' },
                  { label: 'Brand', accessor: 'brand' },
                  { label: 'Cost Price', accessor: (r) => `Rs. ${r.costPrice?.toLocaleString()}` },
                  { label: 'Selling Price', accessor: (r) => `Rs. ${r.sellingPrice?.toLocaleString()}` },
                  { label: 'Qty', accessor: 'quantity' },
                  { label: 'Total Profit', accessor: (r) => `Rs. ${r.profit?.toLocaleString()}` },
                  { label: 'Margin', accessor: (r) => `${r.margin}%` }
                ];
                exportToPDF(profitData?.items || [], profitCols, 'Detailed Profit Report');
              }} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1 shadow-sm">
                <FileText size={14} /> PDF
              </button>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-card-border mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${activeTab === 'overview' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'}`}
          >
            📊 Financial Overview
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${activeTab === 'profit' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'}`}
          >
            📈 Profit Reports
          </button>
          <button
            onClick={() => setActiveTab('petty-cash')}
            className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${activeTab === 'petty-cash' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'}`}
          >
            💰 Petty Cash Log
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 -mb-[2px] ${activeTab === 'tax' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'}`}
          >
            🏛️ Income Tax Management
          </button>
        </div>

        {/* TAB 1: FINANCIAL OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center"><ArrowUpRight size={16} className="text-white" /></div>
                </div>
                <p className="text-2xl font-bold text-dark-navy">Rs. {(d.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Total Revenue</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-blue-500 flex items-center justify-center"><ArrowDownRight size={16} className="text-white" /></div>
                </div>
                <p className="text-2xl font-bold text-dark-navy">Rs. {(d.totalExpenses || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Total Expenses</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"><DollarSign size={16} className="text-white" /></div>
                </div>
                <p className="text-2xl font-bold text-dark-navy">Rs. {(d.totalAdditionalIncome || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Other Income</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${profitPositive ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-blue-600'} flex items-center justify-center`}>
                    {profitPositive ? <TrendingUp size={16} className="text-white" /> : <TrendingDown size={16} className="text-white" />}
                  </div>
                </div>
                <p className={`text-2xl font-bold ${profitPositive ? 'text-emerald-600' : 'text-red-600'}`}>Rs. {Math.abs(d.netProfit || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-text mt-1">Net {profitPositive ? 'Profit' : 'Loss'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">Pending Bills</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">Rs. {(d.pendingExpenses || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">Items Sold</p>
                <p className="text-2xl font-bold text-dark-navy mt-1">{(d.totalItemsSold || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">POS Revenue</p>
                <p className="text-2xl font-bold text-dark-navy mt-1">Rs. {(d.posRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <p className="text-xs text-muted-text">Online Revenue</p>
                <p className="text-2xl font-bold text-dark-navy mt-1">Rs. {(d.onlineRevenue || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Segment Margin Comparison Charts */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Product Segments Chart */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm lg:col-span-2">
                <h2 className="font-semibold text-dark-navy mb-1">📱 Mobiles vs Accessories gross margins</h2>
                <p className="text-xs text-muted-text mb-4">Gross margins for product departments</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={segmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `Rs. ${v.toLocaleString()}`} />
                    <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Profit" fill="#d946a0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Segment margin list */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">📊 Segment gross margins</h2>
                <div className="space-y-4">
                  {['mobiles', 'accessories'].map((seg) => {
                    const rev = d.profitSegments?.[seg]?.revenue || 0;
                    const prof = d.profitSegments?.[seg]?.profit || 0;
                    const marginPct = rev > 0 ? ((prof / rev) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={seg} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                        <h3 className="capitalize font-bold text-sm text-dark-navy mb-2">{seg}</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-text block">Revenue</span>
                            <span className="font-semibold text-dark-navy">Rs. {rev.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-text block">Profit</span>
                            <span className="font-semibold text-emerald-600">Rs. {prof.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-text">Gross Margin</span>
                            <span className="font-bold text-primary-blue">{marginPct}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full">
                            <div className="bg-primary-blue h-1.5 rounded-full" style={{ width: `${Math.min(marginPct, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Original Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Monthly Trend */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">📈 Monthly Trend</h2>
                {(d.series || d.monthlyData) && (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={d.series || d.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#d946a0" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#3b82f6" name="Profit" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">🥧 Expense Breakdown</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={2} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-text text-sm">No expense data</div>
                )}
              </div>
            </div>

            {/* Profit/Loss Trend Line */}
            {(d.series || d.monthlyData) && (
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm mb-8">
                <h2 className="font-semibold text-dark-navy mb-4">📉 Profit Trend</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={d.series || d.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                    <Line type="monotone" dataKey="profit" stroke="#d946a0" strokeWidth={3} dot={{ r: 4 }} name="Net Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILED PROFIT REPORTS */}
        {activeTab === 'profit' && (
          <div>
            {/* Filter Section */}
            <div className="bg-white rounded-2xl border border-card-border p-4 mb-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">Category Type</label>
                <select
                  value={profitCategory}
                  onChange={(e) => setProfitCategory(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue"
                >
                  <option value="all">All Category Types</option>
                  <option value="mobiles">Mobiles (Phones/Tablets)</option>
                  <option value="accessories">Accessories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">Brand Filter</label>
                <select
                  value={profitBrand}
                  onChange={(e) => setProfitBrand(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue"
                >
                  <option value="all">All Brands</option>
                  {BRANDS_LIST.slice(1).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">From Date</label>
                <input
                  type="date"
                  value={profitStartDate}
                  onChange={(e) => setProfitStartDate(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-blue"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">To Date</label>
                <input
                  type="date"
                  value={profitEndDate}
                  onChange={(e) => setProfitEndDate(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-blue"
                />
              </div>
            </div>

            {/* Profit KPI Summary Cards */}
            {profitData?.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                  <p className="text-xs text-muted-text">Total Revenue</p>
                  <p className="text-xl font-bold text-dark-navy mt-1">Rs. {profitData.summary.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                  <p className="text-xs text-muted-text">Cost of Goods Sold</p>
                  <p className="text-xl font-bold text-dark-navy mt-1">Rs. {profitData.summary.totalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                  <p className="text-xs text-muted-text font-semibold">Total Gross Profit</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">Rs. {profitData.summary.totalProfit.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                  <p className="text-xs text-muted-text">Gross profit margin</p>
                  <p className="text-xl font-bold text-primary-blue mt-1">{profitData.summary.profitMargin}%</p>
                </div>
              </div>
            )}

            {/* Grouped charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Category Profit Chart */}
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <h3 className="font-semibold text-dark-navy mb-3 text-xs uppercase tracking-wider">Gross Profit by Category</h3>
                {profitData?.byCategory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={profitData.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#10b981" name="Gross Profit" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-muted-text">No category data</div>
                )}
              </div>

              {/* Brand Profit Chart */}
              <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                <h3 className="font-semibold text-dark-navy mb-3 text-xs uppercase tracking-wider">Gross Profit by Brand</h3>
                {profitData?.byBrand?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={profitData.byBrand}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="#10b981" name="Gross Profit" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-muted-text">No brand data</div>
                )}
              </div>
            </div>

            {/* Profit breakdown list */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm overflow-hidden">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center justify-between">
                <span>📖 Detailed Items Profit breakdown</span>
                {profitLoading && <span className="text-xs text-muted-text animate-pulse">Refreshing...</span>}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-muted-text text-xs uppercase text-left">
                      <th className="py-3 px-2">Date</th>
                      <th className="py-3 px-2">Invoice</th>
                      <th className="py-3 px-2">Product Name</th>
                      <th className="py-3 px-2">Category</th>
                      <th className="py-3 px-2">Brand</th>
                      <th className="py-3 px-2 text-right">Cost (Rs.)</th>
                      <th className="py-3 px-2 text-right">Selling (Rs.)</th>
                      <th className="py-3 px-2 text-center">Qty</th>
                      <th className="py-3 px-2 text-right">Gross Profit</th>
                      <th className="py-3 px-2 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {profitLoading ? (
                      <tr>
                        <td colSpan="10" className="py-8 text-center text-muted-text">Loading profit records...</td>
                      </tr>
                    ) : !profitData?.items?.length ? (
                      <tr>
                        <td colSpan="10" className="py-8 text-center text-muted-text">No profit records matched selected criteria</td>
                      </tr>
                    ) : (
                      profitData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-3 px-2 text-xs">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="py-3 px-2 text-xs font-mono">#{item.invoiceNumber}</td>
                          <td className="py-3 px-2 text-xs font-semibold text-dark-navy">{item.name}</td>
                          <td className="py-3 px-2 text-xs text-muted-text">{item.category}</td>
                          <td className="py-3 px-2 text-xs text-muted-text">{item.brand}</td>
                          <td className="py-3 px-2 text-right text-xs">Rs. {item.costPrice.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right text-xs">Rs. {item.sellingPrice.toLocaleString()}</td>
                          <td className="py-3 px-2 text-center text-xs font-bold">{item.quantity}</td>
                          <td className="py-3 px-2 text-right font-bold text-emerald-600 text-xs">Rs. {item.profit.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right font-semibold text-primary-blue text-xs">{item.margin}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PETTY CASH LOG */}
        {activeTab === 'petty-cash' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Petty Cash Form */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm h-fit">
              <h2 className="font-semibold text-dark-navy mb-2 flex items-center gap-1">
                <Plus size={18} className="text-primary-blue" />
                Log Petty Cash
              </h2>
              <p className="text-xs text-muted-text mb-4">Record standard cash expenses or cash draws from bank accounts</p>

              <form onSubmit={handlePettySubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Transaction Type</label>
                  <select
                    value={pettyForm.type}
                    onChange={(e) => setPettyForm({ ...pettyForm, type: e.target.value })}
                    className="w-full border border-card-border rounded-xl py-2 px-3 text-sm bg-white"
                  >
                    <option value="out">Cash Out (Expense/Drawdown)</option>
                    <option value="in">Cash In (Bank Transfer / Double Entry)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Amount (Rs.)</label>
                  <input
                    type="number"
                    value={pettyForm.amount}
                    onChange={(e) => setPettyForm({ ...pettyForm, amount: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full border border-card-border rounded-xl py-2 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Description / Purpose</label>
                  <input
                    type="text"
                    value={pettyForm.description}
                    onChange={(e) => setPettyForm({ ...pettyForm, description: e.target.value })}
                    placeholder="e.g. Tea & Refreshments, Office Staples"
                    className="w-full border border-card-border rounded-xl py-2 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Reference / Bill No</label>
                  <input
                    type="text"
                    value={pettyForm.referenceNo}
                    onChange={(e) => setPettyForm({ ...pettyForm, referenceNo: e.target.value })}
                    placeholder="e.g. REF-48192"
                    className="w-full border border-card-border rounded-xl py-2 px-3 text-sm"
                  />
                </div>

                {pettyForm.type === 'in' && (
                  <div>
                    <label className="text-xs font-semibold text-muted-text block mb-1">Source Bank Account</label>
                    <select
                      value={pettyForm.accountId}
                      onChange={(e) => setPettyForm({ ...pettyForm, accountId: e.target.value })}
                      className="w-full border border-card-border rounded-xl py-2 px-3 text-sm bg-white"
                    >
                      <option value="">-- Choose Account --</option>
                      {accounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>{acc.name} (Type: {acc.type})</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-text mt-1">This will automatically transfer funds from selected ledger bank account to the Cash account.</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Date</label>
                  <input
                    type="date"
                    value={pettyForm.date}
                    onChange={(e) => setPettyForm({ ...pettyForm, date: e.target.value })}
                    className="w-full border border-card-border rounded-xl py-2 px-3 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-blue hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md text-sm"
                >
                  Log Transaction
                </button>
              </form>
            </div>

            {/* Petty Cash Table */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm lg:col-span-2 overflow-hidden">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center justify-between">
                <span>📖 Petty Cash Ledger Logs</span>
                {pettyLoading && <span className="text-xs text-muted-text animate-pulse">Refreshing...</span>}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-muted-text text-xs uppercase text-left">
                      <th className="py-3 px-2">Date</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Ref</th>
                      <th className="py-3 px-2">Description</th>
                      <th className="py-3 px-2">Linked Account</th>
                      <th className="py-3 px-2">Logged By</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pettyLoading ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-muted-text">Loading petty cash logs...</td>
                      </tr>
                    ) : pettyCashLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-muted-text">No petty cash records registered</td>
                      </tr>
                    ) : (
                      pettyCashLogs.map((log) => (
                        <tr key={log._id}>
                          <td className="py-3 px-2 text-xs">{new Date(log.date || log.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {log.type === 'in' ? 'Cash In' : 'Cash Out'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-xs text-muted-text">{log.referenceNo || '-'}</td>
                          <td className="py-3 px-2 text-xs font-medium">{log.description}</td>
                          <td className="py-3 px-2 text-xs text-muted-text">{log.accountId?.name || 'Cash Account'}</td>
                          <td className="py-3 px-2 text-xs">{log.loggedBy?.name || 'System'}</td>
                          <td className={`py-3 px-2 text-right font-bold ${log.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {log.type === 'in' ? '+' : '-'} Rs. {log.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INCOME TAX MANAGEMENT */}
        {activeTab === 'tax' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Tax Payment Form */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm h-fit">
              <h2 className="font-semibold text-dark-navy mb-2 flex items-center gap-1">
                <Plus size={18} className="text-primary-blue" />
                Log Tax Payment
              </h2>
              <p className="text-xs text-muted-text mb-4">Record state tax payouts and periodic government settlements</p>

              <form onSubmit={handleTaxSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Tax Year</label>
                  <input
                    type="number"
                    value={taxForm.year}
                    onChange={(e) => setTaxForm({ ...taxForm, year: e.target.value })}
                    placeholder="e.g. 2026"
                    className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Period</label>
                  <select
                    value={taxForm.period}
                    onChange={(e) => setTaxForm({ ...taxForm, period: e.target.value })}
                    className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm bg-white"
                  >
                    <option value="Yearly">Yearly (Full Year)</option>
                    <option value="Q1">Q1 (Jan - Mar)</option>
                    <option value="Q2">Q2 (Apr - Jun)</option>
                    <option value="Q3">Q3 (Jul - Sep)</option>
                    <option value="Q4">Q4 (Oct - Dec)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Amount paid (Rs.)</label>
                  <input
                    type="number"
                    value={taxForm.amount}
                    onChange={(e) => setTaxForm({ ...taxForm, amount: e.target.value })}
                    placeholder="e.g. 250000"
                    className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Challan / Receipt Reference No</label>
                  <input
                    type="text"
                    value={taxForm.referenceNo}
                    onChange={(e) => setTaxForm({ ...taxForm, referenceNo: e.target.value })}
                    placeholder="e.g. TAX-2026-CHAL92"
                    className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Notes / Internal Comments</label>
                  <input
                    type="text"
                    value={taxForm.notes}
                    onChange={(e) => setTaxForm({ ...taxForm, notes: e.target.value })}
                    placeholder="e.g. Settlement of corporate income tax"
                    className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-text block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={taxForm.paymentDate}
                    onChange={(e) => setTaxForm({ ...taxForm, paymentDate: e.target.value })}
                    className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-blue hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md text-sm"
                >
                  Save Tax Record
                </button>
              </form>
            </div>

            {/* Tax Payments Table */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm lg:col-span-2 overflow-hidden">
              <h2 className="font-semibold text-dark-navy mb-4 flex items-center justify-between">
                <span>📖 Income Tax Payments Ledger</span>
                {taxLoading && <span className="text-xs text-muted-text animate-pulse">Refreshing...</span>}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-muted-text text-xs uppercase text-left">
                      <th className="py-3 px-2">Payment Date</th>
                      <th className="py-3 px-2">Year</th>
                      <th className="py-3 px-2">Period</th>
                      <th className="py-3 px-2">Receipt Ref</th>
                      <th className="py-3 px-2">Logged By</th>
                      <th className="py-3 px-2">Notes</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {taxLoading ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-muted-text">Loading tax payments...</td>
                      </tr>
                    ) : taxPayments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-muted-text">No corporate tax records filed</td>
                      </tr>
                    ) : (
                      taxPayments.map((tp) => (
                        <tr key={tp._id}>
                          <td className="py-3 px-2 text-xs">{new Date(tp.paymentDate).toLocaleDateString()}</td>
                          <td className="py-3 px-2 text-xs font-semibold">{tp.year}</td>
                          <td className="py-3 px-2 text-xs">{tp.period}</td>
                          <td className="py-3 px-2 text-xs text-muted-text">{tp.referenceNo || '-'}</td>
                          <td className="py-3 px-2 text-xs">{tp.createdBy?.name || 'System'}</td>
                          <td className="py-3 px-2 text-xs text-muted-text truncate max-w-[150px]">{tp.notes || '-'}</td>
                          <td className="py-3 px-2 text-right font-bold text-red-600">
                            Rs. {tp.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminFinancials;
