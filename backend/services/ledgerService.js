const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

/**
 * Centralized service to record transactions and update account balances.
 * This ensures all financial data is synchronized across POS, Expenses, and Income.
 */
const recordTransaction = async ({
  storeId,
  accountId,
  type, // 'income' | 'expense' | 'transfer'
  category,
  amount,
  paymentMethod,
  chequeDetails,
  referenceNo,
  description,
  createdBy,
  date = new Date()
}) => {
  // Normalize paymentMethod for Transaction model enum (e.g., 'bank_transfer' -> 'Bank Transfer')
  let normalizedMethod = paymentMethod;
  const map = {
    'cash': 'Cash',
    'bank_transfer': 'Bank Transfer',
    'cheque': 'Cheque',
    'card': 'Card',
    'payhere': 'Card',
    'other': 'Card',
    'koko': 'Koko',
    'hire_purchase': 'Hire Purchase'
  };
  if (map[paymentMethod?.toLowerCase()]) {
    normalizedMethod = map[paymentMethod.toLowerCase()];
  }

  // 1. Create the transaction record
  const transaction = await Transaction.create({
    storeId,
    accountId,
    type,
    category,
    amount,
    paymentMethod: normalizedMethod,
    chequeDetails,
    referenceNo,
    description,
    createdBy,
    date
  });

  // 2. Update account balance if an account is linked
  // Note: For cheques, we only update when cleared (handled in status update controllers)
  if (accountId && paymentMethod?.toLowerCase() !== 'cheque') {
    const account = await Account.findById(accountId);
    if (account) {
      if (type === 'income') {
        account.balance += Number(amount);
      } else if (type === 'expense') {
        account.balance -= Number(amount);
      }
      await account.save();
    }
  }

  return transaction;
};

/**
 * Special handler for transfers between accounts
 */
const recordTransfer = async ({
  storeId,
  fromAccountId,
  toAccountId,
  amount,
  referenceNo,
  description,
  createdBy
}) => {
  // 1. Deduct from source
  await recordTransaction({
    storeId,
    accountId: fromAccountId,
    type: 'expense',
    category: 'Internal Transfer (Out)',
    amount,
    paymentMethod: 'Bank Transfer',
    referenceNo,
    description: `Transfer to ${toAccountId}: ${description}`,
    createdBy
  });

  // 2. Add to destination
  await recordTransaction({
    storeId,
    accountId: toAccountId,
    type: 'income',
    category: 'Internal Transfer (In)',
    amount,
    paymentMethod: 'Bank Transfer',
    referenceNo,
    description: `Transfer from ${fromAccountId}: ${description}`,
    createdBy
  });
};

module.exports = {
  recordTransaction,
  recordTransfer
};
