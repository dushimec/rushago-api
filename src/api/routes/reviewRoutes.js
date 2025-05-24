import express from 'express';
import { createReview, moderateReview, respondToReview, softDeleteReview, permanentDeleteReview, reviewStats } from '../controllers/index.js';
import { authenticateJWT, isAdmin } from '../middlewares/index.js';

const router = express.Router();

router.route('/')
  .post(authenticateJWT, createReview);

router.route('/moderate/:id')
  .put(authenticateJWT, isAdmin, moderateReview);

router.route('/respond/:id')
  .put(authenticateJWT, respondToReview);

router.route('/:id')
  .delete(authenticateJWT, softDeleteReview);

router.route('/:id/permanent')
  .delete(authenticateJWT, isAdmin, permanentDeleteReview);

router.route('/stats')
  .get(authenticateJWT, reviewStats);

export default router;