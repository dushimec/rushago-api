import express from 'express';
import { authenticateJWT } from '../middlewares/index.js';
import { getChatHistory, markMessageRead, messageStats, permanentDeleteMessage, softDeleteMessage, startChat } from '../controllers/messageControler.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: API for managing messages, including sending, reading, deleting, and viewing stats.
 */

/**
 * @swagger
 * /api/v1/messages/start:
 *   post:
 *     summary: Start a new chat
 *     description: Initiates a new chat between a sender and a recipient.
 *     tags: [Messages]
 *     security:
 *       - JWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               car_id:
 *                 type: string
 *               recipient_id:
 *                 type: string
 *               content:
 *                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Chat started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 thread_id:
 *                   type: string
 *                 car_id:
 *                   type: string
 *                 sender_id:
 *                   type: string
 *                 recipient_id:
 *                   type: string
 *                 priority:
 *                   type: boolean
 *                 message:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     content:
 *                       type: string
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Sender, recipient, or car not found
 *       500:
 *         description: Internal server error
 */
router.route('/start').post(authenticateJWT, startChat);

/**
 * @swagger
 * /api/v1/messages/history/{thread_id}:
 *   get:
 *     summary: Get chat history by thread ID
 *     description: Retrieves the chat history for a specific thread.
 *     tags: [Messages]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: thread_id
 *         in: path
 *         required: true
 *         description: The ID of the thread to retrieve the history for.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved chat history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   content:
 *                     type: string
 *                   sender_id:
 *                     type: string
 *                   recipient_id:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *       404:
 *         description: Chat history not found
 *       500:
 *         description: Internal server error
 */
router.route('/history/:thread_id').get(authenticateJWT, getChatHistory);

/**
 * @swagger
 * /api/v1/messages/read/{message_id}:
 *   put:
 *     summary: Mark a message as read
 *     description: Marks a message as read.
 *     tags: [Messages]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: message_id
 *         in: path
 *         required: true
 *         description: The ID of the message to mark as read.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.route('/read/:message_id').put(authenticateJWT, markMessageRead);

/**
 * @swagger
 * /api/messages/{message_id}:
 *   delete:
 *     summary: Soft delete a message
 *     description: Soft deletes a message (marks as deleted but does not remove it from the database).
 *     tags: [Messages]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: message_id
 *         in: path
 *         required: true
 *         description: The ID of the message to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message soft deleted
 *       404:
 *         description: Message not found
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.route('/:message_id').delete(authenticateJWT, softDeleteMessage);

/**
 * @swagger
 * /api/v1/messages/{message_id}/permanent:
 *   delete:
 *     summary: Permanently delete a message
 *     description: Permanently deletes a message from the database.
 *     tags: [Messages]
 *     security:
 *       - JWT: []
 *     parameters:
 *       - name: message_id
 *         in: path
 *         required: true
 *         description: The ID of the message to permanently delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message permanently deleted
 *       404:
 *         description: Message not found
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Internal server error
 */
router.route('/:message_id/permanent').delete(authenticateJWT, permanentDeleteMessage);

/**
 * @swagger
 * /api/v1/messages/stats:
 *   get:
 *     summary: Get message statistics
 *     description: Retrieves statistics about messages, such as total, read, and priority messages.
 *     tags: [Messages]
 *     security:
 *       - JWT: []
 *     responses:
 *       200:
 *         description: Successfully retrieved message statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalMessages:
 *                   type: integer
 *                 readMessages:
 *                   type: integer
 *                 priorityMessages:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.route('/stats').get(authenticateJWT, messageStats);

export default router;
