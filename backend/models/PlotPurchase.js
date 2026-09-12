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
  commissionType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  commissionPercentage: { type: Number, default: 0 },
  commissionAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paidBy: { type: String, default: '' }, // Partner who paid the commission
  paymentDate: { type: Date },
  transactionId: { type: String, default: '' },
  paymentMode: { type: String, default: '' },
  proofFile: { type: String, default: '' },
  proofUrl: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Other expenses (Registration, Document Charges, Misc)
const OtherExpenseSchema = new mongoose.Schema({
  expenseName: { type: String, required: true }, // e.g., 'Registration', 'Document Charges'
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  paidBy: { type: String, required: true }, // Partner who paid the expense
  paymentMode: { type: String, default: '' },
  transactionId: { type: String, default: '' },
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
  area: { type: String, default: '' }, // Legacy text field
  totalYards: { type: Number, default: 0 },
  registeredYards: { type: Number, default: 0 },
  pricePerYard: { type: Number, default: 0 },
  totalCost: { type: Number, required: true },
  registrationDate: { type: Date },
  notes: { type: String, default: '' },
  salesTracking: {
    yardsSold: { type: Number, default: 0 },
    salePricePerYard: { type: Number, default: 0 },
    profit: { type: Number, default: 0 }
  },
  partners: [PartnerSchema],
  payments: [PaymentSchema],
  commissionAgents: [CommissionAgentSchema],
  otherExpenses: [OtherExpenseSchema]
}, { timestamps: true });

module.exports = mongoose.model('PlotPurchase', PlotPurchaseSchema);
