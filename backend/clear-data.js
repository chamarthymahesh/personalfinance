const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Expense = require('./models/Expense');

dotenv.config();

const clearExpenses = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const res = await Expense.deleteMany({});
    console.log(`Deleted ${res.deletedCount} expenses from the database.`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

clearExpenses();
