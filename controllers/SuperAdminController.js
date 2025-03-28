import crypto from 'crypto';
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
} from 'firebase/firestore';
import { auth, db, serverTimestamp } from '../config/firebaseConfig.js';

const superAdminsCollection = 'facilitators';

const generatePassword = (length = 12) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};

// Creates a new super admin in both Firebase Auth and Firestore
export const createSuperAdmin = async (req, res) => {
    try {
        // Validate required fields
        const requiredFields = [
            'email', 'surname', 'fullName'
        ];
        
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ 
                    error: `Missing required field: ${field}` 
                });
            }
        }

        const generatedPassword = generatePassword();

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            req.body.email, 
            generatedPassword
        );
        const user = userCredential.user;

        // Send password reset email
        await sendPasswordResetEmail(auth, req.body.email);

        // Create super admin in Firestore - without storing the password
        const superAdminData = {
            uid: user.uid,
            surname: req.body.surname,
            fullName: req.body.fullName,
            email: req.body.email,
            // Optional fields - only added if provided
            ...(req.body.idNumber && { idNumber: req.body.idNumber }),
            ...(req.body.street && { street: req.body.street }),
            ...(req.body.city && { city: req.body.city }),
            ...(req.body.postalCode && { postalCode: req.body.postalCode }),
            
            // Default two-factor to true, can be overridden if needed
            twoFactorEnabled: req.body.twoFactorEnabled ?? true,
            role: req.body.role || 'super_admin', // Hardcoded role for super admin
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, superAdminsCollection, user.uid), superAdminData);
        
        const responseData = {
            ...superAdminData,
            temporaryPassword: generatedPassword,
            message: 'Please change this temporary password immediately upon first login'
        };

        console.log(`Created super admin account for ${req.body.email}`);
        
        res.status(201).json(responseData);
    } catch (error) {
        console.error('Error creating super admin:', error);
        
        // Handle specific Firebase Authentication errors
        if (error.code === 'auth/email-already-in-use') {
            return res.status(400).json({ 
                error: 'Email is already registered' 
            });
        }
        
        // Generic error response
        res.status(400).json({ 
            error: error.message || 'Failed to create super admin account' 
        });
    }
};