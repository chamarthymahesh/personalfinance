const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    
    const mfCategories = await Category.find({ 
      name: { $in: ['Mutual funds - SIP', 'Mutual funds - Lumpsum'] } 
    });

    for (const cat of mfCategories) {
      if (!cat.fields.find(f => f.name === 'startDate')) {
        cat.fields.push({ name: 'startDate', label: 'Start Date', type: 'date' });
        await Category.updateOne({ _id: cat._id }, { $set: { fields: cat.fields } });
        console.log(`Added startDate field to ${cat.name}`);
      }
    }

    console.log('Done updating mutual fund categories.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
