import express from 'express';
import { signup, login, logout, googleAuth, googleAuthCallback, verifyEmail, verifyPhone } from '../controllers/index.js';
import { authenticateJWT } from '../middlewares/index.js';
import { limiter } from '../middlewares/rateLimit.js';
const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: User Signup
 *     description: Allows a user to sign up with email, phone, and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Signup successful
 *       400:
 *         description: Validation errors or user already exists
 *       500:
 *         description: Internal server error
 */
router.route('/signup')
  .post(limiter, signup);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User Login
 *     description: Allows a user to log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.route('/login')
  .post(limiter, login);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User Logout
 *     description: Logs out the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.route('/logout')
  .post(authenticateJWT, logout);

/**
 * @swagger
 * /api/v1/auth/google-auth:
 *   post:
 *     summary: Google Authentication
 *     description: Allows a user to authenticate using Google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_token
 *             properties:
 *               id_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Google authentication successful
 *       400:
 *         description: Missing Google ID token
 *       500:
 *         description: Internal server error
 */
router.route('/google-auth')
  .post(limiter, googleAuth)
  .get(limiter, googleAuthCallback);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   get:
 *     summary: Email Verification
 *     description: Verifies the user's email address using the token sent via email
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         description: The email verification token
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Token missing or invalid
 *       404:
 *         description: User not found or token expired
 */
router.route('/verify-email')
  .get(verifyEmail);

/**
 * @swagger
 * /api/v1/auth/verify-phone:
 *   post:
 *     summary: Phone Verification
 *     description: Verifies the user's phone number with a verification code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *       400:
 *         description: Invalid or expired verification code
 *       404:
 *         description: User not found
 */
router.route('/verify-phone')
  .post(verifyPhone);

export default router;
