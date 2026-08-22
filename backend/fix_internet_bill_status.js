require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const result = await Expense.findOneAndUpdate(
      { title: '101629490929', category: 'Internet bill', frequency: 'Half-Yearly' },
      { $set: { status: 'Unpaid' } },
      { new: true }
    );
    if (result) {
      console.log('Successfully updated status to Unpaid:');
      console.log(`Title: ${result.title}, Status: ${result.status}, Frequency: ${result.frequency}`);
    } else {
      console.log('Bill not found.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
