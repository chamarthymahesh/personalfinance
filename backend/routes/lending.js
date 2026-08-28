const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const LendingLedger = require('../models/LendingLedger');
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

// Get ledger for a specific expense
router.get('/:expenseId', async (req, res) => {
  try {
    const ledger = await LendingLedger.findOne({ expenseId: req.params.expenseId });
    if (!ledger) return res.status(404).json({ error: 'No ledger found' });
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new ledger for a lending entry
router.post('/', async (req, res) => {
  try {
    const { expenseId, personName, principalAmount, interestRate, startDate, interestType } = req.body;
    
    const existing = await LendingLedger.findOne({ expenseId });
    if (existing) return res.status(400).json({ error: 'Ledger already exists for this entry' });

    const ledger = new LendingLedger({
      expenseId,
      personName,
      principalAmount,
      interestRate: interestRate || 0,
      interestType: interestType || 'Simple Interest',
      startDate: startDate || new Date(),
      outstandingBalance: principalAmount,
      entries: [{
        type: 'opening',
        date: startDate || new Date(),
        amount: principalAmount,
        balanceAfter: principalAmount,
        note: 'Opening balance'
      }]
    });

    await ledger.save();
    res.status(201).json(ledger);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add interest entry manually
router.post('/:id/add-interest', async (req, res) => {
  try {
    const ledger = await LendingLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    const { date, note, monthLabel } = req.body;
    const interestAmount = parseFloat(((ledger.outstandingBalance * ledger.interestRate) / 100).toFixed(2));
    const newBalance = parseFloat((ledger.outstandingBalance + interestAmount).toFixed(2));

    ledger.entries.push({
      type: 'interest',
      date: date || new Date(),
      amount: interestAmount,
      balanceAfter: newBalance,
      note: note || `Interest @ ${ledger.interestRate}%`,
      monthLabel: monthLabel || ''
    });

    ledger.outstandingBalance = newBalance;
    await ledger.save();
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: compute true running balance at a given date from all entries
function getBalanceAt(entries, atDate) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  for (const e of sorted) {
    if (new Date(e.date) > atDate) break;
    if (e.type === 'opening') balance = e.amount;
    else if (e.type === 'interest') balance = parseFloat((balance + e.amount).toFixed(2));
    else if (e.type === 'partial_payment') balance = parseFloat((balance - e.amount).toFixed(2));
  }
  return balance;
}

// Helper: compute true Principal remaining at a given date (for Simple Interest)
function getPrincipalAt(entries, atDate) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let principal = 0;
  let unpaidInterest = 0;
  
  for (const e of sorted) {
    if (new Date(e.date) > atDate) break;
    
    if (e.type === 'opening') {
      principal = e.amount;
    } else if (e.type === 'interest') {
      unpaidInterest = parseFloat((unpaidInterest + e.amount).toFixed(2));
    } else if (e.type === 'partial_payment') {
      // Payment clears interest first, then reduces principal
      let remainingPayment = e.amount;
      
      if (remainingPayment >= unpaidInterest) {
        remainingPayment = parseFloat((remainingPayment - unpaidInterest).toFixed(2));
        unpaidInterest = 0;
        principal = parseFloat((principal - remainingPayment).toFixed(2));
      } else {
        unpaidInterest = parseFloat((unpaidInterest - remainingPayment).toFixed(2));
      }
    }
  }
  return principal;
}

// Helper: compute effective principal for Yearly Compound Interest.
// Within each year, monthly interest is based on that year's opening principal.
// At each year-end anniversary, the full year's interest is added to principal (compounded annually).
function getYearlyCompoundPrincipalAt(entries, startDate, interestRate, atDate) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

  let originalPrincipal = 0;
  const payments = []; // { date, amount }

  for (const e of sorted) {
    if (new Date(e.date) > atDate) break;
    if (e.type === 'opening') originalPrincipal = e.amount;
    if (e.type === 'partial_payment') payments.push({ date: new Date(e.date), amount: e.amount });
  }

  const start = new Date(startDate);
  let effectivePrincipal = originalPrincipal;
  let yearStart = new Date(start);

  while (true) {
    const yearEnd = new Date(yearStart);
    yearEnd.setFullYear(yearEnd.getFullYear() + 1);

    // If the anniversary hasn't happened yet relative to atDate, stop
    if (yearEnd > atDate) break;

    // Full year's interest on this year's opening principal (12 months × rate%)
    const yearlyInterest = parseFloat((effectivePrincipal * interestRate * 12 / 100).toFixed(2));

    // Sum all principal payments made during this year
    let paymentsThisYear = 0;
    for (const p of payments) {
      if (p.date >= yearStart && p.date < yearEnd) {
        paymentsThisYear = parseFloat((paymentsThisYear + p.amount).toFixed(2));
      }
    }

    // At year-end: new principal = old principal + year interest - payments this year
    effectivePrincipal = parseFloat((effectivePrincipal + yearlyInterest - paymentsThisYear).toFixed(2));
    if (effectivePrincipal < 0) effectivePrincipal = 0;

    yearStart = yearEnd;
  }

  // Apply any payments made in the current (incomplete) year up to atDate
  for (const p of payments) {
    if (p.date >= yearStart && p.date <= atDate) {
      effectivePrincipal = parseFloat((effectivePrincipal - p.amount).toFixed(2));
      if (effectivePrincipal < 0) effectivePrincipal = 0;
    }
  }

  return effectivePrincipal;
}

// Automatically sync all missing accrued interest (using Simple Interest on Principal)
router.post('/:id/sync-interest', async (req, res) => {
  try {
    const ledger = await LendingLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    let newEntriesCount = 0;
    let updatedCurrentMonth = false;

    let currentStart = new Date(ledger.startDate);
    const today = new Date();

    while (currentStart < today) {
      let nextFirst = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
      let periodEnd = nextFirst;
      
      if (periodEnd > today) {
        periodEnd = new Date(today);
      }
      
      const msPerDay = 1000 * 60 * 60 * 24;
      const startDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate());
      const endDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
      const daysElapsed = Math.round((endDay - startDay) / msPerDay);
      
      if (daysElapsed > 0) {
        const daysInMonth = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate();
        
        // Evaluate basis at the end of the period (before interest is applied)
        let basisAmount;
        if (ledger.interestType === 'Compound Interest') {
          basisAmount = getBalanceAt(ledger.entries, new Date(periodEnd.getTime() - 1));
        } else if (ledger.interestType === 'Yearly Compound Interest') {
          basisAmount = getYearlyCompoundPrincipalAt(ledger.entries, ledger.startDate, ledger.interestRate, new Date(periodEnd.getTime() - 1));
        } else {
          basisAmount = getPrincipalAt(ledger.entries, new Date(periodEnd.getTime() - 1));
        }
        const fullInterest = parseFloat(((basisAmount * ledger.interestRate) / 100).toFixed(2));
        const interestAmount = parseFloat(((fullInterest * daysElapsed) / daysInMonth).toFixed(2));
        
        const monthLabel = currentStart.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        const existingIndex = ledger.entries.findIndex(
          e => e.type === 'interest' && e.monthLabel === monthLabel && e.note?.includes('Auto-generated')
        );

        if (existingIndex !== -1) {
          const existingEntry = ledger.entries[existingIndex];
          // Check if date or amount changed (fixes previously wrongly calculated partial months)
          if (new Date(existingEntry.date).getTime() !== periodEnd.getTime() || existingEntry.amount !== interestAmount) {
             existingEntry.date = periodEnd;
             existingEntry.amount = interestAmount;
             updatedCurrentMonth = true;
          }
        } else {
          ledger.entries.push({
            type: 'interest',
            date: periodEnd,
            amount: interestAmount,
            balanceAfter: 0,
            note: `Auto-generated Interest @ ${ledger.interestRate}%`,
            monthLabel: monthLabel
          });
          newEntriesCount++;
        }
      }
      
      currentStart = nextFirst;
    }

    // Recalculate all balances chronologically
    ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    for (let i = 0; i < ledger.entries.length; i++) {
      const e = ledger.entries[i];
      if (e.type === 'opening') runningBalance = e.amount;
      else if (e.type === 'interest') runningBalance = parseFloat((runningBalance + e.amount).toFixed(2));
      else if (e.type === 'partial_payment') runningBalance = parseFloat((runningBalance - e.amount).toFixed(2));
      e.balanceAfter = runningBalance;
    }
    
    ledger.outstandingBalance = runningBalance;

    if (newEntriesCount > 0 || updatedCurrentMonth) await ledger.save();

    res.json({ ledger, newEntriesCount, updatedCurrentMonth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recalculate ALL auto-generated interest from scratch (fixes wrong amounts after payments)
router.post('/:id/recalculate-interest', async (req, res) => {
  try {
    const ledger = await LendingLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    // Remove all auto-generated interest entries, keep opening + manual interest + payments
    ledger.entries = ledger.entries.filter(e =>
      e.type !== 'interest' || !e.note?.includes('Auto-generated')
    );

    let newEntriesCount = 0;
    let currentStart = new Date(ledger.startDate);
    const today = new Date();

    while (currentStart < today) {
      let nextFirst = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
      let periodEnd = nextFirst;
      
      if (periodEnd > today) {
        periodEnd = new Date(today);
      }
      
      const msPerDay = 1000 * 60 * 60 * 24;
      const startDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate());
      const endDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
      const daysElapsed = Math.round((endDay - startDay) / msPerDay);
      
      if (daysElapsed > 0) {
        const daysInMonth = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate();
        
        let basisAmount;
        if (ledger.interestType === 'Compound Interest') {
          basisAmount = getBalanceAt(ledger.entries, new Date(periodEnd.getTime() - 1));
        } else if (ledger.interestType === 'Yearly Compound Interest') {
          basisAmount = getYearlyCompoundPrincipalAt(ledger.entries, ledger.startDate, ledger.interestRate, new Date(periodEnd.getTime() - 1));
        } else {
          basisAmount = getPrincipalAt(ledger.entries, new Date(periodEnd.getTime() - 1));
        }
        const fullInterest = parseFloat(((basisAmount * ledger.interestRate) / 100).toFixed(2));
        const interestAmount = parseFloat(((fullInterest * daysElapsed) / daysInMonth).toFixed(2));
        
        const monthLabel = currentStart.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        ledger.entries.push({
          type: 'interest',
          date: periodEnd,
          amount: interestAmount,
          balanceAfter: 0,
          note: `Auto-generated Interest @ ${ledger.interestRate}%`,
          monthLabel: monthLabel
        });
        
        newEntriesCount++;
      }
      
      currentStart = nextFirst;
    }

    // Recalculate all balances chronologically
    ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    for (let i = 0; i < ledger.entries.length; i++) {
      const e = ledger.entries[i];
      if (e.type === 'opening') runningBalance = e.amount;
      else if (e.type === 'interest') runningBalance = parseFloat((runningBalance + e.amount).toFixed(2));
      else if (e.type === 'partial_payment') runningBalance = parseFloat((runningBalance - e.amount).toFixed(2));
      e.balanceAfter = runningBalance;
    }
    
    ledger.outstandingBalance = runningBalance;
    await ledger.save();

    res.json({ ledger, newEntriesCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Add partial payment
router.post('/:id/add-payment', upload.single('proofFile'), async (req, res) => {
  try {
    const ledger = await LendingLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    const { amount, date, note, paymentMode } = req.body;
    const paymentAmt = parseFloat(amount);

    const proofUrl = req.file ? `/uploads/${req.file.filename}` : '';

    // Push the new payment entry (balanceAfter will be recalculated below)
    ledger.entries.push({
      type: 'partial_payment',
      date: date || new Date(),
      amount: paymentAmt,
      balanceAfter: 0,
      note: note || 'Partial payment received',
      paymentMode: paymentMode || '',
      proofUrl: proofUrl
    });

    // Sort all entries chronologically and recalculate running balances from scratch
    // This correctly handles backdated payments (e.g. a payment dated in the past)
    ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    for (let i = 0; i < ledger.entries.length; i++) {
      const e = ledger.entries[i];
      if (e.type === 'opening') runningBalance = e.amount;
      else if (e.type === 'interest') runningBalance = parseFloat((runningBalance + e.amount).toFixed(2));
      else if (e.type === 'partial_payment') {
        runningBalance = parseFloat((runningBalance - e.amount).toFixed(2));
        if (runningBalance < 0) {
          return res.status(400).json({ error: 'Payment exceeds outstanding balance at that date' });
        }
      }
      e.balanceAfter = runningBalance;
    }

    ledger.outstandingBalance = runningBalance;
    await ledger.save();
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific entry by its _id and recalculate outstanding balance
router.delete('/:id/entry/:entryId', async (req, res) => {
  try {
    const ledger = await LendingLedger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ error: 'Ledger not found' });

    const entryIndex = ledger.entries.findIndex(e => e._id.toString() === req.params.entryId);
    if (entryIndex === -1) return res.status(404).json({ error: 'Entry not found' });

    const entry = ledger.entries[entryIndex];
    if (entry.type === 'opening') {
      return res.status(400).json({ error: 'Cannot delete the opening entry' });
    }

    // Remove the entry
    ledger.entries.splice(entryIndex, 1);

    // Recalculate outstandingBalance from all remaining entries in chronological order
    const sorted = [...ledger.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    for (const e of sorted) {
      if (e.type === 'opening') balance = e.amount;
      else if (e.type === 'interest') balance = parseFloat((balance + e.amount).toFixed(2));
      else if (e.type === 'partial_payment') balance = parseFloat((balance - e.amount).toFixed(2));
    }
    ledger.outstandingBalance = balance;

    await ledger.save();
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function recalculateLedgerInterest(ledger) {
  // Remove all auto-generated interest entries, keep opening + manual interest + payments
  ledger.entries = ledger.entries.filter(e =>
    e.type !== 'interest' || !e.note?.includes('Auto-generated')
  );

  let newEntriesCount = 0;
  let currentStart = new Date(ledger.startDate);
  const today = new Date();

  while (currentStart < today) {
    let nextFirst = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1);
    let periodEnd = nextFirst;
    
    if (periodEnd > today) {
      periodEnd = new Date(today);
    }
    
    const msPerDay = 1000 * 60 * 60 * 24;
    const startDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate());
    const endDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
    const daysElapsed = Math.round((endDay - startDay) / msPerDay);
    
    if (daysElapsed > 0) {
      const daysInMonth = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0).getDate();
      
      let basisAmount;
      if (ledger.interestType === 'Compound Interest') {
        basisAmount = getBalanceAt(ledger.entries, new Date(periodEnd.getTime() - 1));
      } else if (ledger.interestType === 'Yearly Compound Interest') {
        basisAmount = getYearlyCompoundPrincipalAt(ledger.entries, ledger.startDate, ledger.interestRate, new Date(periodEnd.getTime() - 1));
      } else {
        basisAmount = getPrincipalAt(ledger.entries, new Date(periodEnd.getTime() - 1));
      }
      const fullInterest = parseFloat(((basisAmount * ledger.interestRate) / 100).toFixed(2));
      const interestAmount = parseFloat(((fullInterest * daysElapsed) / daysInMonth).toFixed(2));
      
      const monthLabel = currentStart.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      ledger.entries.push({
        type: 'interest',
        date: periodEnd,
        amount: interestAmount,
        balanceAfter: 0,
        note: `Auto-generated Interest @ ${ledger.interestRate}%`,
        monthLabel: monthLabel
      });
      
      newEntriesCount++;
    }
    
    currentStart = nextFirst;
  }

  // Recalculate all balances chronologically
  ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;
  for (let i = 0; i < ledger.entries.length; i++) {
    const e = ledger.entries[i];
    if (e.type === 'opening') runningBalance = e.amount;
    else if (e.type === 'interest') runningBalance = parseFloat((runningBalance + e.amount).toFixed(2));
    else if (e.type === 'partial_payment') runningBalance = parseFloat((runningBalance - e.amount).toFixed(2));
    e.balanceAfter = runningBalance;
  }
  
  ledger.outstandingBalance = runningBalance;
  await ledger.save();
  return ledger;
}

router.recalculateLedgerInterest = recalculateLedgerInterest;
module.exports = router;

