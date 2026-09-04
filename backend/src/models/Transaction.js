const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'INR'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  merchant: {
    type: String,
    default: null,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    default: null,
    enum: [null, 'cash', 'upi', 'card', 'bank_transfer', 'wallet', 'other']
  },
  receiptUrl: {
    type: String,
    default: null
  },
  source: {
    type: String,
    default: 'manual',
    enum: ['manual', 'receipt_scan', 'screenshot_scan', 'recurring', 'imported']
  },
  aiCategorized: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  }
}, { timestamps: true });

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, merchant: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
