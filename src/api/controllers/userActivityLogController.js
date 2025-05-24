import asyncHandler from 'express-async-handler';
import { UserActivityLog } from '../models/UserActivity.js';
import { logUserActivity } from '../utils/globalFeature.js';

export const getUserActivityLogs = asyncHandler(async (req, res) => {
  const logs = await UserActivityLog.find({ user_id: req.user.id, 'status.is_deleted': false });
  res.status(200).json(logs);
});

export const softDeleteUserActivityLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const log = await UserActivityLog.findById(id);
  if (!log) {
    res.status(404);
    throw new Error('Activity log not found');
  }

  if (log.user_id.toString() !== req.user.id && req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  log.status.is_deleted = true;
  await log.save();

  await logUserActivity(req.user.id, 'activity_log_soft_deleted', { action: 'soft_delete_activity_log', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Activity log soft deleted successfully' });
});

export const permanentDeleteUserActivityLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const log = await UserActivityLog.findById(id);
  if (!log) {
    res.status(404);
    throw new Error('Activity log not found');
  }

  if (log.user_id.toString() !== req.user.id && req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  await log.remove();

  await logUserActivity(req.user.id, 'activity_log_permanently_deleted', { action: 'permanent_delete_activity_log', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Activity log permanently deleted successfully' });
});

export const userActivityLogStats = asyncHandler(async (req, res) => {
  const totalLogs = await UserActivityLog.countDocuments({ 'status.is_deleted': false });
  const userLogs = await UserActivityLog.countDocuments({ user_id: req.user.id, 'status.is_deleted': false });
  const recentLogs = await UserActivityLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, 'status.is_deleted': false });

  await logUserActivity(req.user.id, 'activity_log_stats_viewed', { action: 'view_activity_log_stats' }, { device: req.headers['user-agent'] });
  res.status(200).json({ totalLogs, userLogs, recentLogs });
});