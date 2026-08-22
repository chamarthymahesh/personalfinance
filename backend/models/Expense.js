const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title']
  },
  category: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  frequency: {
    type: String,
    enum: ['Monthly', 'Yearly', 'One-time'],
    required: true
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  paymentMode: {
    type: String
  },
  paidDate: {
    type: Date
  },
  referenceNumber: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
