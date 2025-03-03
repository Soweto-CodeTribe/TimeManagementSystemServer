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
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
// });

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'text/plain'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed.'));
    }
  }
}).single('file'); // 'file' is the field name expected in the request

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

  console.log("Registering trainee:", trainee); 

  try {

    const existsChecks = await checkTraineeExists(trainee.email, trainee.idNumber);
    if (existsChecks.exists) {
      console.log(`Skipping trainee: ${trainee.email} already exists as ${existsChecks.reason}`);
      return {
        success: false,
        status: "skipped",
        message: `Trainee already exists with this ${existsChecks.reason}`,
      };
    }
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
      console.log("Parsed trainees:", trainees);
  });
}

// Process trainees in batches
async function registerTraineesInBatches(trainees) {

  console.log(`Starting batch processing for ${trainees.length} trainees`); 

  for (let i = 0; i < trainees.length; i += CONFIG.batchSize) {
    const batch = trainees.slice(i, i + CONFIG.batchSize);
    console.log(`Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(trainees.length / CONFIG.batchSize)}`);
    
    for (const trainee of batch) {
      console.log("Processing individual trainee:", trainee.email); // ADD THIS LOG

      const result = await registerTrainee(trainee);
      console.log("Trainee registration result:", result); // ADD THIS LOG
    }
  }

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
    // Process the file using the middleware
    uploadMiddleware(req, res, async (err) => {
      // console.log("Files:", req.file);
      console.log("Successfully Uploaded:", req.file)
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Error uploading file",
        });
      }
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No file uploaded. Please select a CSV file.",
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
      } catch (processingError) {
        console.error("Error processing CSV data:", processingError);
        // If headers are already sent, we need to write the error as part of the stream
        if (res.headersSent) {
          res.write(
            JSON.stringify({
              success: false,
              message: "Error during processing",
              error: processingError.message,
            })
          );
          res.end();
        } else {
          res.status(500).json({
            success: false,
            message: "Error processing CSV file",
            error: processingError.message,
          });
        }
      }
    });
  } catch (error) {
    console.error("Unexpected error in upload handler:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error processing request",
        error: error.message,
      });
    }
  }
};