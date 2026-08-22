const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const addCreditCardCategory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const count = await Category.countDocuments({ module: 'credit_cards' });
    if (count === 0) {
      await Category.create([
        {
          name: 'Credit Card Spends',
          module: 'credit_cards',
          fields: [
            { name: 'cardName', label: 'Card Name (e.g., HDFC Millennia)', type: 'text', required: true },
            { name: 'merchant', label: 'Merchant / Spend Location', type: 'text', required: true }
          ]
        }
      ]);
      console.log('Added Credit Card Spends category');
    } else {
      console.log('Credit cards module already has categories');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

addCreditCardCategory();
