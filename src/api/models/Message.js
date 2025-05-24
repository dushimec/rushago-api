import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  thread_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  car_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: {
    text: { type: String },
    media: [{ type: String }],
    type: { type: String, enum: ['text', 'media', 'system'], default: 'text' }
  },
  priority: { type: Boolean, default: false },
  status: {
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    read_timestamp: { type: Date },
    is_deleted: { type: Boolean, default: false }
  },
  timestamp: { type: Date, default: Date.now }
});

messageSchema.index({ thread_id: 1, timestamp: -1 });

 export const Message = mongoose.model('Message', messageSchema); 