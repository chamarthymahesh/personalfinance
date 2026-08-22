require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const bills = await Expense.find({ category: 'Internet bill' }).sort({ createdAt: -1 });
    console.log(`\nTotal Internet bill records: ${bills.length}\n`);
    bills.forEach(b => {
      console.log(`---`);
      console.log(`Title     : ${b.title}`);
      console.log(`Status    : ${b.status}`);
      console.log(`Frequency : ${b.frequency}`);
      console.log(`Amount    : ${b.amount}`);
      console.log(`Details   : ${JSON.stringify(b.details)}`);
      console.log(`Created   : ${b.createdAt}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
