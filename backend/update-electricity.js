const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const updateCats = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // 1. Delete duplicate
    const delRes = await Category.deleteMany({ name: { $in: ['Electricity Bills', 'Electricity'] } });
    console.log(`Deleted ${delRes.deletedCount} duplicate electricity categories`);
    
    // 2. Update 'Current (electricity) bills' to add 'Consumer Name' field
    const targetCat = await Category.findOne({ name: 'Current (electricity) bills' });
    if (targetCat) {
      // Check if it already has it
      const hasName = targetCat.fields.some(f => f.name === 'consumerName');
      if (!hasName) {
        targetCat.fields.push({
          name: 'consumerName',
          label: 'Consumer Name',
          type: 'text',
          required: true
        });
        await targetCat.save();
        console.log('Added Consumer Name field to Current (electricity) bills');
      } else {
        console.log('Consumer Name field already exists');
      }
    } else {
      console.log('Could not find Current (electricity) bills category');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

updateCats();
