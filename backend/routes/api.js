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
const auth = require('../middleware/auth');

router.use(auth);

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

// ============================================================
// Insurance Payment History — fetch all paid records for a policy
// GET /api/expenses/history?title=XXXX&category=Postal+insurance
// ============================================================
router.get('/expenses/history', async (req, res) => {
  try {
    const { title, category } = req.query;
    if (!title) return res.status(400).json({ error: 'title query param required' });
    const query = { title, status: 'Paid' };
    if (category) query.category = category;
    const records = await Expense.find(query).sort({ paidDate: 1, dueDate: 1 });
    const totalPaid = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    res.json({ records, totalPaid, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ============================================================
// Payment History Backfill — auto-generate all past paid months
// POST /api/expenses/history-backfill
// Body: { title, category, amount, frequency, startDate, details }
// ============================================================
router.post('/expenses/history-backfill', async (req, res) => {
  try {
    const { title, category, amount, frequency, startDate, details } = req.body;
    if (!title || !category || !amount || !startDate) {
      return res.status(400).json({ error: 'title, category, amount, startDate are required' });
    }

    const freq = frequency || 'Monthly';
    const monthStep = freq === 'Monthly' ? 1 : freq === 'Quarterly' ? 3 : freq === 'Half-Yearly' ? 6 : 12;

    // Fetch all existing paid records for this policy (to avoid duplicates)
    const existing = await Expense.find({ title, category, status: 'Paid' });
    const existingMonths = new Set(
      existing.map(r => {
        const d = r.paidDate || r.dueDate;
        return d ? `${new Date(d).getFullYear()}-${new Date(d).getMonth()}` : null;
      }).filter(Boolean)
    );

    const toCreate = [];
    const cursor = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor <= today) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      if (!existingMonths.has(key)) {
        const paidDate = new Date(cursor);
        toCreate.push({
          title,
          category,
          amount: Number(amount),
          frequency: freq,
          dueDate: paidDate,
          paidDate,
          status: 'Paid',
          paymentMode: 'Cash',
          details: details || {},
          remarks: 'Backfilled history entry'
        });
      }
      cursor.setMonth(cursor.getMonth() + monthStep);
    }

    const created = await Expense.insertMany(toCreate);
    res.status(201).json({ created: created.length, skipped: existingMonths.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.put('/:type/:id', upload.any(), async (req, res) => {
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

    // Attach uploaded files to details
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fieldName = file.fieldname; 
        if (fieldName.startsWith('file_')) {
          const detailKey = fieldName.replace('file_', '');
          req.body.details[detailKey] = file.path;
        }
      });
    }

    const data = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!data) return res.status(404).json({ error: 'Document not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attach proof to an existing paid expense
router.put('/expenses/:id/attach-proof', upload.single('paymentProof'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { paymentProof: req.file.path },
      { new: true }
    );
    if (!expense) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, paymentProof: req.file.path });
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
    const nextDate = new Date(expense.dueDate);
    let shouldCreate = false;

    if (expense.frequency === 'Monthly' && expense.dueDate) {
      nextDate.setMonth(nextDate.getMonth() + 1);
      shouldCreate = true;
    } else if (expense.frequency === 'Quarterly' && expense.dueDate) {
      nextDate.setMonth(nextDate.getMonth() + 3);
      shouldCreate = true;
    } else if (expense.frequency === 'Half-Yearly' && expense.dueDate) {
      nextDate.setMonth(nextDate.getMonth() + 6);
      shouldCreate = true;
    } else if (expense.frequency === 'Yearly' && expense.dueDate) {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      shouldCreate = true;
    }

    if (shouldCreate) {
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
