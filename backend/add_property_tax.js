const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    const newCategory = {
      name: 'Property tax',
      module: 'properties',
      fields: [
        { name: 'propertyName', label: 'Property Name / Address', type: 'text', required: true },
        { name: 'propertyId', label: 'Property ID / Khata No.', type: 'text' },
        { name: 'taxYear', label: 'Tax Assessment Year (e.g. 2026-27)', type: 'text' },
        { name: 'taxReceipt', label: 'Tax Receipt (PDF)', type: 'file' }
      ]
    };
    
    // Check if it exists first
    const exists = await Category.findOne({ name: 'Property tax' });
    if (!exists) {
      const created = await Category.create(newCategory);
      console.log('Created Property tax category:', created.name);
    } else {
      console.log('Category already exists.');
    }
    process.exit(0);
  });
