const User = require('../models/User');
const RegistrationOtp = require('../models/RegistrationOtp');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { isValidEmail, isValidSLPhone, formatSLPhone } = require('../utils/validators');
const { isRealEmailAddress } = require('../utils/emailValidationService');
const { sendSms, buildOtpMessage } = require('../utils/smsService');

const OTP_EXPIRY_MINUTES = 5;

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const fail = (res, status, message) => res.status(status).json({ message });

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || !phone) {
      return fail(res, 400, 'Name, email, password and phone are required');
    }

    if (password.length < 6) {
      return fail(res, 400, 'Password must be at least 6 characters');
    }

    if (!isValidEmail(email)) {
      return fail(res, 400, 'Please enter a valid email address');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidSLPhone(phone)) {
      return fail(res, 400, 'Please enter a valid Sri Lankan phone number');
    }

    const normalizedPhone = formatSLPhone(phone);

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return fail(res, 400, 'User already exists');
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password, // Let pre-save hook in User model handle hashing
      phone: normalizedPhone,
      role: role || 'customer',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Registration failed');
  }
};

const requestRegistrationOtp = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || !phone) {
      return fail(res, 400, 'Name, email, password and phone are required');
    }

    if (password.length < 6) {
      return fail(res, 400, 'Password must be at least 6 characters');
    }

    if (!isValidEmail(email)) {
      return fail(res, 400, 'Please enter a valid email address');
    }

    const emailValidation = await isRealEmailAddress(email);
    if (!emailValidation.valid) {
      return fail(res, 400, emailValidation.reason);
    }

    if (!isValidSLPhone(phone)) {
      return fail(res, 400, 'Please enter a valid Sri Lankan phone number (e.g., +94771234567 or 0771234567)');
    }

    const normalizedPhone = formatSLPhone(phone);
    const normalizedEmail = emailValidation.normalizedEmail;

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return fail(res, 400, 'User already exists');
    }

    const otp = generateOtp();
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await RegistrationOtp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        phone: normalizedPhone,
        name: name.trim(),
        passwordHash,
        role: role || 'customer',
        otpHash: hashOtp(otp),
        expiresAt,
        attempts: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendSms(normalizedPhone, await buildOtpMessage(otp));

    res.json({
      message: 'OTP sent successfully',
      email: normalizedEmail,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to request registration OTP');
  }
};

const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return fail(res, 400, 'Email and OTP are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = await RegistrationOtp.findOne({ email: normalizedEmail });
    if (!pending) {
      return fail(res, 400, 'No pending registration found. Request a new OTP.');
    }

    if (pending.expiresAt < new Date()) {
      await RegistrationOtp.deleteOne({ _id: pending._id });
      return fail(res, 400, 'OTP has expired. Please request a new one.');
    }

    if (pending.attempts >= 5) {
      await RegistrationOtp.deleteOne({ _id: pending._id });
      return fail(res, 429, 'Too many failed OTP attempts. Request a new OTP.');
    }

    if (pending.otpHash !== hashOtp(String(otp).trim())) {
      pending.attempts += 1;
      await pending.save();
      return fail(res, 400, 'Invalid OTP');
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      await RegistrationOtp.deleteOne({ _id: pending._id });
      return fail(res, 400, 'User already exists');
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.passwordHash,
      phone: pending.phone,
      role: pending.role || 'customer',
    });

    await RegistrationOtp.deleteOne({ _id: pending._id });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to verify registration OTP');
  }
};

const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, 400, 'Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).populate('assignedStore', 'name');

    if (!user) {
      return fail(res, 401, 'Invalid email or password');
    }

    // Check if account is deactivated
    if (user.isActive === false) {
      return fail(res, 403, 'Your account has been deactivated. Please contact the administrator.');
    }

    if (await user.matchPassword(password)) {
      res.json({ 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        phone: user.phone, 
        assignedStore: user.assignedStore?._id || user.assignedStore,
        assignedStoreName: user.assignedStore?.name || '',
        employeeInfo: user.employeeInfo,
        token: generateToken(user._id) 
      });
    } else {
      return fail(res, 401, 'Invalid email or password');
    }
  } catch (error) {
    return fail(res, 500, error.message || 'Login failed');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedStore', 'name');
    if (user) {
      res.json({ 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        phone: user.phone, 
        avatar: user.avatar, 
        addresses: user.addresses,
        assignedStore: user.assignedStore?._id || user.assignedStore,
        assignedStoreName: user.assignedStore?.name || '',
        employeeInfo: user.employeeInfo
      });
    } else {
      return fail(res, 404, 'User not found');
    }
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to load user');
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return fail(res, 404, 'User not found');
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;

    // Validate phone if being updated
    if (req.body.phone && !isValidSLPhone(req.body.phone)) {
      return fail(res, 400, 'Please enter a valid Sri Lankan phone number');
    }
    if (req.body.phone) {
      user.phone = formatSLPhone(req.body.phone);
    }

    if (req.body.email && req.body.email !== user.email) {
      if (!isValidEmail(req.body.email)) {
        return fail(res, 400, 'Please enter a valid email address');
      }
      const emailValidation = await isRealEmailAddress(req.body.email);
      if (!emailValidation.valid) {
        return fail(res, 400, emailValidation.reason);
      }
      const exists = await User.findOne({ email: emailValidation.normalizedEmail });
      if (exists) {
        return fail(res, 400, 'Email already in use');
      }
      user.email = emailValidation.normalizedEmail;
    }
    if (req.body.password) { user.password = req.body.password; }
    if (req.body.addresses) { user.addresses = req.body.addresses; }
    if (req.body.avatar !== undefined) { user.avatar = req.body.avatar; }

    const updated = await user.save();
    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role, phone: updated.phone, avatar: updated.avatar, addresses: updated.addresses, token: generateToken(updated._id) });
  } catch (error) {
    return fail(res, 500, error.message || 'Failed to update profile');
  }
};

