import {
  collection,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  addDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db, serverTimestamp } from "../config/firebaseConfig.js";



//GET METHOD Trainee

// export const trainee_id = async (req, res) => {
//   try {
//     // Check if user exists and has uid
//     if (!req.user || !req.user.uid) {
//       return res.status(401).json({ error: 'User not authenticated' });
//     }
//     // Query trainees collection to find the trainee document with matching uid
//     const traineesRef = collection(db, "trainees");
//     const snapshot = await getDocs(traineesRef);
//     const traineeDoc = snapshot.docs.find(doc => doc.data().uid === req.user.uid);
//     if (!traineeDoc) {
//       return res.status(404).json({ error: 'Trainee profile not found' });
//     }
//     const traineeData = {
//       id: traineeDoc.id,
//       ...traineeDoc.data()
//     };
//     // Convert timestamps to ISO string
//     if (traineeData.createdAt) {
//       traineeData.createdAt = traineeData.createdAt.toDate().toISOString();
//     }
//     if (traineeData.updatedAt) {
//       traineeData.updatedAt = traineeData.updatedAt.toDate().toISOString();
//     }
//     res.status(200).json(traineeData);
//   } catch (error) {
//     console.error("Error fetching trainee profile:", error);
//     res.status(500).json({
//       error: "Failed to fetch trainee profile",
//       details: error.message
//     });
//   }
// };


// PUT METHOD - Update a trainee

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

    // Fetch user feedback for this trainee
    const feedbackRef = collection(db, "feedback");
    const feedbackQuery = query(feedbackRef, where("traineeId", "==", traineeDoc.id));
    const feedbackSnapshot = await getDocs(feedbackQuery);
    
    // Process feedback documents
    const feedbackList = feedbackSnapshot.docs.map(doc => {
      const data = doc.data();
      const feedback = {
        id: doc.id,
        ...data
      };
      
      // Convert timestamps to ISO string
      if (feedback.createdAt) {
        feedback.createdAt = feedback.createdAt.toDate().toISOString();
      }
      if (feedback.updatedAt) {
        feedback.updatedAt = feedback.updatedAt.toDate().toISOString();
      }
      
      return feedback;
    });

    // Include feedback in the response
    traineeData.feedback = feedbackList;
    
    res.status(200).json(traineeData);
  } catch (error) {
    console.error("Error fetching trainee profile with feedback:", error);
    res.status(500).json({
      error: "Failed to fetch trainee profile with feedback",
      details: error.message
    });
  }
};

//Endpoint for submitting new feedback
export const submitFeedback = async (req, res) => {
  try {
    // Check if user exists and has uid
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { feedbackText, category, rating } = req.body;
    
    if (!feedbackText) {
      return res.status(400).json({ error: 'Feedback text is required' });
    }

    // Find trainee ID for this user
    const traineesRef = collection(db, "trainees");
    const snapshot = await getDocs(traineesRef);
    const traineeDoc = snapshot.docs.find(doc => doc.data().uid === req.user.uid);
    
    if (!traineeDoc) {
      return res.status(404).json({ error: 'Trainee profile not found' });
    }

    // Create new feedback document
    const feedbackRef = collection(db, "feedback");
    const timestamp = serverTimestamp();
    
    const newFeedback = {
      traineeId: traineeDoc.id,
      uid: req.user.uid,
      feedbackText,
      category: category || 'general',
      rating: rating || null,
      status: 'new',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const docRef = await addDoc(feedbackRef, newFeedback);
    
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: docRef.id
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({
      error: "Failed to submit feedback",
      details: error.message
    });
  }
};


export const getAllFeedback = async (req, res) => {
  try {
    // Check if user exists and has uid
    // if (!req.user || !req.user.uid) {
    //   return res.status(401).json({ error: 'User not authenticated' });
    // }
    
    // Check if user has admin privileges
    // const isAdmin = await checkAdminStatus(req.user.uid);
    // if (!isAdmin) {
    //   return res.status(403).json({ error: 'Unauthorized access' });
    // }

    // Get all feedback documents
    const feedbackRef = collection(db, "feedback");
    const q = query(
      feedbackRef,
      orderBy("createdAt", "desc")
    );
    
    const feedbackSnapshot = await getDocs(q);
    const feedbackList = feedbackSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
      updatedAt: doc.data().updatedAt?.toDate?.() || null
    }));
    
    res.status(200).json({
      success: true,
      feedback: feedbackList
    });
  } catch (error) {
    console.error("Error retrieving all feedback:", error);
    res.status(500).json({
      error: "Failed to retrieve feedback",
      details: error.message
    });
  }
};


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