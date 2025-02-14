import "dotenv/config"
import admin from "firebase-admin";
import mongoose from 'mongoose';
import serviceAccount from "../config/serviceAccountKey.json" assert { type: "json" };
import Facilitator from '../models/facilitatorModels.js';

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createSuperAdmin() {
    try {
        // Configuration for the first super admin
        const superAdminConfig = {
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'temporaryPassword123!',
        displayName: process.env.SUPER_ADMIN_NAME || 'Super Admin'
    };

    // Check if super admin already exists in MongoDB
    const existingAdmin = await Facilitator.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('Super admin already exists!');
      process.exit(0);
    }

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      email: superAdminConfig.email,
      password: superAdminConfig.password,
      displayName: superAdminConfig.displayName
    });

    // Create custom claims for super admin
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'super_admin'
    });

    // Create super admin in MongoDB
    const superAdmin = new Facilitator({
      uid: userRecord.uid,
      name: superAdminConfig.displayName,
      email: superAdminConfig.email,
      role: 'super_admin',
      location: 'Soweto'
    });

    await superAdmin.save();

    console.log('Super admin created successfully!');
    console.log('Email:', superAdminConfig.email);
    console.log('Password:', superAdminConfig.password);
    console.log('Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();