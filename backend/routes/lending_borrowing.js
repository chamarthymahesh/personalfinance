const express = require('express');
const router = express.Router();
const LendingBorrowing = require('../models/LendingBorrowing');
const auth = require('../middleware/auth');

router.use(auth);

// Helper function to calculate interest
function calculateTotalInterest(principal, rate, type, startDate, endDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((endDate - startDate) / msPerDay);
  
  if (days <= 0) return 0;
  
  const years = days / 365;

  if (type === 'Simple Interest') {
    return parseFloat((principal * (rate / 100) * years).toFixed(2));
  } else if (type === 'Compound Interest') {
    // Assuming monthly compounding for standard compound
    const n = 12;
    const amount = principal * Math.pow(1 + rate / 100 / n, n * years);
    return parseFloat((amount - principal).toFixed(2));
  } else if (type === 'Yearly Compound Interest') {
    // Compounded once a year
    const amount = principal * Math.pow(1 + rate / 100, years);
    return parseFloat((amount - principal).toFixed(2));
  }
  return 0;
}

// Get all
router.get('/', async (req, res) => {
  try {
    const records = await LendingBorrowing.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new
router.post('/', async (req, res) => {
  try {
    const record = new LendingBorrowing(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const record = await LendingBorrowing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    await LendingBorrowing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close and calculate profit
router.post('/:id/close', async (req, res) => {
  try {
    const record = await LendingBorrowing.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (record.status === 'Closed') return res.status(400).json({ error: 'Already closed' });

    const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date();
    record.endDate = endDate;
    record.status = 'Closed';

    // Calculate interest
    record.totalBorrowedInterest = calculateTotalInterest(
      record.borrowedPrincipal, 
      record.borrowedInterestRate, 
      record.borrowedInterestType, 
      record.startDate, 
      endDate
    );

    record.totalLentInterest = calculateTotalInterest(
      record.borrowedPrincipal, // Same principal is lent
      record.lentInterestRate, 
      record.lentInterestType, 
      record.startDate, 
      endDate
    );

    record.totalProfit = parseFloat((record.totalLentInterest - record.totalBorrowedInterest).toFixed(2));

    // Distribute profit based on investment share
    const totalInvestment = record.partners.reduce((sum, p) => sum + p.investmentAmount, 0);
    
    if (totalInvestment > 0) {
      record.partners.forEach(p => {
        const share = p.investmentAmount / totalInvestment;
        p.profitShareAmount = parseFloat((record.totalProfit * share).toFixed(2));
      });
    }

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
