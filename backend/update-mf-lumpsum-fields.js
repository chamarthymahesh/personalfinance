const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const addMFLumpsumFields = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const targetCat = await Category.findOne({ name: 'Mutual funds - Lumpsum' });
    if (targetCat) {
      const existingNames = targetCat.fields.map(f => f.name);
      
      const fieldsToAdd = [
        { name: 'holderName', label: 'Holder Name', type: 'text', required: true }
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
        console.log(`Added ${added} new fields to Mutual funds - Lumpsum category`);
      } else {
        console.log('Fields already exist');
      }
    } else {
      console.log('Could not find Mutual funds - Lumpsum category');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

addMFLumpsumFields();
