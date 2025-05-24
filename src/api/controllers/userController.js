import asyncHandler from 'express-async-handler';
import httpStatus from 'http-status';
import AppError from '../helpers/appError.js';
import { User } from '../models/User.js';
import { logUserActivity, uploadSingleImage } from '../utils/globalFeature.js';
import { makePayment, initiateCardPayment, checkPaymentStatus } from '../services/payment.js';

export const updateProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Profile picture is required');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const profilePictureUrl = await uploadSingleImage(req.file, 'rushago/profiles');
  user.profile.profile_picture = profilePictureUrl;
  await user.save();

  await logUserActivity(req.user.id, 'profile_picture_updated', { action: 'update_profile_picture' }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'Profile picture updated successfully', profile_picture: profilePictureUrl });
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ 'status.is_deleted': false }).select('-authentication.password_hash');
  await logUserActivity(req.user.id, 'users_viewed', { action: 'view_users' }, { device: req.headers['user-agent'] });
  res.status(200).json(users);
});

export const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.is_online = false;
  user.role.is_renter = false;
  user.role.is_owner = false;
  await user.save();

  await logUserActivity(req.user.id, 'user_suspended', { action: 'suspend_user', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'User suspended successfully' });
});

export const softDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  user.status.is_deleted = true;
  user.is_online = false;
  await user.save();

  await logUserActivity(req.user.id, 'user_soft_deleted', { action: 'soft_delete_user', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'User soft deleted successfully' });
});

export const permanentDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.user.role.admin_level === 'none') {
    res.status(403);
    throw new Error('Not authorized');
  }

  await user.remove();
  await logUserActivity(req.user.id, 'user_permanently_deleted', { action: 'permanent_delete_user', target_id: id }, { device: req.headers['user-agent'] });
  res.status(200).json({ message: 'User permanently deleted successfully' });
});

export const userStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({ 'status.is_deleted': false });
  const activeUsers = await User.countDocuments({ is_online: true, 'status.is_deleted': false });
  const proOwners = await User.countDocuments({ 'subscription.plan': 'pro_owner', 'subscription.status': 'active', 'status.is_deleted': false });

  await logUserActivity(req.user.id, 'user_stats_viewed', { action: 'view_user_stats' }, { device: req.headers['user-agent'] });
  res.status(200).json({ totalUsers, activeUsers, proOwners });
});

export const subscribeToPlan = asyncHandler(async (req, res) => {
  const { plan, payment_method } = req.body;
  if (!plan || !['basic_owner', 'pro_owner'].includes(plan)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid subscription plan');
  }

  const user = await User.findById(req.user.id);
  if (user.subscription.plan === plan && user.subscription.status === 'active') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Already subscribed to this plan');
  }

  const tx_ref = `RUSHAGO_SUB_${req.user.id}_${Date.now()}`;
  const amount = plan === 'pro_owner' ? 10000 : 5000; // RWF
  const paymentData = {
    tx_ref,
    amount,
    currency: 'RWF',
    redirect_url: 'http://localhost:15000/api/v1/users/subscription/redirect',
    customer: {
      email: user.email,
      name: user.name
    },
    customizations: {
      title: `RUSHAGO ${plan} Subscription`,
      description: `Subscription payment for ${plan} plan`
    }
  };

  try {
    const response = await initiateCardPayment(paymentData);
    if (response.status !== 'success') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to initiate payment');
    }

    user.subscription.pending_payment = { tx_ref, amount, plan };
    await user.save();

    await logUserActivity(req.user.id, 'subscription_initiated', { action: 'initiate_subscription', metadata: { plan, tx_ref } }, { device: req.headers['user-agent'] });
    res.status(httpStatus.OK).json({
      message: 'Payment initiated',
      payment_url: response.data.link
    });
  } catch (error) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, `Payment initiation failed: ${error.message}`);
  }
});

export const handleSubscriptionRedirect = asyncHandler(async (req, res) => {
  const { status, tx_ref, transaction_id } = req.query;
  if (!tx_ref || !status) {
    res.status(400);
    throw new Error('Invalid redirect data');
  }

  const user = await User.findOne({ 'subscription.pending_payment.tx_ref': tx_ref });
  if (!user) {
    res.status(404);
    throw new Error('User with pending payment not found');
  }

  if (status === 'successful') {
    try {
      const response = await checkPaymentStatus(transaction_id);
      if (response[0].status === httpStatus.OK) {
        user.subscription.plan = user.subscription.pending_payment.plan;
        user.subscription.status = 'active';
        user.subscription.start_date = new Date();
        user.subscription.end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        user.subscription.payment_method_id = transaction_id;
        user.role.is_owner = true;
        user.subscription.pending_payment = null;
        await user.save();

        await logUserActivity(user._id, 'subscription_activated', { action: 'activate_subscription', metadata: { plan: user.subscription.plan } }, { device: req.headers['user-agent'] });
        res.status(200).json({ message: 'Subscription activated successfully' });
      } else {
        user.subscription.pending_payment = null;
        await user.save();
        res.status(400).json({ message: 'Payment verification failed' });
      }
    } catch (error) {
      user.subscription.pending_payment = null;
      await user.save();
      res.status(500).json({ message: `Verification failed: ${error.message}` });
    }
  } else {
    user.subscription.pending_payment = null;
    await user.save();
    res.status(400).json({ message: 'Payment failed or cancelled' });
  }
});