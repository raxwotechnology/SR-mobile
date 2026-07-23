import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Wallet, CreditCard, Landmark, ArrowUpRight, ArrowDownLeft, History, MoreVertical, TrendingUp, DollarSign } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
<<<<<<< HEAD
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
=======
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
import { getAccounts, createAccount, updateAccount, deleteAccount, getAccountTransactions, getStores } from '../../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import useAdminStoreStore from '../../store/adminStoreStore';

const emptyForm = {
  name: '', type: 'Cash', accountNumber: '', bankName: '', balance: 0, isDefault: false, storeId: ''
};

const AdminAccounts = () => {
  const { selectedStoreId } = useAdminStoreStore();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewingTransactions, setViewingTransactions] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transLoading, setTransLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);


  const fetchData = async () => {
    try {
      setLoading(true);
      const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      const [accRes, storesRes] = await Promise.all([
        getAccounts({ storeId: storeParam }),
        getStores()
      ]);
      setAccounts(accRes.data || []);
      setStores(storesRes.data.stores || storesRes.data || []);


    } catch (err) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedStoreId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, storeId: selectedStoreId !== 'all' ? selectedStoreId : '' });
    setShowModal(true);
  };

  const openEdit = (account) => {
    setEditingId(account._id);
    setForm({
      name: account.name || '',
      type: account.type || 'Cash',
      accountNumber: account.accountNumber || '',
      bankName: account.bankName || '',
      balance: account.balance || 0,
      isDefault: !!account.isDefault,
      storeId: account.storeId?._id || account.storeId || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.storeId) {
      toast.error('Store is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateAccount(editingId, form);
        toast.success('Account updated');
      } else {
        await createAccount(form);
        toast.success('Account created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save account');
    } finally {
      setSaving(false);
    }
  };

<<<<<<< HEAD
  const handleDeleteClick = (account) => {
    setItemToDelete(account);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteAccount(itemToDelete._id);
=======
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this account?')) return;
    try {
      await deleteAccount(id);
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
      toast.success('Account deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete account');
    }
  };

  const fetchTransactions = async (account) => {
    setViewingTransactions(account);
    setTransLoading(true);
    try {
      const { data } = await getAccountTransactions(account._id);
      setTransactions(data || []);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setTransLoading(false);
    }
  };

  const exportExcel = (account) => {
    const rows = transactions.map(t => ({
      Date: new Date(t.date || t.createdAt).toLocaleDateString(),
      Reference: t.referenceNo || '—',
      Category: t.category,
      Description: t.description,
      Type: t.type.toUpperCase(),
      Amount: t.amount
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Ledger Transactions');
    XLSX.writeFile(workbook, `account_${account.name.replace(/\s+/g, '_')}_ledger.xlsx`);
    toast.success('Excel downloaded');
  };

  const exportPDF = (account) => {
    const doc = new jsPDF();
    doc.text(`Ledger Transactions - ${account.name} (${account.type})`, 14, 15);
    const head = [['Date', 'Reference', 'Category', 'Description', 'Type', 'Amount']];
    const body = transactions.map(t => [
      new Date(t.date || t.createdAt).toLocaleDateString(),
      t.referenceNo || '—',
      t.category,
      t.description,
      t.type.toUpperCase(),
      `Rs. ${Number(t.amount).toLocaleString()}`
    ]);
    
    autoTable(doc, {
      head,
      body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    doc.save(`account_${account.name.replace(/\s+/g, '_')}_ledger.pdf`);
    toast.success('PDF downloaded');
  };

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Accounts Management">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Accounts Management">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <Landmark className="text-primary-blue" /> Bank Financial Accounts
            </h1>
            <p className="text-muted-text text-sm mt-1">Manage cash drawers, bank accounts and mobile wallets</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary-blue text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all">
            <Plus size={18} /> New Account
          </button>
        </div>

        {/* Total Liquidity Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-[2rem] p-8 text-white shadow-2xl mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-medium mb-2">Total Combined Balance</p>
            <h2 className="text-5xl font-bold mb-6">Rs. {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            <div className="flex gap-8">
              <div>
                <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-wider mb-1">Cash on Hand</p>
                <p className="text-lg font-bold">Rs. {accounts.filter(a => a.type === 'Cash').reduce((s, a) => s + a.balance, 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-wider mb-1">Bank Balance</p>
                <p className="text-lg font-bold">Rs. {accounts.filter(a => a.type === 'Bank').reduce((s, a) => s + a.balance, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div key={account._id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  account.type === 'Cash' ? 'bg-emerald-50 text-emerald-600' :
                  account.type === 'Bank' ? 'bg-blue-50 text-blue-600' :
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {account.type === 'Cash' ? <Wallet size={24} /> : <Landmark size={24} />}
                </div>
                <div className="flex gap-1">
                   <button onClick={() => fetchTransactions(account)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-primary-blue hover:bg-indigo-50 transition-all" title="Ledger Transactions"><History size={16} /></button>
                   <button onClick={() => openEdit(account)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-primary-blue hover:bg-indigo-50 transition-all" title="Edit Account"><Edit2 size={16} /></button>
<<<<<<< HEAD
                   <button onClick={() => handleDeleteClick(account)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-600 hover:bg-red-50 transition-all" title="Delete Account"><Trash2 size={16} /></button>
=======
                   <button onClick={() => handleDelete(account._id)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-600 hover:bg-red-50 transition-all" title="Delete Account"><Trash2 size={16} /></button>
>>>>>>> 6e38bb6df289ec2e0085cc7a6d886a1f493448a9
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-dark-navy text-lg">{account.name}</h3>
                  {account.isDefault && <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">DEFAULT</span>}
                </div>
                <p className="text-xs text-muted-text mb-4 uppercase tracking-wide font-bold">{account.type} • {account.bankName || 'Direct'}</p>
                
                <div className="text-2xl font-bold text-dark-navy mb-1">
                  Rs. {Number(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-gray-400 font-mono">{account.accountNumber || 'No Acc. Number'}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-xs font-bold uppercase">
                 <span className={`px-3 py-1 rounded-full ${account.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                   {account.status}
                 </span>
                 <button onClick={() => fetchTransactions(account)} className="text-primary-blue hover:underline flex items-center gap-1">
                   View Ledger <ArrowUpRight size={14} />
                 </button>
              </div>
            </div>
          ))}

          {/* Add New Empty State */}
          <div onClick={openCreate} className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary-blue hover:text-primary-blue cursor-pointer transition-all h-[260px]">
            <Plus size={40} className="mb-4" />
            <p className="font-bold">Add New Account</p>
          </div>
        </div>

        {/* Modal: Create/Edit Account */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-dark-navy">{editingId ? 'Edit Account' : 'Create Account'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"><X size={22} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Account Label / Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Commercial Bank - Main" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Account Type *</label>
                    <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm">
                      <option value="Cash">Cash Drawer</option>
                      <option value="Bank">Bank Account</option>
                      <option value="Mobile Wallet">Mobile Wallet</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bank Name (Optional)</label>
                    <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Sampath Bank" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Account Number</label>
                    <input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" placeholder="XXXX-XXXX-XXXX" />
                  </div>
                  {!editingId && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Initial Balance (Rs.)</label>
                      <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-indigo-600" />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Store Assignment *</label>
                    <select 
                      required 
                      disabled={selectedStoreId !== 'all'}
                      value={form.storeId} 
                      onChange={(e) => setForm({ ...form, storeId: e.target.value })} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm disabled:opacity-50"
                    >
                      <option value="">Select Store</option>
                      {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="w-4 h-4 rounded text-primary-blue" />
                      <span className="text-sm font-bold text-dark-navy">Set as Default Account</span>
                    </label>
                  </div>


                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={saving} className="flex-1 bg-primary-blue text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                    {saving ? 'Saving...' : editingId ? 'Update Account' : 'Create Account'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-8 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Account Transactions (Ledger) */}
        {viewingTransactions && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setViewingTransactions(null)}>
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div>
                  <h2 className="text-lg font-bold text-dark-navy">{viewingTransactions.name}</h2>
                  <p className="text-xs text-muted-text uppercase font-bold tracking-widest">{viewingTransactions.type} Ledger</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportExcel(viewingTransactions)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm">Export Excel</button>
                  <button onClick={() => exportPDF(viewingTransactions)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm">Export PDF</button>
                  <button onClick={() => setViewingTransactions(null)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all ml-1"><X size={20} /></button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1">
                {transLoading ? (
                   <div className="flex items-center justify-center py-20">
                     <div className="w-8 h-8 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
                   </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100">
                        <th className="pb-3 font-bold uppercase text-[10px]">Date</th>
                        <th className="pb-3 font-bold uppercase text-[10px]">Reference</th>
                        <th className="pb-3 font-bold uppercase text-[10px]">Description</th>
                        <th className="pb-3 font-bold uppercase text-[10px]">Type</th>
                        <th className="pb-3 font-bold uppercase text-[10px] text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.map((t) => (
                        <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 text-xs text-muted-text">{new Date(t.date || t.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 font-mono text-[10px] font-bold text-primary-blue">{t.referenceNo || '—'}</td>
                          <td className="py-4">
                             <div className="text-xs font-bold text-dark-navy">{t.category}</div>
                             <div className="text-[10px] text-muted-text">{t.description}</div>
                          </td>
                          <td className="py-4">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                               t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                             }`}>
                               {t.type.toUpperCase()}
                             </span>
                          </td>
                          <td className={`py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'} Rs. {Number(t.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic">No transactions found for this account.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                 <div className="text-xs font-bold text-muted-text">Current Live Balance</div>
                 <div className="text-xl font-bold text-dark-navy">Rs. {Number(viewingTransactions.balance).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.name || 'this account'}
      />
    </DashboardLayout>
  );
};

export default AdminAccounts;
