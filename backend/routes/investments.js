const express = require('express');
const router = express.Router();
const InvestmentLedger = require('../models/InvestmentLedger');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.use(auth);

// @route   GET /api/v1/investment-ledger/:expenseId
// @desc    Get ledger for a specific investment expense
router.get('/:expenseId', async (req, res) => {
  try {
    const ledger = await InvestmentLedger.findOne({ expenseId: req.params.expenseId });
    if (!ledger) {
      return res.status(404).json({ success: false, error: 'Ledger not found' });
    }
    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/v1/investment-ledger/init
// @desc    Initialize a ledger if it doesn't exist
router.post('/init', async (req, res) => {
  try {
    const { expenseId, fundName, initialAmount, startDate } = req.body;
    
    const existing = await InvestmentLedger.findOne({ expenseId });
    if (existing) {
      return res.status(200).json({ success: true, data: existing });
    }

    const ledger = new InvestmentLedger({
      expenseId,
      fundName,
      totalInvested: initialAmount || 0,
      entries: initialAmount > 0 ? [{
        type: 'opening',
        amount: initialAmount,
        date: startDate ? new Date(startDate) : new Date(),
        totalInvestedAfter: initialAmount,
        note: 'Initial invested amount'
      }] : []
    });

    await ledger.save();
    res.status(201).json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/v1/investment-ledger/:id/entry
// @desc    Add a new entry (invest or withdraw)
router.post('/:id/entry', upload.single('proofFile'), async (req, res) => {
  try {
    const ledger = await InvestmentLedger.findById(req.params.id);
    if (!ledger) {
      return res.status(404).json({ success: false, error: 'Ledger not found' });
    }

    const { type, amount, date, note, paymentMode } = req.body;
    const numAmount = Number(amount);
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : '';

    let totalInvestedAfter = ledger.totalInvested;
    if (type === 'invest') {
      totalInvestedAfter += numAmount;
    } else if (type === 'withdraw') {
      totalInvestedAfter -= numAmount;
    }

    const newEntry = {
      type,
      amount: numAmount,
      date: date ? new Date(date) : new Date(),
      note,
      paymentMode,
      proofUrl,
      totalInvestedAfter
    };

    ledger.entries.push(newEntry);
    ledger.totalInvested = totalInvestedAfter;

    // Sort entries by date
    ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate balances
    let runningTotal = 0;
    for (let i = 0; i < ledger.entries.length; i++) {
      const entry = ledger.entries[i];
      if (entry.type === 'invest' || entry.type === 'opening') {
        runningTotal += entry.amount;
      } else if (entry.type === 'withdraw') {
        runningTotal -= entry.amount;
      }
      entry.totalInvestedAfter = runningTotal;
    }
    ledger.totalInvested = runningTotal;

    await ledger.save();
    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   DELETE /api/v1/investment-ledger/:id/entry/:entryId
// @desc    Delete a specific entry
router.delete('/:id/entry/:entryId', async (req, res) => {
  try {
    const ledger = await InvestmentLedger.findById(req.params.id);
    if (!ledger) {
      return res.status(404).json({ success: false, error: 'Ledger not found' });
    }

    ledger.entries = ledger.entries.filter(e => e._id.toString() !== req.params.entryId);

    // Recalculate balances
    let runningTotal = 0;
    for (let i = 0; i < ledger.entries.length; i++) {
      const entry = ledger.entries[i];
      if (entry.type === 'invest' || entry.type === 'opening') {
        runningTotal += entry.amount;
      } else if (entry.type === 'withdraw') {
        runningTotal -= entry.amount;
      }
      entry.totalInvestedAfter = runningTotal;
    }
    ledger.totalInvested = runningTotal;

    await ledger.save();
    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// @route   POST /api/v1/investment-ledger/:id/auto-generate
// @desc    Auto-generate monthly investment entries from startDate up to today
router.post('/:id/auto-generate', async (req, res) => {
  try {
    const ledger = await InvestmentLedger.findById(req.params.id);
    if (!ledger) {
      return res.status(404).json({ success: false, error: 'Ledger not found' });
    }

    const { startDate, sipAmount, frequency } = req.body;
    if (!startDate || !sipAmount) {
      return res.status(400).json({ success: false, error: 'startDate and sipAmount are required' });
    }

    const amount = Number(sipAmount);
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // end of today

    // Generate dates from startDate up to today
    const newEntries = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    while (cursor <= today) {
      // Skip if an entry already exists on this date (same day)
      const dateStr = cursor.toISOString().split('T')[0];
      const alreadyExists = ledger.entries.some(e => {
        const eDate = new Date(e.date).toISOString().split('T')[0];
        return eDate === dateStr;
      });

      if (!alreadyExists) {
        newEntries.push({
          type: 'invest',
          amount,
          date: new Date(cursor),
          note: `SIP - ${cursor.toLocaleString('default', { month: 'long', year: 'numeric' })}`
        });
      }

      // Advance by frequency
      if (frequency === 'Weekly') {
        cursor.setDate(cursor.getDate() + 7);
      } else if (frequency === 'Quarterly') {
        cursor.setMonth(cursor.getMonth() + 3);
      } else {
        // Monthly (default)
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    // Add new entries to ledger
    ledger.entries.push(...newEntries);

    // Sort all entries by date
    ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate running balance
    let runningTotal = 0;
    for (let i = 0; i < ledger.entries.length; i++) {
      const entry = ledger.entries[i];
      if (entry.type === 'invest' || entry.type === 'opening') {
        runningTotal += entry.amount;
      } else if (entry.type === 'withdraw') {
        runningTotal -= entry.amount;
      }
      entry.totalInvestedAfter = runningTotal;
    }
    ledger.totalInvested = runningTotal;

    await ledger.save();
    res.status(200).json({ success: true, data: ledger, generated: newEntries.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
