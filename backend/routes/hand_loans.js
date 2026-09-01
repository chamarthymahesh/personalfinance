const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const HandLoanLedger = require('../models/HandLoanLedger');
const auth = require('../middleware/auth');
const syncExpenseStatus = require('../utils/syncExpenseStatus');

router.use(auth);

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

// Helper to recalculate currentBalance from entries
function recalculateBalance(entries) {
  // Sort by date chronologically
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  for (const e of sorted) {
    if (e.type === 'opening') {
      balance = parseFloat((balance + e.amount).toFixed(2));
    } else if (e.type === 'given') {
      // Giving money increases the balance owed to us (or our debt if negative)
      // We assume balance is "Amount owed to us" (or our debt depending on context, handled by absolute amount)
      balance = parseFloat((balance + e.amount).toFixed(2));
    } else if (e.type === 'received') {
      // Receiving money decreases the balance
      balance = parseFloat((balance - e.amount).toFixed(2));
    }
    e.balanceAfter = balance;
  }
  return { sortedEntries: sorted, finalBalance: balance };
}

// Get ledger for a specific expense
router.get('/:expenseId', async (req, res) => {
  try {
    const ledger = await HandLoanLedger.findOne({ expenseId: req.params.expenseId });
    if (!ledger) return res.status(404).json({ error: 'No ledger found' });
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new ledger for a hand loan entry
router.post('/', async (req, res) => {
  try {
    const { expenseId, personName, initialAmount, startDate, type } = req.body;
    
    const existing = await HandLoanLedger.findOne({ expenseId });
    if (existing) return res.status(400).json({ error: 'Ledger already exists for this entry' });

    // type can be 'given' or 'received' for the first transaction if they want to log it right away, or 'opening'
    const amt = parseFloat(initialAmount) || 0;
    
    const ledger = new HandLoanLedger({
      expenseId,
      personName,
      startDate: startDate || new Date(),
      currentBalance: amt,
      entries: [{
        type: 'opening',
        date: startDate || new Date(),
        amount: amt,
        balanceAfter: amt,
        note: 'Opening balance'
      }]
    });

    await ledger.save();
    await syncExpenseStatus(ledger.expenseId, ledger.outstandingBalance);
    res.status(201).json(ledger);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add a transaction (given or received)
router.post('/:id/add-transaction', upload.single('proofFile'), async (req, res) => {
  try {
    const ledger = await HandLoanLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    const { amount, date, note, paymentMode, transactionType } = req.body; 
    // transactionType should be 'given' or 'received'
    if (!['given', 'received'].includes(transactionType)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const amt = parseFloat(amount);
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : '';

    ledger.entries.push({
      type: transactionType,
      date: date || new Date(),
      amount: amt,
      balanceAfter: 0, // recalculated below
      note: note || '',
      paymentMode: paymentMode || '',
      proofUrl: proofUrl
    });

    // Recalculate
    const { sortedEntries, finalBalance } = recalculateBalance(ledger.entries);
    ledger.entries = sortedEntries;
    ledger.currentBalance = finalBalance;

    await ledger.save();
    await syncExpenseStatus(ledger.expenseId, ledger.outstandingBalance);
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific entry by its _id and recalculate balance
router.delete('/:id/entry/:entryId', async (req, res) => {
  try {
    const ledger = await HandLoanLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    const entryIndex = ledger.entries.findIndex(e => e._id.toString() === req.params.entryId);
    if (entryIndex === -1) return res.status(404).json({ error: 'Entry not found' });

    const entry = ledger.entries[entryIndex];
    if (entry.type === 'opening') {
      return res.status(400).json({ error: 'Cannot delete the opening entry' });
    }

    // Remove the entry
    ledger.entries.splice(entryIndex, 1);

    // Recalculate balance
    const { sortedEntries, finalBalance } = recalculateBalance(ledger.entries);
    ledger.entries = sortedEntries;
    ledger.currentBalance = finalBalance;

    await ledger.save();
    await syncExpenseStatus(ledger.expenseId, ledger.outstandingBalance);
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit an entry
router.put('/:id/entry/:entryId', upload.single('proofFile'), async (req, res) => {
  try {
    const ledger = await HandLoanLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    const entryIndex = ledger.entries.findIndex(e => e._id.toString() === req.params.entryId);
    if (entryIndex === -1) return res.status(404).json({ error: 'Entry not found' });

    const entry = ledger.entries[entryIndex];

    const { amount, date, note, paymentMode, transactionType } = req.body;
    
    if (entry.type !== 'opening') {
      if (transactionType && !['given', 'received'].includes(transactionType)) {
        return res.status(400).json({ error: 'Invalid transaction type' });
      }
      if (transactionType) entry.type = transactionType;
      if (amount !== undefined) entry.amount = parseFloat(amount);
    } else {
      if (amount !== undefined) entry.amount = parseFloat(amount);
    }
    
    if (date) entry.date = date;
    if (note !== undefined) entry.note = note;
    if (paymentMode !== undefined) entry.paymentMode = paymentMode;

    if (req.file) {
      entry.proofUrl = `/uploads/${req.file.filename}`;
    }

    const { sortedEntries, finalBalance } = recalculateBalance(ledger.entries);
    ledger.entries = sortedEntries;
    ledger.currentBalance = finalBalance;

    await ledger.save();
    await syncExpenseStatus(ledger.expenseId, ledger.outstandingBalance);
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
