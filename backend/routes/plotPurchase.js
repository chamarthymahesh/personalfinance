const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PlotPurchase = require('../models/PlotPurchase');

// ─── Multer Setup ───────────────────────────────────────────────────────────
const plotUploadsDir = path.join(__dirname, '../uploads/plots');
if (!fs.existsSync(plotUploadsDir)) fs.mkdirSync(plotUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, plotUploadsDir),
  filename: (req, file, cb) => cb(null, `plot_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

// ─── PLOT CRUD ──────────────────────────────────────────────────────────────

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
    const { plotName, location, area, totalYards, registeredYards, pricePerYard, totalCost, purchaseDate, registrationDate, notes, partners } = req.body;
    const computedPartners = (partners || []).map(p => ({
      name: p.name,
      sharePercent: p.sharePercent,
      shareAmount: Math.round((totalCost * p.sharePercent) / 100)
    }));
    const plot = new PlotPurchase({ plotName, location, area, totalYards, registeredYards, pricePerYard, totalCost, purchaseDate, registrationDate, notes, partners: computedPartners, payments: [], commissionAgents: [] });
    await plot.save();
    res.status(201).json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update plot details
router.put('/:id', async (req, res) => {
  try {
    const { plotName, location, area, totalYards, registeredYards, pricePerYard, totalCost, purchaseDate, registrationDate, notes, partners } = req.body;
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    if (plotName) plot.plotName = plotName;
    if (location !== undefined) plot.location = location;
    if (area !== undefined) plot.area = area;
    if (totalYards !== undefined) plot.totalYards = totalYards;
    if (registeredYards !== undefined) plot.registeredYards = registeredYards;
    if (pricePerYard !== undefined) plot.pricePerYard = pricePerYard;
    if (totalCost) plot.totalCost = totalCost;
    if (purchaseDate !== undefined) plot.purchaseDate = purchaseDate;
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

// POST upload plot document
router.post('/:id/document', upload.single('plotDocumentFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    if (req.file) {
      plot.plotDocumentFile = `/uploads/plots/${req.file.filename}`;
    }
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── SALES ──────────────────────────────────────────────────────────────────

// POST add a new sale
router.post('/:id/sales', upload.single('proofFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const { buyerName, saleDate, yardsSold, salePricePerYard, saleCharges, notes } = req.body;
    const yards = Number(yardsSold);
    const pricePerYard = Number(salePricePerYard);
    const totalSaleAmount = yards * pricePerYard;
    let parsedCharges = [];
    try { parsedCharges = JSON.parse(saleCharges || '[]'); } catch { parsedCharges = []; }
    const totalSaleCharges = parsedCharges.reduce((s, c) => s + Number(c.amount || 0), 0);
    const netSaleAmount = totalSaleAmount - totalSaleCharges;
    const proofFile = req.file ? `/uploads/plots/${req.file.filename}` : '';
    plot.sales.push({ buyerName, saleDate, yardsSold: yards, salePricePerYard: pricePerYard, totalSaleAmount, saleCharges: parsedCharges, totalSaleCharges, netSaleAmount, notes, proofFile });
    await plot.save();
    res.status(201).json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a sale
router.delete('/:id/sales/:saleId', async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    plot.sales = plot.sales.filter(s => s._id.toString() !== req.params.saleId);
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── PAYMENTS ───────────────────────────────────────────────────────────────

// POST add payment (with optional file upload)
router.post('/:id/payments', upload.single('proofFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const { paidBy, amount, date, transactionId, paymentMode, proofUrl, notes } = req.body;
    const proofFile = req.file ? `/uploads/plots/${req.file.filename}` : '';
    plot.payments.push({ paidBy, amount: Number(amount), date: date ? new Date(date) : new Date(), transactionId, paymentMode, proofUrl, proofFile, notes });
    await plot.save();
    res.status(201).json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update payment
router.put('/:id/payments/:paymentId', upload.single('proofFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const payment = plot.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    
    const { paidBy, amount, date, transactionId, paymentMode, proofUrl, notes } = req.body;
    if (paidBy) payment.paidBy = paidBy;
    if (amount) payment.amount = Number(amount);
    if (date) payment.date = new Date(date);
    if (transactionId !== undefined) payment.transactionId = transactionId;
    if (paymentMode !== undefined) payment.paymentMode = paymentMode;
    if (proofUrl !== undefined) payment.proofUrl = proofUrl;
    if (notes !== undefined) payment.notes = notes;
    if (req.file) payment.proofFile = `/uploads/plots/${req.file.filename}`;
    
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a payment
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

// ─── COMMISSION AGENTS ───────────────────────────────────────────────────────

// GET all commission agents for a plot
router.get('/:id/agents', async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id).select('commissionAgents');
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    res.json(plot.commissionAgents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST add commission agent (with optional file upload)
router.post('/:id/agents', upload.single('proofFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const { agentName, commissionType, commissionPercentage, commissionAmount, paidAmount, paidBy, paymentDate, transactionId, paymentMode, proofUrl, notes } = req.body;
    const proofFile = req.file ? `/uploads/plots/${req.file.filename}` : '';
    plot.commissionAgents.push({
      agentName,
      commissionType: commissionType || 'fixed',
      commissionPercentage: Number(commissionPercentage || 0),
      commissionAmount: Number(commissionAmount || 0),
      paidAmount: Number(paidAmount || 0),
      paidBy: paidBy || '',
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      transactionId,
      paymentMode,
      proofUrl,
      proofFile,
      notes
    });
    await plot.save();
    res.status(201).json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update agent (mark paid etc.) with optional proof upload
router.put('/:id/agents/:agentId', upload.single('proofFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const agent = plot.commissionAgents.id(req.params.agentId);
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    const { agentName, commissionType, commissionPercentage, commissionAmount, paidAmount, paidBy, paymentDate, transactionId, paymentMode, proofUrl, notes } = req.body;
    if (agentName) agent.agentName = agentName;
    if (commissionType) agent.commissionType = commissionType;
    if (commissionPercentage !== undefined) agent.commissionPercentage = Number(commissionPercentage);
    if (commissionAmount !== undefined) agent.commissionAmount = Number(commissionAmount);
    if (paidAmount !== undefined) agent.paidAmount = Number(paidAmount);
    if (paidBy !== undefined) agent.paidBy = paidBy;
    if (paymentDate) agent.paymentDate = new Date(paymentDate);
    if (transactionId !== undefined) agent.transactionId = transactionId;
    if (paymentMode !== undefined) agent.paymentMode = paymentMode;
    if (proofUrl !== undefined) agent.proofUrl = proofUrl;
    if (notes !== undefined) agent.notes = notes;
    if (req.file) agent.proofFile = `/uploads/plots/${req.file.filename}`;
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE commission agent
router.delete('/:id/agents/:agentId', async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    plot.commissionAgents.id(req.params.agentId).deleteOne();
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── OTHER EXPENSES ────────────────────────────────────────────────────────

// POST add other expense (with optional file upload)
router.post('/:id/expenses', upload.single('proofFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const { expenseName, amount, date, paidBy, paymentMode, transactionId, proofUrl, notes } = req.body;
    const proofFile = req.file ? `/uploads/plots/${req.file.filename}` : '';
    plot.otherExpenses.push({
      expenseName,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      paidBy,
      paymentMode,
      transactionId,
      proofUrl,
      proofFile,
      notes
    });
    await plot.save();
    res.status(201).json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update other expense
router.put('/:id/expenses/:expenseId', upload.single('proofFile'), async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    const expense = plot.otherExpenses.id(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    
    const { expenseName, amount, date, paidBy, paymentMode, transactionId, proofUrl, notes } = req.body;
    if (expenseName) expense.expenseName = expenseName;
    if (amount) expense.amount = Number(amount);
    if (date) expense.date = new Date(date);
    if (paidBy) expense.paidBy = paidBy;
    if (paymentMode !== undefined) expense.paymentMode = paymentMode;
    if (transactionId !== undefined) expense.transactionId = transactionId;
    if (proofUrl !== undefined) expense.proofUrl = proofUrl;
    if (notes !== undefined) expense.notes = notes;
    if (req.file) expense.proofFile = `/uploads/plots/${req.file.filename}`;
    
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE other expense
router.delete('/:id/expenses/:expenseId', async (req, res) => {
  try {
    const plot = await PlotPurchase.findById(req.params.id);
    if (!plot) return res.status(404).json({ message: 'Plot not found' });
    plot.otherExpenses.id(req.params.expenseId).deleteOne();
    await plot.save();
    res.json(plot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── File serving ────────────────────────────────────────────────────────────
// Already served via app.use('/uploads', express.static(uploadsDir)) in server.js

module.exports = router;
