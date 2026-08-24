require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const result = await Category.findOneAndUpdate(
      { name: 'Other expenses' },
      {
        $set: {
          module: 'other',
          fields: [
            { name: 'sentTo', label: 'Sent To (Person / Organisation)', type: 'text', required: true },
            { name: 'purpose', label: 'Purpose / Reason', type: 'text', required: true }
          ]
        }
      },
      { new: true, upsert: true }
    );
    console.log('Updated category:', result.name, '| Fields:', result.fields.map(f => f.name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
