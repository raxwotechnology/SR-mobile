import { useState, useEffect, useMemo } from 'react';
import { Download, FileText, FileSpreadsheet, Filter, Store as StoreIcon, Clock, CheckCircle, X, Plus, Edit2, Trash2, ShieldAlert, AlertCircle } from 'lucide-react';

import DashboardLayout from '../../components/DashboardLayout';
import {
  getAttendanceReport, getEmployees, getStores, adminMarkAttendance,
  getLeavePolicies, createLeavePolicy, updateLeavePolicy, deleteLeavePolicy,
  getAttendancePolicies, createAttendancePolicy, updateAttendancePolicy, deleteAttendancePolicy,
  assignPoliciesToEmployee, assignPoliciesToAllEmployees
} from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-toastify';
import { adminNavGroups as navItems } from './adminNavItems';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const now = new Date();

const AdminAttendance = () => {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('All');
  
  const [showAttModal, setShowAttModal] = useState(false);
  const [attForm, setAttForm] = useState({ employeeId: '', date: new Date().toISOString().split('T')[0], checkInTime: '09:00', checkOutTime: '17:00', status: 'present', notes: '' });

  // Policy Management States
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'attendance-policies' | 'assign-policies'
  const [attendancePolicies, setAttendancePolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // Attendance Policy Modal State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingAttendancePolicyId, setEditingAttendancePolicyId] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    name: '',
    shiftStartTime: '09:00',
    shiftEndTime: '17:00',
    graceTimeMinutes: 15,
    lateArrivalPenalty: 0,
    earlyCheckoutPenalty: 0,
    halfDayThresholdHours: 4,
    isDefault: false
  });

  // Assign Policy Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignConfirm, setShowBulkAssignConfirm] = useState(false);

  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    employeeName: '',
    attendancePolicyId: ''
  });

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null); // { id, name }

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (selectedStore !== 'All') params.storeId = selectedStore;
      
      const [attRes, empRes, storeRes] = await Promise.all([
        getAttendanceReport(params),
        getEmployees(),
        getStores(),
      ]);
      setRecords(attRes.data);
      setEmployees(empRes.data);
      setStores(storeRes.data || []);
    } catch (err) { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  const fetchPolicies = async () => {
    setPoliciesLoading(true);
    try {
      const attRes = await getAttendancePolicies();
      setAttendancePolicies(attRes.data || []);
    } catch (err) {
      toast.error('Failed to load HR policies');
    } finally {
      setPoliciesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year, selectedStore]);

  useEffect(() => {
    if (activeTab !== 'records') {
      fetchPolicies();
    }
  }, [activeTab]);

  const handleMarkAtt = async () => {
    if (!attForm.employeeId) return toast.error('Select employee');
    try {
      const dateStr = attForm.date;
      await adminMarkAttendance({
        employeeId: attForm.employeeId,
        date: dateStr,
        checkInTime: `${dateStr}T${attForm.checkInTime}:00`,
        checkOutTime: `${dateStr}T${attForm.checkOutTime}:00`,
        status: attForm.status,
        notes: attForm.notes,
      });
      toast.success('Attendance marked');
      setShowAttModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // Attendance Policy Operations
  const handleSaveAttendancePolicy = async (e) => {
    e.preventDefault();
    if (!attendanceForm.name) return toast.error('Policy name is required');
    try {
      if (editingAttendancePolicyId) {
        await updateAttendancePolicy(editingAttendancePolicyId, attendanceForm);
        toast.success('Attendance policy updated');
      } else {
        await createAttendancePolicy(attendanceForm);
        toast.success('Attendance policy created');
      }
      setShowAttendanceModal(false);
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance policy');
    }
  };

  const openEditAttendance = (policy) => {
    setEditingAttendancePolicyId(policy._id);
    setAttendanceForm({
      name: policy.name,
      shiftStartTime: policy.shiftStartTime,
      shiftEndTime: policy.shiftEndTime,
      graceTimeMinutes: policy.graceTimeMinutes,
      lateArrivalPenalty: policy.lateArrivalPenalty,
      earlyCheckoutPenalty: policy.earlyCheckoutPenalty,
      halfDayThresholdHours: policy.halfDayThresholdHours,
      isDefault: !!policy.isDefault
    });
    setShowAttendanceModal(true);
  };

  const openCreateAttendance = () => {
    setEditingAttendancePolicyId(null);
    setAttendanceForm({
      name: '',
      shiftStartTime: '09:00',
      shiftEndTime: '17:00',
      graceTimeMinutes: 15,
      lateArrivalPenalty: 0,
      earlyCheckoutPenalty: 0,
      halfDayThresholdHours: 4,
      isDefault: false
    });
    setShowAttendanceModal(true);
  };

  // Deletion logic
  const handlePolicyDeleteClick = (policy) => {
    setPolicyToDelete({ id: policy._id, name: policy.name });
    setDeleteModalOpen(true);
  };

  const handlePolicyDeleteConfirm = async () => {
    if (!policyToDelete) return;
    try {
      await deleteAttendancePolicy(policyToDelete.id);
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
        attendancePolicyId: employee.employeeInfo?.attendancePolicyId?._id || employee.employeeInfo?.attendancePolicyId || ''
      });
    } else {
      setAssignForm({
        employeeId: 'all',
        employeeName: 'All Employees',
        attendancePolicyId: ''
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
          attendancePolicyId: assignForm.attendancePolicyId || null
        });
        toast.success('Attendance policy assigned to all employees successfully');
        setShowBulkAssignConfirm(false);

      } else {
        await assignPoliciesToEmployee({
          employeeId: assignForm.employeeId,
          attendancePolicyId: assignForm.attendancePolicyId || null
        });
        toast.success('Attendance policy assigned successfully');
      }
      setShowAssignModal(false);
      // Refresh employees list
      const empRes = await getEmployees();
      setEmployees(empRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign policies');
    }
  };

  const departments = useMemo(() => {
    const deps = new Set(employees.map(e => e.employeeInfo?.department).filter(Boolean));
    return ['All', ...Array.from(deps)];
  }, [employees]);

  const roles = useMemo(() => {
    const rs = new Set(employees.map(e => e.role).filter(Boolean));
    return ['All', ...Array.from(rs)];
  }, [employees]);

  // Group by employee
  const summaryData = useMemo(() => {
    const byEmployee = {};
    
    employees.forEach(e => {
      byEmployee[e._id] = {
        name: e.name,
        role: e.role || '',
        department: e.employeeInfo?.department || '',
        present: 0, absent: 0, leave: 0, late: 0, totalHours: 0, overtime: 0
      };
    });

    records.forEach(r => {
      const id = r.employeeId?._id || r.employeeId;
      if (!byEmployee[id]) {
        byEmployee[id] = { name: r.employeeId?.name || 'Unknown', role: r.employeeId?.role || '', department: '', present: 0, absent: 0, leave: 0, late: 0, totalHours: 0, overtime: 0 };
      }
      if (r.status === 'present') { byEmployee[id].present++; byEmployee[id].totalHours += r.hoursWorked || 0; byEmployee[id].overtime += r.overtime || 0; }
      else if (r.status === 'leave') byEmployee[id].leave++;
      else if (r.status === 'absent') byEmployee[id].absent++;
      if (r.checkIn) { const h = new Date(r.checkIn).getHours(); if (h >= 9) byEmployee[id].late++; }
    });

    return Object.entries(byEmployee)
      .map(([id, d]) => ({ ...d, id }))
      .filter(e => (selectedRole === 'All' || e.role === selectedRole) && (selectedDepartment === 'All' || e.department === selectedDepartment))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records, employees, selectedRole, selectedDepartment]);

  // Chart data
  const chartData = summaryData.map(e => ({ name: e.name.split(' ')[0], present: e.present, leave: e.leave, absent: e.absent }));

  const exportExcel = () => {
    const rows = summaryData.map(e => ({
      Employee: e.name,
      Role: e.role,
      Department: e.department,
      Present: e.present,
      Leave: e.leave,
      Absent: e.absent,
      Late: e.late,
      'Total Hours': e.totalHours.toFixed(1),
      Overtime: e.overtime.toFixed(1)
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance Report');
    XLSX.writeFile(workbook, `attendance_${month}_${year}.xlsx`);
    toast.success('Excel downloaded');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Attendance Report - ${month}/${year}`, 14, 15);
    const head = [['Employee', 'Role', 'Department', 'Present', 'Leave', 'Absent', 'Late', 'Hours', 'Overtime']];
    const body = summaryData.map(e => [e.name, e.role, e.department, e.present, e.leave, e.absent, e.late, e.totalHours.toFixed(1), e.overtime.toFixed(1)]);
    
    autoTable(doc, {
      head,
      body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    doc.save(`attendance_${month}_${year}.pdf`);
    toast.success('PDF downloaded');
  };

  if (loading) return <DashboardLayout navItems={navItems} title="Admin Dashboard"><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout navItems={navItems} title="Admin Dashboard">
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">📋 HR & Attendance Management</h1>
            <p className="text-muted-text text-sm mt-1">Configure shift times, leaves, and track employee hours</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {activeTab === 'records' && (
              <>
                <button onClick={() => setShowAttModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"><Clock size={16} /> Mark Attendance</button>
                <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"><FileSpreadsheet size={16} /> Excel</button>
                <button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"><FileText size={16} /> PDF</button>
              </>
            )}
            {activeTab === 'attendance-policies' && (
              <button onClick={openCreateAttendance} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"><Plus size={16} /> Create Attendance Policy</button>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-card-border mb-6 gap-6">
          <button
            onClick={() => setActiveTab('records')}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'records' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'
            }`}
          >
            📋 Attendance Records
          </button>
          <button
            onClick={() => setActiveTab('attendance-policies')}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'attendance-policies' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'
            }`}
          >
            ⏱️ Attendance Policies
          </button>
          <button
            onClick={() => setActiveTab('assign-policies')}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'assign-policies' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-muted-text hover:text-dark-navy'
            }`}
          >
            👤 Assign Attendance Policies
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'records' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-2">Month</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue">
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-2">Year</label>
                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-24 border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-2">Department</label>
                <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="w-40 border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue">
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-2 text-primary-blue">Store</label>
                <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="w-40 border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white shadow-sm font-medium">
                  <option value="All">All Stores</option>
                  {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-2">Role</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-40 border border-card-border rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white shadow-sm">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Attendance Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm mb-6">
                <h2 className="font-semibold text-dark-navy mb-4">📊 Attendance Overview</h2>
                <div className="overflow-x-auto overflow-y-hidden w-full custom-scrollbar">
                  <div style={{ minWidth: `${Math.max(chartData.length * 60, 600)}px`, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="present" fill="#10b981" name="Present" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="leave" fill="#f59e0b" name="Leave" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Table */}
            <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-muted-text">Employee</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-text">Role/Dept</th>
                      <th className="text-center px-3 py-3 font-medium text-emerald-600">Present</th>
                      <th className="text-center px-3 py-3 font-medium text-amber-600">Leave</th>
                      <th className="text-center px-3 py-3 font-medium text-red-500">Absent</th>
                      <th className="text-center px-3 py-3 font-medium text-orange-500">Late</th>
                      <th className="text-center px-3 py-3 font-medium text-blue-600">Hours</th>
                      <th className="text-center px-3 py-3 font-medium text-purple-600">Overtime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {summaryData.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-muted-text">No attendance records found</td></tr>
                    ) : summaryData.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-dark-navy">{e.name}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] uppercase font-bold text-gray-500">{e.role}</span>
                            {e.department && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{e.department}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-600">{e.present}</td>
                        <td className="px-3 py-3 text-center font-bold text-amber-600">{e.leave}</td>
                        <td className="px-3 py-3 text-center font-bold text-red-500">{e.absent}</td>
                        <td className="px-3 py-3 text-center font-bold text-orange-500">{e.late}</td>
                        <td className="px-3 py-3 text-center font-bold text-blue-600">{e.totalHours.toFixed(1)}h</td>
                        <td className="px-3 py-3 text-center font-bold text-purple-600">{e.overtime.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}


        {activeTab === 'attendance-policies' && (

          <div className="space-y-6">
            {policiesLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-3 border-primary-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : attendancePolicies.length === 0 ? (
              <div className="bg-white rounded-2xl border border-card-border p-12 text-center text-muted-text">
                No attendance policies found. Click "Create Attendance Policy" to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {attendancePolicies.map(p => (

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
                          <span>⏰ Shift Schedule</span>
                          <span className="font-semibold text-dark-navy">{p.shiftStartTime} - {p.shiftEndTime}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>⏱️ Late Grace Period</span>
                          <span className="font-semibold text-dark-navy">{p.graceTimeMinutes} mins</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>⚠️ Late Check-in Fine</span>
                          <span className="font-semibold text-red-500">Rs. {p.lateArrivalPenalty.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>🚶 Early Checkout Fine</span>
                          <span className="font-semibold text-red-500">Rs. {p.earlyCheckoutPenalty.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1.5">
                          <span>⚖️ Half-Day Threshold</span>
                          <span className="font-semibold text-dark-navy">&lt; {p.halfDayThresholdHours} working hours</span>

                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-gray-50 pt-4 mt-auto">
                      <button onClick={() => openEditAttendance(p)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-gray-200"><Edit2 size={12} /> Edit</button>
                      <button onClick={() => handlePolicyDeleteClick(p, 'attendance')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-red-100"><Trash2 size={12} /> Delete</button>

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
                <p className="text-xs text-muted-text">Assign policies to all employees at once</p>
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
                    <th className="text-left px-6 py-4 font-semibold text-dark-navy">Attendance Policy</th>
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
                      const ap = attendancePolicies.find(p => p._id === (emp.employeeInfo?.attendancePolicyId?._id || emp.employeeInfo?.attendancePolicyId));
                      
                      return (
                        <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-dark-navy">{emp.name}</td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{emp.role}</td>
                          <td className="px-6 py-4">
                            {ap ? (
                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100">
                                {ap.name}
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

      {/* Mark Attendance Modal */}
      {showAttModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-card-border">
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2"><Clock size={20} className="text-blue-600" /> Mark Attendance</h2>
              <button onClick={() => setShowAttModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-text block mb-1">Employee *</label>
                <select value={attForm.employeeId} onChange={(e) => setAttForm({...attForm, employeeId: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm bg-white">
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-text block mb-1">Date</label>
                  <input type="date" value={attForm.date} onChange={(e) => setAttForm({...attForm, date: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-text block mb-1">Status</label>
                  <select value={attForm.status} onChange={(e) => setAttForm({...attForm, status: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm bg-white">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="half-day">Half Day</option>
                    <option value="late">Late</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-text block mb-1">Check In</label>
                  <input type="time" value={attForm.checkInTime} onChange={(e) => setAttForm({...attForm, checkInTime: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-text block mb-1">Check Out</label>
                  <input type="time" value={attForm.checkOutTime} onChange={(e) => setAttForm({...attForm, checkOutTime: e.target.value})}
                    className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-text block mb-1">Notes</label>
                <input value={attForm.notes} onChange={(e) => setAttForm({...attForm, notes: e.target.value})}
                  className="w-full border border-card-border rounded-lg px-3 py-2.5 text-sm" placeholder="Optional notes" />
              </div>
              <button onClick={handleMarkAtt} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold">
                <CheckCircle size={16} className="inline mr-2" />Mark Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Policy Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-card-border bg-slate-50">
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                ⏱️ {editingAttendancePolicyId ? 'Edit Attendance Policy' : 'Create Attendance Policy'}
              </h2>
              <button onClick={() => setShowAttendanceModal(false)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveAttendancePolicy} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-dark-navy block mb-1">Policy Name *</label>
                <input
                  type="text"
                  required
                  value={attendanceForm.name}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, name: e.target.value })}
                  placeholder="e.g., Day Shift (Colombo)"
                  className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Shift Start (HH:MM)</label>
                  <input
                    type="text"
                    required
                    value={attendanceForm.shiftStartTime}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, shiftStartTime: e.target.value })}
                    placeholder="09:00"
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Shift End (HH:MM)</label>
                  <input
                    type="text"
                    required
                    value={attendanceForm.shiftEndTime}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, shiftEndTime: e.target.value })}
                    placeholder="17:00"
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Late Grace (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={attendanceForm.graceTimeMinutes}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, graceTimeMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Half-Day Limit (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    value={attendanceForm.halfDayThresholdHours}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, halfDayThresholdHours: parseInt(e.target.value) || 0 })}
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Late Check-in Fine (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={attendanceForm.lateArrivalPenalty}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, lateArrivalPenalty: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-dark-navy block mb-1">Early Checkout Fine (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={attendanceForm.earlyCheckoutPenalty}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, earlyCheckoutPenalty: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="attendanceDefault"
                  checked={attendanceForm.isDefault}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue"
                />
                <label htmlFor="attendanceDefault" className="text-sm font-semibold text-dark-navy cursor-pointer select-none">
                  Set as system default attendance policy
                </label>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="submit" className="flex-1 bg-primary-blue hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors">
                  {editingAttendancePolicyId ? 'Update Policy' : 'Create Policy'}
                </button>
                <button type="button" onClick={() => setShowAttendanceModal(false)} className="flex-1 border border-card-border hover:bg-gray-50 py-2.5 rounded-xl font-semibold text-muted-text">
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
                👤 Assign Attendance Policy
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
                <label className="text-xs font-bold text-dark-navy block mb-1">Assign Attendance Policy</label>
                <select
                  value={assignForm.attendancePolicyId}
                  onChange={(e) => setAssignForm({ ...assignForm, attendancePolicyId: e.target.value })}
                  className="w-full border border-card-border rounded-xl px-3.5 py-2.5 text-sm bg-white"
                >
                  <option value="">System Default</option>
                  {attendancePolicies.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.shiftStartTime} - {p.shiftEndTime}, grace: {p.graceTimeMinutes}m)
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

export default AdminAttendance;
