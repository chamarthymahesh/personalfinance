const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const addPhoneBillFields = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const targetCat = await Category.findOne({ name: 'Phone bill' });
    if (targetCat) {
      const existingNames = targetCat.fields.map(f => f.name);
      
      const fieldsToAdd = [
        { name: 'holderName', label: 'Phone Number Holder Name', type: 'text', required: true },
        { name: 'networkName', label: 'Network Name (e.g. Jio, Airtel, BSNL)', type: 'text', required: true }
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
        console.log(`Added ${added} new fields to Phone bill category`);
      } else {
        console.log('Fields already exist');
      }
    } else {
      console.log('Could not find Phone bill category');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

addPhoneBillFields();
