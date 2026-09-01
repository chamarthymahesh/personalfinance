const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const HandLoanLedger = require('./models/HandLoanLedger');

function recalculateBalance(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  for (const e of sorted) {
    if (e.type === 'opening') {
      balance = parseFloat((balance + e.amount).toFixed(2));
    } else if (e.type === 'given') {
      balance = parseFloat((balance + e.amount).toFixed(2));
    } else if (e.type === 'received') {
      balance = parseFloat((balance - e.amount).toFixed(2));
    }
    e.balanceAfter = balance;
  }
  return { sortedEntries: sorted, finalBalance: balance };
}

async function fixBalances() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/financetracker'; // Fallback to local
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const ledgers = await HandLoanLedger.find();
    let count = 0;
    for (const ledger of ledgers) {
      const { sortedEntries, finalBalance } = recalculateBalance(ledger.entries);
      ledger.entries = sortedEntries;
      ledger.currentBalance = finalBalance;
      await ledger.save();
      count++;
    }
    console.log(`Successfully fixed balances for ${count} ledgers.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
fixBalances();
