import asyncHandler from 'express-async-handler';
import { User } from '../models/User.js';
import { Car } from '../models/Car.js';
import { logUserActivity } from '../utils/globalFeature.js';

export const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

export const getGlobalStats = asyncHandler(async (req, res) => {
  const userCount = await User.countDocuments();
  const carCount = await Car.countDocuments({ 'status.is_active': true });

  await logUserActivity(req.user?.id, 'global_stats_viewed', { action: 'view_global_stats' }, { device: req.headers['user-agent'] });
  res.status(200).json({ userCount, carCount });
});