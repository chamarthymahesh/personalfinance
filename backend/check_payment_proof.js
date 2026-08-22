require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const bill = await Expense.findOne({ 
      title: 'SRINIVAS KODAD CHITTI', 
      status: 'Paid' 
    });
    if (bill) {
      console.log('Bill found:');
      console.log('  _id         :', bill._id);
      console.log('  status      :', bill.status);
      console.log('  paymentMode :', bill.paymentMode);
      console.log('  paidDate    :', bill.paidDate);
      console.log('  paymentProof:', bill.paymentProof);
      console.log('  referenceNum:', bill.referenceNumber);
    } else {
      console.log('No paid bill found.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
