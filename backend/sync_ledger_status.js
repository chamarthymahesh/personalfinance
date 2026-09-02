const mongoose = require('mongoose');
require('dotenv').config();
const Expense = require('./models/Expense');
const LendingLedger = require('./models/LendingLedger');
const HandLoanLedger = require('./models/HandLoanLedger');
const InvestmentLedger = require('./models/InvestmentLedger');

async function syncLedgerStatus() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/finance_tracker');
  console.log('Connected to DB');

  const ledgers = await LendingLedger.find();
  for (let l of ledgers) {
    if (l.outstandingBalance <= 0) {
      await Expense.findByIdAndUpdate(l.expenseId, { status: 'Paid' });
      console.log('Closed LendingLedger for Expense:', l.expenseId);
    } else {
      await Expense.findByIdAndUpdate(l.expenseId, { status: 'Unpaid' });
    }
  }

  const handLoans = await HandLoanLedger.find();
  for (let l of handLoans) {
    if (l.outstandingBalance <= 0) {
      await Expense.findByIdAndUpdate(l.expenseId, { status: 'Paid' });
      console.log('Closed HandLoan for Expense:', l.expenseId);
    } else {
      await Expense.findByIdAndUpdate(l.expenseId, { status: 'Unpaid' });
    }
  }

  console.log('Sync complete');
  process.exit();
}

syncLedgerStatus();
