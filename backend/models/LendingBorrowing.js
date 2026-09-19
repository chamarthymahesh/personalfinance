const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  investmentAmount: { type: Number, required: true },
  profitShareAmount: { type: Number, default: 0 }
});

const LendingBorrowingSchema = new mongoose.Schema({
  borrowedFrom: { type: String, required: true },
  borrowedPrincipal: { type: Number, required: true },
  borrowedInterestRate: { type: Number, required: true },
  borrowedInterestType: { type: String, enum: ['Simple Interest', 'Compound Interest', 'Yearly Compound Interest'], default: 'Simple Interest' },
  
  lentTo: { type: String, required: true },
  lentInterestRate: { type: Number, required: true },
  lentInterestType: { type: String, enum: ['Simple Interest', 'Compound Interest', 'Yearly Compound Interest'], default: 'Simple Interest' },
  
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date }, // Set when closed
  status: { type: String, enum: ['Active', 'Closed'], default: 'Active' },
  
  partners: [PartnerSchema],
  
  // Computed fields when closed
  totalBorrowedInterest: { type: Number, default: 0 },
  totalLentInterest: { type: Number, default: 0 },
  totalProfit: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('LendingBorrowing', LendingBorrowingSchema);
