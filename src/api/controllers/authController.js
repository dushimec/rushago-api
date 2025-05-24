import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { User } from '../models/User.js';
import {
  generateJWT, generateVerificationToken, sendVerificationEmail,
  sendPhoneVerificationCode, logUserActivity
} from '../utils/globalFeature.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error('Name, email, phone, and password are required');
  }

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    res.status(400);
    throw new Error('Email or phone already registered');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const verification_token = generateVerificationToken();
  const phone_verification_code = await sendPhoneVerificationCode(phone);

  const user = await User.create({
    name,
    email,
    phone,
    authentication: {
      password_hash,
      verification_token,
      phone_verification_code,
      phone_verification_expires: new Date(Date.now() + 3600000)
    },
    role: { is_renter: true }
  });

  user.activity_metrics.last_login = new Date();
  user.activity_metrics.login_count += 1;
  user.activity_metrics.active_days.push(new Date());
  user.is_online = true;
  await user.save();

  await sendVerificationEmail(email, verification_token);
  await logUserActivity(user._id, 'signup', { action: 'user_created' }, { device: req.headers['user-agent'] });

  const token = generateJWT({ id: user._id, isProOwner: false });

  res.status(201).json({
    message: 'Signup successful, please verify email and phone',
    token,
    user: { id: user._id, email, phone, name, isProOwner: false }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isPasswordValid = await bcrypt.compare(password, user.authentication.password_hash);
  if (!isPasswordValid) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  if (!user.verifications.email_verified || !user.verifications.phone_verified) {
    res.status(403);
    throw new Error('Please verify your email and phone');
  }

  user.activity_metrics.last_login = new Date();
  user.activity_metrics.login_count += 1;
  user.activity_metrics.active_days.push(new Date());
  user.is_online = true;
  await user.save();

  await logUserActivity(user._id, 'login', { action: 'user_login' }, { device: req.headers['user-agent'] });

  const token = generateJWT({ id: user._id, isProOwner: user.role.is_owner && user.subscription.plan === 'pro_owner' });

  res.status(200).json({
    message: 'Login successful',
    token,
    user: { id: user._id, email, name: user.name, isProOwner: user.role.is_owner && user.subscription.plan === 'pro_owner' }
  });
});

export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user._id); // Still generate JWT

    // ✅ NO Redis session saving

    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  } catch (error) {
    res.status(500).json({ message: 'Google authentication failed' });
  }
};
export const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400);
    throw new Error('Refresh token is required');
  }

  // Verify the refresh token
  const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
  if (!decoded) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }

  // Generate a new access token
  const newToken = generateJWT({ id: decoded.id, isProOwner: decoded.isProOwner });

  res.status(200).json({ token: newToken });
});
export const verifyPhone = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    res.status(400);
    throw new Error('Phone and verification code are required');
  }

  const user = await User.findOne({ phone });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (
    !user.authentication.phone_verification_code ||
    user.authentication.phone_verification_code !== code ||
    (user.authentication.phone_verification_expires && user.authentication.phone_verification_expires < new Date())
  ) {
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  user.verifications.phone_verified = true;
  user.authentication.phone_verification_code = null;
  user.authentication.phone_verification_expires = null;
  await user.save();

  res.status(200).json({ message: 'Phone verified successfully' });
});
export const logout = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const user = await User.findById(userId);
  if (user) {
    user.is_online = false;
    await user.save();
  }

  await logUserActivity(userId, 'logout', { action: 'user_logout' }, { device: req.headers['user-agent'] });

  res.status(200).json({ message: 'Logout successful' });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) {
    res.status(400);
    throw new Error('Google ID token is required');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const { email, name, picture, sub: googleId } = ticket.getPayload();
  let user = await User.findOne({ email });
  const verification_token = generateVerificationToken();

  if (!user) {
    const phone_verification_code = await sendPhoneVerificationCode(req.body.phone || '+250700000000');
    user = await User.create({
      name,
      email,
      phone: req.body.phone || '',
      profile: { profile_picture: picture },
      authentication: {
        auth_providers: [{ provider: 'google', provider_id: googleId }],
        verification_token,
        phone_verification_code,
        phone_verification_expires: new Date(Date.now() + 3600000)
      },
      role: { is_renter: true }
    });
    await sendVerificationEmail(email, verification_token);
  } else {
    const googleProvider = user.authentication.auth_providers.find(p => p.provider === 'google');
    if (!googleProvider) {
      user.authentication.auth_providers.push({ provider: 'google', provider_id: googleId });
    }
    if (!user.verifications.email_verified) {
      user.authentication.verification_token = verification_token;
      await sendVerificationEmail(email, verification_token);
    }
  }

  user.activity_metrics.last_login = new Date();
  user.activity_metrics.login_count += 1;
  user.activity_metrics.active_days.push(new Date());
  user.is_online = true;
  await user.save();

  await logUserActivity(user._id, 'google_auth', { action: 'google_login' }, { device: req.headers['user-agent'] });

  const token = generateJWT({ id: user._id, isProOwner: user.role.is_owner && user.subscription.plan === 'pro_owner' });

  res.status(200).json({
    message: 'Google authentication successful, please verify email and phone if not done',
    token,
    user: { id: user._id, email, name, isProOwner: user.role.is_owner && user.subscription.plan === 'pro_owner' }
  });
});
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    res.status(400);
    throw new Error('Verification token is required');
  }

  const user = await User.findOne({ 'authentication.verification_token': token });
  if (!user) {
    res.status(404);
    throw new Error('User not found or token expired');
  }

  user.verifications.email_verified = true;
  user.authentication.verification_token = null;
  await user.save();

  res.status(200).json({ message: 'Email verified successfully' });
});