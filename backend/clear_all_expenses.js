const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Expense = mongoose.model('Expense', new mongoose.Schema({}, { strict: false }));
    const result = await Expense.deleteMany({});
    console.log('Deleted all expenses:', result);
    process.exit(0);
  });
