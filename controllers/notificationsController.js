import { 
    collection, 
    doc, 
    runTransaction, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs,
    query,
    where 
  } from 'firebase/firestore';
  import { db, serverTimestamp } from '../config/firebaseConfig.js';
  
  // GET METHOD - Get all messages
  export const get_Messages = async (req, res) => {
    try {
      const messagesRef = collection(db, "messages");
      const snapshot = await getDocs(messagesRef);
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
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, where("recipients", "array-contains", traineeId));
      const snapshot = await getDocs(q);
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
  
      const counterRef = doc(db, "counters", "messageCounter");
      let newMessageId;
  
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          newMessageId = 1;
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
        recipients, // Array of trainee IDs
        priority: priority || 'normal',
        category: category || 'general',
        senderId,
        status: 'sent',
        readBy: [], // Array to track which recipients have read the message
        createdAt: serverTimestamp(),
      };
  
      const docRef = doc(db, "messages", newMessageId.toString());
      await setDoc(docRef, newMessage);
  
      const newDoc = await getDoc(docRef);
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
      const messageRef = doc(db, "messages", id);
      const updateData = {
        title,
        content,
        recipients,
        priority,
        category,
        status,
        updatedAt: serverTimestamp(),
      };
  
      await updateDoc(messageRef, updateData);
  
      const updatedDoc = await getDoc(messageRef);
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
      const messageRef = doc(db, "messages", id);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        return res.status(404).json({ error: "Message not found" });
      }
  
      const messageData = messageDoc.data();
      if (!messageData.readBy.includes(traineeId)) {
        await updateDoc(messageRef, {
          readBy: [...messageData.readBy, traineeId],
          updatedAt: serverTimestamp(),
        });
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
      const messageRef = doc(db, "messages", id);
      const messageDoc = await getDoc(messageRef);
  
      if (!messageDoc.exists()) {
        return res.status(404).json({ error: "Message not found" });
      }
  
      const messageData = messageDoc.data();
  
      const deletedMessageRef = doc(db, "deletedMessages", id);
      await setDoc(deletedMessageRef, {
        ...messageData,
        deletedAt: serverTimestamp(),
      });
  
      await deleteDoc(messageRef);
  
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
      const deletedMessagesRef = collection(db, "deletedMessages");
      const snapshot = await getDocs(deletedMessagesRef);
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