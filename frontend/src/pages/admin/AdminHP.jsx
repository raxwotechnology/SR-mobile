import { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  Printer,
  Download,
  Plus,
  Trash2
} from 'lucide-react';
import { getHPRecords, recordHPPayment, deleteHPRecord, getAccounts, getHPById } from '../../services/api';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/DashboardLayout';
import { adminNavGroups as navItems } from './adminNavItems';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const AdminHP = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedHP, setSelectedHP] = useState(null);
  
  // Details Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedHPDetails, setSelectedHPDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'Cash', accountId: '', referenceNo: '', notes: '' });
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetchData();
    fetchAccounts();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await getHPRecords({ 
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined
      });
      setRecords(data);
    } catch (err) {
      toast.error('Failed to load installment records');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data } = await getAccounts();
      setAccounts(data || []);
    } catch (err) { console.error(err); }
  };

  const handleOpenDetails = async (recordId) => {
    try {
      setLoadingDetails(true);
      setShowDetailsModal(true);
      const { data } = await getHPById(recordId);
      setSelectedHPDetails(data);
    } catch (err) {
      toast.error('Failed to load agreement details');
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    try {
      await recordHPPayment(selectedHP._id, payForm);
      toast.success('Payment recorded successfully!');
      setShowPayModal(false);
      fetchData();
      if (showDetailsModal && selectedHPDetails?._id === selectedHP._id) {
        // Refresh details too
        const { data } = await getHPById(selectedHP._id);
        setSelectedHPDetails(data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteClick = (record) => {
    setItemToDelete({ id: record._id, name: `HP Agreement for ${record.customer?.name || 'Customer'}` });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteHPRecord(itemToDelete.id);
      toast.success('Installment agreement deleted successfully');
      fetchData();
      if (showDetailsModal && selectedHPDetails?._id === itemToDelete.id) {
        setShowDetailsModal(false);
      }
    } catch (err) {
      toast.error('Failed to delete installment agreement');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Overdue': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Defaulted': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="Hire Purchase">
      <div className="p-6 max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <Clock className="text-primary-blue" />
              Credit Sales & Installments (HP)
            </h1>
            <p className="text-slate-500 text-sm">Monitor credit customer registry, billing installments, and cash receipts history</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData} 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-card-border rounded-xl text-sm font-medium hover:bg-slate-50 transition-all"
            >
              Refresh List
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Active Credit Sales', value: records.filter(r => r.status === 'Active').length, icon: Clock, color: 'text-primary-blue', bg: 'bg-indigo-50' },
            { label: 'Total Outstanding Balance', value: `Rs. ${records.reduce((s, r) => s + (r.balanceAmount), 0).toLocaleString()}`, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Completed Agreements', value: records.filter(r => r.status === 'Completed').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Overdue Payments', value: records.filter(r => r.status === 'Overdue').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-card-border shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-xl font-bold text-dark-navy mt-0.5">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-3xl border border-card-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-card-border flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-4 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by customer name, phone or NIC..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-card-border rounded-xl text-sm font-medium focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: '1300px' }}>
              <thead>
                <tr className="bg-slate-50/50 border-b border-card-border">
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Sold</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Original Price</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Advance Paid</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Principal Balance</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Interest Added</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Payable</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Installment</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Due</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cashier</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {loading ? (
                  <tr><td colSpan="12" className="py-20 text-center"><span className="pos-spinner-sm" /></td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan="12" className="py-20 text-center text-slate-400 font-medium">No installment plans found</td></tr>
                ) : records.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-xs font-bold text-dark-navy">{record.customer.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{record.customer.phone} | {record.customer.nic}</p>
                        <p className="text-[9px] text-indigo-600 font-bold mt-0.5">Agreement Date: {new Date(record.startDate || record.createdAt).toLocaleDateString()}</p>

                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 max-w-[150px] truncate" title={record.orderId?.items?.map(i => `${i.name} (x${i.quantity})`).join(', ')}>
                      {record.orderId?.items?.map(i => i.name).join(', ') || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">
                      Rs. {record.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-emerald-600">
                      Rs. {record.downPayment.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">
                      Rs. {(record.totalAmount - record.downPayment).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-amber-600">
                      Rs. {(record.interestAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-900">
                      Rs. {record.netTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p className="font-semibold text-dark-navy">Rs. {record.installmentAmount.toLocaleString()}/mo</p>
                      <p className="text-[9px] text-slate-400 font-medium">{record.numberOfInstallments} installments ({record.installmentType})</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {record.nextDueDate ? new Date(record.nextDueDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold text-rose-600 block">Rs. {record.balanceAmount.toLocaleString()}</span>
                      <span className={`inline-block px-2 py-0.5 mt-1 rounded-full text-[9px] font-bold border ${getStatusColor(record.status)}`}>
                        {record.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {record.createdBy?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenDetails(record._id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-dark-navy rounded text-[11px] font-bold transition-all"
                        >
                          Details
                        </button>
                        <button 
                          onClick={() => { setSelectedHP(record); setPayForm({ ...payForm, amount: record.installmentAmount }); setShowPayModal(true); }}
                          disabled={record.status === 'Completed'}
                          className="px-2 py-1 bg-primary-blue text-white rounded text-[11px] font-bold hover:bg-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Pay
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(record)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete Agreement"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details & History Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-navy/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-indigo-50/50">
              <div>
                <h3 className="text-lg font-bold text-dark-navy">Credit Sale Agreement Details</h3>
                {selectedHPDetails && (
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(selectedHPDetails.status)}`}>
                    {selectedHPDetails.status.toUpperCase()}
                  </span>
                )}
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-rose-500 text-sm font-bold">Close</button>
            </div>
            
            {loadingDetails ? (
              <div className="p-20 text-center flex-1 flex items-center justify-center">
                <span className="pos-spinner-sm" />
              </div>
            ) : selectedHPDetails ? (
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* 2-Column Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Customer & Guarantors */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Information</h4>
                      <p className="text-sm font-bold text-dark-navy">{selectedHPDetails.customer.name}</p>
                      <p className="text-xs text-slate-600">Phone: {selectedHPDetails.customer.phone}</p>
                      <p className="text-xs text-slate-600">NIC: {selectedHPDetails.customer.nic}</p>
                      {selectedHPDetails.customer.address && (
                        <p className="text-xs text-slate-500 mt-1">Address: {selectedHPDetails.customer.address}</p>
                      )}
                    </div>

                    {selectedHPDetails.customer.guarantors && selectedHPDetails.customer.guarantors.length > 0 && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guarantor Details</h4>
                        {selectedHPDetails.customer.guarantors.map((g, idx) => (
                          <div key={idx} className="border-t border-slate-200/60 first:border-0 pt-2 first:pt-0 mt-2 first:mt-0">
                            <p className="text-xs font-bold text-dark-navy">{g.name}</p>
                            <p className="text-[10px] text-slate-600">Phone: {g.phone} | NIC: {g.nic}</p>
                            {g.address && <p className="text-[10px] text-slate-500">Address: {g.address}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Financial breakdown */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Products Purchased</h4>
                      {selectedHPDetails.orderId?.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-200/40 last:border-0">
                          <span className="font-semibold text-slate-700">{item.name} (x{item.quantity})</span>
                          <span className="text-slate-500">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      )) || <p className="text-xs text-slate-400 italic">No products listed</p>}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Financial Summary</h4>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Original Product Price:</span>
                        <span className="font-bold text-slate-700">Rs. {selectedHPDetails.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Advance Paid:</span>
                        <span className="font-bold text-emerald-600">Rs. {selectedHPDetails.downPayment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Principal Balance:</span>
                        <span className="font-bold text-slate-700">Rs. {(selectedHPDetails.totalAmount - selectedHPDetails.downPayment).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Interest Added:</span>
                        <span className="font-bold text-amber-600">Rs. {(selectedHPDetails.interestAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="font-bold text-slate-700">Total Payable Amount:</span>
                        <span className="font-extrabold text-slate-900">Rs. {selectedHPDetails.netTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Installment Plan:</span>
                        <span className="font-bold text-slate-700">Rs. {selectedHPDetails.installmentAmount.toLocaleString()}/mo ({selectedHPDetails.numberOfInstallments}x)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Payments Paid:</span>
                        <span className="font-bold text-emerald-600">Rs. {selectedHPDetails.totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="font-bold text-slate-700">Current Outstanding Balance:</span>
                        <span className="font-extrabold text-rose-600">Rs. {selectedHPDetails.balanceAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Agreement Date:</span>
                        <span className="font-semibold text-slate-700">{new Date(selectedHPDetails.startDate || selectedHPDetails.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">

                        <span>Original Cashier:</span>
                        <span>{selectedHPDetails.createdBy?.name || 'System'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom section: Detailed Payment History */}
                <div className="bg-white rounded-2xl border border-card-border overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b border-card-border">
                    <h4 className="text-xs font-bold text-dark-navy uppercase tracking-wider">Installment Payments Ledger</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-card-border text-slate-500 font-bold">
                          <th className="px-4 py-2.5">Receipt No</th>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Amount</th>
                          <th className="px-4 py-2.5">Method</th>
                          <th className="px-4 py-2.5">Bank Account</th>
                          <th className="px-4 py-2.5">Cashier</th>
                          <th className="px-4 py-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(!selectedHPDetails.payments || selectedHPDetails.payments.length === 0) ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-slate-400 italic">No payments received yet</td>
                          </tr>
                        ) : (
                          selectedHPDetails.payments.map((p) => (
                            <tr key={p._id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-bold text-slate-700">{p.receiptNo || 'N/A'}</td>
                              <td className="px-4 py-2.5">{new Date(p.date || p.createdAt).toLocaleString()}</td>
                              <td className="px-4 py-2.5 font-bold text-emerald-600">Rs. {p.amount.toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-slate-600">{p.paymentMethod}</td>
                              <td className="px-4 py-2.5 text-slate-600">{p.accountId?.name || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-slate-600">{p.receivedBy?.name || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-slate-500 italic">{p.notes || p.referenceNo || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedHP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-navy/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-lg font-bold text-dark-navy">Record Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-rose-500 font-bold text-sm">Close</button>
            </div>
            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Customer</p>
                <p className="text-sm font-bold text-dark-navy">{selectedHP.customer.name}</p>
                <p className="text-xs text-slate-400">{selectedHP.customer.phone}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Amount (Rs.) *</label>
                <input required type="number" value={payForm.amount} onChange={(e) => setPayForm({...payForm, amount: e.target.value})}
                  className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue font-bold text-primary-blue" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Method</label>
                  <select value={payForm.paymentMethod} onChange={(e) => setPayForm({...payForm, paymentMethod: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none">
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Account</label>
                  <select required value={payForm.accountId} onChange={(e) => setPayForm({...payForm, accountId: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none">
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Reference / Notes</label>
                <input value={payForm.notes} onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                  placeholder="Additional notes..." className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none" />
              </div>

              <button type="submit" className="w-full bg-primary-blue text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all">
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.name}
      />
    </DashboardLayout>
  );
};

export default AdminHP;
