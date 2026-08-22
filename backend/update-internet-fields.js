const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const addInternetBillFields = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const targetCat = await Category.findOne({ name: 'Internet bill' });
    if (targetCat) {
      // Add new fields if they don't exist
      const existingNames = targetCat.fields.map(f => f.name);
      
      const fieldsToAdd = [
        { name: 'accountHolderName', label: 'Account Holder Name', type: 'text', required: true },
        { name: 'location', label: 'Location', type: 'text', required: false },
        { name: 'providerName', label: 'Provider Name (e.g. Jio, Airtel)', type: 'text', required: true }
      ];
      
      let added = 0;
      fieldsToAdd.forEach(field => {
        if (!existingNames.includes(field.name)) {
          targetCat.fields.push(field);
          added++;
        }
      });
      
      if (added > 0) {
        await targetCat.save();
        console.log(`Added ${added} new fields to Internet bill category`);
      } else {
        console.log('Fields already exist');
      }
    } else {
      console.log('Could not find Internet bill category');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

addInternetBillFields();
