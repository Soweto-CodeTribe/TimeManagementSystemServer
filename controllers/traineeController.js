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
    console.log("User in request:", req.user);

    // Ensure user is authenticated
    if (!req.user || !req.user.uid) {
      return res
        .status(403)
        .json({ error: "Unauthorized: No valid trainee data" });
    }

    // Check if user is a trainee
    const traineeRef = doc(db, "trainees", req.user.uid);
    const traineeDoc = await getDoc(traineeRef);

    // if (!traineeDoc.exists()) {
    //     return res.status(403).json({ error: "Unauthorized: Not a Mlab Trainee" });
    // }

    // Get logged-in trainee's data
    const traineeData = {
      id: traineeDoc.id,
    //   id: traineeDoc.name,
    //   id: traineeDoc.surname,
    //   id: traineeDoc.email,
    //   id: traineeDoc.phoneNumber,
    //   id: traineeDoc.age,
    //   id: traineeDoc.gender,
      ...traineeDoc.data(),
    };
    const trainee_details = traineeDoc.data()

    res.status(200).json(traineeData);
    console.log("Success fetching trainee data")
  } catch (error) {
    console.error("Error fetching trainee:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch trainee", details: error.message });
  }
};

// PUT METHOD - Update a trainee
export const update_Trainee = async (req, res) => {
  const { id } = req.params;
  const { name, surname, age, gender, phoneNumber, idNumber, email } = req.body;
  try {
    const traineeRef = doc(db, "trainees", id);
    const updateData = {
      name,
      surname,
      age,
      gender,
      phoneNumber,
      idNumber,
      email,
      updatedAt: serverTimestamp(),
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
