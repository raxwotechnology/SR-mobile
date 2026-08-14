import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, ArrowRight, Search, Plus, User, Edit3, X, Users, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { getEmployeeNavGroups } from './employeeNav';
import { getEmployees, adminMarkAttendance, getAttendanceReport } from '../../services/api';
import API from '../../services/api';
import { toast } from 'react-toastify';

const statusColors = {
  present: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  absent: 'bg-red-100 text-red-700 border border-red-200',
  leave: 'bg-amber-100 text-amber-700 border border-amber-200',
  late: 'bg-orange-100 text-orange-700 border border-orange-200',
};

const EmployeeAttendance = () => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [todayReport, setTodayReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [todayRecord, setTodayRecord] = useState(null);

  // Staff search & filters
  const [searchStaff, setSearchStaff] = useState('');
  const [staffFilter, setStaffFilter] = useState('all'); // 'all', 'checkedIn', 'checkedOut', 'notCheckedIn'

  // Mark Modal
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [attForm, setAttForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '08:30',
    checkOutTime: '17:00',
    status: 'present',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAttendance = async () => {
    try {
      const now = new Date();
      const curMonth = month || (now.getMonth() + 1);
      const curYear = year || now.getFullYear();

      const [myAttRes, empRes, reportRes] = await Promise.all([
        API.get('/hr/attendance', { params: { month: curMonth, year: curYear } }),
        getEmployees(),
        getAttendanceReport({ month: now.getMonth() + 1, year: now.getFullYear() })
      ]);

      setRecords(myAttRes.data || []);
      const todayStr = new Date().toDateString();
      setTodayRecord((myAttRes.data || []).find(a => new Date(a.date).toDateString() === todayStr) || null);

      setEmployees(empRes.data || []);
      setTodayReport(reportRes.data || []);
    } catch (err) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [month, year]);

  // Self Check-In / Check-Out
  const handleCheckIn = async () => {
    try {
      await API.post('/hr/attendance/check-in');
      toast.success('Checked in! ⏰');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await API.post('/hr/attendance/check-out');
      toast.success('Checked out! 👋');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    }
  };

  // Quick Clock In for an employee
  const handleQuickClockIn = async (emp) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
      
      await adminMarkAttendance({
        employeeId: emp._id,
        date: dateStr,
        checkInTime: `${dateStr}T${timeStr}`,
        status: 'present',
        notes: `Clocked in by ${user?.name || 'Staff'}`
      });

      toast.success(`Clocked in ${emp.name} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ⏰`);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock-in failed');
    }
  };

  // Quick Clock Out for an employee
  const handleQuickClockOut = async (emp, existingCheckIn) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      let ciISO = existingCheckIn ? new Date(existingCheckIn).toISOString() : `${dateStr}T08:30:00`;

      await adminMarkAttendance({
        employeeId: emp._id,
        date: dateStr,
        checkInTime: ciISO,
        checkOutTime: `${dateStr}T${timeStr}`,
        status: 'present',
        notes: `Clocked out by ${user?.name || 'Staff'}`
      });

      toast.success(`Clocked out ${emp.name} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 👋`);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock-out failed');
    }
  };

  // Open custom mark modal for an employee
  const openMarkModalFor = (emp = null) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const empId = emp ? emp._id : (employees[0]?._id || '');
    
    // Find today's record for this employee if any
    const empRecord = todayReport.find(r => {
      const rEmpId = r.employeeId?._id || r.employeeId;
      return rEmpId === empId && new Date(r.date).toDateString() === new Date().toDateString();
    });

    let ci = '08:30';
    let co = '17:00';
    let st = 'present';
    let nt = '';

    if (empRecord) {
      if (empRecord.checkIn) ci = new Date(empRecord.checkIn).toTimeString().substring(0, 5);
      if (empRecord.checkOut) co = new Date(empRecord.checkOut).toTimeString().substring(0, 5);
      if (empRecord.status) st = empRecord.status;
      if (empRecord.notes) nt = empRecord.notes;
    }

    setAttForm({
      employeeId: empId,
      date: todayStr,
      checkInTime: ci,
      checkOutTime: co,
      status: st,
      notes: nt
    });
    setShowMarkModal(true);
  };

  const handleSaveCustomAtt = async (e) => {
    e.preventDefault();
    if (!attForm.employeeId) return toast.error('Please select an employee');
    setSubmitting(true);
    try {
      const dateStr = attForm.date;
      await adminMarkAttendance({
        employeeId: attForm.employeeId,
        date: dateStr,
        checkInTime: `${dateStr}T${attForm.checkInTime}:00`,
        checkOutTime: attForm.checkOutTime ? `${dateStr}T${attForm.checkOutTime}:00` : null,
        status: attForm.status,
        notes: attForm.notes,
      });

      toast.success('Attendance updated successfully');
      setShowMarkModal(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
  const totalOvertime = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
  const presentDays = records.filter(r => r.status === 'present').length;

  // Map today's staff records
  const todayStr = new Date().toDateString();
  const staffList = employees.map(emp => {
    const todayRec = todayReport.find(r => {
      const rEmpId = r.employeeId?._id || r.employeeId;
      return rEmpId === emp._id && new Date(r.date).toDateString() === todayStr;
    });
    return { employee: emp, record: todayRec || null };
  }).filter(({ employee, record }) => {
    const matchesSearch = employee.name?.toLowerCase().includes(searchStaff.toLowerCase()) ||
                          employee.role?.toLowerCase().includes(searchStaff.toLowerCase());
    
    if (!matchesSearch) return false;
    if (staffFilter === 'checkedIn') return !!record && !record.checkOut;
    if (staffFilter === 'checkedOut') return !!record && !!record.checkOut;
    if (staffFilter === 'notCheckedIn') return !record;
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout navItems={getEmployeeNavGroups(user?.role)} title="Employee Portal">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={getEmployeeNavGroups(user?.role)} title="Employee Portal">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-navy">⏰ Attendance Dashboard</h1>
            <p className="text-muted-text text-sm">Mark your own attendance or clock in/out for staff members</p>
          </div>
          <button
            onClick={() => openMarkModalFor(null)}
            className="flex items-center gap-2 bg-primary-blue hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm self-start sm:self-auto text-sm"
          >
            <Plus size={16} /> Mark Staff Attendance
          </button>
        </div>

        {/* My Today's Status */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          <h3 className="font-semibold text-dark-navy mb-3 flex items-center gap-2">
            <User size={18} className="text-primary-blue" /> My Today's Status ({user?.name})
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            {!todayRecord ? (
              <button onClick={handleCheckIn}
                className="flex items-center gap-2 bg-primary-blue hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-md">
                <Clock size={18} /> Check In Now
              </button>
            ) : !todayRecord.checkOut ? (
              <>
                <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1">
                  <CheckCircle size={14} /> Checked in at {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
                <button onClick={handleCheckOut}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
                  <XCircle size={16} /> Check Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                  In: {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
                <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                  Out: {new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-medium">
                  {todayRecord.hoursWorked?.toFixed(1)}h worked
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Staff Clock In / Clock Out Section */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-dark-navy flex items-center gap-2">
                <Users size={18} className="text-emerald-600" /> Staff Attendance (Clock In & Out for Team)
              </h3>
              <p className="text-xs text-muted-text mt-0.5">Quickly clock in or clock out any employee for today</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  className="w-full border border-card-border rounded-xl pl-9 pr-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="border border-card-border rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
              >
                <option value="all">All Staff ({employees.length})</option>
                <option value="checkedIn">Checked In</option>
                <option value="checkedOut">Checked Out</option>
                <option value="notCheckedIn">Not Checked In</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-muted-text text-xs bg-gray-50/70">
                  <th className="text-left py-2.5 px-3 font-semibold">Employee</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Role</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Today's Status</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Check In</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Check Out</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Clock Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/50">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-xs text-muted-text">
                      No staff members found matching criteria
                    </td>
                  </tr>
                ) : (
                  staffList.map(({ employee: emp, record }) => {
                    const isCheckedIn = !!record?.checkIn;
                    const isCheckedOut = !!record?.checkOut;

                    return (
                      <tr key={emp._id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-primary-blue font-bold text-xs flex items-center justify-center border border-blue-200 uppercase">
                              {emp.name?.substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-dark-navy text-xs">{emp.name}</p>
                              <p className="text-[10px] text-muted-text">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                            {emp.role || 'Staff'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {!record ? (
                            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                              ⚪ Not Checked In
                            </span>
                          ) : isCheckedOut ? (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                              🔵 Checked Out ({record.hoursWorked?.toFixed(1) || 0}h)
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full animate-pulse">
                              🟢 Working (Checked In)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs text-dark-navy font-medium">
                          {record?.checkIn
                            ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-xs text-dark-navy font-medium">
                          {record?.checkOut
                            ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCheckedIn ? (
                              <button
                                onClick={() => handleQuickClockIn(emp)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                              >
                                <Clock size={12} /> Clock In
                              </button>
                            ) : !isCheckedOut ? (
                              <button
                                onClick={() => handleQuickClockOut(emp, record.checkIn)}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                              >
                                <XCircle size={12} /> Clock Out
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-500 font-semibold px-2 py-1">
                                Completed Today
                              </span>
                            )}
                            <button
                              onClick={() => openMarkModalFor(emp)}
                              className="p-1.5 rounded-lg border border-card-border hover:bg-gray-100 text-gray-600 transition-colors"
                              title="Custom Mark Attendance"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Personal Monthly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-card-border text-center shadow-sm">
            <p className="text-2xl font-bold text-dark-navy">{presentDays}</p>
            <p className="text-xs text-muted-text mt-0.5">My Days Present</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center shadow-sm">
            <p className="text-2xl font-bold text-dark-navy">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-text mt-0.5">My Total Hours</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{totalOvertime.toFixed(1)}</p>
            <p className="text-xs text-muted-text mt-0.5">My Overtime Hours</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-card-border text-center shadow-sm">
            <p className="text-2xl font-bold text-dark-navy">{records.filter(r => r.status === 'leave').length}</p>
            <p className="text-xs text-muted-text mt-0.5">My Leave Days</p>
          </div>
        </div>

        {/* Month Selector + History */}
        <div className="bg-white rounded-2xl border border-card-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-navy">My Attendance History</h3>
            <div className="flex gap-2">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="border border-card-border rounded-lg px-3 py-1.5 text-xs bg-white">
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="border border-card-border rounded-lg px-3 py-1.5 text-xs bg-white">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {records.length === 0 ? (
            <p className="text-center text-muted-text py-8 text-xs">No attendance records for this month</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-muted-text text-xs">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Check In</th>
                    <th className="text-left py-2 px-3">Check Out</th>
                    <th className="text-left py-2 px-3">Hours</th>
                    <th className="text-left py-2 px-3">Overtime</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id} className="border-b border-card-border/50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-xs">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td className="py-2.5 px-3 text-xs">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="py-2.5 px-3 text-xs">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="py-2.5 px-3 text-xs">{r.hoursWorked?.toFixed(1) || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-amber-600">{r.overtime ? `+${r.overtime.toFixed(1)}h` : '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-card-border animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-dark-navy flex items-center gap-2">
                <Clock size={20} className="text-primary-blue" /> Mark Staff Attendance
              </h2>
              <button
                onClick={() => setShowMarkModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomAtt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-navy mb-1">Select Employee</label>
                <select
                  value={attForm.employeeId}
                  onChange={(e) => setAttForm({ ...attForm, employeeId: e.target.value })}
                  className="w-full border border-card-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-navy mb-1">Date</label>
                  <input
                    type="date"
                    value={attForm.date}
                    onChange={(e) => setAttForm({ ...attForm, date: e.target.value })}
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-navy mb-1">Status</label>
                  <select
                    value={attForm.status}
                    onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                    <option value="half_day">Half Day</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-navy mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={attForm.checkInTime}
                    onChange={(e) => setAttForm({ ...attForm, checkInTime: e.target.value })}
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-navy mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={attForm.checkOutTime}
                    onChange={(e) => setAttForm({ ...attForm, checkOutTime: e.target.value })}
                    className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-navy mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes e.g. Came late, On duty..."
                  value={attForm.notes}
                  onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })}
                  className="w-full border border-card-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm bg-primary-blue hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmployeeAttendance;
