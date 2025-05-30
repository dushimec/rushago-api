import express from 'express';
import { getUserActivityLogs, softDeleteUserActivityLog, permanentDeleteUserActivityLog, userActivityLogStats } from '../controllers/index.js';
import { authenticateJWT } from '../middlewares/index.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: UserActivityLogs
 *   description: Endpoints for managing user activity logs
 */

/**
 * @swagger
 * /api/v1/user-activity-logs:
 *   get:
 *     summary: Get all activity logs for the authenticated user
 *     tags: [UserActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user activity logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user_id:
 *                     type: string
 *                   action:
 *                     type: string
 *                   status:
 *                     type: object
 *                     properties:
 *                       is_deleted:
 *                         type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/user-activity-logs/{id}:
 *   delete:
 *     summary: Soft delete a user activity log
 *     tags: [UserActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Activity log ID
 *     responses:
 *       200:
 *         description: Activity log soft deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Activity log not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/user-activity-logs/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a user activity log
 *     tags: [UserActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Activity log ID
 *     responses:
 *       200:
 *         description: Activity log permanently deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Activity log not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/user-activity-logs/stats:
 *   get:
 *     summary: Get statistics about user activity logs
 *     tags: [UserActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity log statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLogs:
 *                   type: integer
 *                 userLogs:
 *                   type: integer
 *                 recentLogs:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */

router.route('/')
  .get(authenticateJWT, getUserActivityLogs);

router.route('/:id')
  .delete(authenticateJWT, softDeleteUserActivityLog);

router.route('/:id/permanent')
  .delete(authenticateJWT, permanentDeleteUserActivityLog);

router.route('/stats')
  .get(authenticateJWT, userActivityLogStats);

export default router;