const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    const Expense = mongoose.model('Expense', new mongoose.Schema({}, { strict: false }));
    
    const mfCategories = await Category.find({ 
      name: { $in: ['Mutual funds - SIP', 'Mutual funds - Lumpsum'] } 
    });

    for (const cat of mfCategories) {
      if (!cat.fields.find(f => f.name === 'fundName')) {
        // Add fundName field at the beginning
        cat.fields.unshift({ name: 'fundName', label: 'Fund Name', type: 'text', required: true });
        
        // Also ensure holderName exists, user showed it in screenshot
        if (!cat.fields.find(f => f.name === 'holderName')) {
          cat.fields.push({ name: 'holderName', label: 'Holder Name', type: 'text' });
        }

        await Category.updateOne({ _id: cat._id }, { $set: { fields: cat.fields } });
        console.log(`Updated fields for ${cat.name}`);
      }
    }
    
    // Check if we need to update any existing expenses with default fundName
    const expenses = await Expense.find({ category: { $in: ['Mutual funds - SIP', 'Mutual funds - Lumpsum'] } });
    for (const exp of expenses) {
      let changed = false;
      if (!exp.details) exp.details = {};
      if (!exp.details.fundName) {
        exp.details.fundName = exp.title || 'Unknown Fund';
        changed = true;
      }
      if (changed) {
        await Expense.updateOne({ _id: exp._id }, { $set: { details: exp.details } });
        console.log(`Updated expense ${exp.title} with fundName`);
      }
    }

    console.log('Done updating mutual fund categories.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
