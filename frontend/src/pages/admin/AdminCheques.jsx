import { useState, useEffect } from 'react';
import { Landmark, Search, Calendar, Filter, CheckCircle2, XCircle, Clock, AlertCircle, FileText, Building, Trash2, X, Plus } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
<<<<<<< HEAD
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
=======
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
import { getCheques, updateChequeStatus, deleteTransaction, getStores, getAccounts, createTransaction } from '../../services/api';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';

const AdminCheques = () => {
  const { selectedStoreId } = useAdminStoreStore();
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });

  // Manual Cheque States
  const [showModal, setShowModal] = useState(false);
<<<<<<< HEAD
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
=======
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
  const [stores, setStores] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    number: '',
    bank: '',
    dueDate: '',
    amount: '',
    type: 'income',
    storeId: '',
    accountId: '',
    description: ''
  });

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStoreId !== 'all') params.storeId = selectedStoreId;
      if (filter.status) params.status = filter.status;
      
      const { data } = await getCheques(params);
      setCheques(data || []);
    } catch (err) {
      toast.error('Failed to load cheques');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliary = async () => {
    try {
      const [storesRes, accountsRes] = await Promise.all([
        getStores(),
        getAccounts()
      ]);
      setStores(storesRes.data.stores || storesRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (err) {
      console.error('Failed to load auxiliary data for cheques modal');
    }
  };

  useEffect(() => {
    fetchCheques();
  }, [selectedStoreId, filter.status]);

  useEffect(() => {
    fetchAuxiliary();
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateChequeStatus(id, { status: newStatus });
      toast.success(`Cheque marked as ${newStatus}`);
      fetchCheques();
    } catch (err) {
      toast.error('Failed to update cheque status');
    }
  };

<<<<<<< HEAD
  const handleDeleteClick = (cheque) => {
    setItemToDelete(cheque);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteTransaction(itemToDelete._id);
=======
  const handleDeleteCheque = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this cheque record? This will also remove the linked financial transaction.')) return;
    try {
      await deleteTransaction(id);
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
      toast.success('Cheque deleted successfully');
      fetchCheques();
    } catch (err) {
      toast.error('Failed to delete cheque');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.number || !form.bank || !form.dueDate || !form.amount || !form.storeId) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await createTransaction({
        storeId: form.storeId,
        accountId: form.accountId || undefined,
        type: form.type,
        category: form.type === 'income' ? 'Cheque Received' : 'Cheque Issued',
        amount: Number(form.amount),
        paymentMethod: 'cheque',
        referenceNo: `CHQ-${form.number}`,
        description: form.description || `Cheque #${form.number} from ${form.bank}`,
        chequeDetails: {
          number: form.number,
          bank: form.bank,
          dueDate: form.dueDate,
          status: 'Pending'
        }
      });
      toast.success('Cheque recorded successfully!');
      setShowModal(false);
      setForm({
        number: '',
        bank: '',
        dueDate: '',
        amount: '',
        type: 'income',
        storeId: selectedStoreId !== 'all' ? selectedStoreId : '',
        accountId: '',
        description: ''
      });
      fetchCheques();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record cheque');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Cleared': return 'bg-green-100 text-green-700 border-green-200';
      case 'Bounced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const filteredCheques = cheques.filter(c => 
    c.chequeDetails.number?.toLowerCase().includes(filter.search.toLowerCase()) ||
    c.chequeDetails.bank?.toLowerCase().includes(filter.search.toLowerCase()) ||
    c.description?.toLowerCase().includes(filter.search.toLowerCase())
  );

  return (
    <DashboardLayout navItems={navItems} title="Cheque Management">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <Landmark className="text-primary-blue" /> Cheque Registry
            </h1>
            <p className="text-muted-text text-sm mt-1">Monitor and manage all customer and supplier cheques</p>
          </div>
          <button onClick={() => {
            setForm({ ...form, storeId: selectedStoreId !== 'all' ? selectedStoreId : '' });
            setShowModal(true);
          }} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-md">
            <Plus size={16} /> Record Cheque
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by cheque number, bank, or note..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              className="bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-primary-blue transition-all"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Cleared">Cleared</option>
              <option value="Bounced">Bounced</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase">Cheque Details</th>
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase">Due Date</th>
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase">Store</th>
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase text-right">Amount</th>
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                    <th className="p-5 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCheques.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-gray-400 italic">No cheques found matching your criteria.</td>
                    </tr>
                  ) : (
                    filteredCheques.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-primary-blue">
                              <FileText size={20} />
                            </div>
                            <div>
                              <div className="font-bold text-dark-navy">#{c.chequeDetails.number || 'N/A'}</div>
                              <div className="text-xs text-muted-text flex items-center gap-1">
                                <Building size={12} /> {c.chequeDetails.bank || 'Unknown Bank'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-sm text-dark-navy">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            {c.chequeDetails.dueDate ? new Date(c.chequeDetails.dueDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="p-5 text-sm text-muted-text">
                          {c.storeId?.name || 'All Stores'}
                        </td>
                        <td className="p-5 text-right font-bold text-dark-navy">
                          Rs. {c.amount.toLocaleString()}
                        </td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(c.chequeDetails.status)}`}>
                            {c.chequeDetails.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
<<<<<<< HEAD
                              onClick={() => handleDeleteClick(c)}
=======
                              onClick={() => handleDeleteCheque(c._id)}
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
                              className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Delete Cheque Record"
                            >
                              <Trash2 size={18} />
                            </button>
                            {c.chequeDetails.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(c._id, 'Cleared')}
                                  className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all"
                                  title="Mark as Cleared"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(c._id, 'Bounced')}
                                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                                  title="Mark as Bounced"
                                >
                                  <AlertCircle size={18} />
                                </button>
                              </>
                            )}
                            {c.chequeDetails.status !== 'Pending' && (
                              <button
                                onClick={() => handleStatusUpdate(c._id, 'Pending')}
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-all"
                                title="Reset to Pending"
                              >
                                <Clock size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Record Cheque Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-xl font-bold text-dark-navy flex items-center gap-2">
                  <Landmark className="text-primary-blue" size={22} /> Record Cheque Payment
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cheque Type *</label>
                    <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm bg-white">
                      <option value="income">Received (Customer Cheque)</option>
                      <option value="expense">Issued (Supplier/Expense Cheque)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cheque Number *</label>
                    <input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. 102938" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bank Name *</label>
                    <input required value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. BOC, Sampath Bank" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Due Date *</label>
                    <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Amount (Rs.) *</label>
                    <input type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-indigo-600" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Associated Store *</label>
                    <select required value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm bg-white">
                      <option value="">Select Branch...</option>
                      {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Target Bank Account (Optional)</label>
                    <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm bg-white">
                      <option value="">Select Account...</option>
                      {accounts.filter(a => a.type === 'Bank').map(a => <option key={a._id} value={a._id}>{a.name} ({a.bankName})</option>)}
                    </select>
                    <p className="text-[10px] text-muted-text mt-1">Select the bank account where this cheque will be deposited once cleared.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description / Notes</label>
                    <textarea rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm resize-none" placeholder="Details about customer, invoice or supplier..." />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button type="submit" disabled={saving} className="flex-1 bg-primary-blue text-white py-3.5 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-indigo-100">
                    {saving ? 'Saving...' : 'Record Cheque'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-8 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.chequeDetails?.number ? `cheque #${itemToDelete.chequeDetails.number}` : 'this cheque'}
      />
    </DashboardLayout>
  );
};

export default AdminCheques;
