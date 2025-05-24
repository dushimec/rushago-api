import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  billId: { type: String, unique: true },
  phone: { type: String },
  amount: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['momo', 'card'], required: true },
  status: { type: String, enum: ['pending', 'initiated', 'completed', 'failed'], default: 'pending' },
  isDone: { type: Boolean, default: false },
  resBody: { type: mongoose.Schema.Types.Mixed },
  callbackBody: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

billSchema.pre('save', async function(next) {
  if (!this.billId) {
    this.billId = `BILL-${Date.now()}-${this._id}`;
  }
  next();
});

export const Bill = mongoose.model('Bill', billSchema);