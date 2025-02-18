import express from 'express';
import { authenticateUser, isSuperAdmin } from '../middleware/auth.js';
import { verifyToken } from '../utilities/index.js';
import {
  createFacilitator,
  getAllFacilitators,
  getFacilitator,
  updateFacilitator,
  deleteFacilitator,
  changePassword
} from '../controllers/facilitatorController.js';

const router = express.Router();

router.post('/', verifyToken, isSuperAdmin, createFacilitator);
router.get('/', verifyToken, getAllFacilitators);
router.get('/:id', verifyToken, getFacilitator);
router.put('/:id', verifyToken, updateFacilitator);
router.delete('/:id', verifyToken, isSuperAdmin, deleteFacilitator);
router.post('/change-password', verifyToken, changePassword);


export default router;
