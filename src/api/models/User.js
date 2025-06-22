import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  profile: {
    profile_picture: { type: String, default: '' },
    bio: { type: String, default: '' },
    preferences: {
      preferred_cities: [{ type: String }],
      preferred_car_types: [{ type: String }],
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        in_app: { type: Boolean, default: true }
      }
    }
  }, 
  authentication: {
    password_hash: { type: String, required: true },
    auth_providers: [{
      provider: { type: String, enum: ['google', 'apple', 'facebook'] },
      provider_id: { type: String }
    }],
    verification_token: { type: String },
    phone_verification_code: { type: String },
    phone_verification_expires: { type: Date },
    mfa_setting: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['sms', 'email', 'authenticator'], default: 'sms' }
    }
  },
  verifications: {
    email_verified: { type: Boolean, default: false },
    phone_verified: { type: Boolean, default: false },
    identity_verified: { type: Boolean, default: false }
  },
  role: {
    is_renter: { type: Boolean, default: true },
    is_owner: { type: Boolean, default: false },
    admin_level: { type: String, enum: ['none', 'moderator', 'super'], default: 'none' }
  },
  subscription: {
    plan: { type: String, enum: ['basic_owner', 'pro_owner'], default: 'basic_owner' },
    status: { type: String, enum: ['inactive', 'active', 'cancelled'], default: 'inactive' },
    start_date: { type: Date },
    end_date: { type: Date },
    payment_method_id: { type: String },
    pending_payment: {
      tx_ref: { type: String },
      amount: { type: Number },
      plan: { type: String, enum: ['basic_owner', 'pro_owner'] }
    }
  },
  activity_metrics: {
    last_login: { type: Date },
    login_count: { type: Number, default: 0 },
    active_days: [{ type: Date }]
  },
  is_online: { type: Boolean, default: false },
  status: {
    is_deleted: { type: Boolean, default: false }
  }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);