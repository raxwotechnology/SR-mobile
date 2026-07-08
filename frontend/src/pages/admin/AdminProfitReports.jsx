import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, FileText, Search, Calendar, Landmark, Tag, Package, Download } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getProfitReport, getCategories } from '../../services/api';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';

const BRANDS_LIST = ['all', 'Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Huawei', 'OnePlus', 'Anker', 'JBL', 'Baseus'];

const AdminProfitReports = () => {
  const { selectedStoreId } = useAdminStoreStore();

  // Filters
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Categories list
  const [categories, setCategories] = useState([]);

  // Data states
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Table pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load category list for filter
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await getCategories();
        setCategories(data || []);
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    fetchCats();
  }, []);

  // Fetch profit data from backend
  const fetchProfitData = async () => {
    try {
      setLoading(true);
      const params = {
        category,
        brand,
        startDate,
        endDate,
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };
      const { data } = await getProfitReport(params);
      setProfitData(data);
      setCurrentPage(1); // Reset to page 1 on search
    } catch (err) {
      toast.error('Failed to load profit analysis reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when parameters or store selection changes
  useEffect(() => {
    fetchProfitData();
  }, [category, brand, startDate, endDate, selectedStoreId]);

  // Quick Date Select
  const handleQuickDate = (rangeType) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];

    switch (rangeType) {
      case 'today':
        start = end;
        break;
      case 'week': {
        const prevWeek = new Date(today);
        prevWeek.setDate(today.getDate() - 7);
        start = prevWeek.toISOString().split('T')[0];
        break;
      }
      case 'month': {
        const prevMonth = new Date(today);
        prevMonth.setMonth(today.getMonth() - 1);
        start = prevMonth.toISOString().split('T')[0];
        break;
      }
      case 'year':
        start = `${today.getFullYear()}-01-01`;
        break;
      default:
        start = '';
        end = '';
    }

    setStartDate(start);
    setEndDate(end);
  };

  // Process item details for inline search and pagination
  const filteredItems = useMemo(() => {
    if (!profitData?.items) return [];
    if (!searchQuery.trim()) return profitData.items;

    const query = searchQuery.toLowerCase();
    return profitData.items.filter(item => 
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(query)) ||
      (item.brand && item.brand.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query))
    );
  }, [profitData, searchQuery]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Chronological daily profit trend processed client-side for Recharts
  const dailyTrendData = useMemo(() => {
    if (!profitData?.items) return [];

    const dailyMap = {};
    profitData.items.forEach(item => {
      const dateStr = new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, revenue: 0, cost: 0, profit: 0, rawDate: new Date(item.date) };
      }
      dailyMap[dateStr].revenue += item.totalRevenue || (item.sellingPrice * item.quantity);
      dailyMap[dateStr].cost += item.totalCost || (item.costPrice * item.quantity);
      dailyMap[dateStr].profit += item.profit;
    });

    // Sort chronologically
    return Object.values(dailyMap).sort((a, b) => a.rawDate - b.rawDate);
  }, [profitData]);

  // Export functions
  const handleExport = (type) => {
    if (!profitData?.items?.length) {
      toast.warn('No data available to export');
      return;
    }

    const profitCols = [
      { label: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
      { label: 'Invoice No', accessor: 'invoiceNumber' },
      { label: 'Item Name', accessor: 'name' },
      { label: 'Category', accessor: 'category' },
      { label: 'Brand', accessor: 'brand' },
      { label: 'Cost Price', accessor: (r) => `Rs. ${r.costPrice?.toLocaleString()}` },
      { label: 'Selling Price', accessor: (r) => `Rs. ${r.sellingPrice?.toLocaleString()}` },
      { label: 'Qty', accessor: 'quantity' },
      { label: 'Total Revenue', accessor: (r) => `Rs. ${(r.sellingPrice * r.quantity)?.toLocaleString()}` },
      { label: 'Total Cost', accessor: (r) => `Rs. ${(r.costPrice * r.quantity)?.toLocaleString()}` },
      { label: 'Total Profit', accessor: (r) => `Rs. ${r.profit?.toLocaleString()}` },
      { label: 'Margin', accessor: (r) => `${r.margin}%` }
    ];

    const title = 'Detailed Profit Analysis Report';
    if (type === 'pdf') {
      exportToPDF(profitData.items, profitCols, title);
    } else if (type === 'excel') {
      exportToExcel(profitData.items, profitCols, title.toLowerCase().replace(/\s+/g, '-'));
    }
  };

  const s = profitData?.summary || { totalRevenue: 0, totalCost: 0, totalProfit: 0, profitMargin: 0 };
  const profitPositive = s.totalProfit >= 0;

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6">
        
        {/* Title and Top Level Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              📈 Standalone Profit Analysis
            </h1>
            <p className="text-muted-text text-sm mt-1">
              Analyze margins and gross product profitability by categories, brands, and timelines.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => handleExport('excel')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} /> Excel Export
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileText size={14} /> PDF Export
            </button>
            <button
              onClick={fetchProfitData}
              disabled={loading}
              className="bg-white border border-card-border hover:bg-gray-50 text-dark-navy text-xs font-semibold p-2 rounded-xl transition-colors flex items-center justify-center shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-text flex items-center gap-1">
              🔍 Report Filters
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => handleQuickDate('today')} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">Today</button>
              <button onClick={() => handleQuickDate('week')} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">Last 7 Days</button>
              <button onClick={() => handleQuickDate('month')} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">Last 30 Days</button>
              <button onClick={() => handleQuickDate('year')} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">This Year</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">Category Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue text-dark-navy font-medium"
              >
                <option value="all">All Categories</option>
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
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full border border-card-border rounded-xl py-2 px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-blue text-dark-navy font-medium"
              >
                <option value="all">All Brands</option>
                {BRANDS_LIST.slice(1).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">From Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-blue text-dark-navy"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-muted-text block mb-1">To Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-card-border rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-blue text-dark-navy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-text">Gross Revenue</p>
              <p className="text-xl font-bold text-dark-navy mt-1">Rs. {s.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <ArrowUpRight size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-text">Cost of Goods Sold (COGS)</p>
              <p className="text-xl font-bold text-dark-navy mt-1">Rs. {s.totalCost.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
              <Package size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div>
              <p className="text-xs text-muted-text font-semibold">Total Gross Profit</p>
              <p className={`text-xl font-bold mt-1 ${profitPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                Rs. {s.totalProfit.toLocaleString()}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profitPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {profitPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-text font-semibold">Profit Margin</p>
              <p className="text-xl font-bold text-purple-600 mt-1">{s.profitMargin}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        {/* Visual Analytics Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Gross Profit by Category */}
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <h3 className="font-semibold text-dark-navy mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={14} className="text-blue-500" /> Gross Profit by Category
            </h3>
            {profitData?.byCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={profitData.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" name="Gross Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-xs text-muted-text border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                No category data matches current filters
              </div>
            )}
          </div>

          {/* Gross Profit by Brand */}
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <h3 className="font-semibold text-dark-navy mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Landmark size={14} className="text-purple-500" /> Gross Profit by Brand
            </h3>
            {profitData?.byBrand?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={profitData.byBrand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#10b981" name="Gross Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-xs text-muted-text border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                No brand data matches current filters
              </div>
            )}
          </div>
        </div>

        {/* Time Series Profit Trend Chart */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-500" /> Chronological Daily Profit Trend
          </h3>
          {dailyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" name="Gross Revenue" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" name="Gross Profit" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-xs text-muted-text border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
              No historical timeline data matches filters
            </div>
          )}
        </div>

        {/* Detailed Items Table */}
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-dark-navy text-base">📖 Detailed Items Profit Ledger</h2>
              <p className="text-muted-text text-xs mt-0.5">Individual product sales details and margins.</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-muted-text" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by product, invoice..."
                className="w-full pl-9 pr-4 py-2 border border-card-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary-blue bg-gray-50/40 text-dark-navy font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-card-border text-muted-text text-[10px] uppercase text-left font-bold tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Invoice</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Brand</th>
                  <th className="py-3 px-3 text-right">Cost (Rs.)</th>
                  <th className="py-3 px-3 text-right">Selling (Rs.)</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Gross Profit</th>
                  <th className="py-3 px-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-xs text-muted-text">Loading profit records...</td>
                  </tr>
                ) : !filteredItems.length ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-xs text-muted-text">No profit records matched criteria</td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 text-xs text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-xs font-mono font-medium text-slate-700">#{item.invoiceNumber}</td>
                      <td className="py-3 px-3 text-xs font-semibold text-dark-navy">{item.name}</td>
                      <td className="py-3 px-3 text-xs text-muted-text">{item.category}</td>
                      <td className="py-3 px-3 text-xs text-muted-text">{item.brand}</td>
                      <td className="py-3 px-3 text-right text-xs text-slate-600">Rs. {item.costPrice.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-xs text-slate-600">Rs. {item.sellingPrice.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center text-xs font-bold text-dark-navy">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 text-xs">Rs. {item.profit.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-bold text-primary-blue text-xs">{item.margin}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs">
              <span className="text-muted-text">
                Showing {Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredItems.length, currentPage * itemsPerPage)} of {filteredItems.length} records
              </span>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-card-border rounded-xl text-dark-navy font-semibold hover:bg-gray-50 disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-xl font-bold ${currentPage === page ? 'bg-primary-blue text-white' : 'border border-card-border text-dark-navy hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 border border-card-border rounded-xl text-dark-navy font-semibold hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminProfitReports;
