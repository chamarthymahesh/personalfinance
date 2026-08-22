require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    // Check if a next Unpaid bill already exists for this account
    const existing = await Expense.findOne({ 
      title: '101629490929', 
      category: 'Internet bill', 
      status: 'Unpaid' 
    });

    if (existing) {
      console.log('Next Unpaid bill already exists:', existing.dueDate);
      process.exit(0);
    }

    // Create next Half-Yearly bill (6 months from March 2026 = September 2026)
    const nextDue = new Date('2026-09-01');

    const nextBill = await Expense.create({
      title: '101629490929',
      category: 'Internet bill',
      amount: 3564,
      frequency: 'Half-Yearly',
      dueDate: nextDue,
      status: 'Unpaid',
      details: {
        accountId: '101629490929',
        accountHolderName: 'Mahesh',
        location: 'Kothapet',
        providerName: 'ACT Fibernet'
      }
    });

    console.log('Next Half-Yearly bill created successfully!');
    console.log(`Title: ${nextBill.title}`);
    console.log(`Due Date: ${nextBill.dueDate.toDateString()}`);
    console.log(`Amount: ₹${nextBill.amount}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
