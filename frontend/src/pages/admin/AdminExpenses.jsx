import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Search, FileDown, Upload, Paperclip } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, uploadDocument, getFinancialDashboard, getStores, getAccounts } from '../../services/api';

import { toast } from 'react-toastify';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const EXPENSE_CATEGORIES = ['Employee Payments', 'Utilities', 'Water Bill', 'Electricity', 'Overtime', 'Rent', 'Salaries', 'Marketing', 'Transport', 'Supplies', 'Maintenance', 'Insurance', 'Internet & Phone', 'Equipment', 'Packaging', 'Cleaning', 'Security', 'Miscellaneous', 'Other'];
const INCOME_CATEGORIES = ['Sales', 'Interest', 'Rent Income', 'Commission', 'Refund', 'Insurance Claim', 'Asset Sale', 'Sponsorship', 'Other Income', 'Other'];

const emptyForm = { 
  type: 'expense', 
  category: 'Utilities', 
  amount: '', 
  date: new Date().toISOString().split('T')[0], 
  paymentMethod: 'Cash',
  accountId: '',
  chequeDetails: { number: '', bank: '', dueDate: '' },
  referenceNo: '',
  description: '',
  attachments: [] 
};


const AdminExpenses = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expense');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stores, setStores] = useState([]);
  const [accounts, setAccounts] = useState([]);

  
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const { selectedStoreId } = useAdminStoreStore();

  const fetchData = async () => {
    try {
      const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      const [txRes, sumRes, storesRes, accountsRes] = await Promise.all([
        getTransactions({ storeId: storeParam }),
        getFinancialDashboard({ period: 'monthly', storeId: storeParam }),
        getStores(),
        getAccounts({ storeId: storeParam })
      ]);

      setTransactions(txRes.data);
      setSummary(sumRes.data);
      setStores(storesRes.data.stores || storesRes.data);
      setAccounts(accountsRes.data || []);

    } catch (err) {
      toast.error('Failed to load ledger records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedStoreId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, type: activeTab, category: activeTab === 'expense' ? 'Utilities' : 'Sales', storeId: selectedStoreId !== 'all' ? selectedStoreId : '' });
    setShowModal(true);
  };

  const openEdit = (tx) => {
    setEditingId(tx._id);
    setForm({ 
      type: tx.type, 
      category: tx.category, 
      amount: tx.amount, 
      date: tx.date?.split('T')[0] || '', 
      paymentMethod: tx.paymentMethod || 'Cash',
      accountId: tx.accountId?._id || tx.accountId || '',
      chequeDetails: tx.chequeDetails || { number: '', bank: '', dueDate: '' },
      referenceNo: tx.referenceNo || '',
      description: tx.description || '',
      attachments: tx.attachments || [],
      storeId: tx.storeId?._id || tx.storeId || ''
    });

    setShowModal(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      const res = await uploadDocument(fd);
      setForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, { name: file.name, url: res.data.url }]
      }));
      toast.success('File attached');
    } catch (err) {
      toast.error('File upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editingId) {
        await updateTransaction(editingId, payload);
        toast.success('Transaction updated');
      } else {
        await createTransaction(payload);
        toast.success('Transaction added');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteClick = (tx) => {
    setItemToDelete({ id: tx._id, name: tx.description || tx.category });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteTransaction(itemToDelete.id);
      toast.success('Record deleted');
      fetchData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const filtered = transactions.filter(t => {
    if (t.type !== activeTab) return false;
    const matchSearch = t.description?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || t.category === catFilter;
    return matchSearch && matchCat;
  });

  const exportColumns = [
    { label: 'Category', accessor: 'category' },
    { label: 'Description', accessor: 'description' },
    { label: 'Amount (Rs.)', accessor: (r) => r.amount?.toFixed(2) },
    { label: 'Payment Method', accessor: 'paymentMethod' },
    { label: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
  ];

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Financial Ledger">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Financial Ledger">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">💰 Ledger Management</h1>
            <p className="text-muted-text text-sm mt-1">{transactions.length} total transactions tracked</p>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                <FileDown size={16} /> Export ▾
              </button>
              <div className="hidden group-hover:block absolute right-0 mt-1 bg-white rounded-xl shadow-xl border border-card-border z-20 min-w-[140px]">
                <button onClick={() => exportToCSV(filtered, exportColumns, activeTab)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-t-xl">📄 CSV</button>
                <button onClick={() => exportToExcel(filtered, exportColumns, activeTab)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">📊 Excel</button>
                <button onClick={() => exportToPDF(filtered, exportColumns, `${activeTab}_report`)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-b-xl">📋 PDF</button>
              </div>
            </div>
            <button onClick={openCreate} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all text-sm">
              <Plus size={18} /> Add {activeTab === 'expense' ? 'Expense' : 'Income'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setCatFilter('all'); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${
                activeTab === t ? 'bg-primary-blue text-white' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
              }`}
            >
              {t}s
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <p className="text-xs text-muted-text">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">Rs. {summary.totalIncome?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <p className="text-xs text-muted-text">Total Expenses</p>
              <p className="text-2xl font-bold text-red-500 mt-1">Rs. {summary.totalExpense?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <p className="text-xs text-muted-text">Net Balance</p>
              <p className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-dark-navy' : 'text-red-600'}`}>Rs. {summary.balance?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
              <p className="text-xs text-muted-text">Total Transactions</p>
              <p className="text-2xl font-bold text-dark-navy mt-1">{summary.transactionCount}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder={`Search ${activeTab}s...`} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="border border-card-border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white">
            <option value="all">All Categories</option>
            {(activeTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-card-border">
                  <th className="text-left px-6 py-4 font-semibold text-dark-navy">Category</th>
                  <th className="text-left px-6 py-4 font-semibold text-dark-navy">Description</th>
                  <th className="text-left px-6 py-4 font-semibold text-dark-navy">Amount</th>
                  <th className="text-left px-6 py-4 font-semibold text-dark-navy">Payment Method</th>
                  <th className="text-left px-6 py-4 font-semibold text-dark-navy">Date</th>
                  <th className="text-center px-6 py-4 font-semibold text-dark-navy">Docs</th>
                  <th className="text-right px-6 py-4 font-semibold text-dark-navy">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filtered.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${activeTab === 'expense' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-dark-navy">{tx.description || 'N/A'}</p>
                      {tx.referenceNo && <p className="text-xs text-muted-text mt-0.5">Ref: {tx.referenceNo}</p>}
                    </td>
                    <td className={`px-6 py-4 font-bold ${activeTab === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {activeTab === 'expense' ? '-' : '+'} Rs. {tx.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-muted-text">{tx.paymentMethod}</td>
                    <td className="px-6 py-4 text-muted-text">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                      {tx.attachments?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          <Paperclip size={12} /> {tx.attachments.length}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(tx)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteClick(tx)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-text text-sm font-medium">No {activeTab}s found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-card-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-dark-navy">{editingId ? `Edit ${activeTab}` : `Add New ${activeTab}`}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-dark-navy mb-1.5">Store Context</label>
                <select value={form.storeId} onChange={(e) => setForm({...form, storeId: e.target.value})}
                  className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50 font-medium">
                  <option value="">Global / All Stores</option>
                  {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-dark-navy mb-1.5">Category *</label>
                  <select required value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50 font-medium text-dark-navy">
                    {(activeTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-dark-navy mb-1.5">Amount (Rs.) *</label>
                  <input type="number" required min="0" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})}
                    placeholder="0.00" className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-dark-navy mb-1.5">Date *</label>
                  <input type="date" required value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50 font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-dark-navy mb-1.5">Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({...form, paymentMethod: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50 font-medium">
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-dark-navy mb-1.5">Debit/Credit Account *</label>
                  <select required value={form.accountId} onChange={(e) => setForm({...form, accountId: e.target.value})}
                    className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-indigo-50 font-bold text-primary-blue">
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a._id} value={a._id}>{a.name} (Rs. {a.balance?.toLocaleString()})</option>)}
                  </select>
                </div>
                {form.paymentMethod === 'Cheque' && (
                  <div>
                    <label className="block text-sm font-bold text-dark-navy mb-1.5">Cheque Due Date</label>
                    <input type="date" value={form.chequeDetails.dueDate?.split('T')[0] || ''} 
                      onChange={(e) => setForm({...form, chequeDetails: { ...form.chequeDetails, dueDate: e.target.value }})}
                      className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50 font-medium" />
                  </div>
                )}
              </div>

              {form.paymentMethod === 'Cheque' && (
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-dark-navy mb-1.5">Cheque Number</label>
                    <input value={form.chequeDetails.number} onChange={(e) => setForm({...form, chequeDetails: { ...form.chequeDetails, number: e.target.value }})}
                      placeholder="XXXXXX" className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-dark-navy mb-1.5">Bank</label>
                    <input value={form.chequeDetails.bank} onChange={(e) => setForm({...form, chequeDetails: { ...form.chequeDetails, bank: e.target.value }})}
                      placeholder="e.g. BOC" className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50" />
                  </div>
                </div>
              )}


              <div>
                <label className="block text-sm font-bold text-dark-navy mb-1.5">Description</label>
                <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder={`What was this ${activeTab} for?`} className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-dark-navy mb-1.5">Reference Number</label>
                <input value={form.referenceNo} onChange={(e) => setForm({...form, referenceNo: e.target.value})}
                  placeholder="Receipt No, Cheque No, etc." className="w-full border border-card-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-slate-50" />
              </div>

              {/* Attachments Section */}
              <div className="bg-slate-50 border border-card-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-dark-navy">Attachments (Bills/Receipts)</label>
                  <label className="cursor-pointer bg-white border border-card-border text-xs font-bold text-dark-navy px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2">
                    {uploading ? <div className="w-3 h-3 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"/> : <Upload size={14}/>}
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.png,.jpg,.jpeg" />
                  </label>
                </div>
                {form.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {form.attachments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-card-border p-2.5 rounded-lg">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-2">
                          <Paperclip size={14} /> {doc.name || 'Attachment'}
                        </a>
                        <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-text italic">No attachments yet. Upload bills or receipts to keep a record.</p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-card-border">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all text-sm">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 bg-primary-blue text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-200">
                  {saving ? 'Saving...' : editingId ? 'Update Record' : `Save ${activeTab}`}
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
        itemName={itemToDelete?.name}
      />
    </DashboardLayout>
  );
};

export default AdminExpenses;
