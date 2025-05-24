import express from 'express';
import { getUserActivityLogs, softDeleteUserActivityLog, permanentDeleteUserActivityLog, userActivityLogStats } from '../controllers/index.js';
import { authenticateJWT } from '../middlewares/index.js';

const router = express.Router();

router.route('/')
  .get(authenticateJWT, getUserActivityLogs);

router.route('/:id')
  .delete(authenticateJWT, softDeleteUserActivityLog);

router.route('/:id/permanent')
  .delete(authenticateJWT, permanentDeleteUserActivityLog);

router.route('/stats')
  .get(authenticateJWT, userActivityLogStats);

export default router;