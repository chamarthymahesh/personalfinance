const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));

    const chitCategory = {
      name: 'Chit fund',
      module: 'investments',
      fields: [
        { name: 'chitCompanyName', label: 'Chit Company / Organiser Name', type: 'text', required: true },
        { name: 'chitValue', label: 'Total Chit Value (₹)', type: 'number', required: true },
        { name: 'totalMembers', label: 'Total Members', type: 'number' },
        { name: 'durationMonths', label: 'Chit Duration (Months)', type: 'number' },
        { name: 'startDate', label: 'Chit Start Date', type: 'date' },
        { name: 'endDate', label: 'Chit End Date', type: 'date' }
      ]
    };

    const exists = await Category.findOne({ name: 'Chit fund' });
    if (!exists) {
      const created = await Category.create(chitCategory);
      console.log('Created Chit fund category:', created.name);
    } else {
      console.log('Chit fund category already exists. Updating fields...');
      await Category.updateOne({ name: 'Chit fund' }, { $set: { fields: chitCategory.fields, module: 'investments' } });
      console.log('Updated!');
    }
    process.exit(0);
  });
