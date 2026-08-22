require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const cats = await Category.find({ module: 'expenses' });
    console.log(cats.map(c => c.name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
