const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Private/Admin/Manager
const getAccounts = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    const filter = {};
    if (storeId) filter.storeId = storeId;
    
    const accounts = await Account.find(filter).sort({ name: 1 });
    if (req.user && req.user.role === 'cashier') {
      const safeAccounts = accounts.map(acc => {
        const a = acc.toObject ? acc.toObject() : { ...acc };
        delete a.balance;
        return a;
      });
      return res.json(safeAccounts);
    }
    res.json(accounts);
  } catch (error) { next(error); }
};

// @desc    Create account
// @route   POST /api/accounts
// @access  Private/Admin
const createAccount = async (req, res, next) => {
  try {
    const { storeId, name, type, accountNumber, bankName, balance, isDefault } = req.body;
    
    if (isDefault) {
      await Account.updateMany({ storeId }, { isDefault: false });
    }

    const account = await Account.create({
      storeId,
      name,
      type,
      accountNumber,
      bankName,
      balance: balance || 0,
      isDefault: !!isDefault
    });

    res.status(201).json(account);
  } catch (error) { next(error); }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Private/Admin
const updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) { res.status(404); return next(new Error('Account not found')); }

    const { name, type, accountNumber, bankName, status, isDefault } = req.body;
    
    if (isDefault) {
      await Account.updateMany({ storeId: account.storeId }, { isDefault: false });
    }

    if (name !== undefined) account.name = name;
    if (type !== undefined) account.type = type;
    if (accountNumber !== undefined) account.accountNumber = accountNumber;
    if (bankName !== undefined) account.bankName = bankName;
    if (status !== undefined) account.status = status;
    if (isDefault !== undefined) account.isDefault = isDefault;

    const updated = await account.save();
    res.json(updated);
  } catch (error) { next(error); }
};

// @desc    Get account transactions
// @route   GET /api/accounts/:id/transactions
// @access  Private/Admin/Manager
const getAccountTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ accountId: req.params.id })
      .sort({ date: -1 })
      .limit(100);
    res.json(transactions);
  } catch (error) { next(error); }
};

// @desc    Delete account
// @route   DELETE /api/accounts/:id
// @access  Private/Admin
const deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) { 
      res.status(404); 
      return next(new Error('Account not found')); 
    }
    await account.deleteOne();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) { next(error); }
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountTransactions
};
