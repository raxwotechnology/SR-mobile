const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Settings = require('../models/Settings');
const LeavePolicy = require('../models/LeavePolicy');
const AttendancePolicy = require('../models/AttendancePolicy');
const { sendNotification } = require('../utils/notificationService');
const { salaryPaidEmail, sendEmail } = require('../utils/emailService');

// Lazy-loaded: only required when export functions are actually called
let PDFDocument, XLSX;
const loadPdfkit = () => { if (!PDFDocument) PDFDocument = require('pdfkit'); return PDFDocument; };
const loadXlsx = () => { if (!XLSX) XLSX = require('sheetjs-style'); return XLSX; };

// Sri Lankan statutory rates
const EPF_EMPLOYEE_RATE = 0.08; // 8% employee contribution
const EPF_EMPLOYER_RATE = 0.12; // 12% employer contribution
const ETF_RATE = 0.03;          // 3% employer contribution

// @desc    Calculate salary for an employee
// @route   POST /api/payroll/calculate
// @access  Private/Manager/Admin
const calculateSalary = async (req, res, next) => {
  try {
    const { employeeId, month, year, allowances = 0, deductions = 0, bonuses = 0 } = req.body;

    const employee = await User.findById(employeeId)
      .populate('employeeInfo.leavePolicyId')
      .populate('employeeInfo.attendancePolicyId');
    if (!employee) { res.status(404); return next(new Error('Employee not found')); }

    let leavePolicy = employee.employeeInfo?.leavePolicyId;
    if (!leavePolicy) {
      leavePolicy = await LeavePolicy.findOne({ isDefault: true });
    }
    let attendancePolicy = employee.employeeInfo?.attendancePolicyId;
    if (!attendancePolicy) {
      attendancePolicy = await AttendancePolicy.findOne({ isDefault: true });
    }

    const Attendance = require('../models/Attendance');
    const OvertimePay = require('../models/OvertimePay');
    const pendingOTs = await OvertimePay.find({ employeeId, status: 'pending' });
    const totalOTAmount = pendingOTs.reduce((sum, ot) => sum + ot.totalAmount, 0);

    const EmployeeTarget = require('../models/EmployeeTarget');
    const pendingTargets = await EmployeeTarget.find({ employeeId, status: 'completed', bonusPaid: false });
    const totalTargetBonus = pendingTargets.reduce((sum, t) => sum + (t.bonusAmount || 0), 0);

    const payType = employee.employeeInfo?.payType || 'monthly';
    const basePayAmount = employee.employeeInfo?.salary || 0;
    
    if (!basePayAmount) {
      res.status(400);
      return next(new Error('Employee salary not set'));
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendances = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    const presentDays = attendances.filter(a => ['present', 'late'].includes(a.status)).length;
    const halfDays = attendances.filter(a => a.status === 'half-day').length;
    const totalWorkingDaysCount = presentDays + (halfDays * 0.5);

    let basicSalary = 0;
    let attendanceDeductions = 0;
    let excessLeaveDeduction = 0;

    if (payType === 'daily') {
      basicSalary = basePayAmount * totalWorkingDaysCount;
    } else if (payType === 'weekly') {
      basicSalary = basePayAmount * 4; 
    } else {
      basicSalary = basePayAmount;
      const dailyRate = basicSalary / 30;

      if (attendancePolicy) {
        const graceTime = attendancePolicy.graceTimeMinutes || 15;
        const latePenalty = attendancePolicy.lateArrivalPenalty || 0;
        const earlyPenalty = attendancePolicy.earlyCheckoutPenalty || 0;
        const halfDayThreshold = attendancePolicy.halfDayThresholdHours || 4;

        const [startH, startM] = (attendancePolicy.shiftStartTime || '09:00').split(':').map(Number);
        const shiftStartMinutes = startH * 60 + startM;

        const [endH, endM] = (attendancePolicy.shiftEndTime || '17:00').split(':').map(Number);
        const shiftEndMinutes = endH * 60 + endM;

        attendances.forEach(att => {
          if (att.status === 'absent') {
            attendanceDeductions += dailyRate;
          } else if (att.status === 'half-day' || (att.hoursWorked > 0 && att.hoursWorked < halfDayThreshold)) {
            attendanceDeductions += (dailyRate / 2);
          } else {
            if (att.checkIn) {
              const checkInMinutes = att.checkIn.getHours() * 60 + att.checkIn.getMinutes();
              if (checkInMinutes - shiftStartMinutes > graceTime) {
                attendanceDeductions += latePenalty;
              }
            }
            if (att.checkOut) {
              const checkOutMinutes = att.checkOut.getHours() * 60 + att.checkOut.getMinutes();
              if (shiftEndMinutes - checkOutMinutes > 0) {
                attendanceDeductions += earlyPenalty;
              }
            }
          }
        });
      } else {
        attendances.forEach(att => {
          if (att.status === 'absent') attendanceDeductions += dailyRate;
          else if (att.status === 'half-day') attendanceDeductions += (dailyRate / 2);
          else if (att.status === 'late') attendanceDeductions += 200;
        });
      }

      if (leavePolicy) {
        const Leave = require('../models/Leave');
        const leavesYear = await Leave.find({
          employeeId,
          status: 'approved',
          startDate: { $gte: new Date(year, 0, 1) },
          endDate: { $lte: new Date(year, 11, 31, 23, 59, 59) }
        });

        let totalExcessDays = 0;
        const leaveTypes = ['annual', 'sick', 'casual'];
        for (const type of leaveTypes) {
          const takenBefore = leavesYear
            .filter(l => l.leaveType === type && l.startDate < startDate)
            .reduce((sum, l) => sum + l.totalDays, 0);

          const takenCurrent = leavesYear
            .filter(l => l.leaveType === type && l.startDate >= startDate && l.startDate <= endDate)
            .reduce((sum, l) => sum + l.totalDays, 0);

          const limit = leavePolicy[type + 'Leaves'] || 0;
          const excess = Math.max(0, takenBefore + takenCurrent - limit) - Math.max(0, takenBefore - limit);
          totalExcessDays += excess;
        }
        excessLeaveDeduction = totalExcessDays * (leavePolicy.deductionPerExcessLeave || 0);
      }
    }

    const actualBonuses = Number(bonuses) + totalOTAmount + totalTargetBonus;
    const grossSalary = basicSalary + Number(allowances) + actualBonuses;
    const epfEmployee = parseFloat((basicSalary * EPF_EMPLOYEE_RATE).toFixed(2));
    const epfEmployer = parseFloat((basicSalary * EPF_EMPLOYER_RATE).toFixed(2));
    const etfEmployer = parseFloat((basicSalary * ETF_RATE).toFixed(2));
    
    const totalDeductions = epfEmployee + Number(deductions) + excessLeaveDeduction + attendanceDeductions;
    const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));

    res.json({
      employeeId,
      employeeName: employee.name,
      month,
      year,
      basicSalary,
      allowances: Number(allowances),
      bonuses: actualBonuses,
      otIncluded: totalOTAmount,
      targetBonusIncluded: totalTargetBonus,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etfEmployer,
      otherDeductions: Number(deductions) + excessLeaveDeduction,
      attendanceDeductions,
      totalDeductions,
      netSalary,
    });
  } catch (error) { next(error); }
};

