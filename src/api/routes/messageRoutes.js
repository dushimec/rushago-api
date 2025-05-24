import express from 'express';
import { authenticateJWT } from '../middlewares/index.js';
import { getChatHistory, markMessageRead, messageStats, permanentDeleteMessage, softDeleteMessage, startChat } from '../controllers/messageControler.js';

const router = express.Router();

router.route('/start')
  .post(authenticateJWT, startChat);

router.route('/history/:thread_id')
  .get(authenticateJWT, getChatHistory);

router.route('/read/:message_id')
  .put(authenticateJWT, markMessageRead);

router.route('/:message_id')
  .delete(authenticateJWT, softDeleteMessage);

router.route('/:message_id/permanent')
  .delete(authenticateJWT, permanentDeleteMessage);

router.route('/stats')
  .get(authenticateJWT, messageStats);

export default router;