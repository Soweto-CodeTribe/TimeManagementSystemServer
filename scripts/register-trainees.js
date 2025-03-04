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
import fs from "fs";
import csvParser from "csv-parser"; // Fixed import for csv-parser

// Configuration
const CONFIG = {
  csvFilePath: "./scripts/trainees-csv.csv",
  batchSize: 5, // Process 5 trainees at a time
  delayBetweenBatches: 3000, // 3 seconds delay between batches to avoid rate limiting
  defaultPassword: "Trainee@123", // Default password for new trainee accounts
};

// Results tracking
const results = {
  successful: [],
  failed: [],
  skipped: [],
};

// Read and parse CSV file
async function readCsvFile() {
  return new Promise((resolve, reject) => {
    const trainees = [];
    fs.createReadStream(CONFIG.csvFilePath)
      .pipe(csvParser({ columns: true, trim: true })) // Use the default export directly
      .on("data", (trainee) => trainees.push(trainee))
      .on("error", (error) => reject(error))
      .on("end", () => {
        console.log(
          `CSV file successfully processed. Found ${trainees.length} trainees.`
        );
        resolve(trainees);
      });
  });
}

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
      results.skipped.push({
        trainee,
        reason: `Trainee already exists with this ${existsCheck.reason}`,
      });
      return;
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

    // Record successful registration
    results.successful.push({
      user: savedTrainee,
      password: CONFIG.defaultPassword,
      message: `User created successfully. A password reset email has been sent to ${trainee.email}`,
    });

    console.log(
      `✅ Successfully registered: ${trainee.name} (${trainee.location})`
    );
    console.log(`   Password reset email sent to: ${trainee.email}`);
  } catch (error) {
    results.failed.push({
      trainee,
      error: error.message,
    });

    console.error(`❌ Failed to register: ${trainee.name} - ${error.message}`);
  }
}

// Process trainees in batches
async function registerTraineesInBatches(trainees) {
  for (let i = 0; i < trainees.length; i += CONFIG.batchSize) {
    const batch = trainees.slice(i, i + CONFIG.batchSize);
    console.log(
      `\nProcessing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(
        trainees.length / CONFIG.batchSize
      )}`
    );

    // Process each trainee in batch sequentially to avoid Firebase auth errors
    for (const trainee of batch) {
      await registerTrainee(trainee);
    }

    // Progress update
    console.log(
      `\nProgress: ${Math.min(i + CONFIG.batchSize, trainees.length)}/${
        trainees.length
      } trainees processed.`
    );
    console.log(
      `Success: ${results.successful.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`
    );

    // Add delay between batches to avoid rate limiting
    if (i + CONFIG.batchSize < trainees.length) {
      console.log(
        `Waiting ${
          CONFIG.delayBetweenBatches / 1000
        } seconds before next batch...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.delayBetweenBatches)
      );
    }
  }
}

// Generate report
function generateReport() {
  console.log("\n\n======== REGISTRATION REPORT ========");
  console.log(
    `Total trainees processed: ${
      results.successful.length + results.failed.length + results.skipped.length
    }`
  );
  console.log(`Successfully registered: ${results.successful.length}`);
  console.log(`Failed registrations: ${results.failed.length}`);
  console.log(`Skipped (already exist): ${results.skipped.length}`);

  // Write results to file for record keeping
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(
    `./trainee_registration_results_${timestamp}.json`,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          total:
            results.successful.length +
            results.failed.length +
            results.skipped.length,
          successful: results.successful.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
        },
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
      },
      null,
      2
    )
  );

  console.log(
    `\nDetailed results saved to trainee_registration_results_${timestamp}.json`
  );

  // Print location-based summary
  const locationSummary = {};

  for (const trainee of results.successful) {
    if (!locationSummary[trainee.location]) {
      locationSummary[trainee.location] = 0;
    }
    locationSummary[trainee.location]++;
  }

  console.log("\nSuccessfully registered trainees by location:");
  for (const [location, count] of Object.entries(locationSummary)) {
    console.log(`${location}: ${count} trainees`);
  }
}

// Main function
async function main() {
  try {
    console.log("🚀 Starting bulk trainee registration...");
    console.log(`Using CSV file: ${CONFIG.csvFilePath}`);

    // Read trainee data from CSV
    const trainees = await readCsvFile();

    if (trainees.length === 0) {
      console.log("No trainees found in CSV file. Exiting.");
      return;
    }

    // Confirm before proceeding
    console.log(
      `\nReady to register ${trainees.length} trainees with the following data structure:`
    );
    console.log(trainees[0]);

    console.log("\nProceeding with registration...");

    // Register trainees
    await registerTraineesInBatches(trainees);

    // Generate report
    generateReport();
  } catch (error) {
    console.error("An error occurred during the registration process:", error);
  } finally {
    // Exit process when done
    process.exit(0);
  }
}

// Run the script
main();

// node register-trainees.js
