require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const result = await Expense.findOneAndUpdate(
      { title: 'SRINIVAS KODAD CHITTI', status: 'Unpaid', dueDate: new Date('2026-10-01') },
      { $set: { dueDate: new Date('2026-09-01') } },
      { new: true }
    );
    if (result) {
      console.log('Due date updated successfully!');
      console.log(`New Due Date: ${result.dueDate.toISOString().split('T')[0]}`);
    } else {
      console.log('Record not found.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
