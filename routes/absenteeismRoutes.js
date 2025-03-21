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
router.post('/create', createUpload);

// Get all uploads for a specific trainee
router.get('/trainee/:traineeId',verifyToken, getTraineeUploads);

// Get all uploads (with filtering) - only for facilitators and admins
router.get('/all-uploads',verifyToken, getAllUploads);

// Get uploads by date range (for reporting) - only for facilitators and admins
router.get('/report', verifyToken, getUploadsByDateRange);

// Update upload status (approve/reject) - only for facilitators and admins
router.put('update-uploads/:id/status', verifyToken,  updateUploadStatus);

// Delete an upload - only for admins
router.delete('delete-uploads/:id', verifyToken, deleteUpload);

export default router;