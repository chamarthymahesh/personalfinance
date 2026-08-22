require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const electricity = await Category.findOne({ name: 'Electricity bills' });
    if (electricity) {
      const hasBillingMonth = electricity.fields.some(f => f.name === 'billingMonth');
      if (!hasBillingMonth) {
        electricity.fields.push({
          name: 'billingMonth',
          label: 'Billing Month',
          type: 'month',
          required: true
        });
        await electricity.save();
        console.log('Added Billing Month field successfully.');
      } else {
        console.log('Billing Month field already exists.');
      }
    } else {
      console.log('Category "Electricity bills" not found.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
