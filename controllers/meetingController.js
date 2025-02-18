import { 
    collection, 
    doc, 
    runTransaction, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs 
  } from 'firebase/firestore';
  import { db, serverTimestamp } from '../config/firebaseConfig.js';
  
  // GET METHOD - Get all meetings
  export const get_Meetings = async (req, res) => {
    try {
      const meetingsRef = collection(db, "meetings");
      const snapshot = await getDocs(meetingsRef);
      const meetings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch meetings", details: error.message });
    }
  };
  
  // POST METHOD - Create a new meeting
  export const create_Meeting = async (req, res) => {
    try {
      const { 
        title, 
        date, 
        startTime, 
        endTime, 
        location, 
        description, 
        facilitatorId,
        attendees 
      } = req.body;
  
      if (!title || !date || !startTime || !endTime || !facilitatorId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      const counterRef = doc(db, "counters", "meetingCounter");
      let newMeetingId;
  
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          newMeetingId = 1;
          transaction.set(counterRef, { lastMeetingId: newMeetingId });
        } else {
          newMeetingId = counterDoc.data().lastMeetingId + 1;
          transaction.update(counterRef, { lastMeetingId: newMeetingId });
        }
      });
  
      const newMeeting = {
        meetingId: newMeetingId,
        title,
        date,
        startTime,
        endTime,
        location,
        description,
        facilitatorId,
        attendees: attendees || [],
        status: 'scheduled',
        createdAt: serverTimestamp(),
      };
  
      const docRef = doc(db, "meetings", newMeetingId.toString());
      await setDoc(docRef, newMeeting);
  
      const newDoc = await getDoc(docRef);
      const savedMeeting = { id: newMeetingId, ...newDoc.data() };
  
      if (savedMeeting.createdAt) {
        savedMeeting.createdAt = savedMeeting.createdAt.toDate().toISOString();
      }
  
      res.status(201).json(savedMeeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res
        .status(500)
        .json({ error: "Failed to create meeting", details: error.message });
    }
  };
  
  // PUT METHOD - Update a meeting
  export const update_Meeting = async (req, res) => {
    const { id } = req.params;
    const { 
      title, 
      date, 
      startTime, 
      endTime, 
      location, 
      description, 
      facilitatorId,
      attendees,
      status 
    } = req.body;
    
    try {
      const meetingRef = doc(db, "meetings", id);
      const updateData = {
        title,
        date,
        startTime,
        endTime,
        location,
        description,
        facilitatorId,
        attendees,
        status,
        updatedAt: serverTimestamp(),
      };
  
      await updateDoc(meetingRef, updateData);
  
      const updatedDoc = await getDoc(meetingRef);
      const updatedMeeting = { id, ...updatedDoc.data() };
  
      if (updatedMeeting.updatedAt) {
        updatedMeeting.updatedAt = updatedMeeting.updatedAt.toDate().toISOString();
      }
  
      res.status(200).json(updatedMeeting);
    } catch (error) {
      console.error("Error updating meeting:", error);
      res
        .status(500)
        .json({ error: "Failed to update meeting", details: error.message });
    }
  };
  
  // DELETE METHOD - Delete a meeting
  export const delete_Meeting = async (req, res) => {
    const { id } = req.params;
    try {
      const meetingRef = doc(db, "meetings", id);
      const meetingDoc = await getDoc(meetingRef);
  
      if (!meetingDoc.exists()) {
        return res.status(404).json({ error: "Meeting not found" });
      }
  
      const meetingData = meetingDoc.data();
  
      const deletedMeetingRef = doc(db, "deletedMeetings", id);
      await setDoc(deletedMeetingRef, {
        ...meetingData,
        deletedAt: serverTimestamp(),
      });
  
      await deleteDoc(meetingRef);
  
      res.status(200).json({
        message: "Meeting deleted successfully and archived in deletedMeetings",
      });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      res
        .status(500)
        .json({ error: "Failed to delete meeting", details: error.message });
    }
  };
  
  // GET deleted meetings
  export const deleted_Meetings = async (req, res) => {
    try {
      const deletedMeetingsRef = collection(db, "deletedMeetings");
      const snapshot = await getDocs(deletedMeetingsRef);
      const deletedMeetings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(deletedMeetings);
    } catch (error) {
      console.error("Error fetching deleted meetings:", error);
      res
        .status(500)
        .json({
          error: "Failed to fetch deleted meetings",
          details: error.message,
        });
    }
  };