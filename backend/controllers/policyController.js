const LeavePolicy = require('../models/LeavePolicy');
const AttendancePolicy = require('../models/AttendancePolicy');
const User = require('../models/User');

// @desc    Get all leave policies
// @route   GET /api/hr/policies/leave
// @access  Private/Admin/Manager
const getLeavePolicies = async (req, res, next) => {
  try {
    const policies = await LeavePolicy.find({}).sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) { next(error); }
};

// @desc    Create a leave policy
// @route   POST /api/hr/policies/leave
// @access  Private/Admin/Manager
const createLeavePolicy = async (req, res, next) => {
  try {
    const { name, annualLeaves, sickLeaves, casualLeaves, deductionPerExcessLeave, isDefault } = req.body;
    if (!name) {
      res.status(400);
      return next(new Error('Policy name is required'));
    }

    if (isDefault) {
      // Remove default flag from other policies
      await LeavePolicy.updateMany({}, { isDefault: false });
    }

    const policy = await LeavePolicy.create({
      name,
      annualLeaves: Number(annualLeaves) || 14,
      sickLeaves: Number(sickLeaves) || 7,
      casualLeaves: Number(casualLeaves) || 7,
      deductionPerExcessLeave: Number(deductionPerExcessLeave) || 0,
      isDefault: !!isDefault,
    });

    res.status(201).json(policy);
  } catch (error) { next(error); }
};

// @desc    Update a leave policy
// @route   PUT /api/hr/policies/leave/:id
// @access  Private/Admin/Manager
const updateLeavePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    if (!policy) {
      res.status(404);
      return next(new Error('Leave Policy not found'));
    }

    if (req.body.isDefault) {
      await LeavePolicy.updateMany({}, { isDefault: false });
    }

    policy.name = req.body.name || policy.name;
    if (req.body.annualLeaves !== undefined) policy.annualLeaves = Number(req.body.annualLeaves);
    if (req.body.sickLeaves !== undefined) policy.sickLeaves = Number(req.body.sickLeaves);
    if (req.body.casualLeaves !== undefined) policy.casualLeaves = Number(req.body.casualLeaves);
    if (req.body.deductionPerExcessLeave !== undefined) policy.deductionPerExcessLeave = Number(req.body.deductionPerExcessLeave);
    if (req.body.isDefault !== undefined) policy.isDefault = !!req.body.isDefault;

    await policy.save();
    res.json(policy);
  } catch (error) { next(error); }
};

// @desc    Delete a leave policy
// @route   DELETE /api/hr/policies/leave/:id
// @access  Private/Admin/Manager
const deleteLeavePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    if (!policy) {
      res.status(404);
      return next(new Error('Leave Policy not found'));
    }
    await policy.deleteOne();
    res.json({ message: 'Leave policy removed' });
  } catch (error) { next(error); }
};

// @desc    Get all attendance policies
// @route   GET /api/hr/policies/attendance
// @access  Private/Admin/Manager
const getAttendancePolicies = async (req, res, next) => {
  try {
    const policies = await AttendancePolicy.find({}).sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) { next(error); }
};

// @desc    Create an attendance policy
// @route   POST /api/hr/policies/attendance
// @access  Private/Admin/Manager
const createAttendancePolicy = async (req, res, next) => {
  try {
    const { name, shiftStartTime, shiftEndTime, graceTimeMinutes, lateArrivalPenalty, earlyCheckoutPenalty, halfDayThresholdHours, isDefault } = req.body;
    if (!name) {
      res.status(400);
      return next(new Error('Policy name is required'));
    }

    if (isDefault) {
      await AttendancePolicy.updateMany({}, { isDefault: false });
    }

    const policy = await AttendancePolicy.create({
      name,
      shiftStartTime: shiftStartTime || '09:00',
      shiftEndTime: shiftEndTime || '17:00',
      graceTimeMinutes: Number(graceTimeMinutes) || 15,
      lateArrivalPenalty: Number(lateArrivalPenalty) || 0,
      earlyCheckoutPenalty: Number(earlyCheckoutPenalty) || 0,
      halfDayThresholdHours: Number(halfDayThresholdHours) || 4,
      isDefault: !!isDefault,
    });

    res.status(201).json(policy);
  } catch (error) { next(error); }
};

