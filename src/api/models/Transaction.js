import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String,  },// enum: ['subscription']
  purpose: { type: String }, // e.g., 'basic_owner_monthly', 'pro_owner_monthly'
  financial: {
    amount: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  payment: {
    method: { type: String,  }, //enum: ['card', 'mobile']
    provider: { type: String, default: 'flutterwave' },
    transaction_id: String,
    status: { type: String,  default: 'pending' } // enum: ['pending', 'completed', 'failed'],
  }
}, { timestamps: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);