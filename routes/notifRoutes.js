import express from 'express';
import { auth } from '../utilities/index.js';
import { 
  getTraineeOverview,
  notifyTrainee,
  suspendTrainee,
  reinstateTrainee,
  getTraineeNotifications,
  markNotificationAsRead
} from '../controllers/notificationController.js';
import verifyToken from '../utilities/index.js';

const router = express.Router();

/**
 * @route   GET /api/trainee-overview
 * @desc    Get all trainees for overview page
 * @access  Private
 */
router.get('/trainee-overview', verifyToken, getTraineeOverview);

/**
 * @route   POST /api/trainee-actions/notify
 * @desc    Send notification to a trainee
 * @access  Private
 */
router.post('/trainee-actions/notify', verifyToken, notifyTrainee);

/**
 * @route   POST /api/trainee-actions/suspend
 * @desc    Suspend a trainee for specified number of days
 * @access  Private
 */
router.post('/trainee-actions/suspend', verifyToken, suspendTrainee);

/**
 * @route   POST /api/trainee-actions/reinstate
 * @desc    Reinstate a previously suspended trainee
 * @access  Private
 */
router.post('/trainee-actions/reinstate',verifyToken, reinstateTrainee);
router.get('/notifications/:traineeId', verifyToken, getTraineeNotifications);
router.put('/notifications/:notificationId/read', verifyToken, markNotificationAsRead);
export default router;