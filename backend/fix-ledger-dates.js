const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Expense = mongoose.model('Expense', new mongoose.Schema({}, { strict: false }));
    const InvestmentLedger = require('./models/InvestmentLedger');
    
    const ledgers = await InvestmentLedger.find();
    for (const ledger of ledgers) {
      const expense = await Expense.findById(ledger.expenseId);
      if (expense && expense.details && expense.details.startDate) {
        // Find opening entry
        const openingEntry = ledger.entries.find(e => e.type === 'opening');
        if (openingEntry) {
          openingEntry.date = new Date(expense.details.startDate);
          
          // Re-sort entries just in case
          ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          await ledger.save();
          console.log(`Updated opening date for ${ledger.fundName} to ${expense.details.startDate}`);
        }
      }
    }
    
    console.log('Done fixing ledger dates.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
