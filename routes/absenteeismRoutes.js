import express from 'express';
import {
  createUpload,
  getTraineeUploads,
  getAllUploads,
  updateUploadStatus,
  deleteUpload,
  getUploadsByDateRange
} from '../controllers/absenteeismController.js';
import { verifyToken } from '../utilities/index.js';

const router = express.Router();

// Create a new upload - trainees can upload their own documents
router.post('/create',verifyToken, createUpload);

// Get all uploads for a specific trainee
router.get('/trainee/:traineeId', getTraineeUploads);

// Get all uploads (with filtering) - only for facilitators and admins
// router.get('/', getAllUploads);

// Get uploads by date range (for reporting) - only for facilitators and admins
// router.get('/report', verifyToken, checkRole(['facilitator', 'admin']), getUploadsByDateRange);

// Update upload status (approve/reject) - only for facilitators and admins
// router.put('/:id/status', verifyToken, checkRole(['facilitator', 'admin']), updateUploadStatus);

// Delete an upload - only for admins
// router.delete('/:id', verifyToken, checkRole(['admin']), deleteUpload);

export default router;