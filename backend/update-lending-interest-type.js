require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const LendingLedger = require('./models/LendingLedger');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    // 1. Update the categories
    const categoriesToUpdate = [
      { name: 'Interest given (lending)' },
      { name: 'Interest taken (borrowing)' }
    ];

    for (const cat of categoriesToUpdate) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        {
          $set: {
            fields: [
              { name: 'personName', label: 'Person Name', type: 'text', required: true },
              { name: 'interestRate', label: 'Interest Rate (%)', type: 'percentage' },
              {
                name: 'interestType',
                label: 'Interest Type',
                type: 'select',
                options: ['Simple Interest', 'Compound Interest'],
                required: true
              }
            ]
          }
        }
      );
      console.log(`Updated category schema for: ${cat.name}`);
    }

    // 2. Set default interestType to 'Simple Interest' for existing LendingLedgers
    const updateLedgers = await LendingLedger.updateMany(
      { interestType: { $exists: false } },
      { $set: { interestType: 'Simple Interest' } }
    );
    console.log(`Updated ${updateLedgers.modifiedCount} existing LendingLedger(s) to 'Simple Interest'`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
