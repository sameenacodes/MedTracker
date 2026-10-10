const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  items: [{
    medicine: { type: mongoose.Schema.Types.ObjectId, 
      ref: 'Medicine' },
    medicineName: String,
    quantity: Number,
    price: Number,
    total: Number,
  }],
  subtotal: Number,
  gst: Number,
  total: Number,
  soldBy: { type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', saleSchema);