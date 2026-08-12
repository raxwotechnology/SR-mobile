import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Search, Filter, Download, Calendar, ArrowUpRight, Phone, User as UserIcon,
  Plus, CheckCircle2, TrendingUp, DollarSign, Package, AlertCircle, Zap,
  FileSpreadsheet, FileText, ChevronDown, Trash2, X
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { 
  getReloads, 
  deleteReload,
  getCardStock, 
  addCardStock, 
  deleteCardStock, 
  getReloadStock,
  addReloadStock,
  deleteReloadStock,
  recordDailyCardSales,
  createReload,
  getAccounts
} from '../../services/api';
import { adminNavGroups as navItems } from './adminNavItems';
import { toast } from 'react-toastify';
import useAdminStoreStore from '../../store/adminStoreStore';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const AdminReloads = () => {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'stock' | 'eod'
  const [reloads, setReloads] = useState([]);
  const [cardStocks, setCardStocks] = useState([]);
  const [reloadStocks, setReloadStocks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState({
    operator: '',
    type: '',
    startDate: '',
    endDate: ''
  });
  const { selectedStoreId } = useAdminStoreStore();

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Scratch Card Modal state
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [isCustomDenom, setIsCustomDenom] = useState(false);
  const [stockFormData, setStockFormData] = useState({
    operator: 'Dialog',
    denomination: '100',
    quantity: '50',
    profitPercentage: '4',
    notes: ''
  });
  const [submittingStock, setSubmittingStock] = useState(false);

  // Electronic Reload Float Modal state
  const [showReloadFloatModal, setShowReloadFloatModal] = useState(false);
  const [floatFormData, setFloatFormData] = useState({
    operator: 'Dialog',
    amount: '50000',
    profitPercentage: '4',
    notes: ''
  });
  const [submittingFloat, setSubmittingFloat] = useState(false);

  // Unified Delete Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'reload' | 'cardStock' | 'reloadStock', item, label }

  // EOD Form state
  const [eodSales, setEodSales] = useState({}); // { [stockId]: quantitySold }
  const [eodReloadTotals, setEodReloadTotals] = useState({
    Dialog: '',
    Mobitel: '',
    Hutch: '',
    Airtel: '',
    SLT: ''
  });
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [eodNotes, setEodNotes] = useState('');
  const [submittingEod, setSubmittingEod] = useState(false);

  const operators = ['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT', 'Other'];

  const OPERATOR_DENOMINATIONS = {
    Dialog: ['100', '159'],
    Mobitel: ['50', '100', '58', '118'],
    Hutch: ['100', '79', '159'],
    Airtel: ['50', '100', '99'],
    SLT: [],
    Other: []
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const params = {
        ...(filter.operator ? { operator: filter.operator } : {}),
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.startDate ? { startDate: filter.startDate } : {}),
        ...(filter.endDate ? { endDate: filter.endDate } : {}),
        ...(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      };

      const [reloadRes, stockRes, rStockRes, accRes] = await Promise.all([
        getReloads(params),
        getCardStock(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {}),
        getReloadStock(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {}),
        getAccounts(selectedStoreId !== 'all' ? { storeId: selectedStoreId } : {})
      ]);

      setReloads(reloadRes.data || []);
      setCardStocks(stockRes.data || []);
      setReloadStocks(rStockRes.data || []);
      setAccounts(accRes.data || []);
      if (accRes.data && accRes.data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accRes.data[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load reload and card stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [filter.operator, filter.type, filter.startDate, filter.endDate, selectedStoreId]);

  // Filtered transactions
  const filteredReloads = reloads.filter(r => 
    r.mobileNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.operator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered card stocks
  const filteredCardStocks = cardStocks.filter(s =>
    s.operator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(s.denomination).includes(searchQuery)
  );

  // Stats calculation
  const totalVolume = filteredReloads.reduce((sum, r) => sum + r.amount, 0);
  const totalProfit = filteredReloads.reduce((sum, r) => sum + (r.profitAmount || (r.amount * (r.profitPercentage || 4) / 100)), 0);
  
  const todayStr = new Date().toDateString();
  const todayReloads = filteredReloads.filter(r => new Date(r.createdAt).toDateString() === todayStr);
  const todayVolume = todayReloads.reduce((sum, r) => sum + r.amount, 0);
  const todayProfit = todayReloads.reduce((sum, r) => sum + (r.profitAmount || (r.amount * (r.profitPercentage || 4) / 100)), 0);
  
  const totalStockUnits = cardStocks.reduce((sum, s) => sum + s.quantity, 0);
  const totalReloadFloat = reloadStocks.reduce((sum, s) => sum + (s.currentBalance || 0), 0);

  const getOperatorBadge = (op) => {
    const styles = {
      Dialog: 'bg-rose-50 text-rose-700 border-rose-100',
      Mobitel: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Hutch: 'bg-amber-50 text-amber-700 border-amber-100',
      Airtel: 'bg-red-50 text-red-700 border-red-100',
      SLT: 'bg-sky-50 text-sky-700 border-sky-100'
    };
    return styles[op] || 'bg-slate-50 text-slate-700 border-slate-100';
  };

  // Add Scratch Card Stock handler
  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!stockFormData.operator || !stockFormData.denomination || !stockFormData.quantity) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      setSubmittingStock(true);
      await addCardStock({
        storeId: selectedStoreId !== 'all' ? selectedStoreId : undefined,
        operator: stockFormData.operator,
        denomination: Number(stockFormData.denomination),
        quantity: Number(stockFormData.quantity),
        profitPercentage: Number(stockFormData.profitPercentage) || 4,
        notes: stockFormData.notes
      });
      toast.success(`Successfully added stock for ${stockFormData.operator} Rs. ${stockFormData.denomination}`);
      setShowAddStockModal(false);
      setStockFormData({
        operator: 'Dialog',
        denomination: '100',
        quantity: '50',
        profitPercentage: '4',
        notes: ''
      });
      setIsCustomDenom(false);
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add card stock');
    } finally {
      setSubmittingStock(false);
    }
  };

  // Add/Top-Up Electronic Reload Float Stock handler
  const handleAddReloadFloat = async (e) => {
    e.preventDefault();
    if (!floatFormData.operator || !floatFormData.amount) {
      toast.error('Please enter operator and top-up float amount');
      return;
    }

    try {
      setSubmittingFloat(true);
      await addReloadStock({
        storeId: selectedStoreId !== 'all' ? selectedStoreId : undefined,
        operator: floatFormData.operator,
        amount: Number(floatFormData.amount),
        profitPercentage: Number(floatFormData.profitPercentage) || 4,
        notes: floatFormData.notes
      });
      toast.success(`Successfully topped up ${floatFormData.operator} Reload Float by Rs. ${Number(floatFormData.amount).toLocaleString()}`);
      setShowReloadFloatModal(false);
      setFloatFormData({
        operator: 'Dialog',
        amount: '50000',
        profitPercentage: '4',
        notes: ''
      });
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to top up reload float balance');
    } finally {
      setSubmittingFloat(false);
    }
  };

  // Unified Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'reload') {
        await deleteReload(deleteTarget.item._id);
        toast.success('Reload transaction deleted successfully');
      } else if (deleteTarget.type === 'cardStock') {
        await deleteCardStock(deleteTarget.item._id);
        toast.success('Scratch card stock deleted successfully');
      } else if (deleteTarget.type === 'reloadStock') {
        await deleteReloadStock(deleteTarget.item._id);
        toast.success('Reload float stock removed successfully');
      }
      setDeleteTarget(null);
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete item');
    }
  };

  // End of Day Sales Submission
  const handleEodSubmit = async (e) => {
    e.preventDefault();
    const salesPayload = [];

    // 1. Collect Scratch Card sales
    cardStocks.forEach((stock) => {
      const qSold = Number(eodSales[stock._id] || 0);
      if (qSold > 0) {
        salesPayload.push({
          operator: stock.operator,
          denomination: stock.denomination,
          quantitySold: qSold,
          profitPercentage: stock.profitPercentage || 4
        });
      }
    });

    // 2. Collect Electronic Reload daily totals
    const reloadEntries = Object.entries(eodReloadTotals).filter(([_, amount]) => Number(amount) > 0);

    if (salesPayload.length === 0 && reloadEntries.length === 0) {
      toast.error('Please enter sold quantities for scratch cards or daily electronic reload totals.');
      return;
    }

    try {
      setSubmittingEod(true);

      // Process Scratch Cards EOD
      if (salesPayload.length > 0) {
        await recordDailyCardSales({
          storeId: selectedStoreId !== 'all' ? selectedStoreId : undefined,
          sales: salesPayload,
          accountId: selectedAccountId,
          notes: eodNotes || 'Daily Scratch Card Sales Entry'
        });
      }

      // Process Electronic Reload Totals EOD
      for (const [operatorName, amountVal] of reloadEntries) {
        const amt = Number(amountVal);
        await createReload({
          storeId: selectedStoreId !== 'all' ? selectedStoreId : undefined,
          mobileNumber: `DAILY-EOD-${operatorName.toUpperCase()}`,
          operator: operatorName,
          amount: amt,
          type: 'Prepaid',
          profitPercentage: 4,
          paymentMethod: 'Cash',
          accountId: selectedAccountId,
          notes: eodNotes ? `${eodNotes} - Daily ${operatorName} Reload Total` : `Daily ${operatorName} Electronic Reload Total`
        });
      }

      toast.success('Daily Card & Electronic Reload Sales recorded!');
      setEodSales({});
      setEodReloadTotals({ Dialog: '', Mobitel: '', Hutch: '', Airtel: '', SLT: '' });
      setEodNotes('');
      fetchAllData();
      setActiveTab('transactions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record daily sales');
    } finally {
      setSubmittingEod(false);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    if (activeTab === 'stock') {
      const columns = [
        { label: 'Operator', accessor: 'operator' },
        { label: 'Denomination (Rs)', accessor: 'denomination' },
        { label: 'Available Units', accessor: 'quantity' },
        { label: 'Cost Price (Rs)', accessor: (r) => (r.costPrice || (r.denomination * 0.96)).toFixed(2) },
        { label: 'Face Value (Rs)', accessor: 'sellingPrice' },
        { label: 'Profit %', accessor: (r) => `${r.profitPercentage || 4}%` },
        { label: 'Store', accessor: (r) => r.storeId?.name || 'All' }
      ];
      exportToCSV(cardStocks, columns, `card_stock_inventory_${new Date().toISOString().split('T')[0]}`);
    } else {
      const columns = [
        { label: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleString() },
        { label: 'Mobile / Ref', accessor: 'mobileNumber' },
        { label: 'Operator', accessor: 'operator' },
        { label: 'Type', accessor: 'type' },
        { label: 'Gross Amount (Rs)', accessor: 'amount' },
        { label: 'Profit %', accessor: (r) => `${r.profitPercentage || 4}%` },
        { label: 'Profit Amount (Rs)', accessor: (r) => (r.profitAmount || (r.amount * (r.profitPercentage || 4) / 100)).toFixed(2) },
        { label: 'Cashier', accessor: (r) => r.createdBy?.name || 'Unknown' }
      ];
      exportToCSV(filteredReloads, columns, `reloads_and_cards_${new Date().toISOString().split('T')[0]}`);
    }
    setShowExportMenu(false);
    toast.success('CSV Export downloaded!');
  };

  const handleExportExcel = () => {
    if (activeTab === 'stock') {
      const columns = [
        { label: 'Operator', accessor: 'operator' },
        { label: 'Denomination (Rs)', accessor: 'denomination' },
        { label: 'Available Units', accessor: 'quantity' },
        { label: 'Cost Price (Rs)', accessor: (r) => (r.costPrice || (r.denomination * 0.96)).toFixed(2) },
        { label: 'Face Value (Rs)', accessor: 'sellingPrice' },
        { label: 'Profit %', accessor: (r) => `${r.profitPercentage || 4}%` },
        { label: 'Store', accessor: (r) => r.storeId?.name || 'All' }
      ];
      exportToExcel(cardStocks, columns, `card_stock_inventory_${new Date().toISOString().split('T')[0]}`);
    } else {
      const columns = [
        { label: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleString() },
        { label: 'Mobile / Ref', accessor: 'mobileNumber' },
        { label: 'Operator', accessor: 'operator' },
        { label: 'Type', accessor: 'type' },
        { label: 'Gross Amount (Rs)', accessor: 'amount' },
        { label: 'Profit %', accessor: (r) => `${r.profitPercentage || 4}%` },
        { label: 'Profit Amount (Rs)', accessor: (r) => (r.profitAmount || (r.amount * (r.profitPercentage || 4) / 100)).toFixed(2) },
        { label: 'Cashier', accessor: (r) => r.createdBy?.name || 'Unknown' }
      ];
      exportToExcel(filteredReloads, columns, `reloads_and_cards_${new Date().toISOString().split('T')[0]}`);
    }
    setShowExportMenu(false);
    toast.success('Excel Report downloaded!');
  };

  const handleExportPDF = () => {
    if (activeTab === 'stock') {
      const columns = [
        { label: 'Operator', accessor: 'operator' },
        { label: 'Denomination', accessor: (r) => `Rs. ${r.denomination}` },
        { label: 'Stock Count', accessor: 'quantity' },
        { label: 'Profit %', accessor: (r) => `${r.profitPercentage || 4}%` },
        { label: 'Store', accessor: (r) => r.storeId?.name || 'Main' }
      ];
      exportToPDF(cardStocks, columns, 'Card Stock Inventory Report');
    } else {
      const columns = [
        { label: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString() },
        { label: 'Mobile / Ref', accessor: 'mobileNumber' },
        { label: 'Operator', accessor: 'operator' },
        { label: 'Type', accessor: 'type' },
        { label: 'Amount (Rs)', accessor: 'amount' },
        { label: 'Profit (Rs)', accessor: (r) => (r.profitAmount || (r.amount * (r.profitPercentage || 4) / 100)).toFixed(2) }
      ];
      exportToPDF(filteredReloads, columns, 'Reload & Scratch Card Sales Report');
    }
    setShowExportMenu(false);
  };

  // EOD calculations
  const eodCardRevenue = cardStocks.reduce((sum, s) => {
    const qSold = Number(eodSales[s._id] || 0);
    return sum + (s.denomination * qSold);
  }, 0);

  const eodCardProfit = cardStocks.reduce((sum, s) => {
    const qSold = Number(eodSales[s._id] || 0);
    const pMargin = s.profitPercentage || 4;
    return sum + ((s.denomination * qSold) * pMargin / 100);
  }, 0);

  const eodReloadRevenue = Object.values(eodReloadTotals).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const eodReloadProfit = eodReloadRevenue * 0.04;

  const totalEodRevenue = eodCardRevenue + eodReloadRevenue;
  const totalEodProfit = eodCardProfit + eodReloadProfit;

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">📱 Reloads & Card Inventory</h1>
            <p className="text-muted-text text-sm">Track mobile top-ups, scratch card inventory, and daily sales balancing</p>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowReloadFloatModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-card-border rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors text-slate-700 shadow-sm"
            >
              <Zap size={16} className="text-amber-500" />
              Add Reload
            </button>
            <button
              onClick={() => setShowAddStockModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Cards
            </button>

            {/* Export Button */}
            <div className="relative">
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-card-border rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors text-slate-700 shadow-sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download size={16} />
                Export
                <ChevronDown size={14} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-card-border z-50 py-1.5">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase">Export Report</div>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText size={14} className="text-emerald-600" />
                    CSV File
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    Excel (.xls)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download size={14} className="text-indigo-600" />
                    PDF Document
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Standard Navigation Tabs */}
        <div className="border-b border-card-border flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 relative transition-all ${
              activeTab === 'transactions'
                ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Transactions History
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-3 relative transition-all ${
              activeTab === 'stock'
                ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Stock & Float Inventory
          </button>
          <button
            onClick={() => setActiveTab('eod')}
            className={`pb-3 relative transition-all ${
              activeTab === 'eod'
                ? 'text-indigo-600 font-bold border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            End-of-Day Sales Entry
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Smartphone size={20} /></div>
              <span className="text-xs text-slate-400 font-medium">{filteredReloads.length} txns</span>
            </div>
            <h3 className="text-2xl font-bold text-dark-navy">Rs. {totalVolume.toLocaleString()}</h3>
            <p className="text-xs text-muted-text">Total Sales Volume</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div>
              <span className="text-xs font-semibold text-emerald-600">4% Margin</span>
            </div>
            <h3 className="text-2xl font-bold text-dark-navy">Rs. {totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-xs text-muted-text">Total Net Profit</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Zap size={20} /></div>
              <span className="text-xs text-slate-400 font-medium">Reload</span>
            </div>
            <h3 className="text-2xl font-bold text-dark-navy">Rs. {totalReloadFloat.toLocaleString()}</h3>
            <p className="text-xs text-muted-text">Reload Float Balance</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><DollarSign size={20} /></div>
              <span className="text-xs font-semibold text-rose-600">Today</span>
            </div>
            <h3 className="text-2xl font-bold text-dark-navy">Rs. {todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-xs text-muted-text">Today's Net Profit</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-card-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><Package size={20} /></div>
              <span className="text-xs text-slate-400 font-medium">{cardStocks.length} types</span>
            </div>
            <h3 className="text-2xl font-bold text-dark-navy">{totalStockUnits.toLocaleString()}</h3>
            <p className="text-xs text-muted-text">Cards in Stock</p>
          </div>
        </div>

        {/* TAB 1: TRANSACTIONS LOG */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-card-border shadow-sm flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search number, operator, notes, or cashier..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <select 
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filter.operator}
                    onChange={(e) => setFilter({...filter, operator: e.target.value})}
                  >
                    <option value="">All Operators</option>
                    {operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filter.type}
                    onChange={(e) => setFilter({...filter, type: e.target.value})}
                  >
                    <option value="">All Types</option>
                    <option value="Prepaid">Prepaid</option>
                    <option value="Postpaid">Postpaid</option>
                    <option value="Bill Payment">Bill Payment</option>
                    <option value="Scratch Card">Scratch Card</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filter.startDate}
                    onChange={(e) => setFilter({...filter, startDate: e.target.value})}
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input 
                    type="date" 
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filter.endDate}
                    onChange={(e) => setFilter({...filter, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-card-border">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target / Ref</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Operator</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cashier</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Profit (4%)</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="8" className="px-6 py-4 bg-slate-50/50"></td>
                        </tr>
                      ))
                    ) : filteredReloads.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Smartphone size={48} className="text-slate-200" />
                            <p>No reload transactions found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredReloads.map((reload) => {
                        const pAmt = reload.profitAmount || (reload.amount * (reload.profitPercentage || 4) / 100);
                        return (
                          <tr key={reload._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-dark-navy font-medium">{new Date(reload.createdAt).toLocaleDateString()}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">{new Date(reload.createdAt).toLocaleTimeString()}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><Phone size={14} /></div>
                                <span className="font-semibold text-slate-700">{reload.mobileNumber}</span>
                              </div>
                              {reload.notes && <div className="text-[11px] text-slate-400 mt-0.5">{reload.notes}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getOperatorBadge(reload.operator)}`}>
                                {reload.operator}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-600 font-medium px-2 py-0.5 bg-slate-100 rounded-md text-xs">
                                {reload.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-slate-600">
                                <UserIcon size={14} className="text-slate-400" />
                                <span>{reload.createdBy?.name || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-emerald-600 font-semibold text-sm">+Rs. {pAmt.toFixed(2)}</div>
                              <div className="text-[10px] text-slate-400">Margin: {reload.profitPercentage || 4}%</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-indigo-600 font-bold text-base">Rs. {reload.amount.toLocaleString()}</div>
                              <div className="text-[10px] text-slate-400">{reload.paymentMethod}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => {
                                  setDeleteTarget({
                                    type: 'reload',
                                    item: reload,
                                    label: `reload transaction (${reload.operator} - Rs. ${reload.amount})`
                                  });
                                  setShowDeleteModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Transaction"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STOCK & FLOAT INVENTORY */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            {/* SECTION 1: ELECTRONIC RELOAD FLOAT STOCK */}
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-dark-navy flex items-center gap-2">
                    <Zap className="text-amber-500" size={18} />
                    Electronic Reload Float Balances
                  </h3>
                  <p className="text-xs text-slate-500">Available float balances for Dialog, Mobitel, Hutch, Airtel, and SLT</p>
                </div>
                <button
                  onClick={() => setShowReloadFloatModal(true)}
                  className="px-3.5 py-1.5 bg-white border border-card-border hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Zap size={14} className="text-amber-500" />
                  Add Reload
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT'].map((op) => {
                  const stock = reloadStocks.find(s => s.operator === op);
                  const bal = stock ? stock.currentBalance : 0;
                  const isLow = bal < 5000;

                  return (
                    <div key={op} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2 relative">
                      {stock && (
                        <button
                          onClick={() => {
                            setDeleteTarget({
                              type: 'reloadStock',
                              item: stock,
                              label: `${stock.operator} Reload Float balance (Rs. ${stock.currentBalance})`
                            });
                            setShowDeleteModal(true);
                          }}
                          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Remove/Reset Float Stock"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      <div className="flex items-center justify-between pr-6">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getOperatorBadge(op)}`}>
                          {op}
                        </span>
                        <span className="text-[10px] text-slate-500">4% Margin</span>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Current Float</div>
                        <div className={`text-lg font-bold ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          Rs. {bal.toLocaleString()}
                        </div>
                      </div>

                      {stock?.lastTopUpAmount > 0 && (
                        <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-200">
                          Last Top Up: Rs. {stock.lastTopUpAmount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: SCRATCH CARD STOCK INVENTORY */}
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-dark-navy flex items-center gap-2">
                    <Package className="text-indigo-600" size={18} />
                    Scratch Card Inventory
                  </h3>
                  <p className="text-xs text-slate-500">Physical card unit counts by operator and denomination</p>
                </div>
                <button
                  onClick={() => {
                    setStockFormData({
                      operator: 'Dialog',
                      denomination: '100',
                      quantity: '50',
                      profitPercentage: '4',
                      notes: ''
                    });
                    setIsCustomDenom(false);
                    setShowAddStockModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} />
                  Add Scratch Cards
                </button>
              </div>

              {/* Grid of Card Stock Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCardStocks.length === 0 ? (
                  <div className="col-span-full bg-slate-50 p-8 text-center rounded-xl border border-slate-200 text-slate-400 text-sm">
                    No scratch card stock entries found. Click "Add Scratch Cards" to populate inventory.
                  </div>
                ) : (
                  filteredCardStocks.map((item) => {
                    const isLow = item.quantity <= 10;
                    return (
                      <div 
                        key={item._id} 
                        className="bg-slate-50 rounded-xl border border-slate-200 p-4 transition-all flex flex-col justify-between relative"
                      >
                        <button
                          onClick={() => {
                            setDeleteTarget({
                              type: 'cardStock',
                              item: item,
                              label: `${item.operator} Rs. ${item.denomination} card stock (${item.quantity} units)`
                            });
                            setShowDeleteModal(true);
                          }}
                          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Remove Card Stock"
                        >
                          <Trash2 size={15} />
                        </button>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getOperatorBadge(item.operator)}`}>
                              {item.operator}
                            </span>
                            <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Rs. {item.denomination}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-dark-navy">
                            Rs. {item.denomination} Card
                          </h4>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-slate-400 font-medium">Stock Count</div>
                            <div className={`text-xl font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                              {item.quantity} <span className="text-xs font-normal text-slate-400">units</span>
                            </div>
                          </div>
                          {isLow && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: END OF DAY SALES ENTRY & BALANCING */}
        {activeTab === 'eod' && (
          <form onSubmit={handleEodSubmit} className="bg-white rounded-2xl border border-card-border p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} />
                End-of-Day Cards & Electronic Reload Sales Entry
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter sold scratch card quantities and electronic reload daily totals to update inventory and balance accounts.
              </p>
            </div>

            {/* SECTION 1: SCRATCH CARD DAILY SALES */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package size={16} className="text-indigo-600" />
                1. Scratch Cards Sold Today
              </h3>
              
              {cardStocks.length === 0 ? (
                <div className="p-4 bg-slate-50 text-center rounded-xl text-slate-500 border border-slate-200 text-xs">
                  No scratch card stock configured yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cardStocks.map((stock) => {
                    const qSold = Number(eodSales[stock._id] || '');
                    const maxQty = stock.quantity;
                    const denom = stock.denomination;
                    const lineRevenue = denom * (qSold || 0);
                    const remainingAfter = Math.max(0, maxQty - (qSold || 0));

                    return (
                      <div key={stock._id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getOperatorBadge(stock.operator)}`}>
                            {stock.operator}
                          </span>
                          <span className="text-xs font-bold text-slate-600">Rs. {denom} Card</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Opening: {maxQty} units</span>
                          <span>Margin: {stock.profitPercentage || 4}%</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">Units Sold Today</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                            value={eodSales[stock._id] || ''}
                            onChange={(e) => setEodSales({ ...eodSales, [stock._id]: e.target.value })}
                          />
                        </div>

                        <div className="pt-2 border-t border-slate-200 text-xs flex justify-between text-slate-600">
                          <div>Sales: <strong className="text-indigo-600">Rs. {lineRevenue.toLocaleString()}</strong></div>
                          <div>Remaining: <strong>{remainingAfter} units</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: ELECTRONIC RELOAD DAILY TOTALS */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                2. Electronic Reload Daily Totals (4% Profit)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT'].map((op) => {
                  const val = eodReloadTotals[op] || '';
                  const amt = Number(val) || 0;
                  const profit = amt * 0.04;
                  const rStock = reloadStocks.find(s => s.operator === op);
                  const currentFloat = rStock ? rStock.currentBalance : 0;
                  const remFloat = Math.max(0, currentFloat - amt);

                  return (
                    <div key={op} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getOperatorBadge(op)}`}>
                          {op}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">+Rs. {profit.toFixed(2)}</span>
                      </div>

                      <div className="text-[10px] text-slate-400">Current Float: Rs. {currentFloat.toLocaleString()}</div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600">Total Sales (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-semibold text-indigo-600"
                          value={eodReloadTotals[op] || ''}
                          onChange={(e) => setEodReloadTotals({ ...eodReloadTotals, [op]: e.target.value })}
                        />
                      </div>

                      {amt > 0 && (
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                          Remaining Float: <strong>Rs. {remFloat.toLocaleString()}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary & Account selection */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 w-full md:w-auto">
                <div className="text-xs text-slate-500 font-medium">Target Account for Income</div>
                <select
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.name} ({acc.type}) - Balance: Rs.{acc.balance}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6 text-right w-full md:w-auto justify-end">
                <div>
                  <div className="text-xs text-slate-500">Total Sales Revenue</div>
                  <div className="text-lg font-bold text-indigo-600">Rs. {totalEodRevenue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total 4% Profit</div>
                  <div className="text-lg font-bold text-emerald-600">Rs. {totalEodProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingEod || totalEodRevenue <= 0}
              className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all ${
                submittingEod || totalEodRevenue <= 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
              }`}
            >
              {submittingEod ? 'Processing...' : 'Confirm & Balance Today\'s Card & Reload Sales'}
            </button>
          </form>
        )}

        {/* MODAL: TOP-UP RELOAD FLOAT STOCK */}
        {showReloadFloatModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-card-border">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-base text-dark-navy flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  Top-Up Reload Float
                </h3>
                <button 
                  onClick={() => setShowReloadFloatModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddReloadFloat} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Operator</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={floatFormData.operator}
                    onChange={(e) => setFloatFormData({ ...floatFormData, operator: e.target.value })}
                  >
                    {['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT'].map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Top-Up Amount (Rs.)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    placeholder="e.g. 50000"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-indigo-600"
                    value={floatFormData.amount}
                    onChange={(e) => setFloatFormData({ ...floatFormData, amount: e.target.value })}
                  />
                  {Number(floatFormData.amount) > 0 && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Cost @ 4% Margin: Rs. {(Number(floatFormData.amount) * 0.96).toLocaleString()} (Profit: Rs. {(Number(floatFormData.amount) * 0.04).toLocaleString()})
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Profit Margin %</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={floatFormData.profitPercentage}
                    onChange={(e) => setFloatFormData({ ...floatFormData, profitPercentage: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Notes (Optional)</label>
                  <textarea
                    placeholder="Float details..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none h-16"
                    value={floatFormData.notes}
                    onChange={(e) => setFloatFormData({ ...floatFormData, notes: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFloat}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                >
                  {submittingFloat ? 'Saving...' : 'Confirm Top-Up'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD SCRATCH CARD STOCK */}
        {showAddStockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-card-border">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-base text-dark-navy flex items-center gap-2">
                  <Package size={18} className="text-indigo-600" />
                  Add Scratch Cards
                </h3>
                <button 
                  onClick={() => setShowAddStockModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddStock} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Operator</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={stockFormData.operator}
                    onChange={(e) => {
                      const op = e.target.value;
                      const denoms = OPERATOR_DENOMINATIONS[op] || [];
                      const defaultDenom = denoms.length > 0 ? denoms[0] : '';
                      setStockFormData({
                        ...stockFormData,
                        operator: op,
                        denomination: defaultDenom
                      });
                      setIsCustomDenom(denoms.length === 0);
                    }}
                  >
                    {operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Denomination (Rs.)</label>
                    {isCustomDenom ? (
                      <div className="relative mt-1">
                        <input
                          type="number"
                          required
                          placeholder="e.g. 100 or 159"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-indigo-600 pr-12"
                          value={stockFormData.denomination}
                          onChange={(e) => setStockFormData({ ...stockFormData, denomination: e.target.value })}
                        />
                        {(OPERATOR_DENOMINATIONS[stockFormData.operator] || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomDenom(false);
                              const denoms = OPERATOR_DENOMINATIONS[stockFormData.operator];
                              setStockFormData({ ...stockFormData, denomination: denoms[0] });
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    ) : (
                      <select
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-indigo-600"
                        value={stockFormData.denomination}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setIsCustomDenom(true);
                            setStockFormData({ ...stockFormData, denomination: '' });
                          } else {
                            setStockFormData({ ...stockFormData, denomination: e.target.value });
                          }
                        }}
                      >
                        {(OPERATOR_DENOMINATIONS[stockFormData.operator] || []).map(val => (
                          <option key={val} value={val}>Rs. {val}</option>
                        ))}
                        <option value="custom">Custom...</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 50"
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={stockFormData.quantity}
                      onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Profit Margin %</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={stockFormData.profitPercentage}
                    onChange={(e) => setStockFormData({ ...stockFormData, profitPercentage: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Notes (Optional)</label>
                  <textarea
                    placeholder="Stock notes..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none h-16"
                    value={stockFormData.notes}
                    onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingStock}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                >
                  {submittingStock ? 'Saving...' : 'Add To Stock'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* UNIFIED SECURITY DELETE CONFIRMATION MODAL */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={deleteTarget ? deleteTarget.label : 'item'}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminReloads;
