const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
  holderName: {
    type: String,
    required: true
  },
  fundName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['SIP', 'Lumpsum'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  remarks: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Investment', InvestmentSchema);
