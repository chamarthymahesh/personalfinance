require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const rentCategory = {
      name: 'House Rent',
      module: 'expenses',
      fields: [
        {
          name: 'ownerName',
          label: 'Owner Name',
          type: 'text',
          required: false
        },
        {
          name: 'propertyAddress',
          label: 'Property Address',
          type: 'text',
          required: false
        }
      ]
    };

    const existing = await Category.findOne({ name: 'House Rent' });
    if (existing) {
      existing.fields = rentCategory.fields;
      existing.module = rentCategory.module;
      await existing.save();
      console.log('House Rent category updated');
    } else {
      await Category.create(rentCategory);
      console.log('House Rent category added');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
