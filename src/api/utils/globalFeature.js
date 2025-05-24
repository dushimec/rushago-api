import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { transporter } from '../config/config.js';
import twilio from 'twilio';
import mongoose from 'mongoose';
import { UserActivityLog } from '../models/UserActivity.js';
import { cloudinary } from '../config/config.js';
import { Message } from '../models/Message.js';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const generateJWT = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const sendVerificationEmail = async (email, token) => {
  const url = `http://localhost:15000/api/v1/auth/verify-email?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'RUSHAGO Email Verification',
    html: `
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${url}">${url}</a>
      <p>This link expires in 1 hour.</p>
    `
  };
  await transporter.sendMail(mailOptions);
};

export const sendPhoneVerificationCode = async (phone) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await twilioClient.messages.create({
    body: `Your RUSHAGO verification code is ${code}`,
    from: process.env.TWILIO_PHONE,
    to: phone
  });
  return code;
};

export const findCarsNear = async (longitude, latitude, maxDistance = 10000) => {
  return await mongoose.model('Car').find({
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistance
      }
    }
  });
};

export const logUserActivity = async (user_id, event_type, details, context) => {
  await UserActivityLog.create({
    user_id,
    event_type,
    details,
    context
  });
};

export const uploadSingleImage = async (file, folder = 'rushago') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'image'
    });
    return result.secure_url;
  } catch (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

export const uploadMultipleImages = async (files, folder = 'rushago') => {
  try {
    const uploadPromises = files.map(file =>
      cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'image'
      })
    );
    const results = await Promise.all(uploadPromises);
    return results.map(result => result.secure_url);
  } catch (error) {
    throw new Error(`Multiple image upload failed: ${error.message}`);
  }
};


export const cacheChatHistory = async (thread_id, messages) => {
  await Message.findOneAndUpdate(
    { thread_id },
    { messages, createdAt: new Date() },
    { upsert: true, new: true }
  );
};

export const getCachedChatHistory = async (thread_id) => {
  const cache = await Message.findOne({ thread_id });
  return cache ? cache.messages : null;
};

export const clearChatCache = async (thread_id) => {
  await Message.deleteOne({ thread_id });
};
