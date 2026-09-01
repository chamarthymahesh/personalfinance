const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const HandLoanLedger = require('./models/HandLoanLedger');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/financetracker');
  const ledgers = await HandLoanLedger.find();
  for (const l of ledgers) {
    if (l.personName === 'MADHURI') {
      console.log('MADHURI LEDGER:');
      console.log('currentBalance:', l.currentBalance);
      console.log('entries:');
      l.entries.forEach(e => {
        console.log(`  ${e.date.toISOString().split('T')[0]} | ${e.type} | ${e.amount} | balAfter: ${e.balanceAfter}`);
      });
    }
  }
  process.exit(0);
}
test();
