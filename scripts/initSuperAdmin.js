import "dotenv/config";
import { auth, db } from "../config/firebaseConfig.js";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

async function createSuperAdmin() {
  try {
    // Configuration for the first super admin
    const superAdminConfig = {
      email: process.env.SUPER_ADMIN_EMAIL || 'super@example.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'temporaryPassword123',
      displayName: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    };

    // Check if super admin exists in Firestore
    const superAdminDocRef = doc(db, "facilitators", "super_admin");
    const superAdminSnapshot = await getDoc(superAdminDocRef);

    if (superAdminSnapshot.exists()) {
      console.log("Super admin already exists!");
      process.exit(0);
    }

    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      superAdminConfig.email,
      superAdminConfig.password
    );

    // Update user profile
    await updateProfile(userCredential.user, {
      displayName: superAdminConfig.displayName,
    });

    // Store super admin in Firestore
    await setDoc(doc(db, "facilitators", userCredential.user.uid), {
      uid: userCredential.user.uid,
      name: superAdminConfig.displayName,
      email: superAdminConfig.email,
      role: "super_admin",
      location: "Soweto",
    });

    console.log("Super admin created successfully!");
    console.log("Email:", superAdminConfig.email);
    console.log("Password:", superAdminConfig.password);
    console.log("Please change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();
