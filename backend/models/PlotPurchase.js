const mongoose = require('mongoose');

// Each payment made towards the plot (by any partner)
const PaymentSchema = new mongoose.Schema({
  paidBy: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  transactionId: { type: String, default: '' },
  paymentMode: { type: String, default: '' },
  proofUrl: { type: String, default: '' },     // external URL (optional)
  proofFile: { type: String, default: '' },    // uploaded filename (via multer)
  notes: { type: String, default: '' }
}, { timestamps: true });

// Commission agent for the plot
const CommissionAgentSchema = new mongoose.Schema({
  agentName: { type: String, required: true },
  commissionAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paymentDate: { type: Date },
  transactionId: { type: String, default: '' },
  paymentMode: { type: String, default: '' },
  proofFile: { type: String, default: '' },
  proofUrl: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Each partner's profile
const PartnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sharePercent: { type: Number, required: true, default: 50 },
  shareAmount: { type: Number, required: true }
});

// The main plot document
const PlotPurchaseSchema = new mongoose.Schema({
  plotName: { type: String, required: true },
  location: { type: String, default: '' },
  area: { type: String, default: '' },
  totalCost: { type: Number, required: true },
  registrationDate: { type: Date },
  notes: { type: String, default: '' },
  partners: [PartnerSchema],
  payments: [PaymentSchema],
  commissionAgents: [CommissionAgentSchema]
}, { timestamps: true });

module.exports = mongoose.model('PlotPurchase', PlotPurchaseSchema);
