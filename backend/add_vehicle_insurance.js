const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const exists = await Category.findOne({ name: 'Vehicle Insurance' });
    if (exists) {
      console.log('Vehicle Insurance category already exists.');
    } else {
      await Category.create({
        name: 'Vehicle Insurance',
        module: 'insurances',
        fields: [
          { name: 'vehicleNo', label: 'Vehicle Number', type: 'text', required: true },
          { name: 'vehicleType', label: 'Vehicle Type (Car/Bike/Truck)', type: 'text' },
          { name: 'policyNumber', label: 'Policy Number', type: 'text', required: true },
          { name: 'insurerName', label: 'Insurance Company', type: 'text' },
          { name: 'policyType', label: 'Policy Type (Comprehensive/Third Party)', type: 'text' },
          { name: 'startDate', label: 'Policy Start Date', type: 'date' },
          { name: 'expiryDate', label: 'Policy Expiry Date', type: 'date' }
        ]
      });
      console.log('✅ Added: Vehicle Insurance');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
