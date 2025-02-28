import "dotenv/config";
import { auth, db } from "../config/firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Configuration
const CONFIG = {
  defaultPassword: "Trainee@123", // Default password for new trainee accounts
  batchSize: 5, // Process 5 trainees at a time
  delayBetweenBatches: 3000, // 3 seconds delay between batches to avoid rate limiting
};

// Check if trainee already exists by email or ID number
async function checkTraineeExists(email, idNumber) {
  // Check by email in trainees collection
  const emailQuery = query(
    collection(db, "trainees"),
    where("email", "==", email)
  );
  const emailResults = await getDocs(emailQuery);

  if (!emailResults.empty) {
    return { exists: true, reason: "email" };
  }

  // Check by ID number in trainees collection
  const idQuery = query(
    collection(db, "trainees"),
    where("idNumber", "==", idNumber)
  );
  const idResults = await getDocs(idQuery);

  if (!idResults.empty) {
    return { exists: true, reason: "idNumber" };
  }

  return { exists: false };
}

// Register a single trainee
async function registerTrainee(trainee) {
  try {
    // Check if trainee already exists
    const existsCheck = await checkTraineeExists(
      trainee.email,
      trainee.idNumber
    );

    if (existsCheck.exists) {
      return {
        success: false,
        status: "skipped",
        message: `Trainee already exists with this ${existsCheck.reason}`,
      };
    }

    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      trainee.email,
      CONFIG.defaultPassword
    );
    const uid = userCredential.user.uid;

    // Update display name to match trainee's name
    await updateProfile(userCredential.user, {
      displayName: `${trainee.name}`,
    });

    // Send password reset email
    await sendPasswordResetEmail(auth, trainee.email);

    // Get next trainee ID from counter
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

    // Prepare trainee data
    const newTrainee = {
      traineeId: newTraineeId,
      uid,
      name: trainee.name,
      surname: trainee.surname,
      email: trainee.email,
      phoneNumber: trainee.phone,
      location: trainee.location,
      gender: trainee.gender,
      age: parseInt(trainee.age),
      idNumber: trainee.idNumber,
      qualification: trainee.qualification,
      address: trainee.address,
      role: "trainee",
      createdAt: serverTimestamp(),
    };

    // Store trainee data in Firestore using traineeId as document ID
    const docRef = doc(db, "trainees", newTraineeId.toString());
    await setDoc(docRef, newTrainee);

    // Get the saved document to return in results
    const newDoc = await getDoc(docRef);
    const savedTrainee = { id: newTraineeId, ...newDoc.data() };

    // Convert timestamp to ISO string if it exists
    if (savedTrainee.createdAt) {
      savedTrainee.createdAt = savedTrainee.createdAt.toDate().toISOString();
    }

    return {
      success: true,
      status: "success",
      trainee: savedTrainee,
      message: `User created successfully. A password reset email has been sent to ${trainee.email}`,
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      error: error.message,
    };
  }
}

// Parse CSV data from buffer
async function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const trainees = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csvParser({ columns: true, trim: true }))
      .on("data", (trainee) => trainees.push(trainee))
      .on("error", (error) => reject(error))
      .on("end", () => {
        resolve(trainees);
      });
  });
}

// Process trainees in batches
async function registerTraineesInBatches(trainees) {
  const results = {
    successful: [],
    failed: [],
    skipped: [],
  };

  for (let i = 0; i < trainees.length; i += CONFIG.batchSize) {
    const batch = trainees.slice(i, i + CONFIG.batchSize);

    // Process each trainee in batch sequentially to avoid Firebase auth errors
    for (const trainee of batch) {
      const result = await registerTrainee(trainee);

      if (result.success) {
        results.successful.push(result);
      } else if (result.status === "skipped") {
        results.skipped.push({ trainee, reason: result.message });
      } else {
        results.failed.push({ trainee, error: result.error });
      }
    }

    // Add delay between batches to avoid rate limiting
    if (i + CONFIG.batchSize < trainees.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.delayBetweenBatches)
      );
    }
  }

  return results;
}

//Uploading a csv file
export const upload_trainee_csv = async (req, res) => {
  try {
    console.log("Headers:", req.headers);
    console.log("Files:", req.file);
    console.log("Body:", req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Validate file type
    if (
      !req.file.mimetype.includes("csv") &&
      !req.file.mimetype.includes("text/plain")
    ) {
      return res.status(400).json({
        success: false,
        message: "File must be a CSV",
      });
    }

    // Parse CSV data
    const trainees = await parseCsvBuffer(req.file.buffer);

    if (trainees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid trainee data found in CSV",
      });
    }

    // Create a response that streams updates as they happen
    res.setHeader("Content-Type", "application/json");
    res.status(202);
    res.write(
      JSON.stringify({
        success: true,
        message: `Processing ${trainees.length} trainees from CSV`,
        totalTrainees: trainees.length,
      }) + "\n"
    );

    // Process trainees
    const results = await registerTraineesInBatches(trainees);

    // Send final summary
    res.write(
      JSON.stringify({
        success: true,
        summary: {
          total: trainees.length,
          successful: results.successful.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
        },
        results,
      })
    );

    res.end();
  } catch (error) {
    console.error("Error in upload handler:", error);
    console.error("Error processing CSV upload:", error);

    // If headers are already sent, we need to write the error as part of the stream
    if (res.headersSent) {
      res.write(
        JSON.stringify({
          success: false,
          message: "Error during processing",
          error: error.message,
        })
      );
      res.end();
    } else {
      res.status(500).json({
        success: false,
        message: "Error processing CSV file",
        error: error.message,
      });
    }
  }
};
