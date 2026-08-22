const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  propertyName: {
    type: String,
    required: true
  },
  tenantName: {
    type: String,
    required: true
  },
  rentAmount: {
    type: Number,
    required: true
  },
  agreementDocumentUrl: {
    type: String
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Property', PropertySchema);
