import { useState, useEffect } from 'react';
import { Calculator, Send, FileText, CreditCard, Download } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { getEmployees, calculateSalary, processSalaryPayment, getPayrollReport, downloadPaysheet } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-toastify';
import { managerNavGroups } from './managerNavItems';



const now = new Date();

const ManagerPayroll = ({ navItems = managerNavGroups, title = 'Manager Dashboard' }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [allowances, setAllowances] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [bonuses, setBonuses] = useState(0);
  const [preview, setPreview] = useState(null);
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('process');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await getEmployees({ includeManagers: true });
      setEmployees(data);
    }
    catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  };

  const handleCalculate = async () => {
    if (!selected) return toast.error('Select an employee');
    try {
      const { data } = await calculateSalary({ employeeId: selected, month, year, allowances, deductions, bonuses });
      setPreview(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Calculation failed'); }
  };

  const handleProcess = async () => {
    if (!selected) return toast.error('Select an employee');
    try {
      await processSalaryPayment({ employeeId: selected, month, year, allowances, deductions, bonuses });
      toast.success('Salary processed & notification sent!');
      setPreview(null);
      setSelected('');
    } catch (err) { toast.error(err.response?.data?.message || 'Processing failed'); }
  };

  const handleFetchReport = async () => {
    try { const { data } = await getPayrollReport({ month, year }); setReport(data); }
    catch { toast.error('Failed to fetch report'); }
  };

  // Chart data from report
  const chartData = report?.payrolls?.map(p => ({
    name: (p.employeeId?.name || 'Unknown').split(' ')[0],
    gross: p.grossSalary,
    epfEmp: p.epfEmployee,
    epfEmployer: p.epfEmployer,
    etf: p.etfEmployer,
    net: p.netSalary,
  })) || [];

  const exportCSV = () => {
    if (!report?.payrolls?.length) return toast.error('No data to export');
    const rows = [
      ['Employee', 'Basic', 'Allowances', 'Bonuses', 'Gross', 'EPF Employee (8%)', 'EPF Employer (12%)', 'ETF Employer (3%)', 'Deductions', 'Net Salary', 'Status'].join(','),
      ...report.payrolls.map(p => [p.employeeId?.name, p.basicSalary, p.allowances, p.bonuses, p.grossSalary, p.epfEmployee, p.epfEmployer, p.etfEmployer, p.otherDeductions, p.netSalary, p.status].join(','))
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `payroll_${month}_${year}.csv`; a.click();
    toast.success('Payroll report exported');
  };

  const handleDownloadPaysheet = async (payroll) => {
    try {
      const { data } = await downloadPaysheet(payroll._id);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `paysheet_${payroll.employeeId?.name || 'employee'}_${payroll.month}_${payroll.year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download paysheet');
    }
  };

  if (loading) return <DashboardLayout navItems={navItems} title={title}><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-blue border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout navItems={navItems} title={title}>
      <div>
        <h1 className="text-2xl font-bold text-dark-navy mb-2">💰 Payroll Management</h1>
        <p className="text-muted-text text-sm mb-6">Process salaries with Sri Lankan EPF/ETF compliance</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('process')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === 'process' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'}`}><Calculator size={16} /> Process Salary</button>
          <button onClick={() => { setTab('report'); handleFetchReport(); }} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === 'report' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'}`}><FileText size={16} /> Monthly Report</button>
          <button onClick={() => { setTab('epf'); handleFetchReport(); }} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === 'epf' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-muted-text hover:bg-gray-200'}`}><CreditCard size={16} /> EPF/ETF Summary</button>
        </div>

        {tab === 'process' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Salary Form */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4">Calculate Salary</h2>
              <div className="space-y-4">
                <div className="relative text-left">
                  <label className="text-xs text-muted-text block mb-1">Employee</label>
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white flex items-center justify-between cursor-pointer"
                  >
                    {(() => {
                      const selectedEmp = employees.find(e => e._id === selected);
                      return (
                        <span className={selectedEmp ? "font-semibold text-dark-navy" : "text-gray-400"}>
                          {selectedEmp
                            ? `${selectedEmp.name} (${selectedEmp.role}) — Rs. ${(selectedEmp.employeeInfo?.salary || 0).toLocaleString()}`
                            : "Select employee"}
                        </span>
                      );
                    })()}
                    <span className="text-gray-400 text-xs">▼</span>
                  </div>

                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                      <div className="absolute left-0 right-0 mt-1.5 p-2 bg-white border border-card-border rounded-2xl shadow-xl z-50 animate-fadeIn">
                        <input
                          type="text"
                          placeholder="Search by name or role..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full border border-card-border rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary-blue mb-2"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {(() => {
                            const filteredEmployees = employees.filter(e =>
                              (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (e.role || '').toLowerCase().includes(searchTerm.toLowerCase())
                            );
                            if (filteredEmployees.length === 0) {
                              return <div className="text-center py-4 text-xs text-muted-text">No employees found</div>;
                            }
                            return filteredEmployees.map((e) => (
                              <div
                                key={e._id}
                                onClick={() => {
                                  setSelected(e._id);
                                  setIsDropdownOpen(false);
                                  setSearchTerm('');
                                }}
                                className={`p-2.5 rounded-lg cursor-pointer transition-all text-left ${
                                  selected === e._id
                                    ? 'bg-primary-blue text-white font-semibold'
                                    : 'hover:bg-gray-50 text-dark-navy'
                                }`}
                              >
                                <div className="text-xs font-semibold">{e.name}</div>
                                <div className={`text-[10px] mt-0.5 ${selected === e._id ? 'text-blue-100' : 'text-muted-text'}`}>
                                  {e.role} • Rs. {(e.employeeInfo?.salary || 0).toLocaleString()}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-text block mb-1">Month</label>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue">
                      {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en', {month: 'long'})}</option>)}
                    </select></div>
                  <div><label className="text-xs text-muted-text block mb-1">Year</label>
                    <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-text block mb-1">Allowances</label><input type="number" value={allowances} onChange={(e) => setAllowances(Number(e.target.value))} className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" /></div>
                  <div><label className="text-xs text-muted-text block mb-1">Bonuses</label><input type="number" value={bonuses} onChange={(e) => setBonuses(Number(e.target.value))} className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" /></div>
                  <div><label className="text-xs text-muted-text block mb-1">Deductions</label><input type="number" value={deductions} onChange={(e) => setDeductions(Number(e.target.value))} className="w-full border border-card-border rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue" /></div>
                </div>
                <button onClick={handleCalculate} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"><Calculator size={18} /> Calculate Preview</button>
              </div>
            </div>

            {/* Preview Card */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-4">Salary Preview</h2>
              {!preview ? (
                <div className="text-center py-12 text-muted-text"><CreditCard size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-sm">Select an employee and calculate to see preview</p></div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-muted-text">Employee</p>
                    <p className="font-bold text-dark-navy text-lg">{preview.employeeName}</p>
                    <p className="text-xs text-muted-text">{month}/{year}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-text">Basic Salary</span><span className="font-medium">Rs. {preview.basicSalary.toLocaleString()}</span></div>
                    {preview.allowances > 0 && <div className="flex justify-between"><span className="text-muted-text">Allowances</span><span className="text-emerald-600">+ Rs. {preview.allowances.toLocaleString()}</span></div>}
                    {preview.bonuses > 0 && <div className="flex justify-between"><span className="text-muted-text">Bonuses</span><span className="text-emerald-600">+ Rs. {preview.bonuses.toLocaleString()}</span></div>}
                    <hr className="border-card-border" />
                    <div className="flex justify-between font-medium"><span>Gross Salary</span><span>Rs. {preview.grossSalary.toLocaleString()}</span></div>
                    <hr className="border-card-border" />
                    <div className="flex justify-between text-red-500"><span>EPF Employee (8%)</span><span>- Rs. {preview.epfEmployee.toLocaleString()}</span></div>
                    {preview.otherDeductions > 0 && <div className="flex justify-between text-red-500"><span>Other Deductions</span><span>- Rs. {preview.otherDeductions.toLocaleString()}</span></div>}
                    {preview.attendanceDeductions > 0 && <div className="flex justify-between text-red-500"><span>Attendance Deductions</span><span>- Rs. {preview.attendanceDeductions.toLocaleString()}</span></div>}
                    <hr className="border-card-border" />
                    <div className="flex justify-between text-lg font-bold"><span className="text-dark-navy">Net Salary</span><span className="text-primary-blue">Rs. {preview.netSalary.toLocaleString()}</span></div>
                    <hr className="border-card-border" />
                    {/* EPF/ETF Breakdown */}
                    <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-800">🏛️ Statutory Contributions (Employer)</p>
                      <div className="flex justify-between text-xs"><span className="text-amber-700">EPF Employer (12%)</span><span className="font-bold text-amber-800">Rs. {preview.epfEmployer.toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-amber-700">ETF Employer (3%)</span><span className="font-bold text-amber-800">Rs. {preview.etfEmployer.toLocaleString()}</span></div>
                      <hr className="border-amber-200" />
                      <div className="flex justify-between text-xs font-bold"><span className="text-amber-800">Total Employer Cost</span><span className="text-amber-900">Rs. {(preview.grossSalary + preview.epfEmployer + preview.etfEmployer).toLocaleString()}</span></div>
                    </div>
                  </div>
                  <button onClick={handleProcess} className="w-full bg-primary-blue hover:bg-emerald-600 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"><Send size={18} /> Process & Send Notification</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'report' && (
          <div className="bg-white rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <div><h2 className="font-semibold text-dark-navy">Payroll Report — {month}/{year}</h2>{report && <span className="text-sm text-muted-text">{report.count} records</span>}</div>
              {report?.payrolls?.length > 0 && <button onClick={exportCSV} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"><Download size={16} /> Export CSV</button>}
            </div>
            {!report || report.payrolls.length === 0 ? (
              <div className="text-center py-12 text-muted-text"><FileText size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-sm">No payroll records for this month</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50">
                      <th className="text-left px-5 py-3 font-medium text-muted-text">Employee</th>
                      <th className="text-right px-3 py-3 font-medium text-muted-text">Basic</th>
                      <th className="text-right px-3 py-3 font-medium text-muted-text">Gross</th>
                      <th className="text-right px-3 py-3 font-medium text-red-500">EPF 8%</th>
                      <th className="text-right px-3 py-3 font-medium text-amber-600">EPF 12%</th>
                      <th className="text-right px-3 py-3 font-medium text-amber-600">ETF 3%</th>
                      <th className="text-right px-3 py-3 font-medium text-primary-blue">Net</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-text">Status</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-text">Paysheet</th>
                    </tr></thead>
                    <tbody className="divide-y divide-card-border">
                      {report.payrolls.map(p => (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-dark-navy">{p.employeeId?.name}</td>
                          <td className="px-3 py-3 text-right">Rs. {p.basicSalary?.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-medium">Rs. {p.grossSalary?.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-red-500">Rs. {p.epfEmployee?.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-amber-600">Rs. {p.epfEmployer?.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-amber-600">Rs. {p.etfEmployer?.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-bold text-primary-blue">Rs. {p.netSalary?.toLocaleString()}</td>
                          <td className="px-3 py-3 text-center"><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{p.status}</span></td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleDownloadPaysheet(p)} className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-dark-navy px-3 py-1.5 rounded-lg text-xs font-semibold">
                              <Download size={14} /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Totals */}
                <div className="px-6 py-4 border-t border-card-border bg-emerald-50 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div><p className="text-muted-text">Total Gross</p><p className="font-bold text-dark-navy">Rs. {report.totals.totalGross.toLocaleString()}</p></div>
                  <div><p className="text-muted-text">Total Net</p><p className="font-bold text-primary-blue">Rs. {report.totals.totalNet.toLocaleString()}</p></div>
                  <div><p className="text-muted-text">EPF Employee</p><p className="font-bold text-red-500">Rs. {report.totals.totalEPFEmployee.toLocaleString()}</p></div>
                  <div><p className="text-muted-text">EPF Employer</p><p className="font-bold text-amber-600">Rs. {report.totals.totalEPFEmployer.toLocaleString()}</p></div>
                  <div><p className="text-muted-text">ETF Employer</p><p className="font-bold text-amber-600">Rs. {report.totals.totalETF.toLocaleString()}</p></div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'epf' && (
          <div className="space-y-6">
            {/* EPF/ETF Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-red-400 to-blue-500 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-red-100 text-xs mb-1">EPF Employee (8%)</p>
                <p className="text-2xl font-bold">Rs. {(report?.totals?.totalEPFEmployee || 0).toLocaleString()}</p>
                <p className="text-red-100 text-xs mt-2">Deducted from employee salary</p>
              </div>
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-amber-100 text-xs mb-1">EPF Employer (12%)</p>
                <p className="text-2xl font-bold">Rs. {(report?.totals?.totalEPFEmployer || 0).toLocaleString()}</p>
                <p className="text-amber-100 text-xs mt-2">Contributed by employer</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-emerald-100 text-xs mb-1">ETF Employer (3%)</p>
                <p className="text-2xl font-bold">Rs. {(report?.totals?.totalETF || 0).toLocaleString()}</p>
                <p className="text-emerald-100 text-xs mt-2">Employment Trust Fund</p>
              </div>
            </div>

            {/* Total Employer Liability */}
            <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="font-semibold text-dark-navy mb-3">📊 Total Employer Liability</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-muted-text text-xs">Total Gross</p>
                  <p className="text-lg font-bold text-dark-navy">Rs. {(report?.totals?.totalGross || 0).toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-amber-700 text-xs">EPF (8%+12%)</p>
                  <p className="text-lg font-bold text-amber-800">Rs. {((report?.totals?.totalEPFEmployee || 0) + (report?.totals?.totalEPFEmployer || 0)).toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-emerald-700 text-xs">ETF (3%)</p>
                  <p className="text-lg font-bold text-emerald-800">Rs. {(report?.totals?.totalETF || 0).toLocaleString()}</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-4 text-center">
                  <p className="text-violet-700 text-xs">Total Cost to Company</p>
                  <p className="text-lg font-bold text-violet-800">Rs. {((report?.totals?.totalGross || 0) + (report?.totals?.totalEPFEmployer || 0) + (report?.totals?.totalETF || 0)).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-card-border p-6 shadow-sm">
                <h2 className="font-semibold text-dark-navy mb-4">📈 Salary & Contributions Breakdown</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="net" fill="#10b981" name="Net Salary" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="epfEmp" fill="#ef4444" name="EPF 8%" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="epfEmployer" fill="#f59e0b" name="EPF 12%" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="etf" fill="#06b6d4" name="ETF 3%" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sri Lankan Compliance Info */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">🇱🇰 Sri Lankan Statutory Compliance</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm text-blue-700">
                <div>
                  <p className="font-medium mb-1">EPF (Employees' Provident Fund)</p>
                  <p className="text-xs">Employee: 8% of gross salary</p>
                  <p className="text-xs">Employer: 12% of gross salary</p>
                  <p className="text-xs mt-1 text-blue-500">Total: 20% goes to EPF</p>
                </div>
                <div>
                  <p className="font-medium mb-1">ETF (Employees' Trust Fund)</p>
                  <p className="text-xs">Employer: 3% of gross salary</p>
                  <p className="text-xs mt-1 text-blue-500">Entirely employer-borne</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Payment Deadlines</p>
                  <p className="text-xs">EPF: Before 15th of next month</p>
                  <p className="text-xs">ETF: Before 15th of next month</p>
                  <p className="text-xs mt-1 text-blue-500">Penalties for late payments apply</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerPayroll;
