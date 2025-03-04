import express from 'express';
import { verifyToken, stakeholderAccess } from '../utilities/index.js';
import { isSuperAdmin } from '../middleware/auth.js';
import {
  createStakeholder,
  getAllStakeholders,
  getStakeholder,
  deleteStakeholder
} from '../controllers/stakeholderController.js';

const router = express.Router();

// Routes for super admins to manage stakeholders
router.post('/', verifyToken, isSuperAdmin, createStakeholder);
router.get('/all', verifyToken, isSuperAdmin, getAllStakeholders);
router.get('/:id', verifyToken, isSuperAdmin, getStakeholder);
router.delete('/:id', verifyToken, isSuperAdmin, deleteStakeholder);



export default router;