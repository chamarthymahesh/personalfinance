require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const result = await Expense.updateMany(
      { category: 'Current (electricity) bills' },
      { $set: { category: 'Electricity bills' } }
    );
    console.log('Expenses updated:', result.modifiedCount);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
