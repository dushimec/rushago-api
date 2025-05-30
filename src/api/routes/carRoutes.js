import express from 'express';
import { createCar, getCars, updateCar, softDeleteCar, permanentDeleteCar, carStats } from '../controllers/carController.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/cars:
 *   post:
 *     summary: Create a new car
 *     tags: [Cars]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: number
 *               type:
 *                 type: string
 *               specifications:
 *                 type: object
 *               location:
 *                 type: object
 *               pricing:
 *                 type: object
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Car created successfully
 *       400:
 *         description: Required fields missing
 */
router.route('/')
  .post(createCar)
  .get(getCars);

/**
 * @swagger
 * /api/v1/cars/{id}:
 *   put:
 *     summary: Update car details
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Car ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: number
 *               type:
 *                 type: string
 *               specifications:
 *                 type: object
 *               location:
 *                 type: object
 *               pricing:
 *                 type: object
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Car updated successfully
 *       404:
 *         description: Car not found
 */
router.route('/:id')
  .put(updateCar)
  .delete(softDeleteCar);

/**
 * @swagger
 * /api/v1/cars/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a car
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Car ID to permanently delete
 *     responses:
 *       200:
 *         description: Car permanently deleted successfully
 *       404:
 *         description: Car not found
 */
router.delete('/:id/permanent', permanentDeleteCar);

/**
 * @swagger
 * /api/v1/cars/stats:
 *   get:
 *     summary: Get car statistics
 *     tags: [Cars]
 *     responses:
 *       200:
 *         description: Car stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCars:
 *                   type: number
 *                 activeCars:
 *                   type: number
 *                 verifiedCars:
 *                   type: number
 */
router.get('/stats', carStats);

export default router;
