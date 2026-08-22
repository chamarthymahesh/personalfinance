const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    const updated = await Category.updateOne(
      { name: 'Property rental income' },
      { $push: { fields: { name: 'rentalAgreement', label: 'Rental Agreement (PDF)', type: 'file' } } }
    );
    console.log('Update Property Rental Income result:', updated);
    process.exit(0);
  });
