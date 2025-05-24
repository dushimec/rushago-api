import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event_type: { type: String, required: true },
  details: {
    action: { type: String },
    target_id: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  context: {
    device: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    ip_address: { type: String }
  },
  status: {
    is_deleted: { type: Boolean, default: false }
  }
}, { timestamps: true });

userActivitySchema.index({ user_id: 1, createdAt: -1 });

export const UserActivityLog = mongoose.model('UserActivityLog', userActivitySchema);