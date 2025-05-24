import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Car } from '../models/Car.js';
import { cacheChatHistory, getCachedChatHistory, clearChatCache, logUserActivity, uploadMultipleImages } from '../utils/globalFeature.js';

export const startChat = asyncHandler(async (req, res) => {
  const { car_id, recipient_id, content, media } = req.body;
  if (!car_id || !recipient_id || (!content && (!req.files || req.files.length === 0))) {
    res.status(400);
    throw new Error('Car ID, recipient ID, and either content or media are required');
  }

  const sender = await User.findById(req.user.id);
  const recipient = await User.findById(recipient_id);
  const car = await Car.findById(car_id);

  if (!sender || !recipient || !car) {
    res.status(404);
    throw new Error('Sender, recipient, or car not found');
  }

  let mediaUrls = [];
  if (req.files && req.files.length > 0) {
    mediaUrls = await uploadMultipleImages(req.files, 'rushago/messages'); // Upload media to Cloudinary
  }

  const thread_id = new mongoose.Types.ObjectId();
  const isProOwner = sender.role.is_owner && sender.subscription.plan === 'pro_owner';

  const message = await Message.create({
    thread_id,
    car_id,
    sender_id: req.user.id,
    recipient_id,
    content: { text: content, media: mediaUrls, type: mediaUrls.length > 0 ? 'media' : 'text' },
    priority: isProOwner
  });

  await logUserActivity(req.user.id, 'message_sent', { action: 'start_chat', target_id: message._id }, { device: req.headers['user-agent'] });
  res.status(201).json({
    thread_id,
    car_id,
    sender_id: req.user.id,
    recipient_id,
    priority: isProOwner,
    message
  });
});

export const getChatHistory = asyncHandler(async (req, res) => {
  const { thread_id } = req.params;

  const cachedMessages = await getCachedChatHistory(thread_id);
  if (cachedMessages) {
    return res.status(200).json(cachedMessages);
  }

  const messages = await Message.find({ thread_id, 'status.is_deleted': false })
    .populate('sender_id', 'name')
    .populate('recipient_id', 'name')
    .sort({ timestamp: 'asc' });

  await cacheChatHistory(thread_id, messages);
  await logUserActivity(req.user.id, 'chat_history_viewed', { action: 'view_chat_history', target_id: thread_id }, { device: req.headers['user-agent'] });
  res.status(200).json(messages);
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const { message_id } = req.params;
  const message = await Message.findById(message_id);
  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  if (message.recipient_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized');
  }

  message.status.read = true;
  message.status.read_timestamp = new Date();
  await message.save();

  await logUserActivity(req.user.id, 'message_read', { action: 'mark_message_read', target_id: message_id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Message marked as read' });
});

export const softDeleteMessage = asyncHandler(async (req, res) => {
  const { message_id } = req.params;
  const message = await Message.findById(message_id);
  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  if (message.sender_id.toString() !== req.user.id && message.recipient_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized');
  }

  message.status.is_deleted = true;
  await message.save();
  await clearChatCache(message.thread_id);

  await logUserActivity(req.user.id, 'message_soft_deleted', { action: 'soft_delete_message', target_id: message_id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Message soft deleted successfully' });
});

export const permanentDeleteMessage = asyncHandler(async (req, res) => {
  const { message_id } = req.params;
  const message = await Message.findById(message_id);
  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  if (message.sender_id.toString() !== req.user.id && message.recipient_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized');
  }

  await message.remove();
  await clearChatCache(message.thread_id);

  await logUserActivity(req.user.id, 'message_permanently_deleted', { action: 'permanent_delete_message', target_id: message_id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Message permanently deleted successfully' });
});

export const messageStats = asyncHandler(async (req, res) => {
  const totalMessages = await Message.countDocuments({ 'status.is_deleted': false });
  const readMessages = await Message.countDocuments({ 'status.read': true, 'status.is_deleted': false });
  const priorityMessages = await Message.countDocuments({ priority: true, 'status.is_deleted': false });

  await logUserActivity(req.user.id, 'message_stats_viewed', { action: 'view_message_stats' }, { device: req.headers['user-agent'] });
  res.status(200).json({ totalMessages, readMessages, priorityMessages });
});