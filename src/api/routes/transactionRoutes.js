import express from 'express';
import { createTransaction, getTransactions, updateTransaction, softDeleteTransaction, permanentDeleteTransaction, transactionStats } from '../controllers/transactionController.js';

const router = express.Router();

router.route('/')
    .post(createTransaction)
    .get(getTransactions);

router.route('/:id')
    .put(updateTransaction)
    .delete(softDeleteTransaction);

router.delete('/:id/permanent', permanentDeleteTransaction);
router.get('/stats', transactionStats);

export default router;
