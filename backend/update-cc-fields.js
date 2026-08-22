const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const addCreditCardFields = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const targetCat = await Category.findOne({ name: 'Credit Card Spends' });
    if (targetCat) {
      // Add new fields if they don't exist
      const existingNames = targetCat.fields.map(f => f.name);
      
      const fieldsToAdd = [
        { name: 'cardNumber', label: 'Card Number', type: 'text', required: true },
        { name: 'expiryDate', label: 'Expiry Date (MM/YY)', type: 'text', required: true },
        { name: 'cvv', label: 'CVV', type: 'text', required: false }
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
        console.log(`Added ${added} new fields to Credit Card Spends category`);
      } else {
        console.log('Fields already exist');
      }
    } else {
      console.log('Could not find Credit Card Spends category');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

addCreditCardFields();
