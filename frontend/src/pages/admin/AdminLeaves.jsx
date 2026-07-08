import { useState, useEffect, useMemo } from 'react';
import { Calendar, Check, X, Clock, FileText, FileSpreadsheet, Plus, Edit2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import {
  getEmployees, getLeavePolicies, createLeavePolicy, updateLeavePolicy, deleteLeavePolicy,
  assignPoliciesToEmployee, assignPoliciesToAllEmployees, adminCreateLeave, approveLeave, rejectLeave, getStoreLeaves, requestLeave
} from '../../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const AdminLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Policy Management Tab States
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'leave-policies' | 'assign-policies'
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // Create/Add Leave Modal State
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', type: 'casual', startDate: '', endDate: '', reason: '', status: 'approved' });

  // Self Request Form State
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });

  // Leave Policy Form/Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editingLeavePolicyId, setEditingLeavePolicyId] = useState(null);
  const [leavePolicyForm, setLeavePolicyForm] = useState({
    name: '',
    annualLeaves: 14,
    sickLeaves: 7,
    casualLeaves: 7,
    deductionPerExcessLeave: 0,
    isDefault: false
  });

  // Assign Policy Form/Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignConfirm, setShowBulkAssignConfirm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    employeeName: '',
    leavePolicyId: ''
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null); // { id, name }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'requests') {
      fetchPolicies();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, empRes] = await Promise.all([
        getStoreLeaves(),
        getEmployees(),
      ]);
      setLeaves(leavesRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    setPoliciesLoading(true);
    try {
      const leaveRes = await getLeavePolicies();
      setLeavePolicies(leaveRes.data || []);
    } catch (err) {
      toast.error('Failed to load leave policies');
    } finally {
      setPoliciesLoading(false);
    }
  };

  const handleAddLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) return toast.error('Fill all fields');
    try {
      await adminCreateLeave(leaveForm);
      toast.success('Leave created');
      setShowAddLeaveModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleApprove = async (id) => {
    try {
      await approveLeave(id);
      toast.success('Leave approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await rejectLeave(id, { reason });
      toast.success('Leave rejected');
      fetchData();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  const handleCreateLeaveRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.startDate || !requestForm.endDate || !requestForm.reason.trim()) {
      toast.error('Please fill all leave request fields');
      return;
    }
    try {
      setRequesting(true);
      await requestLeave({
        type: requestForm.leaveType,
        startDate: requestForm.startDate,
        endDate: requestForm.endDate,
        reason: requestForm.reason.trim(),
      });
      toast.success('Leave request sent');
      setRequestForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setRequesting(false);
    }
  };

  // Leave Policy Operations
  const handleSaveLeavePolicy = async (e) => {
    e.preventDefault();
    if (!leavePolicyForm.name) return toast.error('Policy name is required');
    try {
      if (editingLeavePolicyId) {
        await updateLeavePolicy(editingLeavePolicyId, leavePolicyForm);
        toast.success('Leave policy updated');
      } else {
        await createLeavePolicy(leavePolicyForm);
        toast.success('Leave policy created');
      }
      setShowLeaveModal(false);
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save leave policy');
    }
  };

  const openEditLeave = (policy) => {
    setEditingLeavePolicyId(policy._id);
    setLeavePolicyForm({
      name: policy.name,
      annualLeaves: policy.annualLeaves,
      sickLeaves: policy.sickLeaves,
      casualLeaves: policy.casualLeaves,
      deductionPerExcessLeave: policy.deductionPerExcessLeave,
      isDefault: !!policy.isDefault
    });
    setShowLeaveModal(true);
  };

  const openCreateLeave = () => {
    setEditingLeavePolicyId(null);
    setLeavePolicyForm({
      name: '',
      annualLeaves: 14,
      sickLeaves: 7,
      casualLeaves: 7,
      deductionPerExcessLeave: 0,
      isDefault: false
    });
    setShowLeaveModal(true);
  };

  const handlePolicyDeleteClick = (policy) => {
    setPolicyToDelete({ id: policy._id, name: policy.name });
    setDeleteModalOpen(true);
  };

  const handlePolicyDeleteConfirm = async () => {
    if (!policyToDelete) return;
    try {
      await deleteLeavePolicy(policyToDelete.id);
      toast.success('Policy removed');
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete policy');
    }
  };

  // Policy Assignment logic
  const openAssignModal = (employee = null) => {
    if (employee) {
      setAssignForm({
        employeeId: employee._id,
        employeeName: employee.name,
        leavePolicyId: employee.employeeInfo?.leavePolicyId?._id || employee.employeeInfo?.leavePolicyId || ''
      });
    } else {
      setAssignForm({
        employeeId: 'all',
        employeeName: 'All Employees',
        leavePolicyId: ''
      });
    }
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async (e) => {
    if (e) e.preventDefault();
    if (assignForm.employeeId === 'all' && !showBulkAssignConfirm) {
      setShowBulkAssignConfirm(true);
      return;
    }
    try {
      if (assignForm.employeeId === 'all') {
        await assignPoliciesToAllEmployees({
          leavePolicyId: assignForm.leavePolicyId || null
        });
        toast.success('Leave policy assigned to all employees successfully');
        setShowBulkAssignConfirm(false);
      } else {
        await assignPoliciesToEmployee({
          employeeId: assignForm.employeeId,
          leavePolicyId: assignForm.leavePolicyId || null
        });
        toast.success('Leave policy assigned successfully');
      }
      setShowAssignModal(false);
      // Refresh employees list
      const empRes = await getEmployees();
      setEmployees(empRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign policies');
    }
  };

  const filtered = useMemo(() => {
    return leaves.filter((l) => {
      if (filter !== 'all' && l.status !== filter) return false;
      if (roleFilter !== 'all' && l.employeeId?.role !== roleFilter) return false;
      if (deptFilter !== 'all' && (l.employeeId?.employeeInfo?.department || 'Unassigned') !== deptFilter) return false;
      return true;
    });
  }, [leaves, filter, roleFilter, deptFilter]);

  const departments = useMemo(() => {
    const deps = new Set(leaves.map(l => l.employeeId?.employeeInfo?.department || 'Unassigned').filter(Boolean));
    return ['all', ...Array.from(deps)];
  }, [leaves]);

  const exportExcel = () => {
    const rows = filtered.map(l => ({
      Employee: l.employeeId?.name || 'Unknown',
      Role: l.employeeId?.role || 'N/A',
      Department: l.employeeId?.employeeInfo?.department || 'Unassigned',
      Type: l.leaveType,
      'Start Date': new Date(l.startDate).toLocaleDateString(),
      'End Date': new Date(l.endDate).toLocaleDateString(),
      Days: l.totalDays,
      Status: l.status,
      Reason: l.reason || ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Leaves');
    XLSX.writeFile(workbook, 'leaves_report.xlsx');
    toast.success('Excel exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text('Leave Requests Report', 14, 15);
    autoTable(doc, {
      head: [['Employee', 'Role', 'Department', 'Type', 'Dates', 'Days', 'Status']],
      body: filtered.map(l => [
        l.employeeId?.name || 'Unknown',
        l.employeeId?.role || 'N/A',
        l.employeeId?.employeeInfo?.department || 'Unassigned',
        l.leaveType,
        `${new Date(l.startDate).toLocaleDateString()} - ${new Date(l.endDate).toLocaleDateString()}`,
        l.totalDays,
        l.status
      ]),
      startY: 20
    });
    doc.save('leaves_report.pdf');
    toast.success('PDF exported');
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Admin Panel">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="Admin Panel">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy mb-2">🌴 Leave Management & Policies</h1>
            <p className="text-muted-text text-sm">Configure leaf policies and track employee leave requests</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {activeTab === 'requests' && (
              <>
                <button onClick={() => setShowAddLeaveModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  <Calendar size={16} /> Add Leave
                </button>
                <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  <FileSpreadsheet size={16} /> Export Excel
                </button>
                <button onClick={exportPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  <FileText size={16} /> Export PDF
                </button>
              </>
            )}
            {activeTab === 'leave-policies' && (
              <button onClick={openCreateLeave} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                <Plus size={16} /> Create Leave Policy
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-card-border mb-6 gap-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'requests' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'
            }`}
          >
            📋 Leave Requests
          </button>
          <button
            onClick={() => setActiveTab('leave-policies')}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'leave-policies' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'
            }`}
          >
            🌴 Leave Policies
          </button>
          <button
            onClick={() => setActiveTab('assign-policies')}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'assign-policies' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'
            }`}
          >
            👤 Assign Leave Policies
          </button>
        </div>

        {activeTab === 'requests' && (
          <>
            {/* Request My Leave form */}
            <form onSubmit={handleCreateLeaveRequest} className="bg-white rounded-2xl border border-card-border p-4 shadow-sm mb-6">
              <h2 className="text-sm font-semibold text-dark-navy mb-3">Request My Leave</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={requestForm.leaveType}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, leaveType: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-card-border text-sm"
                >
                  {['annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={requestForm.startDate}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-card-border text-sm"
                />
                <input
                  type="date"
                  value={requestForm.endDate}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-card-border text-sm"
                />
                <button
                  type="submit"
                  disabled={requesting}
                  className="px-4 py-2.5 rounded-xl bg-primary-blue text-white text-sm font-semibold disabled:opacity-60"
                >
                  {requesting ? 'Submitting...' : 'Submit Leave'}
                </button>
              </div>
              <textarea
                value={requestForm.reason}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={2}
                placeholder="Reason"
                className="mt-3 w-full px-3 py-2.5 rounded-xl border border-card-border text-sm"
              />
            </form>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-amber-600">{leaves.filter(l => l.status === 'pending').length}</p>
                <p className="text-xs text-muted-text">Pending</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-emerald-600">{leaves.filter(l => l.status === 'approved').length}</p>
                <p className="text-xs text-muted-text">Approved</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-red-500">{leaves.filter(l => l.status === 'rejected').length}</p>
                <p className="text-xs text-muted-text">Rejected</p>
              </div>
              <div className="bg-white rounded-2xl border border-card-border p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-dark-navy">{leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.totalDays || 0), 0)}</p>
                <p className="text-xs text-muted-text">Total Days Used</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'approved', 'rejected'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                      filter === s ? 'bg-primary-blue text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({s === 'all' ? leaves.length : leaves.filter(l => l.status === s).length})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-card-border rounded-xl text-sm outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="cashier">Cashier</option>
                  <option value="deliveryGuy">Delivery</option>
                  <option value="stockEmployee">Stock</option>
                  <option value="manager">Manager</option>
                </select>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-card-border rounded-xl text-sm outline-none"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-card-border p-12 text-center text-muted-text">
                <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No leave requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((leave) => (
                  <div key={leave._id} className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {leave.employeeId?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-dark-navy text-sm">{leave.employeeId?.name}</h3>
                          <p className="text-xs text-muted-text">{leave.employeeId?.role} • {leave.leaveType} leave</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[leave.status]}`}>
                          {leave.status}
                        </span>
                        {leave.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(leave._id)} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleReject(leave._id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-text">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</span>
                    </div>
                    {leave.reason && <p className="text-xs text-muted-text mt-2 bg-gray-50 rounded-lg p-2">{leave.reason}</p>}
                    {leave.rejectionReason && <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg p-2">Rejected: {leave.rejectionReason}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'leave-policies' && (
          <div className="space-y-6">
            {policiesLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-3 border-primary-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leavePolicies.length === 0 ? (
              <div className="bg-white rounded-2xl border border-card-border p-12 text-center text-muted-text">
                No leave policies found. Click "Create Leave Policy" to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {leavePolicies.map(p => (
                  <div key={p._id} className="bg-white rounded-2xl border border-card-border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                    {p.isDefault && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                        Default
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-dark-navy text-lg mb-4 pr-16">{p.name}</h3>
                      <div className="space-y-2.5 text-sm text-gray-600 mb-6">
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>🌴 Annual Leaves</span>
                          <span className="font-semibold text-dark-navy">{p.annualLeaves} days</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>🤒 Sick Leaves</span>
                          <span className="font-semibold text-dark-navy">{p.sickLeaves} days</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>🏖️ Casual Leaves</span>
                          <span className="font-semibold text-dark-navy">{p.casualLeaves} days</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>💸 Excess Leave Penalty</span>
                          <span className="font-semibold text-red-500">Rs. {p.deductionPerExcessLeave.toLocaleString()} / day</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-gray-50 pt-4 mt-auto">
                      <button onClick={() => openEditLeave(p)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-gray-200"><Edit2 size={12} /> Edit</button>
                      <button onClick={() => handlePolicyDeleteClick(p)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-red-100"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assign-policies' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-5 rounded-2xl border border-card-border shadow-sm gap-4">
              <div>
                <h3 className="font-bold text-dark-navy">Bulk Policy Assignment</h3>
                <p className="text-xs text-muted-text">Assign leave policies to all employees at once</p>
              </div>
              <button
                onClick={() => openAssignModal(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Bulk Assign to All
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-card-border">
                      <th className="text-left px-6 py-4 font-semibold text-dark-navy">Employee</th>
                      <th className="text-left px-6 py-4 font-semibold text-dark-navy">Role</th>
                      <th className="text-left px-6 py-4 font-semibold text-dark-navy">Leave Policy</th>
                      <th className="text-center px-6 py-4 font-semibold text-dark-navy">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {employees.filter(e => e.role !== 'customer').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-muted-text">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      employees.filter(e => e.role !== 'customer').map(emp => {
                        const lp = leavePolicies.find(p => p._id === (emp.employeeInfo?.leavePolicyId?._id || emp.employeeInfo?.leavePolicyId));
                        
                        return (
                          <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-dark-navy">{emp.name}</td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{emp.role}</td>
                            <td className="px-6 py-4">
                              {lp ? (
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                                  {lp.name}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-text bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                  System Default
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => openAssignModal(emp)}
                                className="text-xs font-semibold bg-primary-blue hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
                              >
                                Assign Policy
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
      </div>

      {/* Add Leave Record Modal */}
      {showAddLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-card-border">
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2"><Calendar size={20} className="text-amber-500" /> Create Leave</h2>
              <button onClick={() => setShowAddLeaveModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-text block mb-1">Employee *</label>
                <select value={leaveForm.employeeId} onChange={(e) => setLeaveForm({...leaveForm, employeeId: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm bg-white">
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-text block mb-1">Leave Type</label>
                  <select value={leaveForm.type} onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm bg-white">
                    <option value="casual">Casual</option>
                    <option value="sick">Sick</option>
                    <option value="annual">Annual</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-text block mb-1">Status</label>
                  <select value={leaveForm.status} onChange={(e) => setLeaveForm({...leaveForm, status: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm bg-white">
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-text block mb-1">Start Date *</label>
                  <input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-text block mb-1">End Date *</label>
                  <input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-text block mb-1">Reason</label>
                <input value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm" placeholder="Reason for leave" />
              </div>
              <button onClick={handleAddLeave} className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-semibold">
                Create Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Policy Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-card-border bg-slate-50">
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                🌴 {editingLeavePolicyId ? 'Edit Leave Policy' : 'Create Leave Policy'}
              </h2>
              <button onClick={() => setShowLeaveModal(false)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLeavePolicy} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-dark-navy block mb-1">Policy Name *</label>
                <input
                  type="text"
                  required
                  value={leavePolicyForm.name}
                  onChange={(e) => setLeavePolicyForm({ ...leavePolicyForm, name: e.target.value })}
                  placeholder="e.g., Executive Leave Policy"
                  className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Annual (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={leavePolicyForm.annualLeaves}
                    onChange={(e) => setLeavePolicyForm({ ...leavePolicyForm, annualLeaves: parseInt(e.target.value) || 0 })}
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Sick (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={leavePolicyForm.sickLeaves}
                    onChange={(e) => setLeavePolicyForm({ ...leavePolicyForm, sickLeaves: parseInt(e.target.value) || 0 })}
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Casual (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={leavePolicyForm.casualLeaves}
                    onChange={(e) => setLeavePolicyForm({ ...leavePolicyForm, casualLeaves: parseInt(e.target.value) || 0 })}
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-dark-navy block mb-1">Deduction Per Excess Leave (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={leavePolicyForm.deductionPerExcessLeave}
                  onChange={(e) => setLeavePolicyForm({ ...leavePolicyForm, deductionPerExcessLeave: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 1000"
                  className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="leaveDefault"
                  checked={leavePolicyForm.isDefault}
                  onChange={(e) => setLeavePolicyForm({ ...leavePolicyForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue"
                />
                <label htmlFor="leaveDefault" className="text-sm font-semibold text-dark-navy cursor-pointer select-none">
                  Set as system default leave policy
                </label>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="submit" className="flex-1 bg-primary-blue hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors">
                  {editingLeavePolicyId ? 'Update Policy' : 'Create Policy'}
                </button>
                <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 border border-card-border hover:bg-gray-50 py-2.5 rounded-xl font-semibold text-muted-text">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Policies Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-card-border bg-slate-50">
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-1.5">
                👤 Assign Leave Policy
              </h2>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveAssignment} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-text uppercase block mb-1">Employee</label>
                <p className="font-bold text-dark-navy text-base">{assignForm.employeeName}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-dark-navy block mb-1">Assign Leave Policy</label>
                <select
                  value={assignForm.leavePolicyId}
                  onChange={(e) => setAssignForm({ ...assignForm, leavePolicyId: e.target.value })}
                  className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm bg-white"
                >
                  <option value="">System Default</option>
                  {leavePolicies.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Annual: {p.annualLeaves}d, Sick: {p.sickLeaves}d, Casual: {p.casualLeaves}d)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="submit" className="flex-1 bg-primary-blue hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors">
                  Save Changes
                </button>
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 border border-card-border hover:bg-gray-50 py-2.5 rounded-xl font-semibold text-muted-text">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPolicyToDelete(null); }}
        onConfirm={handlePolicyDeleteConfirm}
        itemName={policyToDelete?.name}
      />

      {/* Bulk Assign Confirmation Modal */}
      {showBulkAssignConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 transform transition-all duration-300 scale-100 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Bulk Policy Assignment</h3>
                <p className="text-xs text-slate-500 font-medium">Please confirm this action</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 font-medium mb-6">
              Are you sure you want to assign this policy to <span className="font-bold text-slate-800">ALL employees</span>? This will overwrite their current individual policies.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowBulkAssignConfirm(false)} 
                className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleSaveAssignment()} 
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-200 transition-all text-sm"
              >
                Yes, Overwrite & Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminLeaves;
