require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const cat = await Category.findOne({ name: 'Vehicle loan EMI' });
    if (cat) {
      // Check if it already has the field
      const hasField = cat.fields.some(f => f.name === 'financeCompany');
      if (!hasField) {
        cat.fields.push({
          name: 'financeCompany',
          label: 'Finance Company / Bank',
          type: 'text',
          required: false
        });
        await cat.save();
        console.log('Finance Company field added.');
      } else {
        console.log('Field already exists.');
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
