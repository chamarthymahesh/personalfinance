const Expense = require('../models/Expense');

async function syncExpenseStatus(expenseId, outstandingBalance) {
  try {
    if (outstandingBalance <= 0) {
      await Expense.findByIdAndUpdate(expenseId, { status: 'Paid' });
    } else {
      await Expense.findByIdAndUpdate(expenseId, { status: 'Unpaid' });
    }
  } catch (error) {
    console.error('Error syncing expense status:', error);
  }
}

module.exports = syncExpenseStatus;
