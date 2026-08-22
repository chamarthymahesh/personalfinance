const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    const updated = await Category.updateOne(
      { name: 'Vehicle loan EMI' },
      { $set: { fields: [
        { name: 'vehicleNo', label: 'Vehicle Number', type: 'text' },
        { name: 'bankName', label: 'Bank Name', type: 'text' },
        { name: 'loanHolderName', label: 'Loan Holder Name', type: 'text' },
        { name: 'loanDurationYears', label: 'How many years', type: 'number' },
        { name: 'lastPaymentDate', label: 'Last payment date', type: 'date' }
      ] } }
    );
    console.log('Update Vehicle Loan EMI result:', updated);
    
    // ALSO update insurances to have Policy Holder Name (checking if it exists first to avoid duplicates)
    const insurances = await Category.find({ module: 'insurances' });
    for (const ins of insurances) {
      if (!ins.fields.find(f => f.name === 'policyHolderName')) {
        ins.fields.push({ name: 'policyHolderName', label: 'Policy Holder Name', type: 'text', required: true });
        
        // Also add other insurance fields requested earlier: Policy Term, Waiting Period, Maturity Amount, Policy Start Date, Policy End Date, Payment End Date
        const missingFields = [
          { name: 'policyTerm', label: 'Policy Term (Years)', type: 'number' },
          { name: 'waitingPeriod', label: 'Waiting Period', type: 'text' },
          { name: 'maturityAmount', label: 'Maturity Amount', type: 'number' },
          { name: 'policyStartDate', label: 'Policy Start Date', type: 'date' },
          { name: 'policyEndDate', label: 'Policy End Date', type: 'date' },
          { name: 'paymentEndDate', label: 'Payment End Date', type: 'date' }
        ];
        
        for (const f of missingFields) {
           if (!ins.fields.find(existing => existing.name === f.name)) {
             ins.fields.push(f);
           }
        }

        await Category.updateOne({ _id: ins._id }, { $set: { fields: ins.fields } });
      }
    }
    console.log('Updated insurances.');
    
    // Also add Holder Name generally to fields if missing, per user request "HERE ALSO HOLDER NAME REQUIRED" for all forms?
    // Wait, let's just do insurance and loan for now since those are the most specific ones requested.
    
    process.exit(0);
  });
