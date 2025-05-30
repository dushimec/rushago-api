import express from 'express';
import { updateProfilePicture, getUsers, suspendUser, softDeleteUser, permanentDeleteUser, userStats, subscribeToPlan, handleSubscriptionRedirect } from '../controllers/index.js';
import { authenticateJWT, isAdmin } from '../middlewares/index.js';
import { uploadSingle } from '../middlewares/index.js';

const router = express.Router();

router.route('/profile-picture')
  .post(authenticateJWT, uploadSingle, updateProfilePicture);

router.route('/')
  .get(authenticateJWT, isAdmin, getUsers);

router.route('/suspend/:id')
  .put(authenticateJWT, isAdmin, suspendUser);

router.route('/:id')
  .delete(authenticateJWT, isAdmin, softDeleteUser);

router.route('/:id/permanent')
  .delete(authenticateJWT, isAdmin, permanentDeleteUser);

router.route('/stats')
  .get(authenticateJWT, isAdmin, userStats);

router.route('/subscribe')
  .post(authenticateJWT, subscribeToPlan);

router.route('/subscription/redirect')
  .get(authenticateJWT, handleSubscriptionRedirect);

  /**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and subscription endpoints
 */

/**
 * @swagger
 * /api/v1/users/profile-picture:
 *   post:
 *     summary: Update the authenticated user's profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profile_picture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 profile_picture:
 *                   type: string
 *       400:
 *         description: Profile picture is required
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/users/suspend/{id}:
 *   put:
 *     summary: Suspend a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User suspended successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Soft delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User soft deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/users/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User permanently deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/users/stats:
 *   get:
 *     summary: Get user statistics (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 activeUsers:
 *                   type: integer
 *                 proOwners:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/users/subscribe:
 *   post:
 *     summary: Subscribe to a plan
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [basic_owner, pro_owner]
 *               payment_method:
 *                 type: string
 *                 description: Payment method (optional)
 *     responses:
 *       200:
 *         description: Payment initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment_url:
 *                   type: string
 *       400:
 *         description: Invalid subscription plan or already subscribed
 *       500:
 *         description: Payment initiation failed
 */

/**
 * @swagger
 * /api/v1/users/subscription/redirect:
 *   get:
 *     summary: Handle payment gateway redirect after subscription payment
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment status from gateway
 *       - in: query
 *         name: tx_ref
 *         schema:
 *           type: string
 *         required: true
 *         description: Transaction reference
 *       - in: query
 *         name: transaction_id
 *         schema:
 *           type: string
 *         required: false
 *         description: Transaction ID from gateway
 *     responses:
 *       200:
 *         description: Subscription activated successfully
 *       400:
 *         description: Payment failed or cancelled
 *       404:
 *         description: User with pending payment not found
 *       500:
 *         description: Verification failed
 */

export default router;