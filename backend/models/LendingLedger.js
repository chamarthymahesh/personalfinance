const mongoose = require('mongoose');

const LedgerEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['interest', 'partial_payment', 'opening'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Other', ''],
    default: ''
  },
  proofUrl: {
    type: String,
    default: ''
  },
  monthLabel: {
    type: String,
    default: ''
  }
});

const LendingLedgerSchema = new mongoose.Schema({
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  personName: {
    type: String,
    required: true
  },
  principalAmount: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number,
    required: true,
    default: 0
  },
  interestType: {
    type: String,
    enum: ['Simple Interest', 'Compound Interest'],
    default: 'Simple Interest'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  outstandingBalance: {
    type: Number,
    required: true
  },
  entries: [LedgerEntrySchema]
}, { timestamps: true });

module.exports = mongoose.model('LendingLedger', LendingLedgerSchema);
