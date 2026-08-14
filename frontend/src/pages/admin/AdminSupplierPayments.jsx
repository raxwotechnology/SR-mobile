import { useState, useEffect, useCallback } from 'react';
import { Wallet, Search, ArrowLeft, TrendingUp, DollarSign, Download, X, FileText, FileSpreadsheet, Edit2, Trash2, CheckCircle, Clock, RefreshCw, Plus, Building2 } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { adminNavGroups as navItems } from './adminNavItems';
import { managerNavGroups } from '../storeOwner/managerNavItems';
import {
  getSupplierPaymentSummary, getSupplierLedger, recordSupplierPayment,
  recordSupplierPurchase, updateSupplierTransaction, deleteSupplierTransaction,
  updateSupplierChequeStatus
} from '../../services/api';
import useAuthStore from '../../store/authStore';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminSupplierPayments = () => {
  const { user } = useAuthStore();
  const currentNavItems = user?.role === 'manager' ? managerNavGroups : navItems;

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payDescription, setPayDescription] = useState('');
  const [chequeDetails, setChequeDetails] = useState({ chequeNumber: '', bankName: '', chequeDate: '', accountNumber: '' });
  const [paying, setPaying] = useState(false);
  const [supplierToPay, setSupplierToPay] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ totalCost: '', amountPaid: '', description: '' });
  const [editTx, setEditTx] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', description: '', date: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await getSupplierPaymentSummary();
      setSuppliers(res.data || []);
    } catch (err) {
      toast.error('Failed to load supplier payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchSummary(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSummary]);

  useEffect(() => {
    const timer = setInterval(() => fetchSummary(true), 30000);
    return () => clearInterval(timer);
  }, [fetchSummary]);

  const openLedger = async (supplier) => {
    setSelectedSupplier(supplier);
    setLedgerLoading(true);
    try {
      const res = await getSupplierLedger(supplier._id);
      setLedger(res.data);
    } catch (err) {
      toast.error('Failed to load ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handlePayment = async () => {
    const targetSupplier = supplierToPay || selectedSupplier;
    if (!targetSupplier) return;
    if (!payAmount || Number(payAmount) <= 0) return toast.error('Enter valid amount');
    if (payMethod === 'cheque' && (!chequeDetails.chequeNumber || !chequeDetails.bankName || !chequeDetails.chequeDate)) {
      return toast.error('Please fill in all required cheque details');
    }
    setPaying(true);
    try {
      await recordSupplierPayment(targetSupplier._id, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        description: payDescription || undefined,
        ...(payMethod === 'cheque' ? chequeDetails : {})
      });
      toast.success('Payment recorded successfully');
      setShowPayModal(false);
      setPayAmount('');
      setPayDescription('');
      setChequeDetails({ chequeNumber: '', bankName: '', chequeDate: '', accountNumber: '' });
      setSupplierToPay(null);
      if (selectedSupplier) {
        openLedger(selectedSupplier);
      }
      fetchSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handlePurchase = async () => {
    if (!purchaseForm.totalCost || Number(purchaseForm.totalCost) <= 0) return toast.error('Enter total cost');
    setPaying(true);
    try {
      await recordSupplierPurchase(selectedSupplier._id, {
        totalCost: Number(purchaseForm.totalCost),
        amountPaid: Number(purchaseForm.amountPaid || 0),
        description: purchaseForm.description || undefined,
      });
      const paid = Number(purchaseForm.amountPaid || 0);
      const due = Number(purchaseForm.totalCost) - paid;
      toast.success(`Purchase recorded! ${due > 0 ? `Balance added: LKR ${due.toLocaleString()}` : 'Fully paid'}`);
      setShowPurchaseModal(false);
      setPurchaseForm({ totalCost: '', amountPaid: '', description: '' });
      openLedger(selectedSupplier);
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase');
    } finally {
      setPaying(false);
    }
  };

  const handleEditTxSubmit = async (e) => {
    e.preventDefault();
    if (!editTx) return;
    try {
      await updateSupplierTransaction(editTx._id, {
        amount: Number(editForm.amount),
        description: editForm.description,
        date: editForm.date,
      });
      toast.success('Transaction updated');
      setEditTx(null);
      if (selectedSupplier) openLedger(selectedSupplier);
      fetchSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDeleteTx = async () => {
    if (!itemToDelete) return;
    try {
      await deleteSupplierTransaction(itemToDelete._id);
      toast.success('Transaction deleted');
      setDeleteModalOpen(false);
      setItemToDelete(null);
      if (selectedSupplier) openLedger(selectedSupplier);
      fetchSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleChequeStatusChange = async (txId, newStatus) => {
    try {
      await updateSupplierChequeStatus(txId, { chequeStatus: newStatus });
      toast.success(`Cheque status updated to ${newStatus}`);
      if (selectedSupplier) openLedger(selectedSupplier);
      fetchSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cheque status');
    }
  };

  const exportCSV = () => {
    if (!ledger?.transactions?.length) return;
    const rows = [['Date', 'Type', 'Description', 'Amount', 'Balance']];
    ledger.transactions.forEach((t) => {
      rows.push([
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.description || '',
        t.amount.toFixed(2),
        t.runningBalance.toFixed(2),
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier_ledger_${selectedSupplier?.name || 'export'}.csv`;
    a.click();
  };

  const exportAllPaymentsExcel = () => {
    if (!filtered.length) return toast.info('No supplier data to export');
    const data = filtered.map((s) => ({
      'Supplier Name': s.name,
      Contact: s.phone || s.email || '—',
      'Total Purchased (LKR)': s.totalPurchased || 0,
      'Total Paid (LKR)': s.totalPaid || 0,
      'Balance Due (LKR)': s.balanceDue || 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Supplier Payments');
    XLSX.writeFile(workbook, `Supplier_Payments_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportAllPaymentsPDF = () => {
    if (!filtered.length) return toast.info('No supplier data to export');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Supplier Payments Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const head = [['Supplier Name', 'Contact', 'Total Purchased', 'Total Paid', 'Balance Due']];
    const body = filtered.map((s) => [
      s.name,
      s.phone || s.email || '—',
      `LKR ${(s.totalPurchased || 0).toLocaleString()}`,
      `LKR ${(s.totalPaid || 0).toLocaleString()}`,
      `LKR ${(s.balanceDue || 0).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 28,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`Supplier_Payments_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filtered = suppliers.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchased = suppliers.reduce((sum, s) => sum + (s.totalPurchased || 0), 0);
  const totalPaid = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
  const totalDue = suppliers.reduce((sum, s) => sum + (s.balanceDue || 0), 0);

  // Ledger View
  if (selectedSupplier) {
    return (
      <DashboardLayout navItems={currentNavItems} title={user?.role === 'manager' ? "Manager Dashboard" : "Admin Panel"}>
        <div className="space-y-6 animate-fade-in">
          <button
            onClick={() => { setSelectedSupplier(null); setLedger(null); }}
            className="flex items-center gap-2 text-primary-blue hover:text-blue-700 font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={18} /> Back to Supplier List
          </button>

          {/* Supplier Header Card */}
          <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-primary-blue font-bold text-xl flex items-center justify-center border border-indigo-100">
                  {selectedSupplier.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-navy">{selectedSupplier.name}</h2>
                  <p className="text-xs text-muted-text flex items-center gap-2 mt-0.5">
                    <span>📞 {selectedSupplier.phone || 'No phone'}</span>
                    {selectedSupplier.email && <span>✉️ {selectedSupplier.email}</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm flex items-center gap-1.5"
                >
                  <Plus size={16} /> Record Purchase
                </button>
                <button
                  onClick={() => setShowPayModal(true)}
                  className="bg-primary-blue hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm text-sm flex items-center gap-1.5"
                >
                  <DollarSign size={16} /> Record Payment
                </button>
                <button
                  onClick={exportCSV}
                  className="border border-card-border hover:bg-gray-50 text-dark-navy font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-1.5"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-card-border">
              <div className="bg-gray-50 rounded-xl p-4 border border-card-border">
                <p className="text-xs text-muted-text font-medium uppercase tracking-wider">Total Purchased</p>
                <p className="text-xl font-bold text-dark-navy mt-1">LKR {(ledger?.totalPurchased || 0).toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Total Paid</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">LKR {(ledger?.totalPaid || 0).toLocaleString()}</p>
              </div>
              <div className={`rounded-xl p-4 border ${ledger?.balanceDue > 0 ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${ledger?.balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Balance Due</p>
                <p className={`text-xl font-bold mt-1 ${ledger?.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  LKR {(ledger?.balanceDue || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <h3 className="font-bold text-dark-navy text-base">Transaction Ledger History</h3>
              {ledgerLoading && <span className="text-xs text-muted-text animate-pulse">Loading ledger...</span>}
            </div>

            {ledgerLoading ? (
              <div className="p-12 text-center text-muted-text">Loading transaction records...</div>
            ) : !ledger?.transactions?.length ? (
              <div className="p-12 text-center text-muted-text">No transaction history found for this supplier</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-card-border text-left text-xs font-semibold text-muted-text uppercase tracking-wider">
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Type</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5 text-right">Amount (LKR)</th>
                      <th className="px-6 py-3.5 text-right">Balance Due</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {ledger.transactions.map((t) => {
                      const isPurchase = t.type === 'purchase';
                      return (
                        <tr key={t._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-dark-navy">
                            {new Date(t.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${isPurchase ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {t.type}
                            </span>
                            {t.paymentMethod === 'cheque' && (
                              <span className="ml-2 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                Cheque #{t.chequeNumber || ''} ({t.chequeStatus || 'pending'})
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-text">
                            {t.description || (isPurchase ? 'Stock Purchase' : 'Supplier Payment')}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold text-xs ${isPurchase ? 'text-dark-navy' : 'text-emerald-600'}`}>
                            {isPurchase ? '+' : '-'} LKR {t.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-xs text-slate-700">
                            LKR {t.runningBalance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditTx(t);
                                  setEditForm({
                                    amount: t.amount,
                                    description: t.description || '',
                                    date: new Date(t.date).toISOString().split('T')[0],
                                  });
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-text hover:text-primary-blue transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete(t);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-text hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Edit Transaction Modal */}
        {editTx && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-card-border">
              <div className="flex items-center justify-between mb-4 border-b border-card-border pb-3">
                <h3 className="text-lg font-bold text-dark-navy">Edit Transaction</h3>
                <button onClick={() => setEditTx(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleEditTxSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Amount (LKR)</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditTx(null)} className="px-4 py-2 text-sm text-muted-text hover:bg-gray-100 rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm bg-primary-blue text-white font-semibold rounded-xl hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteTx}
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction? Ledger balances will be recalculated automatically."
        />
      </DashboardLayout>
    );
  }

  // Summary View
  return (
    <DashboardLayout navItems={currentNavItems} title={user?.role === 'manager' ? "Manager Dashboard" : "Admin Panel"}>
      <div className="space-y-6 animate-fade-in">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy flex items-center gap-2">
              <Wallet className="text-primary-blue" /> Supplier Payments
            </h1>
            <p className="text-muted-text text-sm mt-0.5">Track supplier balances, purchases, and payment transactions</p>
          </div>
          <button
            onClick={() => fetchSummary(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-card-border hover:bg-gray-50 text-dark-navy font-semibold text-sm rounded-xl transition-colors shadow-sm self-start sm:self-auto disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-primary-blue flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <span className="text-xs font-semibold text-muted-text uppercase tracking-wider">Total Purchased</span>
            </div>
            <p className="text-2xl font-bold text-dark-navy">LKR {totalPurchased.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">LKR {totalPaid.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${totalDue > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <Wallet size={18} />
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${totalDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Total Due</span>
            </div>
            <p className={`text-2xl font-bold ${totalDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              LKR {totalDue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers by name, phone, or email..."
              className="w-full border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={exportAllPaymentsExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button
              onClick={exportAllPaymentsPDF}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <FileText size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-text text-sm">Loading suppliers...</div>
          ) : !filtered.length ? (
            <div className="p-12 text-center text-muted-text text-sm">No suppliers found matching criteria</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-card-border text-left text-xs font-semibold text-muted-text uppercase tracking-wider">
                    <th className="px-6 py-3.5">Supplier</th>
                    <th className="px-6 py-3.5">Contact</th>
                    <th className="px-6 py-3.5 text-right">Total Purchased</th>
                    <th className="px-6 py-3.5 text-right">Total Paid</th>
                    <th className="px-6 py-3.5 text-right">Balance Due</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filtered.map((s) => {
                    const hasDue = (s.balanceDue || 0) > 0;
                    return (
                      <tr
                        key={s._id}
                        onClick={() => openLedger(s)}
                        className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary-blue font-bold text-sm flex items-center justify-center border border-blue-100 uppercase">
                              {s.name?.substring(0, 2)}
                            </div>
                            <span className="font-semibold text-dark-navy text-sm">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-text">{s.phone || s.email || '—'}</td>
                        <td className="px-6 py-4 text-right font-bold text-dark-navy">LKR {(s.totalPurchased || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">LKR {(s.totalPaid || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${hasDue ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                            LKR {(s.balanceDue || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSupplierToPay(s);
                              setShowPayModal(true);
                            }}
                            className="bg-primary-blue hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Record Payment Modal */}
        {showPayModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-card-border animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between mb-4 border-b border-card-border pb-3">
                <h3 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                  <DollarSign size={20} className="text-primary-blue" /> Record Payment
                </h3>
                <button
                  onClick={() => { setShowPayModal(false); setSupplierToPay(null); }}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-muted-text mb-4">
                Payment to <strong className="text-dark-navy">{(supplierToPay || selectedSupplier)?.name}</strong> · Balance: <strong className="text-red-600">LKR {((supplierToPay || ledger)?.balanceDue || 0).toLocaleString()}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Amount (LKR) *</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-base font-bold text-dark-navy focus:outline-none focus:ring-2 focus:ring-primary-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cash', 'bank_transfer', 'cheque'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMethod(m)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all capitalize ${payMethod === m ? 'bg-primary-blue text-white border-primary-blue shadow-sm' : 'bg-white text-dark-navy border-card-border hover:bg-gray-50'}`}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {payMethod === 'cheque' && (
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3.5 space-y-3">
                    <p className="text-xs font-bold text-purple-800">Cheque Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-purple-700 uppercase mb-0.5">Cheque No. *</label>
                        <input
                          type="text"
                          value={chequeDetails.chequeNumber}
                          onChange={(e) => setChequeDetails({ ...chequeDetails, chequeNumber: e.target.value })}
                          placeholder="000123"
                          className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-purple-700 uppercase mb-0.5">Bank Name *</label>
                        <input
                          type="text"
                          value={chequeDetails.bankName}
                          onChange={(e) => setChequeDetails({ ...chequeDetails, bankName: e.target.value })}
                          placeholder="Commercial Bank"
                          className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-purple-700 uppercase mb-0.5">Cheque Date *</label>
                        <input
                          type="date"
                          value={chequeDetails.chequeDate}
                          onChange={(e) => setChequeDetails({ ...chequeDetails, chequeDate: e.target.value })}
                          className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-purple-700 uppercase mb-0.5">Account No.</label>
                        <input
                          type="text"
                          value={chequeDetails.accountNumber}
                          onChange={(e) => setChequeDetails({ ...chequeDetails, accountNumber: e.target.value })}
                          placeholder="Optional"
                          className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-text uppercase mb-1">Notes / Reference</label>
                  <input
                    type="text"
                    value={payDescription}
                    onChange={(e) => setPayDescription(e.target.value)}
                    placeholder="Optional payment reference..."
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowPayModal(false); setSupplierToPay(null); }}
                    className="px-4 py-2 text-sm text-muted-text hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={paying}
                    className="px-5 py-2 text-sm bg-primary-blue hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {paying ? 'Processing...' : `Pay LKR ${Number(payAmount || 0).toLocaleString()}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminSupplierPayments;
