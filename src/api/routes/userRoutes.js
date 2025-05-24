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

export default router;