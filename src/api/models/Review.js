import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  car_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratings: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 }
  },
  content: { type: String, required: true },
  response: {
    response_text: { type: String },
    response_date: { type: Date }
  },
  status: {
    current: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    moderation_notes: { type: String },
    is_deleted: { type: Boolean, default: false }
  }
}, { timestamps: true });

reviewSchema.index({ car_id: 1, reviewer_id: 1 });

export const Review = mongoose.model('Review', reviewSchema);