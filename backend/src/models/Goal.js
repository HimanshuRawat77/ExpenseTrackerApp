const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 1
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  targetDate: {
    type: Date,
    required: true
  },
  icon: {
    type: String,
    default: 'piggy-bank'
  },
  color: {
    type: String,
    default: '#1E88E5'
  },
  contributions: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: ''
    }
  }],
  completed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

goalSchema.index({ userId: 1 });

module.exports = mongoose.model('Goal', goalSchema);
