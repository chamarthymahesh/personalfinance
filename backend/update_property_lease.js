const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
    const updated = await Category.updateOne(
      { name: 'Property rental income' },
      { $push: { fields: { $each: [
        { name: 'leaseDuration', label: 'Lease Duration (Months)', type: 'number' },
        { name: 'leaseStartDate', label: 'Lease Start Date', type: 'date' },
        { name: 'leaseEndDate', label: 'Lease End Date', type: 'date' },
        { name: 'annualRentEscalation', label: 'Annual Rent Escalation (%)', type: 'number' }
      ] } } }
    );
    console.log('Update Property Rental Income result:', updated);
    process.exit(0);
  });
