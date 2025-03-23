import admin from 'firebase-admin';

const db = admin.firestore();

// Collection references
const traineesCollection = db.collection('trainees');
const notificationsCollection = db.collection('sentNotifications');

// Get all trainees for overview page
export const getTraineeOverview = async (req, res) => {
  try {
    const traineesSnapshot = await traineesCollection.get();
    if (traineesSnapshot.empty) {
      return res.json({ programStats: [] });
    }

    const programStats = [];
    traineesSnapshot.forEach((doc) => {
      const traineeData = doc.data();
      programStats.push({
        id: doc.id,
        traineeName: traineeData.name,
        traineeLocation: traineeData.location,
        traineeEmail: traineeData.email,
        traineePhoneNumber: traineeData.phone,
        attendancePercentage: traineeData.attendancePercentage || 0,
        status: traineeData.status || 'active',
      });
    });

    res.json({ programStats });
  } catch (error) {
    console.error('Error fetching trainee overview:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Send notification to a trainee
export const notifyTrainee = async (req, res) => {
  try {
    const { traineeId, message, subject } = req.body;

    if (!traineeId || !message) {
      return res.status(400).json({ msg: 'Please provide trainee ID and message' });
    }

    // Get trainee
    const traineeDoc = await traineesCollection.doc(traineeId).get();
    if (!traineeDoc.exists) {
      return res.status(404).json({ msg: 'Trainee not found' });
    }

    const traineeData = traineeDoc.data();
    const fcmTokens = traineeData.fcmTokens || [];

    // Create notification in Firebase
    const notification = {
      traineeId,
      traineeName: traineeData.name,
      traineeEmail: traineeData.email,
      subject: subject || 'New Notification',
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: req.user.id,
      sentByName: req.user.name,
      isRead: false,
    };

    const notificationRef = await notificationsCollection.add(notification);

    // Emit socket event to the specific trainee
    req.io.to(`user-${traineeId}`).emit('notification', {
      id: notificationRef.id,
      subject: notification.subject,
      message: notification.message,
      timestamp: new Date(),
    });

    // Send push notification via FCM
    if (fcmTokens.length > 0) {
      const notificationPayload = {
        notification: {
          title: subject || 'New Notification',
          body: message,
        },
        tokens: fcmTokens,
      };

      const response = await admin.messaging().sendMulticast(notificationPayload);
      console.log(`Push notification sent to ${response.successCount} devices`);

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(fcmTokens[idx]);
          }
        });
        await traineesCollection.doc(traineeId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens),
        });
      }
    }

    res.json({
      success: true,
      msg: 'Notification sent successfully',
      trainee: traineeData.name,
      notificationId: notificationRef.id,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get all notifications for a specific trainee
export const getTraineeNotifications = async (req, res) => {
    try {
      const { traineeId } = req.params;
      
      if (!traineeId) {
        return res.status(400).json({ msg: 'Please provide trainee ID' });
      }
      
      // Check if trainee exists
      const traineeDoc = await traineesCollection.doc(traineeId).get();
      if (!traineeDoc.exists) {
        return res.status(404).json({ msg: 'Trainee not found' });
      }
      
      // Get notifications for the trainee
      const notificationsSnapshot = await notificationsCollection
        .where('traineeId', '==', traineeId)
        .orderBy('createdAt', 'desc')
        .get();
      
      if (notificationsSnapshot.empty) {
        return res.json({ notifications: [] });
      }
      
      const notifications = [];
      notificationsSnapshot.forEach((doc) => {
        const notificationData = doc.data();
        notifications.push({
          id: doc.id,
          subject: notificationData.subject,
          message: notificationData.message,
          createdAt: notificationData.createdAt,
          sentBy: notificationData.sentByName,
          isRead: notificationData.isRead,
          type: notificationData.type || 'general'
        });
      });
      
      res.json({ notifications });
    } catch (error) {
      console.error('Error fetching trainee notifications:', error);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  };

  // Mark a notification as read
export const markNotificationAsRead = async (req, res) => {
    try {
      const { notificationId } = req.params;
      
      if (!notificationId) {
        return res.status(400).json({ msg: 'Please provide notification ID' });
      }
      
      // Check if notification exists
      const notificationRef = notificationsCollection.doc(notificationId);
      const notificationDoc = await notificationRef.get();
      
      if (!notificationDoc.exists) {
        return res.status(404).json({ msg: 'Notification not found' });
      }
      
      // Verify that the trainee owns this notification
      const notificationData = notificationDoc.data();
      if (notificationData.traineeId !== req.user.id) {
        return res.status(403).json({ msg: 'Not authorized to update this notification' });
      }
      
      // Update the notification to mark as read
      await notificationRef.update({
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({
        success: true,
        msg: 'Notification marked as read',
        notificationId
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  };

// Suspend a trainee
export const suspendTrainee = async (req, res) => {
    try {
      const { traineeId, days, reason } = req.body;
  
      if (!traineeId || !days) {
        return res.status(400).json({ msg: 'Please provide trainee ID and suspension duration' });
      }
  
      const traineeRef = traineesCollection.doc(traineeId);
      const traineeDoc = await traineeRef.get();
      if (!traineeDoc.exists) {
        return res.status(404).json({ msg: 'Trainee not found' });
      }
  
      const traineeData = traineeDoc.data();
      const suspensionEndDate = new Date();
      suspensionEndDate.setDate(suspensionEndDate.getDate() + parseInt(days));
  
      // Set the suspendedAt timestamp separately
      const suspendedAt = admin.firestore.FieldValue.serverTimestamp();
  
      const suspensionDetails = {
        suspendedUntil: admin.firestore.Timestamp.fromDate(suspensionEndDate),
        reason: reason || `Suspended for ${days} days`,
        suspendedBy: req.user.id,
        suspendedByName: req.user.name,
      };
  
      // Update the trainee document
      await traineeRef.update({
        status: 'suspended',
        suspensionDetails: { ...suspensionDetails, suspendedAt }, // Add suspendedAt here
        suspensionHistory: admin.firestore.FieldValue.arrayUnion({
          ...suspensionDetails,
          suspendedAt: new Date(), // Use a regular timestamp for the array
        }),
      });
  
      const notification = {
        traineeId,
        traineeName: traineeData.name,
        traineeEmail: traineeData.email,
        subject: 'Account Suspended',
        message: `Your account has been suspended for ${days} days. Reason: ${suspensionDetails.reason}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: req.user.id,
        sentByName: req.user.name,
        isRead: false,
        type: 'suspension',
      };
  
      await notificationsCollection.add(notification);
  
      req.io.to(`user-${traineeId}`).emit('status-change', {
        status: 'suspended',
        message: `Your account has been suspended for ${days} days. Reason: ${suspensionDetails.reason}`,
        endDate: suspensionEndDate,
      });
  
      res.json({
        success: true,
        msg: `Trainee suspended for ${days} days`,
        trainee: traineeData.name,
        suspensionEndDate,
      });
    } catch (error) {
      console.error('Error suspending trainee:', error);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  };

// Reinstate a trainee
export const reinstateTrainee = async (req, res) => {
  try {
    const { traineeId, notes } = req.body;

    if (!traineeId) {
      return res.status(400).json({ msg: 'Please provide trainee ID' });
    }

    const traineeRef = traineesCollection.doc(traineeId);
    const traineeDoc = await traineeRef.get();
    if (!traineeDoc.exists) {
      return res.status(404).json({ msg: 'Trainee not found' });
    }

    const traineeData = traineeDoc.data();
    if (traineeData.status !== 'suspended') {
      return res.status(400).json({ msg: 'Trainee is not currently suspended' });
    }

    const updatedSuspensionDetails = {
      ...traineeData.suspensionDetails,
      reinstatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reinstatedBy: req.user.id,
      reinstatedByName: req.user.name,
      reinstatementNotes: notes || 'Reinstated by administrator',
    };

    await traineeRef.update({
      status: 'active',
      suspensionDetails: updatedSuspensionDetails,
    });

    const notification = {
      traineeId,
      traineeName: traineeData.name,
      traineeEmail: traineeData.email,
      subject: 'Account Reinstated',
      message: 'Your account has been reinstated. You now have full access to the system.',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: req.user.id,
      sentByName: req.user.name,
      isRead: false,
      type: 'reinstatement',
    };

    await notificationsCollection.add(notification);

    req.io.to(`user-${traineeId}`).emit('status-change', {
      status: 'active',
      message: 'Your account has been reinstated. You now have full access to the system.',
    });

    res.json({
      success: true,
      msg: 'Trainee reinstated successfully',
      trainee: traineeData.name,
    });
  } catch (error) {
    console.error('Error reinstating trainee:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};