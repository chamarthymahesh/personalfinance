require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const bills = await Expense.find({ title: 'SRINIVAS KODAD CHITTI' }).sort({ createdAt: 1 });
    console.log(`\nTotal records: ${bills.length}\n`);
    bills.forEach((b, i) => {
      console.log(`[${i+1}] Status: ${b.status}`);
      console.log(`     Due Date  : ${b.dueDate ? b.dueDate.toISOString().split('T')[0] : 'NOT SET'}`);
      console.log(`     Paid Date : ${b.paidDate ? b.paidDate.toISOString().split('T')[0] : '-'}`);
      console.log(`     Amount    : ₹${b.amount}`);
      console.log(`     Created   : ${b.createdAt.toISOString().split('T')[0]}`);
      console.log('');
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