// @desc    Update an attendance policy
// @route   PUT /api/hr/policies/attendance/:id
// @access  Private/Admin/Manager
const updateAttendancePolicy = async (req, res, next) => {
  try {
    const policy = await AttendancePolicy.findById(req.params.id);
    if (!policy) {
      res.status(404);
      return next(new Error('Attendance Policy not found'));
    }

    if (req.body.isDefault) {
      await AttendancePolicy.updateMany({}, { isDefault: false });
    }

    policy.name = req.body.name || policy.name;
    policy.shiftStartTime = req.body.shiftStartTime || policy.shiftStartTime;
    policy.shiftEndTime = req.body.shiftEndTime || policy.shiftEndTime;
    if (req.body.graceTimeMinutes !== undefined) policy.graceTimeMinutes = Number(req.body.graceTimeMinutes);
    if (req.body.lateArrivalPenalty !== undefined) policy.lateArrivalPenalty = Number(req.body.lateArrivalPenalty);
    if (req.body.earlyCheckoutPenalty !== undefined) policy.earlyCheckoutPenalty = Number(req.body.earlyCheckoutPenalty);
    if (req.body.halfDayThresholdHours !== undefined) policy.halfDayThresholdHours = Number(req.body.halfDayThresholdHours);
    if (req.body.isDefault !== undefined) policy.isDefault = !!req.body.isDefault;

    await policy.save();
    res.json(policy);
  } catch (error) { next(error); }
};

// @desc    Delete an attendance policy
// @route   DELETE /api/hr/policies/attendance/:id
// @access  Private/Admin/Manager
const deleteAttendancePolicy = async (req, res, next) => {
  try {
    const policy = await AttendancePolicy.findById(req.params.id);
    if (!policy) {
      res.status(404);
      return next(new Error('Attendance Policy not found'));
    }
    await policy.deleteOne();
    res.json({ message: 'Attendance policy removed' });
  } catch (error) { next(error); }
};

// @desc    Assign policies to an employee
// @route   POST /api/hr/policies/assign
// @access  Private/Admin/Manager
const assignPoliciesToEmployee = async (req, res, next) => {
  try {
    const { employeeId, leavePolicyId, attendancePolicyId } = req.body;
    if (!employeeId) {
      res.status(400);
      return next(new Error('Employee ID is required'));
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      res.status(404);
      return next(new Error('Employee not found'));
    }

    if (!employee.employeeInfo) {
      employee.employeeInfo = {};
    }

    if (leavePolicyId !== undefined) {
      employee.employeeInfo.leavePolicyId = leavePolicyId || undefined;
    }
    if (attendancePolicyId !== undefined) {
      employee.employeeInfo.attendancePolicyId = attendancePolicyId || undefined;
    }

    await employee.save();
    res.json({ success: true, message: 'Policies updated successfully', employee });
  } catch (error) { next(error); }
};

// @desc    Assign policies to all employees
// @route   POST /api/hr/policies/assign-all
// @access  Private/Admin/Manager
const assignPoliciesToAllEmployees = async (req, res, next) => {
  try {
    const { leavePolicyId, attendancePolicyId } = req.body;

    const updateObj = {};
    if (leavePolicyId !== undefined) {
      updateObj['employeeInfo.leavePolicyId'] = leavePolicyId || null;
    }
    if (attendancePolicyId !== undefined) {
      updateObj['employeeInfo.attendancePolicyId'] = attendancePolicyId || null;
    }

    await User.updateMany(
      { role: { $ne: 'customer' } },
      { $set: updateObj }
    );

    res.json({ success: true, message: 'Policies assigned to all employees successfully' });
  } catch (error) { next(error); }
};

module.exports = {
  getLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  getAttendancePolicies,
  createAttendancePolicy,
  updateAttendancePolicy,
  deleteAttendancePolicy,
  assignPoliciesToEmployee,
  assignPoliciesToAllEmployees,
};
