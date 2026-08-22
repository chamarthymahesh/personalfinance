const mongoose = require('mongoose');

const InsuranceSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['LIC', 'Postal', 'Health', 'Term', 'Max Life', 'SBI', 'Other'],
    required: true
  },
  policyNumber: {
    type: String,
    required: true
  },
  holderName: {
    type: String,
    required: true
  },
  term: {
    type: Number, // Years
  },
  premiumAmount: {
    type: Number,
    required: true
  },
  paymentFrequency: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'],
    required: true
  },
  sumAssured: {
    type: Number
  },
  startDate: {
    type: Date
  },
  nextDueDate: {
    type: Date
  },
  remarks: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Insurance', InsuranceSchema);
