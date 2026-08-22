const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Given to Others', 'Taken from Others', 'Business Loan', 'Vehicle Loan'],
    required: true
  },
  partyName: {
    type: String,
    required: true
  },
  principalAmount: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number, // Percentage
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Closed'],
    default: 'Active'
  },
  repaymentHistory: [{
    date: Date,
    amount: Number,
    type: { type: String, enum: ['Principal', 'Interest'] }
  }],
  remarks: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Loan', LoanSchema);