// @desc    Process salary payment  
// @route   POST /api/payroll/pay
// @access  Private/Manager/Admin
const processSalaryPayment = async (req, res, next) => {
  try {
    const { employeeId, month, year, allowances = 0, deductions = 0, bonuses = 0 } = req.body;

    // Check for duplicate
    const existing = await Payroll.findOne({ employeeId, month, year });
    if (existing) {
      res.status(400);
      return next(new Error(`Salary already processed for ${month}/${year}`));
    }

    const employee = await User.findById(employeeId)
      .populate('employeeInfo.leavePolicyId')
      .populate('employeeInfo.attendancePolicyId');
    if (!employee) { res.status(404); return next(new Error('Employee not found')); }

    let leavePolicy = employee.employeeInfo?.leavePolicyId;
    if (!leavePolicy) {
      leavePolicy = await LeavePolicy.findOne({ isDefault: true });
    }
    let attendancePolicy = employee.employeeInfo?.attendancePolicyId;
    if (!attendancePolicy) {
      attendancePolicy = await AttendancePolicy.findOne({ isDefault: true });
    }

    const Attendance = require('../models/Attendance');
    const OvertimePay = require('../models/OvertimePay');
    const pendingOTs = await OvertimePay.find({ employeeId, status: 'pending' });
    const totalOTAmount = pendingOTs.reduce((sum, ot) => sum + ot.totalAmount, 0);

    const EmployeeTarget = require('../models/EmployeeTarget');
    const pendingTargets = await EmployeeTarget.find({ employeeId, status: 'completed', bonusPaid: false });
    const totalTargetBonus = pendingTargets.reduce((sum, t) => sum + (t.bonusAmount || 0), 0);

    const payType = employee.employeeInfo?.payType || 'monthly';
    const basePayAmount = employee.employeeInfo?.salary || 0;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendances = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    const presentDaysCount = attendances.filter(a => ['present', 'late'].includes(a.status)).length;
    const halfDaysCount = attendances.filter(a => a.status === 'half-day').length;
    const totalDaysWorked = presentDaysCount + (halfDaysCount * 0.5);

    let basicSalary = 0;
    let attendanceDeductions = 0;
    let excessLeaveDeduction = 0;

    if (payType === 'daily') {
      basicSalary = basePayAmount * totalDaysWorked;
    } else if (payType === 'weekly') {
      basicSalary = basePayAmount * 4;
    } else {
      basicSalary = basePayAmount;
      const dailyRate = basicSalary / 30;

      if (attendancePolicy) {
        const graceTime = attendancePolicy.graceTimeMinutes || 15;
        const latePenalty = attendancePolicy.lateArrivalPenalty || 0;
        const earlyPenalty = attendancePolicy.earlyCheckoutPenalty || 0;
        const halfDayThreshold = attendancePolicy.halfDayThresholdHours || 4;

        const [startH, startM] = (attendancePolicy.shiftStartTime || '09:00').split(':').map(Number);
        const shiftStartMinutes = startH * 60 + startM;

        const [endH, endM] = (attendancePolicy.shiftEndTime || '17:00').split(':').map(Number);
        const shiftEndMinutes = endH * 60 + endM;

        attendances.forEach(att => {
          if (att.status === 'absent') {
            attendanceDeductions += dailyRate;
          } else if (att.status === 'half-day' || (att.hoursWorked > 0 && att.hoursWorked < halfDayThreshold)) {
            attendanceDeductions += (dailyRate / 2);
          } else {
            if (att.checkIn) {
              const checkInMinutes = att.checkIn.getHours() * 60 + att.checkIn.getMinutes();
              if (checkInMinutes - shiftStartMinutes > graceTime) {
                attendanceDeductions += latePenalty;
              }
            }
            if (att.checkOut) {
              const checkOutMinutes = att.checkOut.getHours() * 60 + att.checkOut.getMinutes();
              if (shiftEndMinutes - checkOutMinutes > 0) {
                attendanceDeductions += earlyPenalty;
              }
            }
          }
        });
      } else {
        attendances.forEach(att => {
          if (att.status === 'absent') attendanceDeductions += dailyRate;
          else if (att.status === 'half-day') attendanceDeductions += (dailyRate / 2);
          else if (att.status === 'late') attendanceDeductions += 200;
        });
      }

      if (leavePolicy) {
        const Leave = require('../models/Leave');
        const leavesYear = await Leave.find({
          employeeId,
          status: 'approved',
          startDate: { $gte: new Date(year, 0, 1) },
          endDate: { $lte: new Date(year, 11, 31, 23, 59, 59) }
        });

        let totalExcessDays = 0;
        const leaveTypes = ['annual', 'sick', 'casual'];
        for (const type of leaveTypes) {
          const takenBefore = leavesYear
            .filter(l => l.leaveType === type && l.startDate < startDate)
            .reduce((sum, l) => sum + l.totalDays, 0);

          const takenCurrent = leavesYear
            .filter(l => l.leaveType === type && l.startDate >= startDate && l.startDate <= endDate)
            .reduce((sum, l) => sum + l.totalDays, 0);

          const limit = leavePolicy[type + 'Leaves'] || 0;
          const excess = Math.max(0, takenBefore + takenCurrent - limit) - Math.max(0, takenBefore - limit);
          totalExcessDays += excess;
        }
        excessLeaveDeduction = totalExcessDays * (leavePolicy.deductionPerExcessLeave || 0);
      }
    }

    const actualBonuses = Number(bonuses) + totalOTAmount + totalTargetBonus;
    const grossSalary = basicSalary + Number(allowances) + actualBonuses;
    const epfEmployee = parseFloat((basicSalary * EPF_EMPLOYEE_RATE).toFixed(2));
    const epfEmployer = parseFloat((basicSalary * EPF_EMPLOYER_RATE).toFixed(2));
    const etfEmployer = parseFloat((basicSalary * ETF_RATE).toFixed(2));
    const totalDeductions = epfEmployee + Number(deductions) + excessLeaveDeduction + attendanceDeductions;
    const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));

    const payroll = await Payroll.create({
      employeeId,
      storeId: employee.assignedStore || null,
      month,
      year,
      basicSalary,
      daysWorked: totalDaysWorked,
      overtimePay: totalOTAmount,
      allowances: Number(allowances),
      bonuses: actualBonuses,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etfEmployer,
      otherDeductions: Number(deductions) + excessLeaveDeduction,
      attendanceDeductions,
      totalDeductions,
      netSalary,
      status: 'paid',
      paidAt: new Date(),
      processedBy: req.user._id,
    });


    for (const ot of pendingOTs) {
      ot.status = 'paid';
      ot.paidAt = new Date();
      await ot.save();
    }

    for (const t of pendingTargets) {
      t.bonusPaid = true;
      await t.save();
    }

    // Send notification & email
    const emailContent = salaryPaidEmail(employee.name, payroll);
    await sendNotification({
      userId: employee._id,
      userEmail: employee.email,
      type: 'salary_credit',
      title: '💰 Salary Credited',
      message: `Your salary of Rs.${netSalary.toLocaleString()} for ${month}/${year} has been processed${totalOTAmount > 0 ? ` (Includes OT: Rs.${totalOTAmount.toLocaleString()})` : ''}.`,
      link: '/employee/salary',
      emailContent,
    });

    res.status(201).json(payroll);
  } catch (error) { next(error); }
};

