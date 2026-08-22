require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const electricity = await Category.findOne({ name: 'Current (electricity) bills' });
    if (electricity) {
      electricity.name = 'Electricity bills';
      await electricity.save();
      console.log('Category renamed successfully.');
    } else {
      console.log('Category not found.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
