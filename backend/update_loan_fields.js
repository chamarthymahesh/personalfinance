require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const loanCategories = ['Vehicle loan EMI', 'Business loan EMI'];
    
    for (const name of loanCategories) {
      const cat = await Category.findOne({ name });
      if (cat) {
        let updated = false;
        
        // Add loanStartDate
        const hasStartDate = cat.fields.some(f => f.name === 'loanStartDate');
        if (!hasStartDate) {
          cat.fields.push({
            name: 'loanStartDate',
            label: 'Loan Start Date',
            type: 'date',
            required: false
          });
          updated = true;
          console.log(`Added loanStartDate to ${name}`);
        }

        // Add totalLoanAmount
        const hasTotalAmount = cat.fields.some(f => f.name === 'totalLoanAmount');
        if (!hasTotalAmount) {
          cat.fields.push({
            name: 'totalLoanAmount',
            label: 'Total Loan Amount',
            type: 'number',
            required: false
          });
          updated = true;
          console.log(`Added totalLoanAmount to ${name}`);
        }
        
        if (updated) {
          await cat.save();
        } else {
          console.log(`Fields already exist in ${name}`);
        }
      } else {
        console.log(`Category not found: ${name}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
