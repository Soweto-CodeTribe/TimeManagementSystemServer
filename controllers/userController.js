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
import { createUserWithEmailAndPassword, sendPasswordResetEmail  } from 'firebase/auth';
import crypto from 'crypto';
import { db, auth, serverTimestamp } from '../config/firebaseConfig.js';


// Function to generate a secure random password
const generatePassword = (length = 12) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};

  //GET METHOD Trainee
  export const get_Users = async (req, res) => {
    try {
      const traineesRef = collection(db, "trainees");
      const snapshot = await getDocs(traineesRef);
      const trainees = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(trainees);
    } catch (error) {
      console.error("Error fetching trainees:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch trainees", details: error.message });
    }
  };

  //GET METHOD Trainee
  export const get_Users_By_Location = async (req, res) => {
    try {
        // Check if user exists and has uid
        if (!req.user || !req.user.uid) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get facilitator's details to check location
        const facilitatorRef = doc(db, 'facilitators', req.user.uid);
        const facilitatorDoc = await getDoc(facilitatorRef);

        if (!facilitatorDoc.exists()) {
            return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
        }

        const facilitatorLocation = facilitatorDoc.data().location;
        console.log("facilitator location: ", facilitatorLocation)

        if (!facilitatorLocation) {
            return res.status(400).json({ error: 'Facilitator location not set' });
        }

        // Query trainees collection with location filter
        const traineesRef = collection(db, "trainees");
        const locationQuery = query(traineesRef, where("location", "==", facilitatorLocation));
        const snapshot = await getDocs(locationQuery);

        const trainees = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Convert any timestamp fields to ISO strings
        const formattedTrainees = trainees.map(trainee => {
            const formatted = { ...trainee };
            if (formatted.createdAt) {
                formatted.createdAt = formatted.createdAt.toDate().toISOString();
            }
            if (formatted.updatedAt) {
                formatted.updatedAt = formatted.updatedAt.toDate().toISOString();
            }
            return formatted;
        });

        res.status(200).json(formattedTrainees);
    } catch (error) {
        console.error("Error fetching trainees:", error);
        res.status(500).json({ 
            error: "Failed to fetch trainees", 
            details: error.message 
        });
    }
};
  
  // POST METHOD - Add a new trainee
  export const create_user = async (req, res) => {
    try {
      // Check if user exists and has uid
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
  
      // Check if user is a facilitator
      const facilitatorRef = doc(db, 'facilitators', req.user.uid);
      const facilitatorDoc = await getDoc(facilitatorRef);
    
      if (!facilitatorDoc.exists()) {
        return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
      }
      const { name, surname, age, gender, phoneNumber, idNumber, email, location } = req.body;
  
      if (!name || !surname || !age || !gender || !phoneNumber || !idNumber || !email || !location) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Generate a secure password
      const generatedPassword = generatePassword();

      // Create authentication user with generated password
      const userCredential = await createUserWithEmailAndPassword(
          auth, 
          email, 
          generatedPassword
      );
      const uid = userCredential.user.uid;

      // Send password reset email
      await sendPasswordResetEmail(auth, email);

      
      const counterRef = doc(db, "counters", "traineeCounter");
      let newTraineeId;
  
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          newTraineeId = 1;
          transaction.set(counterRef, { lastTraineeId: newTraineeId });
        } else {
          newTraineeId = counterDoc.data().lastTraineeId + 1;
          transaction.update(counterRef, { lastTraineeId: newTraineeId });
        }
      });
  
      const newTrainee = {
        traineeId: newTraineeId,
        uid,
        name,
        surname,
        age,
        gender,
        phoneNumber,
        idNumber,
        email,
        location,
        createdAt: serverTimestamp(),
      };
  
      const docRef = doc(db, "trainees", newTraineeId.toString());
      await setDoc(docRef, newTrainee);
  
      const newDoc = await getDoc(docRef);
      const savedTrainee = { id: newTraineeId, ...newDoc.data() };
  
      if (savedTrainee.createdAt) {
        savedTrainee.createdAt = savedTrainee.createdAt.toDate().toISOString();
      }
  
      res.status(201).json({
        user: savedTrainee,
        password: generatedPassword,
        message: `User created successfully. A password reset email has been sent to ${email}`
    });
    } catch (error) {
      console.error("Error adding trainee:", error);
      res
        .status(500)
        .json({ error: "Failed to add trainee", details: error.message });
    }
  };
  
  // PUT METHOD - Update a trainee
  export const update_User = async (req, res) => {
    const { id } = req.params;
    try {
        const traineeRef = doc(db, "trainees", id);
        const traineeDoc = await getDoc(traineeRef);

        if (!traineeDoc.exists()) {
            return res.status(404).json({ error: "Trainee not found" });
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

        await updateDoc(traineeRef, updateData);

        const updatedDoc = await getDoc(traineeRef);
        const updatedTrainee = { id, ...updatedDoc.data() };

        if (updatedTrainee.updatedAt) {
            updatedTrainee.updatedAt = updatedTrainee.updatedAt
                .toDate()
                .toISOString();
        }

        res.status(200).json(updatedTrainee);
    } catch (error) {
        console.error("Error updating trainee:", error);
        res
            .status(500)
            .json({ error: "Failed to update trainee", details: error.message });
    }
};
  
  // DELETE METHOD - Delete a trainee
  export const delete_User = async (req, res) => {
    const { id } = req.params;
    try {
      const traineeRef = doc(db, "trainees", id);
      const traineeDoc = await getDoc(traineeRef);
  
      if (!traineeDoc.exists()) {
        return res.status(404).json({ error: "Trainee not found" });
      }
  
      const traineeData = traineeDoc.data();
  
      const deletedTraineeRef = doc(db, "deletedTrainees", id);
      await setDoc(deletedTraineeRef, {
        ...traineeData,
        deletedAt: serverTimestamp(),
      });
  
      await deleteDoc(traineeRef);
  
      res.status(200).json({
        message: "Trainee deleted successfully and archived in deletedTrainees",
      });
    } catch (error) {
      console.error("Error deleting trainee:", error);
      res
        .status(500)
        .json({ error: "Failed to delete trainee", details: error.message });
    }
  };
  
  // GET deleted trainees
  export const deleted_Users = async (req, res) => {
    try {
      const deletedTraineesRef = collection(db, "deletedTrainees");
      const snapshot = await getDocs(deletedTraineesRef);
      const deletedTrainees = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(deletedTrainees);
    } catch (error) {
      console.error("Error fetching deleted trainees:", error);
      res
        .status(500)
        .json({
          error: "Failed to fetch deleted trainees",
          details: error.message,
        });
    }
  };