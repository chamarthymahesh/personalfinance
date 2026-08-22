const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Insurance = require('../models/Insurance');
const Investment = require('../models/Investment');
const Loan = require('../models/Loan');
const Property = require('../models/Property');
const Category = require('../models/Category');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  }
});
const upload = multer({ storage: storage });

// Dynamic handler for all models
const models = {
  expenses: Expense,
  insurances: Insurance,
  investments: Investment,
  loans: Loan,
  properties: Property,
  categories: Category
};

router.get('/:type', async (req, res) => {
  try {
    const Model = models[req.params.type];
    if (!Model) return res.status(404).json({ error: 'Invalid type' });
    const data = await Model.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aggregation endpoint for Reports
router.get('/reports/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find({ status: 'Paid' });
    
    // Aggregate by category
    const categoryTotals = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    // Format for recharts
    const chartData = Object.keys(categoryTotals).map(key => ({
      name: key,
      value: categoryTotals[key]
    }));

    res.json(chartData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:type', upload.any(), async (req, res) => {
  try {
    const Model = models[req.params.type];
    if (!Model) return res.status(404).json({ error: 'Invalid type' });
    
    // Parse details if sent as a JSON string (from FormData)
    if (typeof req.body.details === 'string') {
      try {
        req.body.details = JSON.parse(req.body.details);
      } catch (e) {
        req.body.details = {};
      }
    }
    
    // If details doesn't exist, initialize it
    if (!req.body.details) req.body.details = {};
    
    // Inject uploaded file paths into details
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // fieldname will be something like 'file_rentalAgreement'
        const keyName = file.fieldname.replace('file_', '');
        req.body.details[keyName] = file.path;
      });
    }
    
    const data = await Model.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:type/:id', async (req, res) => {
  try {
    const Model = models[req.params.type];
    if (!Model) return res.status(404).json({ error: 'Invalid type' });
    console.log(`DELETE request for type=${req.params.type}, id=${req.params.id}`);
    const result = await Model.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Document not found' });
    console.log('Delete successful:', result);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:type/:id', async (req, res) => {
  try {
    const Model = models[req.params.type];
    if (!Model) return res.status(404).json({ error: 'Invalid type' });
    const data = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!data) return res.status(404).json({ error: 'Document not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay expense and auto-generate next
router.put('/expenses/:id/pay', upload.single('paymentProof'), async (req, res) => {
  try {
    const { paymentMode, paidDate, referenceNumber } = req.body;
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Not found' });

    expense.status = 'Paid';
    if (paymentMode) expense.paymentMode = paymentMode;
    if (paidDate) expense.paidDate = new Date(paidDate);
    if (referenceNumber) expense.referenceNumber = referenceNumber;
    if (req.file) expense.paymentProof = req.file.path;
    
    await expense.save();

    // Auto generate next bill if recurring
    if (expense.frequency === 'Monthly' && expense.dueDate) {
      const nextDate = new Date(expense.dueDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      const nextExpense = new Expense({
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        frequency: expense.frequency,
        dueDate: nextDate,
        details: expense.details,
        status: 'Unpaid'
      });
      await nextExpense.save();
    } else if (expense.frequency === 'Yearly' && expense.dueDate) {
      const nextDate = new Date(expense.dueDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      
      const nextExpense = new Expense({
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        frequency: expense.frequency,
        dueDate: nextDate,
        details: expense.details,
        status: 'Unpaid'
      });
      await nextExpense.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
