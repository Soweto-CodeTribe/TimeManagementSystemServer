import express from 'express';
import { auth } from '../utilities/index.js';
import { 
  getTraineeOverview,
  notifyTrainee,
  suspendTrainee,
  reinstateTrainee,
  getTraineeNotifications,
  markNotificationAsRead,
  getAllNotifications,
  deleteAllTraineeNotifications,
  deleteNotification
} from '../controllers/notificationController.js';
import verifyToken from '../utilities/index.js';

const router = express.Router();

/**
 * @route   GET /api/trainee-overview
 * @desc    Get all trainees for overview page
 * @access  Private
 */
router.get('/trainee-overview', auth, getTraineeOverview);

/**
 * @route   POST /api/trainee-actions/notify
 * @desc    Send notification to a trainee
 * @access  Private
 */
router.post('/trainee-actions/notify', auth, notifyTrainee);

/**
 * @route   POST /api/trainee-actions/suspend
 * @desc    Suspend a trainee for specified number of days
 * @access  Private
 */
router.post('/trainee-actions/suspend', auth, suspendTrainee);

/**
 * @route   POST /api/trainee-actions/reinstate
 * @desc    Reinstate a previously suspended trainee
 * @access  Private
 */
router.post('/trainee-actions/reinstate',auth, reinstateTrainee);
/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete a specific notification
 * @access  Private
 */
router.delete('/notifications/:notificationId', verifyToken, deleteNotification);

/**
 * @route   DELETE /api/trainee-notifications/:traineeId
 * @desc    Delete all notifications for a specific trainee
 * @access  Private (restricted to admin or the trainee themselves)
 */
router.delete('/trainee-notifications/:traineeId', verifyToken, deleteAllTraineeNotifications);
router.get('/notifications/:traineeId', auth, getTraineeNotifications);
router.put('/notifications/:notificationId/read', auth, markNotificationAsRead);
router.get('/notifications', auth, getAllNotifications);
export default router;