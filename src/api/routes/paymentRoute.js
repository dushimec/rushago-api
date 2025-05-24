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

export default paymentRoutes;