import {
    collection,
    doc,
    setDoc,
    getDoc,
    query,
    where,
    getDocs,
    updateDoc,
    addDoc,
  } from "firebase/firestore";
import { db, admin } from '../config/firebaseAdminConfig.js';
import { getMessaging } from 'firebase-admin/messaging';
import { isWorkingDay} from '../controllers/sessionController.js'

// Store FCM tokens for users
export const registerDeviceToken = async (req, res) => {
    try {
        const { userId, token } = req.body;
        
        if (!userId || !token) {
            return res.status(400).json({ error: "Missing userId or token" });
        }
        
        // Check if token already exists for this user
        const tokenSnapshot = await db.collection("deviceTokens")
        .where("userId", "==", userId)
        .where("token", "==", token)
        .get();
        
        if (tokenSnapshot.empty) {
        // Token doesn't exist, add it
            await db.collection("deviceTokens").add({
                userId,
                token,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        res.status(200).json({ message: "Device token registered successfully" });
    } catch (error) {
        console.error("Error registering device token:", error);
        res.status(500).json({ error: "Failed to register device token", details: error.message });
    }
};


// Get user's device tokens
export const getUserTokens = async (userId) => {
    try {
        const tokenSnapshot = await db.collection("deviceTokens")
        .where("userId", "==", userId)
        .get();
        
        return tokenSnapshot.docs.map(doc => doc.data().token);
    } catch (error) {
        console.error("Error getting user tokens:", error);
        return [];
    }
};


// Send FCM notification using Firebase Admin SDK
export const sendPushNotification = async (tokens, notification) => {
    if (!tokens || tokens.length === 0) {
        console.error("No tokens provided for notification");
        return false;
    }
    
    try {
        // Initialize messaging directly without passing admin
        const messaging = getMessaging();
        
        // Prepare the message in the format expected by FCM
        const message = {
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: notification.data || {},
        tokens: tokens,
        };
        
        // Send the multicast message
        const response = await messaging.sendEachForMulticast(message);
        console.log('FCM response:', response);
        
        return response.successCount > 0;
    } catch (error) {
        console.error("Error sending FCM notification:", error);
        throw error; // Re-throw to see the full error stack
    }
};


// Send notification to specific recipients
export const sendNotificationToRecipients = async (req, res) => {
    try {
        const { 
        title,
        body,
        recipients,
        data
        } = req.body;
        
        if (!title || !body || !recipients || !Array.isArray(recipients)) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        const results = [];
        
        // Process each recipient
        for (const recipientId of recipients) {
        // Get user's device tokens
            const userTokens = await getUserTokens(recipientId);
            
            if (userTokens.length > 0) {
                try {
                // Send push notification
                const success = await sendPushNotification(userTokens, {
                    title,
                    body,
                    data
                });
                
                results.push({
                    userId: recipientId,
                    sent: success,
                    tokenCount: userTokens.length
                });
                } catch (error) {
                console.error(`Error sending to recipient ${recipientId}:`, error);
                results.push({
                    userId: recipientId,
                    sent: false,
                    tokenCount: userTokens.length,
                    error: error.message
                });
                }
            } else {
                results.push({
                userId: recipientId,
                sent: false,
                tokenCount: 0,
                reason: "No tokens found"
                });
            }
        }
        
        // Ensure req.user exists before using it
        const sentBy = req.user?.uid || 'system';
        
        // Save notification to database
        await db.collection("sentNotifications").add({
        title,
        body,
        recipients,
        data,
        results,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy
        });
        
        res.status(200).json({ 
        message: "Notification processing complete", 
        results 
        });
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ error: "Failed to send notifications", details: error.message });
    }
};


// Send notification when a new message is created
export const sendMessageNotification = async (messageData) => {
    try {
        const { recipients, title, senderId } = messageData;
        
        // Get sender name
        const senderDoc = await db.collection("facilitators").doc(senderId).get();
        const senderName = senderDoc.exists ? 
        senderDoc.data().name || "Facilitator" : 
        "Facilitator";
        
        // For each recipient, send notification
        for (const recipientId of recipients) {
            const userTokens = await getUserTokens(recipientId);
            
            if (userTokens.length > 0) {
                await sendPushNotification(userTokens, {
                title: `New Message: ${title}`,
                body: `You have a new message from ${senderName}`,
                data: {
                    type: 'message',
                    messageId: messageData.messageId.toString()
                }
                });
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error sending message notification:", error);
        return false;
    }
};



// Update trainee notification fields when a new message is sent

export const updateTraineeNotificationFields = async (recipientIds, messageId) => {
    try {
        const batch = db.batch();
        
        // Process each recipient
        for (const traineeId of recipientIds) {
            const traineeRef = db.collection('trainees').doc(traineeId);
            const traineeDoc = await traineeRef.get();
            
            if (traineeDoc.exists) {
                // Update or set the notification fields
                batch.update(traineeRef, {
                    'hasUnreadNotifications': true,
                    'unreadNotificationCount': admin.firestore.FieldValue.increment(1),
                    'lastNotificationAt': admin.firestore.FieldValue.serverTimestamp(),
                    'lastNotificationId': messageId
                });
            }
        }
        
        // Commit the batch
        await batch.commit();
        console.log(`Updated notification fields for ${recipientIds.length} trainees`);
        return true;
    } catch (error) {
        console.error('Error updating trainee notification fields:', error);
        return false;
    }
};


// Reset trainee notification fields when messages are marked as read
export const resetTraineeNotificationFields = async (traineeId) => {
    try {
        // Get all messages for this trainee
        const messagesSnapshot = await db.collection('messages')
        .where('recipients', 'array-contains', traineeId)
        .get();
        
        // If no messages, just reset the fields
        if (messagesSnapshot.empty) {
        await db.collection('trainees').doc(traineeId).update({
            'hasUnreadNotifications': false,
            'unreadNotificationCount': 0
        });
        return true;
        }
        
        // Count unread messages
        let unreadCount = 0;
        let lastNotificationId = null;
        let lastNotificationTime = null;
        
        messagesSnapshot.forEach(doc => {
        const messageData = doc.data();
        if (!messageData.readBy.includes(traineeId)) {
            unreadCount++;
            
            // Track the latest unread notification
            const messageTime = messageData.createdAt?.toDate() || new Date(0);
            if (!lastNotificationTime || messageTime > lastNotificationTime) {
            lastNotificationTime = messageTime;
            lastNotificationId = doc.id;
            }
        }
        });
        
        // Update trainee document
        await db.collection('trainees').doc(traineeId).update({
        'hasUnreadNotifications': unreadCount > 0,
        'unreadNotificationCount': unreadCount,
        'lastNotificationId': lastNotificationId,
        'lastNotificationAt': lastNotificationTime ? admin.firestore.Timestamp.fromDate(lastNotificationTime) : null
        });
        
        return true;
    } catch (error) {
        console.error('Error resetting trainee notification fields:', error);
        return false;
    }
};



// Detect and notify trainees who were absent yesterday
export const notifyAbsentTrainees = async (req, res) => {
    try {
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      // Check if yesterday was a working day
      const wasWorkingDay = await isWorkingDay(yesterday);
      if (!wasWorkingDay) {
        return res.status(200).json({ 
          message: "No notifications sent. Yesterday was not a working day.",
          date: yesterdayStr,
          isWorkingDay: false
        });
      }
      
      // Get all trainees - FIXED: using admin SDK syntax
      const traineesSnapshot = await db.collection("trainees").get();
      
      const absentTrainees = [];
      const notificationResults = [];
      const promises = [];
      
      traineesSnapshot.forEach((traineeDoc) => {
        const trainee = { id: traineeDoc.id, ...traineeDoc.data() };
        
        // For each trainee, check if they were absent yesterday
        const checkPromise = (async () => {
          const reportRef = db.collection("reports").doc(trainee.id);
          const reportDoc = await reportRef.get();
          
          // Check if trainee was absent yesterday (no report or has "Absent" status)
          const wasAbsent = !reportDoc.exists || 
                           !reportDoc.data()?.[yesterdayStr] || 
                           reportDoc.data()?.[yesterdayStr]?.status === "Absent";
          
          if (wasAbsent) {
            absentTrainees.push(trainee);
            
            // Get trainee's device tokens
            const userTokens = await getUserTokens(trainee.id);
            
            if (userTokens.length > 0) {
              // Create deep link or action data for the "Submit Proof" option
              const actionData = {
                type: 'absence_proof',
                date: yesterdayStr,
                traineeId: trainee.id,
                action: 'submit_proof'
              };
              
              // Send notification
              const notificationSent = await sendPushNotification(userTokens, {
                title: "Absence Notification",
                body: `You were absent yesterday (${new Date(yesterdayStr).toLocaleDateString()}). Please submit proof of absence if available.`,
                data: actionData
              });
              
              // Record result
              notificationResults.push({
                traineeId: trainee.id,
                name: trainee.name,
                sent: notificationSent,
                tokenCount: userTokens.length
              });
              
              // Add to sent notifications collection
              await db.collection("sentNotifications").add({
                title: "Absence Notification",
                body: `You were absent yesterday (${new Date(yesterdayStr).toLocaleDateString()}). Please submit proof of absence if available.`,
                recipients: [trainee.id],
                data: actionData,
                results: [{ 
                  userId: trainee.id, 
                  sent: notificationSent, 
                  tokenCount: userTokens.length 
                }],
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                sentBy: 'system',
                type: 'absence_reminder'
              });
              
              // Update trainee's notification fields
              await updateTraineeNotificationFields([trainee.id], `absence_${yesterdayStr}`);
            } else {
              notificationResults.push({
                traineeId: trainee.id,
                name: trainee.name,
                sent: false,
                tokenCount: 0,
                reason: "No device tokens found"
              });
            }
          }
        })();
        
        promises.push(checkPromise);
      });
      
      await Promise.all(promises);
      
      res.status(200).json({
        message: "Absence notifications processed",
        date: yesterdayStr,
        absenteesCount: absentTrainees.length,
        notificationsSent: notificationResults.filter(r => r.sent).length,
        results: notificationResults
      });
    } catch (error) {
      console.error("Absentee notification error:", error);
      res.status(500).json({ error: "Failed to send absence notifications", details: error.message });
    }
  };


// Handle proof of absence submissions
export const submitAbsenceProof = async (req, res) => {
  try {
    const { traineeId, date, reason, proofUrl } = req.body;
    
    if (!traineeId || !date || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Create a document in the absenceProofs collection
    await db.collection("absenceProofs").add({
      traineeId,
      date,
      reason,
      proofUrl: proofUrl || null,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending" // pending, approved, rejected
    });
    
    // Update the report with the absence reason - FIXED: using admin SDK syntax
    const reportRef = db.collection("reports").doc(traineeId);
    const reportDoc = await reportRef.get();
    
    if (reportDoc.exists) {
      await reportRef.update({
        [`${date}.absenceReason`]: reason,
        [`${date}.absenceProofSubmitted`]: true
      });
    } else {
      // Create the report entry if it doesn't exist
      await reportRef.set({
        [date]: {
          date,
          status: "Absent",
          absenceReason: reason,
          absenceProofSubmitted: true,
          isWorkingDay: true,
          totalHoursWorked: 0,
          totalLunchMinutes: 0
        }
      }, { merge: true });
    }
    
    // Also update the absenteeism record if it exists
    const absenteeismSnapshot = await db.collection("absenteeism")
      .where("traineeId", "==", traineeId)
      .where("date", "==", date)
      .get();
    
    if (!absenteeismSnapshot.empty) {
      const absenteeismDoc = absenteeismSnapshot.docs[0];
      await db.collection("absenteeism").doc(absenteeismDoc.id).update({
        reason,
        proofUrl: proofUrl || null,
        proofSubmittedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.status(200).json({
      message: "Absence proof submitted successfully",
      date,
      traineeId
    });
  } catch (error) {
    console.error("Absence proof submission error:", error);
    res.status(500).json({ error: "Failed to submit absence proof", details: error.message });
  }
};