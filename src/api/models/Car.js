import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  type: { type: String, enum: ['sedan', 'suv', 'truck', 'van', 'coupe', 'convertible'], required: true },
  specifications: {
    fuel_type: { type: String, enum: ['petrol', 'diesel', 'electric', 'hybrid'], required: true },
    transmission: { type: String, enum: ['manual', 'automatic'], required: true },
    seats: { type: Number, required: true },
    mileage: { type: Number },
    color: { type: String }
  },
  location: {
    city: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
    }
  },
  pricing: {
    base_price: { type: Number, required: true },
    hourly_rate: { type: Number },
    daily_rate: { type: Number },
    currency: { type: String, default: 'RWF' }
  },
  availability: {
    schedule: [{
      start_date: { type: Date, required: true },
      end_date: { type: Date, required: true },
      is_available: { type: Boolean, default: true }
    }],
    blackout_dates: [{ type: Date }]
  },
  media: {
    photos: [{ type: String }],
    videos: [{ type: String }],
    thumbnail: { type: String }
  },
  categories: [{ type: String }],
  status: {
    is_active: { type: Boolean, default: true },
    is_verified: { type: Boolean, default: false },
    is_featured: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Geospatial index for location-based queries
carSchema.index({ 'location.coordinates': '2dsphere' });

export const Car = mongoose.model('Car', carSchema);
