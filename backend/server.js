const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    
    // Seed initial categories
    const Category = require('./models/Category');
    const count = await Category.countDocuments();
    if (count === 0) {
      await Category.insertMany([
        { name: 'House Rent', fields: [{ name: 'landlordName', label: 'Landlord Name', type: 'text', required: true }] },
        { name: 'Godown Rent', fields: [{ name: 'landlordName', label: 'Landlord Name', type: 'text', required: true }] },
        { name: 'Electricity', fields: [{ name: 'consumerNumber', label: 'Consumer Number', type: 'text', required: true }, { name: 'provider', label: 'Service Provider', type: 'text' }] },
        { name: 'Phone', fields: [{ name: 'serviceNumber', label: 'Service/Mobile Number', type: 'text', required: true }, { name: 'provider', label: 'Service Provider', type: 'text' }] },
        { name: 'Internet', fields: [{ name: 'serviceNumber', label: 'Service/Mobile Number', type: 'text', required: true }, { name: 'provider', label: 'Service Provider', type: 'text' }] },
        { name: 'School Fees', fields: [{ name: 'studentName', label: 'Student Name', type: 'text', required: true }, { name: 'schoolName', label: 'School Name', type: 'text', required: true }] },
        { name: 'Other', fields: [] }
      ]);
      console.log('Seeded initial categories');
    }

    // Seed initial admin user
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        name: 'Mahesh Chamarthy',
        email: 'mahesh@gmail.com',
        password: 'Nehaal@2026'
      });
      console.log('Seeded default admin user');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Serve static uploads (ensure uploads directory exists)
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Route files
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const lendingRoutes = require('./routes/lending');

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lending-ledger', lendingRoutes);
app.use('/api/v1', apiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