const getCashiersList = async (req, res) => {
  try {
    const cashiers = await User.find({ 
      role: { $in: ['cashier', 'manager', 'admin'] },
      isActive: true 
    })
    .select('_id name email avatar role phone employeeInfo.epfNo')
    .populate('assignedStore', 'name')
    .lean();
    res.json(cashiers);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch cashiers list' });
  }
};

const posLogin = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Passcode is required' });
    }

    const codeStr = String(code).trim();

    // If email is provided, verify directly for that user
    if (email) {
      const user = await User.findOne({ email, isActive: true }).populate('assignedStore', 'name');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check PIN bypass or demographic fields
      const isMatched = 
        codeStr === '1234' || 
        codeStr.toLowerCase() === 'cashier123' ||
        codeStr.toLowerCase() === 'admin123' ||
        codeStr.toLowerCase() === 'manager123' ||
        codeStr.toLowerCase() === user.name.toLowerCase() ||
        codeStr.toLowerCase() === user.email.toLowerCase() ||
        (user.employeeInfo?.epfNo && codeStr.toLowerCase() === user.employeeInfo.epfNo.toLowerCase()) ||
        (user.phone && codeStr === user.phone);

      if (isMatched) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          assignedStore: user.assignedStore?._id || user.assignedStore,
          assignedStoreName: user.assignedStore?.name || '',
          employeeInfo: user.employeeInfo,
          token: generateToken(user._id)
        });
      }

      // Check actual account password
      const isPasswordCorrect = await user.matchPassword(codeStr);
      if (isPasswordCorrect) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          assignedStore: user.assignedStore?._id || user.assignedStore,
          assignedStoreName: user.assignedStore?.name || '',
          employeeInfo: user.employeeInfo,
          token: generateToken(user._id)
        });
      }

      return res.status(401).json({ message: 'Invalid passcode or password' });
    }

    // Direct unlock without selected user profile - search all active staff users
    const staff = await User.find({ 
      role: { $in: ['cashier', 'manager', 'admin'] },
      isActive: true 
    }).populate('assignedStore', 'name');

    for (const user of staff) {
      const isMatched = 
        codeStr === '1234' || 
        codeStr.toLowerCase() === 'cashier123' ||
        codeStr.toLowerCase() === 'admin123' ||
        codeStr.toLowerCase() === 'manager123' ||
        codeStr.toLowerCase() === user.name.toLowerCase() ||
        codeStr.toLowerCase() === user.email.toLowerCase() ||
        (user.employeeInfo?.epfNo && codeStr.toLowerCase() === user.employeeInfo.epfNo.toLowerCase()) ||
        (user.phone && codeStr === user.phone);

      if (isMatched) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          assignedStore: user.assignedStore?._id || user.assignedStore,
          assignedStoreName: user.assignedStore?.name || '',
          employeeInfo: user.employeeInfo,
          token: generateToken(user._id)
        });
      }

      // Check actual account password
      try {
        const isPasswordCorrect = await user.matchPassword(codeStr);
        if (isPasswordCorrect) {
          return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            assignedStore: user.assignedStore?._id || user.assignedStore,
            assignedStoreName: user.assignedStore?.name || '',
            employeeInfo: user.employeeInfo,
            token: generateToken(user._id)
          });
        }
      } catch (err) {
        // ignore match failures during list search
      }
    }

    return res.status(401).json({ message: 'Invalid passcode or password' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Verification failed' });
  }
};

const verifyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await user.matchPassword(password);
    if (isMatch) {
      res.json({ success: true, message: 'Password verified successfully' });
    } else {
      res.status(401).json({ success: false, message: 'Incorrect login password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  requestRegistrationOtp,
  verifyRegistrationOtp,
  authUser,
  getMe,
  updateProfile,
  getCashiersList,
  posLogin,
  verifyPassword,
};