// @desc    Get salary history for employee
// @route   GET /api/payroll/history/:employeeId
// @access  Private
const getSalaryHistory = async (req, res, next) => {
  try {
    // Allow employees to see their own, managers/admins to see anyone's
    const employeeId = req.params.employeeId === 'me' ? req.user._id : req.params.employeeId;

    if (employeeId.toString() !== req.user._id.toString() && !['admin', 'manager'].includes(req.user.role)) {
      res.status(403);
      return next(new Error('Not authorized'));
    }

    const history = await Payroll.find({ employeeId })
      .sort({ year: -1, month: -1 })
      .limit(24);
    res.json(history);
  } catch (error) { next(error); }
};

// @desc    Get payroll report for a month
// @route   GET /api/payroll/report
// @access  Private/Manager/Admin
const getPayrollReport = async (req, res, next) => {
  try {
    const { month, year, role, employeeName } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    let payrolls = await Payroll.find(filter)
      .populate('employeeId', 'name email role employeeInfo')
      .sort({ createdAt: -1 });

    if (role && role !== 'all') {
      payrolls = payrolls.filter((p) => p.employeeId?.role === role);
    }
    if (employeeName && String(employeeName).trim()) {
      const q = String(employeeName).trim().toLowerCase();
      payrolls = payrolls.filter((p) => String(p.employeeId?.name || '').toLowerCase().includes(q));
    }

    const totals = payrolls.reduce((acc, p) => ({
      totalGross: acc.totalGross + p.grossSalary,
      totalNet: acc.totalNet + p.netSalary,
      totalEPFEmployee: acc.totalEPFEmployee + p.epfEmployee,
      totalEPFEmployer: acc.totalEPFEmployer + p.epfEmployer,
      totalETF: acc.totalETF + p.etfEmployer,
    }), { totalGross: 0, totalNet: 0, totalEPFEmployee: 0, totalEPFEmployer: 0, totalETF: 0 });

    res.json({ payrolls, totals, count: payrolls.length });
  } catch (error) { next(error); }
};

