const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const missingCategories = [
  // HAND LOANS (module: 'hand_loans')
  { name: 'Hand loan given', module: 'hand_loans', fields: [{ name: 'personName', label: 'Person Name', type: 'text', required: true }] },
  { name: 'Hand loan taken', module: 'hand_loans', fields: [{ name: 'personName', label: 'Person Name', type: 'text', required: true }] },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // Check missing
    for (const cat of missingCategories) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) {
        await Category.create(cat);
        console.log(`Added: ${cat.name}`);
      }
    }
    
    console.log('Done seeding!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
