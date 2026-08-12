import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, Calendar, RefreshCw, Download, FileDown, DollarSign, Clock, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getBalanceReport } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-toastify';
import { exportToExcel, exportBalanceReportPDF } from '../../utils/exportUtils';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';

const AdminBalanceReport = () => {
  const { selectedStoreId } = useAdminStoreStore();

  const [period, setPeriod] = useState('monthly'); // 'daily' | 'monthly' | 'yearly'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('normal'); // 'normal' | 'wholesale' | 'accessories'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US'));

  // Live time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch balance report data
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        period,
        date: selectedDate,
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const { data } = await getBalanceReport(params);
      setReportData(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load balance report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, selectedDate, selectedStoreId]);

  const summary = reportData?.balanceReport || {
    mobileIncome: 0,
    accessoriesIncome: 0,
    wholesaleIncome: 0,
    advanceIncome: 0,
    repairNormalIncome: 0,
    repairCompanyIncome: 0,
    phoneCardIncome: 0,
    simCardIncome: 0,
    reloadIncome: 0,
    serviceCost: 0,
    supplierCost: 0,
    totalIncome: 0,
    totalCost: 0,
    balanceAmount: 0
  };

  const tables = reportData?.tables || {
    normalCustomerDetails: [],
    wholesaleCustomerDetails: [],
    accessoriesPayment: []
  };

  // Get current active table items
  const rawTableItems = useMemo(() => {
    if (activeTab === 'wholesale') return tables.wholesaleCustomerDetails || [];
    if (activeTab === 'accessories') return tables.accessoriesPayment || [];
    return tables.normalCustomerDetails || [];
  }, [activeTab, tables]);

  // Filtered table items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return rawTableItems;
    const q = searchQuery.toLowerCase();
    return rawTableItems.filter(item =>
      (item.receipt && item.receipt.toLowerCase().includes(q)) ||
      (item.item && item.item.toLowerCase().includes(q)) ||
      (item.brand && item.brand.toLowerCase().includes(q)) ||
      (item.model && item.model.toLowerCase().includes(q)) ||
      (item.cId && String(item.cId).toLowerCase().includes(q))
    );
  }, [rawTableItems, searchQuery]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return [
      {
        name: selectedDate.replace(/-/g, '/'),
        Income: summary.totalIncome || 0,
        Cost: summary.totalCost || 0,
        Balance: summary.balanceAmount || 0
      }
    ];
  }, [summary, selectedDate]);

  // Formatter helper
  const formatCur = (val) => {
    return `Rs.${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle PDF export
  const handlePDFExport = () => {
    const activeLabel = activeTab === 'wholesale'
      ? 'WHOLESALE CUSTOMER DETAILS'
      : activeTab === 'accessories'
      ? 'ACCESSORIES PAYMENT'
      : 'NORMAL CUSTOMER DETAILS';

    exportBalanceReportPDF(
      summary,
      filteredItems,
      activeLabel,
      selectedDate.replace(/-/g, '/'),
      period.toUpperCase() + ' REPORT'
    );
  };

  // Handle Excel export
  const handleExcelExport = () => {
    const activeLabel = activeTab === 'wholesale'
      ? 'wholesale-customer-details'
      : activeTab === 'accessories'
      ? 'accessories-payment'
      : 'normal-customer-details';

    const columns = [
      { label: 'RECEIPT', accessor: 'receipt' },
      { label: 'DATE', accessor: 'date' },
      { label: 'TIME', accessor: 'time' },
      { label: 'ITEM', accessor: 'item' },
      { label: 'BRAND', accessor: 'brand' },
      { label: 'MODEL', accessor: 'model' },
      { label: 'QTY', accessor: 'qty' },
      { label: 'PRICE', accessor: (r) => Number(r.price || 0).toFixed(2) },
      { label: 'SUB TOTAL', accessor: (r) => Number(r.subTotal || 0).toFixed(2) },
      { label: 'DISCOUNT', accessor: (r) => Number(r.discount || 0).toFixed(2) },
      { label: 'TOTAL', accessor: (r) => Number(r.total || 0).toFixed(2) },
      { label: 'C_ID', accessor: 'cId' }
    ];

    exportToExcel(filteredItems, columns, `balance-report-${activeLabel}-${selectedDate}`);
  };

  return (
    <DashboardLayout navItems={navItems} title="Balance Report">
      <div className="space-y-6">
        {/* Header Controls - Clean Light Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase">BALANCE REPORT</h1>
              <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-2">
                <span>Real-time Financial Summary</span>
                <span>•</span>
                <span className="text-emerald-600 font-mono flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5" /> {currentTime}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Period Selector Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setPeriod('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'daily' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                DAILY
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'monthly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                MONTHLY
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'yearly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                YEARLY
              </button>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
              <Calendar className="w-4 h-4 text-blue-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Export Buttons */}
            <button
              onClick={handleExcelExport}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1.5 border border-emerald-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>

            <button
              onClick={handlePDFExport}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-500/20 transition-all active:scale-95"
            >
              <FileDown className="w-4 h-4" /> PDF Report
            </button>
          </div>
        </div>

        {/* Balance Report Summary Screen 1 Layout (Photo 1 Matching Clean Desktop Light UI) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Summary Fields Grid Card */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
              <h2 className="text-lg font-black tracking-wide text-slate-900 uppercase flex items-center gap-2">
                <span>📋 BALANCE REPORT SUMMARY</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold capitalize">({period})</span>
              </h2>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                DATE: {selectedDate.replace(/-/g, '/')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              {/* Left Column Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">DATE</label>
                  <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold">
                    {selectedDate.replace(/-/g, '/')}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">MOBILE INCOME</label>
                  <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-2 text-emerald-700 font-mono font-bold text-sm">
                    {formatCur(summary.mobileIncome)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">ACCESSORIES INCOME</label>
                  <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-2 text-emerald-700 font-mono font-bold text-sm">
                    {formatCur(summary.accessoriesIncome)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">WHOLESALE | ADVANCE INCOME</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-2 text-emerald-700 font-mono text-xs font-bold truncate">
                      {formatCur(summary.wholesaleIncome)}
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-2 text-emerald-700 font-mono text-xs font-bold truncate">
                      {formatCur(summary.advanceIncome)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">REPAIRING INCOME (Normal | Company)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-2 text-emerald-700 font-mono text-xs font-bold truncate">
                      {formatCur(summary.repairNormalIncome)}
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-2 text-emerald-700 font-mono text-xs font-bold truncate">
                      {formatCur(summary.repairCompanyIncome)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">PHONE CARD | SIM CARD INCOME</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-2 text-emerald-700 font-mono text-xs font-bold truncate">
                      {formatCur(summary.phoneCardIncome)}
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-2 text-emerald-700 font-mono text-xs font-bold truncate">
                      {formatCur(summary.simCardIncome)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">RELOAD INCOME</label>
                  <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-2 text-emerald-700 font-mono font-bold text-sm">
                    {formatCur(summary.reloadIncome)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">SERVICE COST</label>
                  <div className="bg-red-50/50 border border-red-300 rounded-lg px-3 py-2 text-red-700 font-mono font-bold text-sm">
                    {formatCur(summary.serviceCost)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] mb-1 font-bold tracking-wider uppercase">SUPPLIER COST</label>
                  <div className="bg-red-50/50 border border-red-300 rounded-lg px-3 py-2 text-red-700 font-mono font-bold text-sm">
                    {formatCur(summary.supplierCost)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 text-[11px] mb-1 font-bold tracking-wider uppercase">TOTAL INCOME</label>
                  <div className="bg-blue-50 border-2 border-blue-400 rounded-lg px-3 py-2 text-blue-800 font-mono font-black text-base shadow-sm">
                    {formatCur(summary.totalIncome)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 text-[11px] mb-1 font-bold tracking-wider uppercase">TOTAL COST</label>
                  <div className="bg-red-50 border-2 border-red-400 rounded-lg px-3 py-2 text-red-800 font-mono font-black text-base shadow-sm">
                    {formatCur(summary.totalCost)}
                  </div>
                </div>

                <div>
                  <label className="block text-emerald-800 text-[11px] mb-1 font-bold tracking-wider uppercase">BALANCE AMOUNT</label>
                  <div className="bg-emerald-100 border-2 border-emerald-500 rounded-lg px-3 py-2 text-emerald-900 font-mono font-black text-lg shadow-sm">
                    {formatCur(summary.balanceAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart Visualization (Right Box) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-4 tracking-wider uppercase flex items-center justify-between">
                <span>INCOME vs COST vs BALANCE</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              </h3>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(val) => [`Rs. ${Number(val).toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Income" fill="#2563eb" radius={[6, 6, 0, 0]} name="Income" />
                    <Bar dataKey="Cost" fill="#dc2626" radius={[6, 6, 0, 0]} name="Cost" />
                    <Bar dataKey="Balance" fill="#16a34a" radius={[6, 6, 0, 0]} name="Balance" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5 mt-4">
              <div className="flex justify-between text-slate-600">
                <span>Net Profit Margin:</span>
                <span className="text-slate-900 font-bold">
                  {summary.totalIncome > 0 ? `${((summary.balanceAmount / summary.totalIncome) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 items-center">
                <span>System Status:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> ACTIVE & VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Itemized Transactions Table Screen (Photo 2 Matching Tabs Light UI) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-800 overflow-hidden">
          {/* Top Control Tabs Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setActiveTab('normal')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'normal'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                👨‍💼 NORMAL CUSTOMER DETAILS
              </button>
              <button
                onClick={() => setActiveTab('wholesale')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'wholesale'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 border border-purple-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🏢 WHOLE SALE CUSTOMER DETAILS
              </button>
              <button
                onClick={() => setActiveTab('accessories')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'accessories'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🎧 ACCESSORIES PAYMENT
              </button>
            </div>

            {/* Search Bar & Stats */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search receipt, item, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white text-slate-800 text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 w-64 shadow-sm"
                />
              </div>

              {/* Red PDF Icon Button for Table */}
              <button
                onClick={handlePDFExport}
                className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 transition-all shadow-sm"
                title="Export Table to PDF"
              >
                <FileDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3.5 px-4">RECEIPT</th>
                  <th className="py-3.5 px-3">DATE</th>
                  <th className="py-3.5 px-3">TIME</th>
                  <th className="py-3.5 px-4">ITEM</th>
                  <th className="py-3.5 px-3">BRAND</th>
                  <th className="py-3.5 px-3">MODEL</th>
                  <th className="py-3.5 px-2 text-center">QTY</th>
                  <th className="py-3.5 px-3 text-right">PRICE</th>
                  <th className="py-3.5 px-3 text-right">SUB TOTAL</th>
                  <th className="py-3.5 px-3 text-right">DISCOUNT</th>
                  <th className="py-3.5 px-4 text-right">TOTAL</th>
                  <th className="py-3.5 px-3">C_ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-12 text-slate-400 font-sans">
                      No records found for the selected period and tab filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-blue-600">{row.receipt}</td>
                      <td className="py-3 px-3 text-slate-600">{row.date}</td>
                      <td className="py-3 px-3 text-slate-600">{row.time}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">{row.item}</td>
                      <td className="py-3 px-3 font-sans text-slate-700">{row.brand}</td>
                      <td className="py-3 px-3 font-sans text-slate-600">{row.model}</td>
                      <td className="py-3 px-2 text-center font-bold text-amber-600">{row.qty}</td>
                      <td className="py-3 px-3 text-right">{row.price?.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">{row.subTotal?.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-red-600">{row.discount?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">{row.total?.toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">{row.cId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Count */}
          <div className="p-3 bg-slate-50 text-slate-600 text-xs flex justify-between items-center px-4 border-t border-slate-200">
            <span>Showing {filteredItems.length} transactions</span>
            <span className="font-mono text-slate-900 font-bold">Total Sum: Rs. {filteredItems.reduce((acc, i) => acc + (i.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBalanceReport;
