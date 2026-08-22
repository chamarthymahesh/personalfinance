const mongoose = require('mongoose');

const CategoryFieldSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "consumerNumber"
  label: { type: String, required: true }, // e.g. "Consumer Number"
  type: { type: String, default: 'text' }, // "text", "number", "date", "select"
  required: { type: Boolean, default: false },
  options: [{ type: String }] // For 'select' dropdown options
});

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "Electricity"
  module: { type: String, default: 'expenses' }, // expenses, insurances, investments
  fields: [CategoryFieldSchema]
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
