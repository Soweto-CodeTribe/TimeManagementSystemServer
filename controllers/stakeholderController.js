import { auth, db, serverTimestamp } from '../config/firebaseConfig.js';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import { generateStakeholderToken } from '../utilities/index.js';
import crypto from 'crypto';

// Reference to Firestore collection
const stakeholdersCollection = 'stakeholders';
const tokenRequestsCollection = 'tokenRequests';

// Function to generate a secure random password
const generatePassword = (length = 12) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};

// Creates a new stakeholder in both Firebase Auth and Firestore
export const createStakeholder = async (req, res) => {
    try {
        const generatedPassword = generatePassword();

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, req.body.email, generatedPassword);
        const user = userCredential.user;

        // Create stakeholder in Firestore
        const stakeholderData = {
            uid: user.uid,
            surname: req.body.surname,
            name: req.body.name,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            organization: req.body.organization,
            role: 'stakeholder', // fixed role
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: req.user.uid, // Track which super admin created this stakeholder
            tokenStatus: 'active' // Track token status: active, expired, requested
        };

        await setDoc(doc(db, stakeholdersCollection, user.uid), stakeholderData);
        
        // Generate daily access token
        const tokenData = {
            uid: user.uid,
            email: req.body.email,
            name: req.body.name,
            role: 'stakeholder'
        };
        
        const token = generateStakeholderToken(tokenData);
        
        const responseData = {
            ...stakeholderData,
            temporaryPassword: generatedPassword,
            accessToken: token,
            message: 'This token will expire in 24 hours. A new token will need to be requested from a super admin for continued access.'
        };

        console.log(`Created stakeholder account for ${req.body.email}`);
        
        res.status(201).json(responseData);
    } catch (error) {
        console.error('Error creating stakeholder:', error);
        res.status(400).json({ error: error.message });
    }
};

// Retrieves all stakeholders from Firestore
export const getAllStakeholders = async (req, res) => {
    try {
        const stakeholdersSnapshot = await getDocs(collection(db, stakeholdersCollection));
        const stakeholders = stakeholdersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(stakeholders);
    } catch (error) {
        console.error('Error getting stakeholders:', error);
        res.status(500).json({ error: error.message });
    }
};

// Retrieves a single stakeholder by their UID
export const getStakeholder = async (req, res) => {
    try {
        const stakeholderDoc = await getDoc(doc(db, stakeholdersCollection, req.params.id));
        
        if (!stakeholderDoc.exists()) {
            return res.status(404).json({ error: 'Stakeholder not found' });
        }
        
        res.json({
            id: stakeholderDoc.id,
            ...stakeholderDoc.data()
        });
    } catch (error) {
        console.error('Error getting stakeholder:', error);
        res.status(500).json({ error: error.message });
    }
};

// Deletes a stakeholder from both Firebase Auth and Firestore
export const deleteStakeholder = async (req, res) => {
    try {
        const stakeholderDoc = await getDoc(doc(db, stakeholdersCollection, req.params.id));
        
        if (!stakeholderDoc.exists()) {
            return res.status(404).json({ error: 'Stakeholder not found' });
        }

        // Delete from Firebase Auth - this requires admin SDK in production
        // For now, just delete from Firestore
        await deleteDoc(doc(db, stakeholdersCollection, req.params.id));
        
        res.json({ message: 'Stakeholder deleted successfully' });
    } catch (error) {
        console.error('Error deleting stakeholder:', error);
        res.status(500).json({ error: error.message });
    }
};


