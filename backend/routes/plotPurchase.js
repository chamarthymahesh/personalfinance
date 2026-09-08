const express = require('express');
const router = express.Router();
const PlotPurchase = require('../models/PlotPurchase');

// ─── PLOT CRUD ─────────────────────────────────────────────────────────────

// GET all plots
router.get('/', async (req, res) => {
  try {
    const plots = await PlotPurchase.find().sort({ createdAt: -1 });
    res.json(plots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single plot
router.get('/:id', async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    res.json(plot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create a new plot
router.post('/', async (req, res) => {
  try {
    const { plotName, location, area, totalCost, registrationDate, notes, partners } = req.body;
    // Recompute shareAmount from sharePercent
    const computedPartners = (partners || []).map(p => ({
      name: p.name,
      sharePercent: p.sharePercent,
      shareAmount: Math.round((totalCost * p.sharePercent) / 100)
    }));
    const plot = new PlotPurchase({ plotName, location, area, totalCost, registrationDate, notes, partners: computedPartners, payments: [] });
    await plot.save();
    res.status(201).json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update plot details (not payments)
router.put('/:id', async (req, res) => {
  try {
    const { plotName, location, area, totalCost, registrationDate, notes, partners } = req.body;
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    if (plotName) plot.plotName = plotName;
    if (location !== undefined) plot.location = location;
    if (area !== undefined) plot.area = area;
    if (totalCost) plot.totalCost = totalCost;
    if (registrationDate !== undefined) plot.registrationDate = registrationDate;
    if (notes !== undefined) plot.notes = notes;
    if (partners) {
      plot.partners = partners.map(p => ({
        name: p.name,
        sharePercent: p.sharePercent,
        shareAmount: Math.round((plot.totalCost * p.sharePercent) / 100)
      }));
    }
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a plot
router.delete('/:id', async (req, res) => {
  try {
    await PlotPurchase.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plot deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PAYMENT CRUD ───────────────────────────────────────────────────────────

// POST add a payment to a plot
router.post('/:id/payments', async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const { paidBy, amount, date, transactionId, paymentMode, proofUrl, notes } = req.body;
    plot.payments.push({ paidBy, amount, date: date ? new Date(date) : new Date(), transactionId, paymentMode, proofUrl, notes });
    await plot.save();
    res.status(201).json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a payment from a plot
router.delete('/:id/payments/:paymentId', async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    plot.payments.id(req.params.paymentId).deleteOne();
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
