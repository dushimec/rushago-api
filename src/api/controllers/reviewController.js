import asyncHandler from 'express-async-handler';
import { Review } from '../models/Review.js';
import { Car } from '../models/Car.js';
import { logUserActivity } from '../utils/globalFeature.js';

export const createReview = asyncHandler(async (req, res) => {
  const { car_id, ratings, content } = req.body;
  if (!car_id || !ratings || !content) {
    res.status(400);
    throw new Error('Car ID, ratings, and content are required');
  }

  const car = await Car.findById(car_id);
  if (!car) {
    res.status(404);
    throw new Error('Car not found');
  }

  const review = await Review.create({
    car_id,
    reviewer_id: req.user.id,
    reviewee_id: car.owner_id,
    ratings,
    content
  });

  await logUserActivity(req.user.id, 'review_created', { action: 'create_review', target_id: review._id }, { device: req.headers['user-agent'] });
  res.status(201).json({ message: 'Review created successfully', review });
});

export const moderateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, moderation_notes } = req.body;
  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  const review = await Review.findById(id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  review.status.current = status;
  review.status.moderation_notes = moderation_notes;
  await review.save();

  await logUserActivity(req.user.id, 'review_moderated', { action: 'moderate_review', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Review moderated successfully' });
});

export const respondToReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response_text } = req.body;
  if (!response_text) {
    res.status(400);
    throw new Error('Response text is required');
  }

  const review = await Review.findById(id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (review.reviewee_id.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized');
  }

  review.response.response_text = response_text;
  review.response.response_date = new Date();
  await review.save();

  await logUserActivity(req.user.id, 'review_responded', { action: 'respond_to_review', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Response added successfully' });
});

export const softDeleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const review = await Review.findById(id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (review.reviewer_id.toString() !== req.user.id && req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  review.status.is_deleted = true;
  await review.save();

  await logUserActivity(req.user.id, 'review_soft_deleted', { action: 'soft_delete_review', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Review soft deleted successfully' });
});

export const permanentDeleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const review = await Review.findById(id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  if (review.reviewer_id.toString() !== req.user.id && req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  await review.remove();

  await logUserActivity(req.user.id, 'review_permanently_deleted', { action: 'permanent_delete_review', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Review permanently deleted successfully' });
});

export const reviewStats = asyncHandler(async (req, res) => {
  const totalReviews = await Review.countDocuments({ 'status.is_deleted': false });
  const approvedReviews = await Review.countDocuments({ 'status.current': 'approved', 'status.is_deleted': false });
  const averageRating = await Review.aggregate([
    { $match: { 'status.is_deleted': false } },
    { $group: { _id: null, avgRating: { $avg: '$ratings.overall' } } }
  ]);

  await logUserActivity(req.user.id, 'review_stats_viewed', { action: 'view_review_stats' }, { device: req.headers['user-agent'] });
  res.status(200).json({
    totalReviews,
    approvedReviews,
    averageRating: averageRating.length > 0 ? averageRating[0].avgRating : 0
  });
});