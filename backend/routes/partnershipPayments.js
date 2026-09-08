const express = require('express');
const router = express.Router();
const InvestmentLedger = require('../models/InvestmentLedger');

// Helper to flatten entries
function flattenEntries(docs) {
  const entries = [];
  docs.forEach(doc => {
    if (Array.isArray(doc.entries)) {
      doc.entries.forEach(entry => {
        entries.push({
          ...entry.toObject(),
          ledgerId: doc._id,
          fundName: doc.fundName,
          totalInvested: doc.totalInvested,
        });
      });
    }
  });
  return entries;
}

// GET all partnership payment entries
router.get('/payments', async (req, res) => {
  try {
    const ledgers = await InvestmentLedger.find().select('entries fundName totalInvested');
    const payments = flattenEntries(ledgers);
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a new partnership payment (adds to a ledger; creates ledger if needed)
router.post('/payments', async (req, res) => {
  const { fundName, type, date, amount, totalInvestedAfter, note, paymentMode, proofUrl, transactionId, totalPurchasePrice, partnerName, paidBy } = req.body;
  try {
    // Find or create ledger for the given fundName
    let ledger = await InvestmentLedger.findOne({ fundName });
    if (!ledger) {
      ledger = new InvestmentLedger({ fundName, totalInvested: 0, entries: [] });
    }
    const entry = {
      type,
      date: date ? new Date(date) : new Date(),
      amount,
      totalInvestedAfter,
      note,
      paymentMode,
      proofUrl,
      transactionId,
      totalPurchasePrice,
      partnerName,
      paidBy,
    };
    ledger.entries.push(entry);
    // Update ledger totalInvested if provided
    if (typeof totalInvestedAfter === 'number') {
      ledger.totalInvested = totalInvestedAfter;
    }
    await ledger.save();
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a single payment by entry ID
router.get('/payments/:id', async (req, res) => {
  const entryId = req.params.id;
  try {
    const ledger = await InvestmentLedger.findOne({ 'entries._id': entryId }).select('entries fundName totalInvested');
    if (!ledger) return res.status(404).json({ message: 'Payment not found' });
    const entry = ledger.entries.id(entryId);
    res.json({ ...entry.toObject(), ledgerId: ledger._id, fundName: ledger.fundName, totalInvested: ledger.totalInvested });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
