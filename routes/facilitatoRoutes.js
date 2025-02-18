import express from 'express';
import { authenticateUser, isSuperAdmin } from '../middleware/auth.js';
import {
  createFacilitator,
  getAllFacilitators,
  getFacilitator,
  updateFacilitator,
  deleteFacilitator,
  changePassword
} from '../controllers/facilitatorController.js';

const router = express.Router();

router.post('/', authenticateUser, isSuperAdmin, createFacilitator);
router.get('/', authenticateUser, getAllFacilitators);
router.get('/:id', authenticateUser, getFacilitator);
router.put('/:id', authenticateUser, updateFacilitator);
router.delete('/:id', authenticateUser, isSuperAdmin, deleteFacilitator);
router.post('/change-password', authenticateUser, changePassword);


export default router;