const buildSalaryExportRows = (records = []) => records.map((record) => ({
  employeeName: record.employeeId?.name || 'Unknown',
  role: record.employeeId?.role || 'N/A',
  month: record.month,
  year: record.year,
  basicSalary: Number(record.basicSalary || 0),
  allowances: Number(record.allowances || 0),
  bonuses: Number(record.bonuses || 0),
  deductions: Number(record.otherDeductions || 0),
  netSalary: Number(record.netSalary || 0),
  paymentStatus: record.paymentStatus || record.status || 'pending',
}));

const exportEmployeeSalaryReport = async (req, res, next) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    const employeeId = req.params.employeeId === 'me' ? req.user._id : req.params.employeeId;
    if (String(employeeId) !== String(req.user._id) && !['admin', 'manager'].includes(req.user.role)) {
      res.status(403);
      return next(new Error('Not authorized'));
    }

    const filter = { employeeId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const records = await Payroll.find(filter)
      .populate('employeeId', 'name role')
      .sort({ year: -1, month: -1 });
    const rows = buildSalaryExportRows(records);

    if (format === 'xlsx') {
      const xl = loadXlsx();
      const sheet = xl.utils.json_to_sheet(rows);
      const workbook = xl.utils.book_new();
      xl.utils.book_append_sheet(workbook, sheet, 'Salary Report');
      const buffer = xl.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="salary-report-${employeeId}.xlsx"`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const PDF = loadPdfkit();
      const doc = new PDF({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="salary-report-${employeeId}.pdf"`);
      doc.pipe(res);

      doc.fontSize(16).text('Employee Salary Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);
      rows.forEach((row, idx) => {
        doc.fontSize(11).text(`${idx + 1}. ${row.employeeName} (${row.role})`);
        doc.fontSize(10).text(`Period: ${row.month}/${row.year} | Basic: Rs.${row.basicSalary.toLocaleString()} | Bonus: Rs.${row.bonuses.toLocaleString()} | Deductions: Rs.${row.deductions.toLocaleString()} | Net: Rs.${row.netSalary.toLocaleString()} | Status: ${row.paymentStatus}`);
        doc.moveDown(0.6);
      });
      doc.end();
      return;
    }

    const headers = ['Employee Name', 'Role', 'Month', 'Year', 'Basic Salary', 'Allowances', 'Bonuses', 'Deductions', 'Net Salary', 'Payment Status'];
    const csvLines = [
      headers.join(','),
      ...rows.map((row) => [
        `"${row.employeeName}"`,
        `"${row.role}"`,
        row.month,
        row.year,
        row.basicSalary,
        row.allowances,
        row.bonuses,
        row.deductions,
        row.netSalary,
        `"${row.paymentStatus}"`,
      ].join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="salary-report-${employeeId}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (error) { next(error); }
};

const downloadPaysheet = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employeeId', 'name email role employeeInfo')
      .populate('storeId', 'name address phone')
      .populate('processedBy', 'name');

    if (!payroll) {
      res.status(404);
      return next(new Error('Payroll record not found'));
    }

    if (String(payroll.employeeId?._id) !== String(req.user._id) && !['admin', 'manager'].includes(req.user.role)) {
      res.status(403);
      return next(new Error('Not authorized'));
    }

    const settings = await Settings.findOne().lean();
    const template = settings?.documentTemplates?.paysheet || {};
    const fields = template.fields || {};
    const PDF = loadPdfkit();
    const doc = new PDF({ margin: 42, size: template.layout === 'compact' ? 'A5' : 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="paysheet-${payroll.employeeId?.name || 'employee'}-${payroll.month}-${payroll.year}.pdf"`);
    doc.pipe(res);

    const accent = template.accentColor || '#2563eb';
    doc.rect(0, 0, doc.page.width, 72).fill(accent);
    doc.fillColor('#ffffff').fontSize(18).text(template.title || 'Paysheet', 42, 24);
    doc.fontSize(10).text(settings?.shopName || 'Mobile Hub', 42, 48);

    doc.fillColor('#111827').moveDown(3);
    doc.fontSize(12).text(`Period: ${payroll.month}/${payroll.year}`);
    doc.text(`Employee: ${payroll.employeeId?.name || 'Unknown'}`);
    if (fields.showEmployeeRole !== false) doc.text(`Role: ${payroll.employeeId?.role || 'N/A'}`);
    if (fields.showStore !== false) doc.text(`Store: ${payroll.storeId?.name || 'N/A'}`);
    if (fields.showProcessedBy !== false) doc.text(`Processed By: ${payroll.processedBy?.name || 'System'}`);
    doc.moveDown(1);

    const rows = [
      ['Basic Salary', payroll.basicSalary],
      ['Allowances', payroll.allowances],
      ['Bonuses / OT / Targets', payroll.bonuses],
      ['Gross Salary', payroll.grossSalary],
      ['EPF Employee', -payroll.epfEmployee],
      ['Other Deductions', -payroll.otherDeductions],
      ['Attendance Deductions', -payroll.attendanceDeductions],
      ['Net Salary', payroll.netSalary],
    ];

    rows.forEach(([label, value], index) => {
      const isTotal = label === 'Net Salary';
      if (isTotal) {
        doc.moveDown(0.3);
        doc.strokeColor(accent).lineWidth(1).moveTo(42, doc.y).lineTo(doc.page.width - 42, doc.y).stroke();
        doc.moveDown(0.5);
      }
      doc.fontSize(isTotal ? 13 : 10).fillColor(isTotal ? accent : '#111827');
      doc.text(label, 42, doc.y, { continued: true });
      doc.text(`Rs. ${Number(value || 0).toLocaleString()}`, { align: 'right' });
      if (index < rows.length - 1) doc.moveDown(0.45);
    });

    if (fields.showEmployerContributions !== false) {
      doc.moveDown(1);
      doc.fillColor('#4b5563').fontSize(10).text(`Employer EPF: Rs. ${Number(payroll.epfEmployer || 0).toLocaleString()}`);
      doc.text(`Employer ETF: Rs. ${Number(payroll.etfEmployer || 0).toLocaleString()}`);
    }

    if (template.footerText) {
      doc.moveDown(1.5);
      doc.fontSize(9).fillColor('#6b7280').text(template.footerText, { align: 'center' });
    }

    doc.end();
  } catch (error) { next(error); }
};

module.exports = { calculateSalary, processSalaryPayment, getSalaryHistory, getPayrollReport, exportEmployeeSalaryReport, downloadPaysheet };
