const mongoose = require('mongoose');

// Each payment made towards the plot (by any partner)
const PaymentSchema = new mongoose.Schema({
  paidBy: { type: String, required: true },        // Partner name who made this payment
  amount: { type: Number, required: true },          // Amount paid in this transaction
  date: { type: Date, required: true, default: Date.now },
  transactionId: { type: String, default: '' },      // Bank ref / UPI ID etc
  paymentMode: { type: String, default: '' },        // Cash / Bank Transfer / Cheque / UPI
  proofUrl: { type: String, default: '' },           // URL or filename of receipt/screenshot
  notes: { type: String, default: '' }
}, { timestamps: true });

// Each partner's profile
const PartnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sharePercent: { type: Number, required: true, default: 50 },  // e.g. 50 for 50%
  shareAmount: { type: Number, required: true }                  // Derived: totalCost * sharePercent / 100
});

// The main plot document
const PlotPurchaseSchema = new mongoose.Schema({
  plotName: { type: String, required: true },         // e.g. "Sy No. 45, Shadnagar"
  location: { type: String, default: '' },            // Address / survey number
  area: { type: String, default: '' },               // e.g. "300 sq yards"
  totalCost: { type: Number, required: true },        // e.g. 12000000
  registrationDate: { type: Date },
  notes: { type: String, default: '' },
  partners: [PartnerSchema],
  payments: [PaymentSchema]
}, { timestamps: true });

module.exports = mongoose.model('PlotPurchase', PlotPurchaseSchema);
