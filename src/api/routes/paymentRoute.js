import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/index.js';
import {
  initiateSubscriptionPayment,
  handleSubscriptionRedirect,
  checkPaymentStatusHandler,
  verifySpecificPayment,
  getAllRevenueTotal,
  getAllBills,
  getAllBillsById,
  deleteOneById
} from '../controllers/paymentController.js';

const paymentRoutes = Router();

paymentRoutes.route('/subscription')
  .post(authenticateJWT, initiateSubscriptionPayment);

paymentRoutes.route('/subscription/redirect')
  .get(authenticateJWT, handleSubscriptionRedirect);

paymentRoutes.route('/status')
  .post(authenticateJWT, checkPaymentStatusHandler);

paymentRoutes.route('/verify/:id')
  .get(authenticateJWT, verifySpecificPayment);

paymentRoutes.route('/revenue/total')
  .get(authenticateJWT, authorizeRoles('admin'), getAllRevenueTotal);

paymentRoutes.route('/bills')
  .get(authenticateJWT, authorizeRoles('admin'), getAllBills);

paymentRoutes.route('/bills/:id')
  .get(authenticateJWT, authorizeRoles('admin'), getAllBillsById)
  .delete(authenticateJWT, authorizeRoles('admin'), deleteOneById);

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment and billing management
 */

/**
 * @swagger
 * /api/v1/payments/subscription:
 *   post:
 *     summary: Initiate a subscription payment
 *     tags: [Payments]
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [momo, card]
 *               phone:
 *                 type: string
 *               card_number:
 *                 type: string
 *               expiry_month:
 *                 type: string
 *               expiry_year:
 *                 type: string
 *               cvv:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initiated or subscription activated
 *       400:
 *         description: Invalid input or payment failed
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/payments/subscription/redirect:
 *   get:
 *     summary: Handle payment gateway redirect after subscription payment
 *     tags: [Payments]
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
 *     responses:
 *       200:
 *         description: Subscription activated successfully
 *       400:
 *         description: Payment failed or cancelled
 *       404:
 *         description: User or bill not found
 */

/**
 * @swagger
 * /api/v1/payments/status:
 *   post:
 *     summary: Check payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *       400:
 *         description: Failed to get payment status
 */

/**
 * @swagger
 * /api/v1/payments/verify/{id}:
 *   get:
 *     summary: Verify a specific payment by transaction ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Payment verified and updated
 *       404:
 *         description: Bill not found
 */

/**
 * @swagger
 * /api/v1/payments/revenue/total:
 *   get:
 *     summary: Get total revenue (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total revenue retrieved
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/payments/bills:
 *   get:
 *     summary: Get all bills (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all bills
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/payments/bills/{id}:
 *   get:
 *     summary: Get a bill by ID (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill retrieved
 *       404:
 *         description: Bill not found
 *   delete:
 *     summary: Delete a bill by ID (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill deleted successfully
 *       404:
 *         description: Bill not found
 */
export default paymentRoutes;