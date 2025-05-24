import express from 'express';
import { signup, login, logout, googleAuth, googleAuthCallback, verifyEmail, verifyPhone } from '../controllers/index.js';
import { authenticateJWT } from '../middlewares/index.js';
import { limiter } from '../middlewares/rateLimit.js';
const router = express.Router();

router.route('/signup')
  .post(limiter, signup);

router.route('/login')
  .post(limiter, login);

router.route('/logout')
  .post(authenticateJWT, logout);

router.route('/google-auth')
  .post(limiter, googleAuth)
  .get(limiter, googleAuthCallback);

router.route('/verify-email')
  .get(verifyEmail);

router.route('/verify-phone')
  .post(verifyPhone);

export default router;