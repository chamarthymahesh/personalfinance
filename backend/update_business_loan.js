const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    const updated = await Category.updateOne(
      { name: 'Business loan EMI' },
      { $set: { fields: [
        { name: 'loanAccount', label: 'Loan Account No', type: 'text', required: true },
        { name: 'bankName', label: 'Bank Name', type: 'text' },
        { name: 'loanHolderName', label: 'Loan Holder Name', type: 'text' },
        { name: 'loanDurationYears', label: 'How many years', type: 'number' },
        { name: 'lastPaymentDate', label: 'Last payment date', type: 'date' }
      ] } }
    );
    console.log('Update Business Loan EMI result:', updated);
    process.exit(0);
  });
