const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const missingCategories = [
  // FIXED BILLS (module: 'expenses')
  { name: 'Current (electricity) bills', module: 'expenses', fields: [{ name: 'consumerNumber', label: 'Consumer Number', type: 'text', required: true }] },
  { name: 'Phone bill', module: 'expenses', fields: [{ name: 'mobileNumber', label: 'Mobile Number', type: 'text', required: true }] },
  { name: 'Internet bill', module: 'expenses', fields: [{ name: 'accountId', label: 'Account ID', type: 'text', required: true }] },
  
  // INVESTMENTS (module: 'investments')
  { name: 'Mutual funds - SIP', module: 'investments', fields: [{ name: 'folioNumber', label: 'Folio Number', type: 'text' }] },
  { name: 'Mutual funds - Lumpsum', module: 'investments', fields: [{ name: 'folioNumber', label: 'Folio Number', type: 'text' }] },
  
  // INSURANCE (module: 'insurances')
  { name: 'Postal insurance (PLI / RPLI)', module: 'insurances', fields: [{ name: 'policyNumber', label: 'Policy Number', type: 'text', required: true }] },
  { name: 'LIC premium', module: 'insurances', fields: [{ name: 'policyNumber', label: 'Policy Number', type: 'text', required: true }] },
  { name: 'Health insurance', module: 'insurances', fields: [{ name: 'policyNumber', label: 'Policy Number', type: 'text', required: true }] },
  { name: 'Term insurance', module: 'insurances', fields: [{ name: 'policyNumber', label: 'Policy Number', type: 'text', required: true }] },
  { name: 'Max Life insurance', module: 'insurances', fields: [{ name: 'policyNumber', label: 'Policy Number', type: 'text', required: true }] },
  { name: 'SBI Life insurance', module: 'insurances', fields: [{ name: 'policyNumber', label: 'Policy Number', type: 'text', required: true }] },
  
  // LENDING & BORROWING (module: 'lending')
  { name: 'Interest given (lending)', module: 'lending', fields: [{ name: 'personName', label: 'Person Name', type: 'text', required: true }, { name: 'interestRate', label: 'Interest Rate (%)', type: 'percentage' }] },
  { name: 'Interest taken (borrowing)', module: 'lending', fields: [{ name: 'personName', label: 'Person Name', type: 'text', required: true }, { name: 'interestRate', label: 'Interest Rate (%)', type: 'percentage' }] },
  
  // LOANS (module: 'loans')
  { name: 'Business loan EMI', module: 'loans', fields: [{ name: 'loanAccount', label: 'Loan Account No', type: 'text', required: true }] },
  { name: 'Vehicle loan EMI', module: 'loans', fields: [
    { name: 'vehicleNo', label: 'Vehicle Number', type: 'text' },
    { name: 'bankName', label: 'Bank Name', type: 'text' },
    { name: 'loanHolderName', label: 'Loan Holder Name', type: 'text' },
    { name: 'loanDurationYears', label: 'How many years', type: 'number' },
    { name: 'lastPaymentDate', label: 'Last payment date', type: 'date' }
  ] },
  
  // PROPERTY & FAMILY (module: 'properties')
  { name: 'Property rental income', module: 'properties', fields: [{ name: 'tenantName', label: 'Tenant Name', type: 'text', required: true }] },
  
  // OTHER (module: 'other')
  { name: 'Other expenses', module: 'other', fields: [] }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Also update existing seeded categories to have correct modules
    await Category.updateOne({ name: 'House Rent' }, { $set: { name: 'House & Godown Rent', module: 'expenses' } });
    await Category.deleteMany({ name: { $in: ['Godown Rent', 'Electricity', 'Phone', 'Internet'] } });
    
    // Check missing
    for (const cat of missingCategories) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) {
        await Category.create(cat);
        console.log(`Added: ${cat.name}`);
      }
    }
    
    console.log('Done seeding!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
