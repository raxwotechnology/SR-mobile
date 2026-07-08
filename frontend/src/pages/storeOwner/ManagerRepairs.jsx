import { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Plus, Search, Printer, Trash2, Edit2, CheckCircle2, 
  X, User, Calendar, DollarSign, CreditCard, ArrowRight, 
  AlertCircle, Smartphone, Info, RefreshCw, PlusCircle, Check,
  BarChart3, BarChart, ShoppingBag, ShieldCheck, Users, PackageOpen
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { managerNavGroups } from './managerNavItems';
import { 
  getRepairs, createRepair, updateRepair, deliverRepair, deleteRepair, 
  getEmployees, searchProducts, getAccounts, getStores 
} from '../../services/api';
import useCurrencyStore from '../../store/currencyStore';
import useSettingsStore from '../../store/settingsStore';
import { toast } from 'react-toastify';
import { getImageUrl } from '../../utils/imageHelper';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const statusColors = {
  received: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-purple-100 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const ManagerRepairs = ({ isAdmin = false, isEmployee = false, navItems: propNavItems, storeIdFilter }) => {
  const navItems = propNavItems || managerNavGroups;
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Selection
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Printing Receipts
  const [printJob, setPrintJob] = useState(null); // { repair, type: 'handover' | 'invoice' }

  // Reference Data
  const [technicians, setTechnicians] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [stores, setStores] = useState([]);
  const settings = useSettingsStore((s) => s.settings);
  const { convertPrice, formatPrice } = useCurrencyStore();

  // Create Form State
  const [createForm, setCreateForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deviceModel: '',
    deviceSerialNumber: '',
    reportedIssue: '',
    estimatedCost: 0,
    notes: '',
    storeId: '',
  });

  // Update Form State
  const [updateForm, setUpdateForm] = useState({
    status: 'received',
    technicians: [],
    partsUsed: [],
    repairFee: 0,
    notes: '',
  });

  // Parts search & custom addition
  const [partSearch, setPartSearch] = useState('');
  const [partSearchResults, setPartSearchResults] = useState([]);
  const [customPart, setCustomPart] = useState({ name: '', cost: 0 });

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    paymentMethod: 'Cash',
    accountId: '',
  });

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (isAdmin && storeIdFilter) {
        params.storeId = storeIdFilter;
      }
      const { data } = await getRepairs(params);
      setRepairs(data || []);
    } catch (err) {
      toast.error('Failed to load repair jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const { data } = await getEmployees({ includeManagers: true });
      setTechnicians(data || []);
    } catch (err) {
      console.error('Failed to fetch technicians', err);
    }
  };

  const fetchAccountsList = async () => {
    try {
      const params = {};
      if (isAdmin && storeIdFilter) {
        params.storeId = storeIdFilter;
      }
      const { data } = await getAccounts(params);
      setAccounts(data || []);
      
      // Auto-set default account
      const defaultAcc = data?.find(a => a.isDefault) || data?.[0];
      if (defaultAcc) {
        setCheckoutForm(prev => ({ ...prev, accountId: defaultAcc._id }));
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  const fetchStoresList = async () => {
    if (isAdmin) {
      try {
        const { data } = await getStores();
        setStores(data.stores || data || []);
      } catch (err) {
        console.error('Failed to fetch stores list', err);
      }
    }
  };

  useEffect(() => {
    fetchRepairs();
    fetchTechnicians();
    fetchAccountsList();
    fetchStoresList();
  }, [isAdmin, storeIdFilter]);

  // Product search for parts
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (partSearch.trim().length > 1) {
        try {
          const { data } = await searchProducts(partSearch);
          setPartSearchResults(data.products || []);
        } catch (err) {
          console.error(err);
        }
      } else {
        setPartSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [partSearch]);

  const handleOpenCreate = () => {
    setCreateForm({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      deviceModel: '',
      deviceSerialNumber: '',
      reportedIssue: '',
      estimatedCost: 0,
      notes: '',
      storeId: storeIdFilter || '',
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    // Resolve storeId
    const targetStoreId = createForm.storeId || storeIdFilter;
    if (!targetStoreId) {
      toast.warning('Please select a store to log this repair job');
      return;
    }

    if (!createForm.customerName || !createForm.customerPhone || !createForm.deviceModel || !createForm.reportedIssue) {
      toast.warning('Please fill in all required fields');
      return;
    }

    try {
      const payload = { 
        ...createForm,
        storeId: targetStoreId 
      };
      const { data } = await createRepair(payload);
      toast.success('Repair job logged successfully!');
      setShowCreateModal(false);
      fetchRepairs();
      
      // Auto open print handover note receipt
      handlePrintReceipt(data, 'handover');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create repair job');
    }
  };

  const handleOpenUpdate = (repair) => {
    setSelectedRepair(repair);
    setUpdateForm({
      status: repair.status || 'received',
      technicians: repair.technicians?.map(t => t._id) || [],
      partsUsed: repair.partsUsed || [],
      repairFee: repair.repairFee || 0,
      notes: repair.notes || '',
    });
    setPartSearch('');
    setPartSearchResults([]);
    setCustomPart({ name: '', cost: 0 });
    setShowUpdateModal(true);
  };

  const handleAddInventoryPart = (product) => {
    // Check if already added
    const exists = updateForm.partsUsed.find(p => p.productId === product._id);
    if (exists) {
      toast.info('Item is already added. You can update its quantity in the list.');
      return;
    }

    // Check stock
    if (product.stock <= 0) {
      toast.warning('Warning: Selected item is out of stock in store inventory.');
    }

    const newPart = {
      productId: product._id,
      name: product.name,
      cost: product.priceLKR || product.price,
      qty: 1,
      isInventory: true
    };

    setUpdateForm(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, newPart]
    }));
    setPartSearch('');
    setPartSearchResults([]);
  };

  const handleAddCustomPart = () => {
    if (!customPart.name.trim() || customPart.cost <= 0) {
      toast.warning('Please enter valid part name and cost');
      return;
    }

    const newPart = {
      name: customPart.name,
      cost: Number(customPart.cost),
      qty: 1,
      isInventory: false
    };

    setUpdateForm(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, newPart]
    }));
    setCustomPart({ name: '', cost: 0 });
  };

  const handleRemovePart = (index) => {
    setUpdateForm(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, idx) => idx !== index)
    }));
  };

  const handlePartQtyChange = (index, newQty) => {
    if (newQty < 1) return;
    setUpdateForm(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.map((p, idx) => idx === index ? { ...p, qty: Number(newQty) } : p)
    }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateRepair(selectedRepair._id, updateForm);
      toast.success('Repair job details updated successfully!');
      setShowUpdateModal(false);
      fetchRepairs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update repair job');
    }
  };

  const handleOpenCheckout = (repair) => {
    setSelectedRepair(repair);
    // Try to auto-select matching store account if available
    const storeAcc = accounts.find(a => String(a.storeId) === String(repair.storeId));
    if (storeAcc) {
      setCheckoutForm(prev => ({ ...prev, accountId: storeAcc._id }));
    }
    setShowCheckoutModal(true);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutForm.accountId) {
      toast.warning('Please select a cash/bank account');
      return;
    }

    try {
      const { data } = await deliverRepair(selectedRepair._id, checkoutForm);
      toast.success(`Repair successfully delivered and logged to account!`);
      setShowCheckoutModal(false);
      fetchRepairs();
      
      // Auto open print invoice layout for delivered job
      handlePrintReceipt(data, 'invoice');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    }
  };

  const handleDeleteClick = (repair) => {
    setItemToDelete(repair);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteRepair(itemToDelete._id);
      toast.success('Repair job record deleted successfully');
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchRepairs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete repair job');
    }
  };

  const handlePrintReceipt = (repair, type) => {
    setPrintJob({ repair, type });
    // Trigger print after state is registered and DOM compiles
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Metrics calculations for Reports Tab
  const totalJobsCount = repairs.length;
  const activeRepairsCount = repairs.filter(r => ['received', 'in_progress'].includes(r.status)).length;
  
  // Total Revenue (only delivered repairs)
  const deliveredRepairs = repairs.filter(r => r.status === 'delivered');
  const totalRevenue = deliveredRepairs.reduce((sum, r) => {
    const partsCost = r.partsUsed?.reduce((s, p) => s + (p.cost * p.qty), 0) || 0;
    return sum + (r.repairFee || 0) + partsCost;
  }, 0);

  // Projected Revenue (all non-cancelled repairs)
  const nonCancelledRepairs = repairs.filter(r => r.status !== 'cancelled');
  const projectedRevenue = nonCancelledRepairs.reduce((sum, r) => {
    const partsCost = r.partsUsed?.reduce((s, p) => s + (p.cost * p.qty), 0) || 0;
    return sum + (r.repairFee || 0) + partsCost;
  }, 0);

  // Technician statistics
  const techStats = technicians.map(tech => {
    const assignedJobs = repairs.filter(r => r.technicians?.some(t => t._id === tech._id));
    const completedJobs = assignedJobs.filter(r => ['completed', 'delivered'].includes(r.status));
    const incomeGenerated = completedJobs.reduce((sum, r) => {
      const partsCost = r.partsUsed?.reduce((s, p) => s + (p.cost * p.qty), 0) || 0;
      return sum + (r.repairFee || 0) + partsCost;
    }, 0);

    return {
      _id: tech._id,
      name: tech.name,
      role: tech.role,
      assigned: assignedJobs.length,
      completed: completedJobs.length,
      income: incomeGenerated
    };
  }).filter(t => t.assigned > 0 || t.income > 0).sort((a, b) => b.income - a.income);

  // Parts usage stats
  let totalInventoryPartsCount = 0;
  let totalExternalPartsCount = 0;
  let inventoryPartsCost = 0;
  let externalPartsCost = 0;
  const partFrequency = {};

  repairs.forEach(r => {
    if (r.status !== 'cancelled') {
      r.partsUsed?.forEach(p => {
        if (p.isInventory) {
          totalInventoryPartsCount += p.qty;
          inventoryPartsCost += p.cost * p.qty;
        } else {
          totalExternalPartsCount += p.qty;
          externalPartsCost += p.cost * p.qty;
        }
        partFrequency[p.name] = (partFrequency[p.name] || 0) + p.qty;
      });
    }
  });

  const topParts = Object.entries(partFrequency)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Calculate live totals for the update panel
  const currentPartsTotal = updateForm.partsUsed.reduce((sum, p) => sum + (p.cost * p.qty), 0);
  const currentGrandTotal = Number(updateForm.repairFee) + currentPartsTotal;

  // Filter repairs for main table
  const filteredRepairs = repairs
    .filter(r => {
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        r.jobNo.toLowerCase().includes(term) ||
        r.customerName.toLowerCase().includes(term) ||
        r.customerPhone.toLowerCase().includes(term) ||
        r.deviceModel.toLowerCase().includes(term) ||
        (r.deviceSerialNumber && r.deviceSerialNumber.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });

  return (
    <DashboardLayout navItems={navItems} title={isAdmin ? "Admin Repairs Dashboard" : "Repairs Dashboard"}>
      <div className="no-print">
        {/* Header Block */}
        <div className="mb-6">
          <div className="bg-white rounded-3xl border border-card-border shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-dark-navy flex items-center gap-2">
                <Wrench className="text-primary-blue" /> Device Repairs
              </h1>
              <p className="text-muted-text text-sm mt-1">
                Log customer devices, manage technician tasks, parts replacements, and track ledger synchronization.
              </p>
            </div>
            
            <button
              onClick={handleOpenCreate}
              className="bg-primary-blue hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 self-start md:self-auto"
            >
              <Plus size={20} /> Log Repair Job
            </button>
          </div>
        </div>

        {/* Filters, Search, and Tabs */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {['all', 'received', 'in_progress', 'completed', 'delivered', 'cancelled', 'reports'].map((status) => {
                let count = 0;
                if (status === 'all') count = repairs.length;
                else if (status === 'reports') count = '';
                else count = repairs.filter(r => r.status === status).length;
                
                const isSelected = filterStatus === status;
                
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-primary-blue text-white shadow-sm'
                        : 'bg-gray-50 border border-card-border text-muted-text hover:bg-gray-100'
                    }`}
                  >
                    {status === 'reports' ? 'REPAIRS REPORT' : status.toUpperCase().replace('_', ' ')}
                    {status !== 'reports' && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Input (hide on reports tab) */}
            {filterStatus !== 'reports' && (
              <div className="relative w-full lg:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-text">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, name, phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Display (Reports vs Table) */}
        {filterStatus === 'reports' ? (
          /* ════════════════ REPORTS TAB DASHBOARD ════════════════ */
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-card-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 text-blue-600 p-3.5 rounded-xl">
                  <Wrench size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-text uppercase">Total Jobs Logged</h4>
                  <p className="text-2xl font-black text-dark-navy mt-1">{totalJobsCount}</p>
                </div>
              </div>
              <div className="bg-white border border-card-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 text-amber-600 p-3.5 rounded-xl">
                  <RefreshCw className="animate-spin-slow" size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-text uppercase">Active Repairs</h4>
                  <p className="text-2xl font-black text-dark-navy mt-1">{activeRepairsCount}</p>
                </div>
              </div>
              <div className="bg-white border border-card-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-text uppercase">Delivered Income</h4>
                  <p className="text-xl font-black text-emerald-600 mt-1">{formatPrice(totalRevenue)}</p>
                </div>
              </div>
              <div className="bg-white border border-card-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="bg-purple-50 text-purple-600 p-3.5 rounded-xl">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-text uppercase">Projected Value</h4>
                  <p className="text-xl font-black text-purple-600 mt-1">{formatPrice(projectedRevenue)}</p>
                </div>
              </div>
            </div>

            {/* Split Grid: Tech Performance & Parts Used */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tech Contribution */}
              <div className="bg-white border border-card-border rounded-2xl shadow-sm p-5">
                <h3 className="text-lg font-bold text-dark-navy mb-4 flex items-center gap-2">
                  <Users className="text-primary-blue" size={20} /> Technician Work Distribution
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150 font-bold text-muted-text bg-gray-50">
                        <th className="py-2.5 px-3">Technician</th>
                        <th className="py-2.5 px-3 text-center">Assigned Jobs</th>
                        <th className="py-2.5 px-3 text-center">Completed</th>
                        <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {techStats.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-muted-text italic">
                            No technician allocations found in system repairs.
                          </td>
                        </tr>
                      ) : (
                        techStats.map(tech => (
                          <tr key={tech._id} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-dark-navy block">{tech.name}</span>
                              <span className="text-[10px] text-muted-text uppercase">{tech.role}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-dark-navy">{tech.assigned}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                                {tech.completed}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-600">{formatPrice(tech.income)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Parts Replacements & Stats */}
              <div className="bg-white border border-card-border rounded-2xl shadow-sm p-5 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-dark-navy mb-4 flex items-center gap-2">
                    <PackageOpen className="text-amber-500" size={20} /> Accessories & Parts Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-card-border p-3.5 rounded-xl">
                      <span className="text-muted-text text-[11px] uppercase font-bold block">Inventory Parts Replaced</span>
                      <span className="text-lg font-black text-dark-navy block mt-0.5">{totalInventoryPartsCount} units</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Cost: {formatPrice(inventoryPartsCost)}</span>
                    </div>
                    <div className="bg-gray-50 border border-card-border p-3.5 rounded-xl">
                      <span className="text-muted-text text-[11px] uppercase font-bold block">External Custom Parts</span>
                      <span className="text-lg font-black text-dark-navy block mt-0.5">{totalExternalPartsCount} units</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Cost: {formatPrice(externalPartsCost)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-dark-navy uppercase mb-2">Top Replaced Parts</h4>
                  <div className="space-y-2">
                    {topParts.length === 0 ? (
                      <p className="text-xs text-muted-text italic text-center py-4">No parts replaced in any logs.</p>
                    ) : (
                      topParts.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-150 text-xs">
                          <span className="font-semibold text-dark-navy">{p.name}</span>
                          <span className="bg-primary-blue text-white px-2.5 py-0.5 rounded-full font-bold">
                            {p.qty} replaced
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ════════════════ REPAIR JOBS TABLE ════════════════ */
          loading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-card-border shadow-sm">
              <RefreshCw className="animate-spin text-primary-blue h-10 w-10" />
            </div>
          ) : filteredRepairs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-card-border shadow-sm p-6">
              <Info size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-dark-navy">No Repair Jobs Found</h3>
              <p className="text-muted-text text-sm mt-1">Try expanding your search query or status filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-card-border text-xs font-extrabold uppercase text-muted-text">
                      <th className="py-4 px-6">Job No</th>
                      <th className="py-4 px-6">Customer Details</th>
                      <th className="py-4 px-6">Device Info</th>
                      <th className="py-4 px-6">Reported Issue</th>
                      <th className="py-4 px-6">Technicians</th>
                      <th className="py-4 px-6">Total Cost</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border text-sm">
                    {filteredRepairs.map((repair) => {
                      const partsTotal = repair.partsUsed?.reduce((sum, p) => sum + (p.cost * p.qty), 0) || 0;
                      const grandTotal = (repair.repairFee || 0) + partsTotal;
                      
                      return (
                        <tr key={repair._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-bold text-dark-navy">
                            {repair.jobNo}
                            <span className="block text-[10px] text-muted-text font-normal">
                              {new Date(repair.dateReceived || repair.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-dark-navy">{repair.customerName}</div>
                            <div className="text-xs text-muted-text">{repair.customerPhone}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-dark-navy">{repair.deviceModel}</div>
                            {repair.deviceSerialNumber && (
                              <div className="text-[11px] text-muted-text">S/N: {repair.deviceSerialNumber}</div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="line-clamp-2 max-w-xs text-dark-navy">{repair.reportedIssue}</div>
                          </td>
                          <td className="py-4 px-6">
                            {repair.technicians && repair.technicians.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {repair.technicians.map(t => (
                                  <span key={t._id} className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-red-500 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-bold text-dark-navy">
                            {grandTotal > 0 ? formatPrice(grandTotal) : <span className="text-muted-text text-xs">TBD</span>}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[repair.status] || 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                              {repair.status.toUpperCase().replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Handover Note */}
                              <button
                                onClick={() => handlePrintReceipt(repair, 'handover')}
                                title="Print Handover Note"
                                className="text-gray-600 hover:text-dark-navy p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                              >
                                <Printer size={16} />
                              </button>

                              {/* Edit / Proceed */}
                              {repair.status !== 'delivered' && (
                                <button
                                  onClick={() => handleOpenUpdate(repair)}
                                  title="Update Job Info & Parts"
                                  className="text-amber-600 hover:text-amber-700 p-1.5 hover:bg-amber-50 rounded-lg transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}

                              {/* Checkout Delivery */}
                              {repair.status !== 'delivered' && (
                                <button
                                  onClick={() => handleOpenCheckout(repair)}
                                  title="Deliver & Checkout"
                                  className="text-emerald-600 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 rounded-lg transition-all"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              )}

                              {/* Print Final Invoice for Delivered */}
                              {repair.status === 'delivered' && (
                                <button
                                  onClick={() => handlePrintReceipt(repair, 'invoice')}
                                  title="Print Invoice"
                                  className="text-emerald-600 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 rounded-lg transition-all font-bold text-xs flex items-center gap-1"
                                >
                                  <Printer size={14} /> Invoice
                                </button>
                              )}

                              {/* Delete */}
                              {(isAdmin || !isEmployee) && (
                                <button
                                  onClick={() => handleDeleteClick(repair)}
                                  title="Delete Record"
                                  className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* ════════════════ PRINT LAYOUT WRAPPER ════════════════ */}
      {printJob && (
        <div id="pos-receipt-content" className="bg-white text-black p-4" style={{ fontFamily: 'monospace' }}>
          <div className="text-center pb-4 border-b border-black">
            {settings?.logo && (
              <img 
                src={getImageUrl(settings.logo)} 
                alt="Logo" 
                style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto 6px', borderRadius: '8px' }} 
              />
            )}
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px' }}>
              {printJob.repair.storeId?.name || settings?.shopName || 'Mobile Hub'}
            </h2>
            <p style={{ fontSize: '11px', margin: '2px 0' }}>
              {printJob.repair.storeId?.address || settings?.address || ''}
            </p>
            <p style={{ fontSize: '11px', margin: '2px 0' }}>
              Tel: {printJob.repair.storeId?.phone || settings?.phone || ''}
            </p>
          </div>

          <div className="text-center my-3">
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              {printJob.type === 'handover' ? 'JOB RECEIPT / HANDOVER NOTE' : 'REPAIR SERVICE INVOICE'}
            </h3>
          </div>

          <div style={{ fontSize: '11px', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '8px 0' }}>
            <div className="flex justify-between">
              <span>Job No:</span>
              <strong>{printJob.repair.jobNo}</strong>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(printJob.repair.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span>{printJob.repair.status.toUpperCase()}</span>
            </div>
            {printJob.type === 'invoice' && printJob.repair.dateDelivered && (
              <div className="flex justify-between">
                <span>Date Delivered:</span>
                <span>{new Date(printJob.repair.dateDelivered).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Customer & Device */}
          <div style={{ fontSize: '11px', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
            <h4 style={{ margin: '0 0 4px', fontWeight: 700 }}>CUSTOMER DETAILS</h4>
            <div>Name: {printJob.repair.customerName}</div>
            <div>Phone: {printJob.repair.customerPhone}</div>
            {printJob.repair.customerEmail && <div>Email: {printJob.repair.customerEmail}</div>}
          </div>

          <div style={{ fontSize: '11px', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
            <h4 style={{ margin: '0 0 4px', fontWeight: 700 }}>DEVICE INFORMATION</h4>
            <div>Model: {printJob.repair.deviceModel}</div>
            {printJob.repair.deviceSerialNumber && <div>S/N or IMEI: {printJob.repair.deviceSerialNumber}</div>}
            <div style={{ marginTop: '4px' }}><strong>Issue:</strong> {printJob.repair.reportedIssue}</div>
            {printJob.repair.notes && <div className="mt-1 text-gray-700"><strong>Notes:</strong> {printJob.repair.notes}</div>}
          </div>

          {/* Pricing & Parts */}
          {printJob.type === 'handover' ? (
            <div className="text-right py-2" style={{ fontSize: '12px' }}>
              {printJob.repair.estimatedCost > 0 && (
                <div><strong>Estimated Cost:</strong> Rs. {printJob.repair.estimatedCost.toLocaleString()}</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '11px' }}>
              <h4 style={{ margin: '4px 0', fontWeight: 700 }}>REPLACEMENT PARTS & SERVICE</h4>
              
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '4px', marginBottom: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 40px 80px', fontWeight: 700, fontSize: '10px' }}>
                  <span>Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Price</span>
                </div>
                
                {/* Service Labor Fee */}
                {printJob.repair.repairFee > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 40px 80px', margin: '4px 0' }}>
                    <span>Labor / Repairing Fee</span>
                    <span className="text-center">1</span>
                    <span className="text-right">Rs. {printJob.repair.repairFee.toLocaleString()}</span>
                  </div>
                )}

                {/* Parts */}
                {printJob.repair.partsUsed && printJob.repair.partsUsed.map((part, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.2fr 40px 80px', margin: '4px 0' }}>
                    <span>{part.name}</span>
                    <span className="text-center">{part.qty}</span>
                    <span className="text-right">Rs. {(part.cost * part.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="text-right py-2" style={{ fontSize: '13px', fontWeight: 700 }}>
                <span>GRAND TOTAL: </span>
                <span>Rs. {((printJob.repair.repairFee || 0) + (printJob.repair.partsUsed?.reduce((sum, p) => sum + (p.cost * p.qty), 0) || 0)).toLocaleString()}</span>
              </div>

              <div style={{ fontSize: '10px', marginTop: '6px' }} className="flex justify-between border-t border-black pt-2">
                <span>Payment Method: <strong>{printJob.repair.paymentMethod || 'N/A'}</strong></span>
                <span>Billed By: {printJob.repair.createdBy?.name || 'Cashier'}</span>
              </div>
            </div>
          )}

          {/* Terms & Signatures */}
          <div className="mt-8 pt-4 border-t border-black text-[9px] text-gray-700" style={{ lineHeight: '1.3' }}>
            <h5 className="font-bold mb-1 text-black">Terms & Conditions:</h5>
            {printJob.type === 'handover' ? (
              <ol className="list-decimal pl-3 space-y-1">
                <li>Please produce this note when collecting your device.</li>
                <li>We are not responsible for any data loss. Please back up data before repair.</li>
                <li>Devices must be collected within 30 days of completion. Unclaimed devices may be sold to cover costs.</li>
                <li>Estimated cost is subject to change if additional faults are found during repair.</li>
              </ol>
            ) : (
              <ol className="list-decimal pl-3 space-y-1">
                <li>Repaired hardware components carry a 30-day warranty only.</li>
                <li>Warranty is void if device shows water damage, physical impact, or third-party tampering.</li>
                <li>Thank you for choosing {settings?.shopName || 'Mobile Hub'}!</li>
              </ol>
            )}

            <div className="flex justify-between mt-12 pt-6">
              <div className="text-center w-24 border-t border-black pt-1">
                Customer Signature
              </div>
              <div className="text-center w-24 border-t border-black pt-1">
                Receiver Signature
              </div>
            </div>

            <div className="text-center mt-6 text-[8px] text-gray-500">
              Printed on {new Date().toLocaleString()} | Powered by Mobile Hub ERP
            </div>
          </div>
          
          {/* Close button for screen rendering */}
          <div className="no-print mt-6 flex justify-center">
            <button
              onClick={() => setPrintJob(null)}
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-xl text-xs"
            >
              Close Print Preview
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL: CREATE REPAIR JOB ════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-card-border relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-dark-navy p-1.5 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-extrabold text-dark-navy mb-4 flex items-center gap-2">
              <Wrench className="text-primary-blue" /> Log Device Repair Job
            </h3>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex gap-3 text-xs text-blue-800 mb-2">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <div>
                  Enter the customer's details and reported issue. The system will generate a sequential **REP-XXXXX** job number and print-ready receipt.
                </div>
              </div>

              {/* Store Selector (Active only for Admins when Store Switcher is on Global) */}
              {isAdmin && !storeIdFilter && (
                <div>
                  <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Target Store / Location *</label>
                  <select
                    required
                    value={createForm.storeId}
                    onChange={(e) => setCreateForm({...createForm, storeId: e.target.value})}
                    className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                  >
                    <option value="">-- Choose Store Location --</option>
                    {stores.map(store => (
                      <option key={store._id} value={store._id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({...createForm, customerName: e.target.value})}
                    placeholder="e.g. John Doe"
                    className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    value={createForm.customerPhone}
                    onChange={(e) => setCreateForm({...createForm, customerPhone: e.target.value})}
                    placeholder="e.g. 0771234567"
                    className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Customer Email</label>
                <input
                  type="email"
                  value={createForm.customerEmail}
                  onChange={(e) => setCreateForm({...createForm, customerEmail: e.target.value})}
                  placeholder="e.g. customer@email.com"
                  className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Device Model *</label>
                  <input
                    type="text"
                    required
                    value={createForm.deviceModel}
                    onChange={(e) => setCreateForm({...createForm, deviceModel: e.target.value})}
                    placeholder="e.g. iPhone 13 Pro"
                    className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Serial / IMEI No</label>
                  <input
                    type="text"
                    value={createForm.deviceSerialNumber}
                    onChange={(e) => setCreateForm({...createForm, deviceSerialNumber: e.target.value})}
                    placeholder="IMEI or Serial Number"
                    className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Reported Issue *</label>
                <input
                  type="text"
                  required
                  value={createForm.reportedIssue}
                  onChange={(e) => setCreateForm({...createForm, reportedIssue: e.target.value})}
                  placeholder="e.g. Display cracked / White screen / Battery drain"
                  className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Estimated Cost (Rs.)</label>
                  <input
                    type="number"
                    value={createForm.estimatedCost}
                    onChange={(e) => setCreateForm({...createForm, estimatedCost: Number(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Internal / Intake Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                  placeholder="Note physical scratches, liquid entry tags..."
                  rows="2"
                  className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-card-border text-sm font-semibold hover:bg-gray-50 text-muted-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-700 text-white font-bold text-sm shadow-md"
                >
                  Create & Print Job Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL: UPDATE / PROCEED REPAIR JOB ════════════════ */}
      {showUpdateModal && selectedRepair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 border border-card-border relative">
            <button
              onClick={() => setShowUpdateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-dark-navy p-1.5 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-extrabold text-dark-navy mb-4 flex items-center gap-2">
              <Edit2 className="text-amber-500" /> Proceed Repair - Job #{selectedRepair.jobNo}
            </h3>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left col: Basic fields & Technicians */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Repair Job Status</label>
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})}
                      className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                    >
                      <option value="received">Received / Intake</option>
                      <option value="in_progress">In Progress / Repairing</option>
                      <option value="completed">Completed / Ready</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Assign Technicians</label>
                    <p className="text-[10px] text-muted-text mb-1.5">Assign one or more staff to work on this device:</p>
                    <div className="max-h-48 overflow-y-auto border border-card-border rounded-xl p-3 space-y-2 bg-gray-50">
                      {technicians.length === 0 ? (
                        <p className="text-xs text-muted-text italic">No employees found in store system.</p>
                      ) : (
                        technicians.map(tech => (
                          <label key={tech._id} className="flex items-center gap-2 text-sm text-dark-navy cursor-pointer">
                            <input
                              type="checkbox"
                              checked={updateForm.technicians.includes(tech._id)}
                              onChange={(e) => {
                                const current = [...updateForm.technicians];
                                if (e.target.checked) {
                                  setUpdateForm({ ...updateForm, technicians: [...current, tech._id] });
                                } else {
                                  setUpdateForm({ ...updateForm, technicians: current.filter(id => id !== tech._id) });
                                }
                              }}
                              className="rounded text-primary-blue focus:ring-primary-blue"
                            />
                            <span>{tech.name} <span className="text-xs text-muted-text">({tech.role})</span></span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Repairing Fee / Labor Fee (Rs.)</label>
                    <input
                      type="number"
                      value={updateForm.repairFee}
                      onChange={(e) => setUpdateForm({...updateForm, repairFee: Number(e.target.value)})}
                      className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Repair Progress Notes</label>
                    <textarea
                      value={updateForm.notes}
                      onChange={(e) => setUpdateForm({...updateForm, notes: e.target.value})}
                      placeholder="Note parts replaced, issues resolved..."
                      rows="2"
                      className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Right col: Parts Panel */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-card-border md:pl-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-navy uppercase mb-1 flex justify-between">
                      <span>Replacement Parts Used</span>
                      <span className="text-[10px] text-primary-blue normal-case font-normal">Deducts inventory on checkout</span>
                    </label>

                    {/* Search store accessories */}
                    <div className="relative mb-2">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-text">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        value={partSearch}
                        onChange={(e) => setPartSearch(e.target.value)}
                        placeholder="Search store inventory..."
                        className="w-full pl-8 pr-4 py-2 border border-card-border rounded-xl focus:ring-1 focus:ring-primary-blue focus:outline-none text-xs bg-white"
                      />
                      {partSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-card-border shadow-lg rounded-xl max-h-40 overflow-y-auto z-10 text-xs">
                          {partSearchResults.map(product => (
                            <button
                              key={product._id}
                              type="button"
                              onClick={() => handleAddInventoryPart(product)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
                            >
                              <div className="max-w-[70%]">
                                <span className="font-semibold text-dark-navy block truncate">{product.name}</span>
                                <span className="block text-[10px] text-muted-text">Stock: {product.stock} | SKU: {product.sku || 'N/A'}</span>
                              </div>
                              <span className="text-primary-blue font-bold">Rs. {product.price?.toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Custom / External Parts */}
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-card-border mb-3">
                      <p className="text-[10px] font-bold text-dark-navy mb-1.5 uppercase">Add Custom External Part</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        <input
                          type="text"
                          placeholder="Part Name"
                          value={customPart.name}
                          onChange={(e) => setCustomPart({ ...customPart, name: e.target.value })}
                          className="col-span-3 p-1.5 text-xs border border-card-border rounded-lg bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Cost"
                          value={customPart.cost || ''}
                          onChange={(e) => setCustomPart({ ...customPart, cost: Number(e.target.value) })}
                          className="col-span-2 p-1.5 text-xs border border-card-border rounded-lg bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomPart}
                        className="mt-2 w-full py-1.5 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"
                      >
                        <PlusCircle size={14} /> Add Custom Part
                      </button>
                    </div>

                    {/* Added Parts List */}
                    <div className="max-h-44 overflow-y-auto border border-card-border rounded-xl bg-gray-50/50 p-2 space-y-1.5">
                      {updateForm.partsUsed.length === 0 ? (
                        <p className="text-xs text-muted-text italic text-center py-4">No parts added yet.</p>
                      ) : (
                        updateForm.partsUsed.map((part, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border border-card-border text-xs flex justify-between items-center">
                            <div className="max-w-[70%]">
                              <span className="font-semibold text-dark-navy block truncate">{part.name}</span>
                              <span className="text-[10px] text-muted-text">
                                {part.isInventory ? 'Inventory Part' : 'External Part'} | Rs. {part.cost.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={part.qty}
                                onChange={(e) => handlePartQtyChange(idx, e.target.value)}
                                className="w-10 p-1 border border-card-border rounded text-center"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePart(idx)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Summary Live Calculation Box */}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
                    <div className="flex justify-between mb-1">
                      <span>Labor / Repair Fee:</span>
                      <span className="font-bold">Rs. {Number(updateForm.repairFee).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Parts Cost ({updateForm.partsUsed.length} items):</span>
                      <span className="font-bold">Rs. {currentPartsTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-2 font-bold text-sm text-emerald-900">
                      <span>Live Grand Total:</span>
                      <span>Rs. {currentGrandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-card-border text-sm font-semibold hover:bg-gray-50 text-muted-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-700 text-white font-bold text-sm shadow-md"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL: CHECKOUT & DELIVER REPAIR JOB ════════════════ */}
      {showCheckoutModal && selectedRepair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 border border-card-border relative">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-dark-navy p-1.5 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-extrabold text-dark-navy mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" /> Deliver & Checkout Job
            </h3>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-3 text-xs text-amber-800">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                  This action marks the job as **Delivered**, decrements accessories stock in inventory, and posts payment income directly into your centralized ledger.
                </div>
              </div>

              {/* Summary Detail */}
              <div className="bg-gray-50 border border-card-border rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-text">Job Reference:</span>
                  <span className="font-bold text-dark-navy">{selectedRepair.jobNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-text">Customer Name:</span>
                  <span className="font-bold text-dark-navy">{selectedRepair.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-text">Device:</span>
                  <span className="font-bold text-dark-navy">{selectedRepair.deviceModel}</span>
                </div>
                <div className="border-t border-gray-200 my-2 pt-2"></div>
                
                <div className="flex justify-between">
                  <span className="text-muted-text">Service Labor Fee:</span>
                  <span className="font-bold text-dark-navy">Rs. {(selectedRepair.repairFee || 0).toLocaleString()}</span>
                </div>
                
                {selectedRepair.partsUsed && selectedRepair.partsUsed.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-muted-text block">Parts Replacement:</span>
                    {selectedRepair.partsUsed.map((p, idx) => (
                      <div key={idx} className="flex justify-between pl-3 text-[10px] text-gray-600">
                        <span>{p.name} (x{p.qty}):</span>
                        <span>Rs. {(p.cost * p.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="border-t-2 border-dashed border-gray-200 my-2 pt-2 flex justify-between font-bold text-sm text-dark-navy">
                  <span>Grand Total Payable:</span>
                  <span>
                    Rs. {((selectedRepair.repairFee || 0) + (selectedRepair.partsUsed?.reduce((sum, p) => sum + (p.cost * p.qty), 0) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Payment Method</label>
                <select
                  value={checkoutForm.paymentMethod}
                  onChange={(e) => setCheckoutForm({...checkoutForm, paymentMethod: e.target.value})}
                  className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-navy uppercase mb-1">Debit Cash Drawer / Bank Account</label>
                <select
                  required
                  value={checkoutForm.accountId}
                  onChange={(e) => setCheckoutForm({...checkoutForm, accountId: e.target.value})}
                  className="w-full p-3 rounded-xl border border-card-border focus:ring-2 focus:ring-primary-blue focus:outline-none text-sm bg-white"
                >
                  <option value="">-- Select Cash/Bank Account --</option>
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type}) - Balance: Rs. {acc.balance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-card-border text-sm font-semibold hover:bg-gray-50 text-muted-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
                >
                  Deliver & Print Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete ? `Repair Job #${itemToDelete.jobNo} (${itemToDelete.deviceModel})` : ''}
      />
    </DashboardLayout>
  );
};

export default ManagerRepairs;
