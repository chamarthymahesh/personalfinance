const mongoose = require('mongoose');

const InvestmentEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['invest', 'withdraw', 'opening'],
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
  totalInvestedAfter: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  paymentMode: {
    type: String,
    default: ''
  }
});

const InvestmentLedgerSchema = new mongoose.Schema({
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  fundName: {
    type: String,
    required: true
  },
  totalInvested: {
    type: Number,
    required: true,
    default: 0
  },
  entries: [InvestmentEntrySchema]
}, { timestamps: true });

module.exports = mongoose.model('InvestmentLedger', InvestmentLedgerSchema);
