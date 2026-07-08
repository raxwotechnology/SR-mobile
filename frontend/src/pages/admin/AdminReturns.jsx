import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminNavGroups as navItems } from './adminNavItems';
import { toast } from 'react-toastify';
import { approveCustomerReturn, deleteCustomerReturn, exportCustomerReturnsReport, getCustomerReturns, rejectCustomerReturn } from '../../services/api';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const statusColors = {
  requested: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const AdminReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Custom Modal States
  const [activeReturn, setActiveReturn] = useState(null);
  const [modalType, setModalType] = useState(''); // 'approve' or 'reject'
  const [resolution, setResolution] = useState('exchange');
  const [rejectReason, setRejectReason] = useState('Rejected by admin');
  const [submitting, setSubmitting] = useState(false);

  // Delete States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const { data } = await getCustomerReturns({});
      setReturns(data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? returns : returns.filter((r) => r.status === filter)),
    [returns, filter]
  );

  const openApproveModal = (ret) => {
    setActiveReturn(ret);
    setModalType('approve');
    setResolution('exchange');
  };

  const openRejectModal = (ret) => {
    setActiveReturn(ret);
    setModalType('reject');
    setRejectReason('Rejected by admin');
  };

  const submitApprove = async () => {
    if (!activeReturn) return;
    setSubmitting(true);
    try {
      await approveCustomerReturn(activeReturn._id, { resolution, markResolved: true });
      toast.success('Return approved by admin');
      setActiveReturn(null);
      setModalType('');
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve return');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!activeReturn) return;
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await rejectCustomerReturn(activeReturn._id, { reason: rejectReason.trim() });
      toast.success('Return rejected by admin');
      setActiveReturn(null);
      setModalType('');
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject return');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (ret) => {
    setReturnToDelete(ret);
    setShowDeleteConfirm(true);
  };

  const submitDelete = async () => {
    if (!returnToDelete) return;
    setSubmitting(true);
    try {
      await deleteCustomerReturn(returnToDelete._id);
      toast.success('Return request deleted');
      setReturnToDelete(null);
      setShowDeleteConfirm(false);
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete return request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportCustomerReturnsReport({ startDate, endDate, status: filter !== 'all' ? filter : undefined });
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customer-returns-report.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Return report exported');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export return report');
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">Returns</h1>
            <p className="text-muted-text text-sm mt-1">Pending / Approved / Rejected return requests</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-card-border rounded-lg px-2 py-1 text-xs" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-card-border rounded-lg px-2 py-1 text-xs" />
            <button onClick={handleExport} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">Export PDF</button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all', 'requested', 'approved', 'rejected', 'on_hold', 'resolved'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                filter === s ? 'bg-primary-blue text-white' : 'bg-white border border-card-border text-muted-text hover:bg-gray-50'
              }`}
            >
              {s.replaceAll('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-muted-text">RMA</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Order</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Order Details</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Return Reason</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-text">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filtered.map((r) => (
                    <tr key={r._id}>
                      <td className="px-6 py-3.5 font-medium text-dark-navy">{r.holdBillNo}</td>
                      <td className="px-6 py-3.5 text-muted-text">#{String(r.orderId?._id || r.orderId).slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-3.5 text-muted-text">{r.customerId?.name || '—'}</td>
                      <td className="px-6 py-3.5 text-muted-text">
                        {(r.items || []).map((it) => `${it.orderItemName} x${it.qty}`).join(', ') || '—'}
                      </td>
                      <td className="px-6 py-3.5 text-muted-text">
                        {(r.items || []).map((it) => it.reason).filter(Boolean).join(', ') || r.notes || '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {['requested', 'approved', 'on_hold'].includes(r.status) && (
                            <>
                              <button
                                type="button"
                                onClick={() => openApproveModal(r)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openRejectModal(r)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => openDeleteModal(r)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-muted-text">No returns found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Approve Resolution Modal */}
      {modalType === 'approve' && activeReturn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                ✓
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Approve Return Request</h3>
              <p className="text-sm text-slate-500">
                Resolution for <span className="font-semibold text-slate-800">{activeReturn.holdBillNo}</span> ({activeReturn.customerId?.name || 'Customer'})
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Resolution Method
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800 transition-all"
                >
                  <option value="exchange">Exchange Product (Default)</option>
                  <option value="store_credit">Store Credit</option>
                  <option value="upgrade">Upgrade Product</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => { setActiveReturn(null); setModalType(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submitApprove}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {submitting ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {modalType === 'reject' && activeReturn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                ✕
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Reject Return Request</h3>
              <p className="text-sm text-slate-500">
                Reason for rejecting <span className="font-semibold text-slate-800">{activeReturn.holdBillNo}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Rejection Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a clear reason..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => { setActiveReturn(null); setModalType(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submitReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {submitting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setReturnToDelete(null); }}
        onConfirm={submitDelete}
        itemName={returnToDelete?.holdBillNo}
      />
    </DashboardLayout>
  );
};

export default AdminReturns;

