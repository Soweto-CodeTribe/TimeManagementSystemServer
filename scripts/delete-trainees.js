import "dotenv/config";
import { auth, db } from "../config/firebaseConfig.js";
import { deleteUser, signInWithEmailAndPassword } from "firebase/auth";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import fs from "fs";
import csvParser from "csv-parser";

// Configuration
const CONFIG = {
  csvFilePath: "./scripts/trainees-csv.csv", // Same CSV file used for registration
  batchSize: 5, // Process 5 trainees at a time
  delayBetweenBatches: 3000, // 3 seconds delay between batches to avoid rate limiting
  defaultPassword: "Trainee@123", // Default password that was used for trainee accounts
};

// Results tracking
const results = {
  successful: [],
  failed: [],
  notFound: [],
};

// Read and parse CSV file
async function readCsvFile() {
  return new Promise((resolve, reject) => {
    const trainees = [];
    fs.createReadStream(CONFIG.csvFilePath)
      .pipe(csvParser({ columns: true, trim: true }))
      .on("data", (trainee) => trainees.push(trainee))
      .on("error", (error) => reject(error))
      .on("end", () => {
        console.log(`CSV file successfully processed. Found ${trainees.length} trainees.`);
        resolve(trainees);
      });
  });
}

// Find trainee by email in Firestore
async function findTraineeByEmail(email) {
  const traineeQuery = query(
    collection(db, "trainees"),
    where("email", "==", email)
  );
  
  const querySnapshot = await getDocs(traineeQuery);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  // Return the first matching document (should be only one with unique email)
  return {
    id: querySnapshot.docs[0].id,
    ...querySnapshot.docs[0].data()
  };
}

// Delete a single trainee
async function deleteTrainee(trainee) {
  try {
    // Find trainee in Firestore by email
    const traineeData = await findTraineeByEmail(trainee.email);
    
    if (!traineeData) {
      results.notFound.push({
        email: trainee.email,
        name: trainee.name,
        reason: "Trainee not found in database"
      });
      console.log(`⚠️ Trainee not found: ${trainee.name} (${trainee.email})`);
      return;
    }

    // Delete trainee document from Firestore first
    await deleteDoc(doc(db, "trainees", traineeData.id));
    
    // Try to delete user from Authentication
    // Note: This would typically require re-authentication
    // For admin purposes, you should use the Admin SDK in a secure environment
    try {
      // This is a simplified approach - in production, use Firebase Admin SDK
      // Sign in as the user first (requires user's password)
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trainee.email,
        CONFIG.defaultPassword
      );
      
      // Delete the authenticated user
      await deleteUser(userCredential.user);
    } catch (authError) {
      console.warn(`⚠️ Could not delete auth record for ${trainee.email}: ${authError.message}`);
      console.warn("Firestore record was deleted, but auth record may remain.");
    }

    results.successful.push({
      name: trainee.name,
      email: trainee.email,
      id: traineeData.id
    });
    
    console.log(`✅ Successfully deleted: ${trainee.name} (${trainee.email})`);
    
  } catch (error) {
    results.failed.push({
      trainee,
      error: error.message,
    });
    
    console.error(`❌ Failed to delete: ${trainee.name} - ${error.message}`);
  }
}

// Process trainees in batches
async function deleteTraineesInBatches(trainees) {
  for (let i = 0; i < trainees.length; i += CONFIG.batchSize) {
    const batch = trainees.slice(i, i + CONFIG.batchSize);
    console.log(`\nProcessing deletion batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(trainees.length / CONFIG.batchSize)}`);
    
    // Process each trainee in batch sequentially
    for (const trainee of batch) {
      await deleteTrainee(trainee);
    }
    
    // Progress update
    console.log(`\nProgress: ${Math.min(i + CONFIG.batchSize, trainees.length)}/${trainees.length} trainees processed.`);
    console.log(`Success: ${results.successful.length}, Failed: ${results.failed.length}, Not Found: ${results.notFound.length}`);
    
    // Add delay between batches to avoid rate limiting
    if (i + CONFIG.batchSize < trainees.length) {
      console.log(`Waiting ${CONFIG.delayBetweenBatches / 1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
  }
}

// Generate report
function generateReport() {
  console.log('\n\n======== DELETION REPORT ========');
  console.log(`Total trainees processed: ${results.successful.length + results.failed.length + results.notFound.length}`);
  console.log(`Successfully deleted: ${results.successful.length}`);
  console.log(`Failed deletions: ${results.failed.length}`);
  console.log(`Not found: ${results.notFound.length}`);
  
  // Write results to file for record keeping
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    `./trainee_deletion_results_${timestamp}.json`,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: results.successful.length + results.failed.length + results.notFound.length,
        successful: results.successful.length,
        failed: results.failed.length,
        notFound: results.notFound.length,
      },
      successful: results.successful,
      failed: results.failed,
      notFound: results.notFound,
    }, null, 2)
  );
  
  console.log(`\nDetailed results saved to trainee_deletion_results_${timestamp}.json`);
}

// Main function
async function main() {
  try {
    console.log('🔥 Starting bulk trainee deletion...');
    console.log(`Using CSV file: ${CONFIG.csvFilePath}`);
    
    // Read trainee data from CSV
    const trainees = await readCsvFile();
    
    if (trainees.length === 0) {
      console.log('No trainees found in CSV file. Exiting.');
      return;
    }
    
    // Confirm before proceeding
    console.log(`\n⚠️ WARNING: Ready to DELETE ${trainees.length} trainees from the system.`);
    console.log(`This will remove them from both Authentication and Firestore.`);
    console.log(`First trainee to be deleted: ${trainees[0].name} (${trainees[0].email})`);
    
    // In a real script, you might want to add a confirmation prompt here
    console.log('\nProceeding with deletion...');
    
    // Delete trainees
    await deleteTraineesInBatches(trainees);
    
    // Generate report
    generateReport();
    
  } catch (error) {
    console.error('An error occurred during the deletion process:', error);
  } finally {
    // Exit process when done
    process.exit(0);
  }
}

// Run the script
main();

// node delete-trainees.js