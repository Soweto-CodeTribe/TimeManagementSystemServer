import {
  collection,
  doc,
  getDoc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { db, serverTimestamp } from "../config/firebaseConfig.js";



//GET METHOD Trainee
export const trainee_id = async (req, res) => {
  try {
    // Check if user exists and has uid
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    // Query trainees collection to find the trainee document with matching uid
    const traineesRef = collection(db, "trainees");
    const snapshot = await getDocs(traineesRef);
    const traineeDoc = snapshot.docs.find(doc => doc.data().uid === req.user.uid);
    if (!traineeDoc) {
      return res.status(404).json({ error: 'Trainee profile not found' });
    }
    const traineeData = {
      id: traineeDoc.id,
      ...traineeDoc.data()
    };
    // Convert timestamps to ISO string
    if (traineeData.createdAt) {
      traineeData.createdAt = traineeData.createdAt.toDate().toISOString();
    }
    if (traineeData.updatedAt) {
      traineeData.updatedAt = traineeData.updatedAt.toDate().toISOString();
    }
    res.status(200).json(traineeData);
  } catch (error) {
    console.error("Error fetching trainee profile:", error);
    res.status(500).json({
      error: "Failed to fetch trainee profile",
      details: error.message
    });
  }
};


// PUT METHOD - Update a trainee
export const update_Trainee = async (req, res) => {
    try {
      // Check if user exists and has uid
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      // Query trainees collection to find the trainee document with matching uid
      const traineesRef = collection(db, "trainees");
      const snapshot = await getDocs(traineesRef);
      const traineeDoc = snapshot.docs.find(doc => doc.data().uid === req.user.uid);
      if (!traineeDoc) {
        return res.status(404).json({ error: 'Trainee profile not found' });
      }
      // Only include fields that are present in req.body
      const updateData = {
        ...Object.keys(req.body).reduce((acc, key) => {
          if (req.body[key] !== undefined) {
            acc[key] = req.body[key];
          }
          return acc;
        }, {}),
        updatedAt: serverTimestamp()
      };
      // Update the trainee document
      const traineeRef = doc(db, "trainees", traineeDoc.id);
      await updateDoc(traineeRef, updateData);
      // Fetch and return the updated document
      const updatedDoc = await getDoc(traineeRef);
      const updatedTrainee = {
        id: traineeDoc.id,
        ...updatedDoc.data()
      };
      if (updatedTrainee.updatedAt) {
        updatedTrainee.updatedAt = updatedTrainee.updatedAt.toDate().toISOString();
      }
      res.status(200).json(updatedTrainee);
    } catch (error) {
      console.error("Error updating trainee profile:", error);
      res.status(500).json({
        error: "Failed to update trainee profile",
        details: error.message
      });
    }
  };