import { db, admin } from '../config/firebaseAdminConfig.js';
import { sendMessageNotification,
  updateTraineeNotificationFields,
  resetTraineeNotificationFields } from '../services/notificationService.js';

  
// GET METHOD - Get all messages
export const get_Messages = async (req, res) => {
  try {
    const snapshot = await db.collection("messages").get();
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch messages", details: error.message });
  }
};

// GET METHOD - Get messages for a specific trainee
export const get_Trainee_Messages = async (req, res) => {
  const { traineeId } = req.params;
  try {
    const snapshot = await db.collection("messages")
      .where("recipients", "array-contains", traineeId)
      .get();
    
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching trainee messages:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch trainee messages", details: error.message });
  }
};

// POST METHOD - Create a new message
export const create_Message = async (req, res) => {
  try {
    const { 
      title,
      content,
      recipients,
      priority,
      category,
      senderId
    } = req.body;

    if (!title || !content || !recipients || !senderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Use a transaction to get and update the counter
    const counterRef = db.collection("counters").doc("messageCounter");
    let newMessageId = 1;
    
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) {
        transaction.set(counterRef, { lastMessageId: newMessageId });
      } else {
        newMessageId = counterDoc.data().lastMessageId + 1;
        transaction.update(counterRef, { lastMessageId: newMessageId });
      }
    });

    const newMessage = {
      messageId: newMessageId,
      title,
      content,
      recipients,
      priority: priority || 'normal',
      category: category || 'general',
      senderId,
      status: 'sent',
      readBy: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection("messages").doc(newMessageId.toString()).set(newMessage);

    // Update trainee notification fields
    await updateTraineeNotificationFields(recipients, messageDocId);

    // Send push notification for new message
    await sendMessageNotification(newMessage);

    // Get the saved document to return
    const newDoc = await db.collection("messages").doc(newMessageId.toString()).get();
    const savedMessage = { id: newMessageId, ...newDoc.data() };

    if (savedMessage.createdAt) {
      savedMessage.createdAt = savedMessage.createdAt.toDate().toISOString();
    }

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("Error creating message:", error);
    res
      .status(500)
      .json({ error: "Failed to create message", details: error.message });
  }
};

// PUT METHOD - Update a message
export const update_Message = async (req, res) => {
  const { id } = req.params;
  const { 
    title,
    content,
    recipients,
    priority,
    category,
    status
  } = req.body;
  
  try {
    const updateData = {
      title,
      content,
      recipients,
      priority,
      category,
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    await db.collection("messages").doc(id).update(updateData);

    const updatedDoc = await db.collection("messages").doc(id).get();
    const updatedMessage = { id, ...updatedDoc.data() };

    if (updatedMessage.updatedAt) {
      updatedMessage.updatedAt = updatedMessage.updatedAt.toDate().toISOString();
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error updating message:", error);
    res
      .status(500)
      .json({ error: "Failed to update message", details: error.message });
  }
};

// PUT METHOD - Mark message as read
export const mark_Message_Read = async (req, res) => {
  const { id } = req.params;
  const { traineeId } = req.body;
  
  try {
    const messageRef = db.collection("messages").doc(id);
    const messageDoc = await messageRef.get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: "Message not found" });
    }

    const messageData = messageDoc.data();
    if (!messageData.readBy.includes(traineeId)) {
      await messageRef.update({
        readBy: [...messageData.readBy, traineeId],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Reset notification fields for this trainee
      await resetTraineeNotificationFields(traineeId);
    }

    res.status(200).json({ message: "Message marked as read" });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res
      .status(500)
      .json({ error: "Failed to mark message as read", details: error.message });
  }
};

// DELETE METHOD - Delete a message
export const delete_Message = async (req, res) => {
  const { id } = req.params;
  try {
    const messageRef = db.collection("messages").doc(id);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return res.status(404).json({ error: "Message not found" });
    }

    const messageData = messageDoc.data();

    await db.collection("deletedMessages").doc(id).set({
      ...messageData,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await messageRef.delete();

    res.status(200).json({
      message: "Message deleted successfully and archived in deletedMessages",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res
      .status(500)
      .json({ error: "Failed to delete message", details: error.message });
  }
};

// GET deleted messages
export const deleted_Messages = async (req, res) => {
  try {
    const snapshot = await db.collection("deletedMessages").get();
    const deletedMessages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(deletedMessages);
  } catch (error) {
    console.error("Error fetching deleted messages:", error);
    res
      .status(500)
      .json({
        error: "Failed to fetch deleted messages",
        details: error.message,
      });
  }
};

// Get unread message count for a trainee
export const get_Unread_Message_Count = async (req, res) => {
  const { traineeId } = req.params;
  
  try {
    const snapshot = await db.collection("messages")
      .where("recipients", "array-contains", traineeId)
      .get();
    
    let unreadCount = 0;
    snapshot.docs.forEach(doc => {
      const messageData = doc.data();
      if (!messageData.readBy.includes(traineeId)) {
        unreadCount++;
      }
    });
    
    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ 
      error: "Failed to fetch unread message count", 
      details: error.message 
    });
  }
};


// GET trainee notification status
export const get_Trainee_Notification_Status = async (req, res) => {
  const { traineeId } = req.params;
  
  try {
    const traineeDoc = await db.collection("trainees").doc(traineeId).get();
    
    if (!traineeDoc.exists) {
      return res.status(404).json({ error: "Trainee not found" });
    }
    
    const traineeData = traineeDoc.data();
    
    // Extract notification fields with defaults if they don't exist
    const notificationStatus = {
      hasUnreadNotifications: traineeData.hasUnreadNotifications || false,
      unreadNotificationCount: traineeData.unreadNotificationCount || 0,
      lastNotificationAt: traineeData.lastNotificationAt 
        ? traineeData.lastNotificationAt.toDate().toISOString() 
        : null,
      lastNotificationId: traineeData.lastNotificationId || null
    };
    
    res.status(200).json(notificationStatus);
  } catch (error) {
    console.error("Error fetching trainee notification status:", error);
    res.status(500).json({ 
      error: "Failed to fetch notification status", 
      details: error.message 
    });
  }
};