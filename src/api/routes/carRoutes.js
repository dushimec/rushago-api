import express from 'express';
import { createCar, getCars, updateCar, softDeleteCar, permanentDeleteCar, carStats } from '../controllers/carController.js';

const router = express.Router();

router.route('/')
    .post(createCar)
    .get(getCars);

router.route('/:id')
    .put(updateCar)
    .delete(softDeleteCar);

router.delete('/:id/permanent', permanentDeleteCar);
router.get('/stats', carStats);

export default router;
