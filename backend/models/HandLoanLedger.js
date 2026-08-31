const mongoose = require('mongoose');

const HandLoanLedgerEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['opening', 'given', 'received'],
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
  }
});

const HandLoanLedgerSchema = new mongoose.Schema({
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  personName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentBalance: {
    type: Number,
    required: true
  },
  entries: [HandLoanLedgerEntrySchema]
}, { timestamps: true });

module.exports = mongoose.model('HandLoanLedger', HandLoanLedgerSchema);
