import express from 'express';
import { createReview, moderateReview, respondToReview, softDeleteReview, permanentDeleteReview, reviewStats } from '../controllers/index.js';
import { authenticateJWT, isAdmin } from '../middlewares/index.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Endpoints for managing car reviews
 */

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - car_id
 *               - ratings
 *               - content
 *             properties:
 *               car_id:
 *                 type: string
 *                 description: ID of the car being reviewed
 *               ratings:
 *                 type: object
 *                 description: Ratings object (should include at least 'overall')
 *                 properties:
 *                   overall:
 *                     type: number
 *               content:
 *                 type: string
 *                 description: Review content
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Car ID, ratings, or content missing
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/v1/reviews/moderate/{id}:
 *   put:
 *     summary: Moderate a review (approve or reject)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               moderation_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review moderated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Review not found
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/reviews/respond/{id}:
 *   put:
 *     summary: Respond to a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response_text
 *             properties:
 *               response_text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response added successfully
 *       400:
 *         description: Response text is required
 *       404:
 *         description: Review not found
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Soft delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review soft deleted successfully
 *       404:
 *         description: Review not found
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/reviews/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review permanently deleted successfully
 *       404:
 *         description: Review not found
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/v1/reviews/stats:
 *   get:
 *     summary: Get review statistics
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Review statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReviews:
 *                   type: integer
 *                 approvedReviews:
 *                   type: integer
 *                 averageRating:
 *                   type: number
 *       500:
 *         description: Internal server error
 */

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