import { auth, db, serverTimestamp } from '../config/firebaseConfig.js';
import { createUserWithEmailAndPassword, deleteUser, updatePassword } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import crypto from 'crypto';

// Reference to Firestore collection
const facilitatorsCollection = 'facilitators';

// Function to generate a secure random password
const generatePassword = (length = 12) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};

// Creates a new facilitator in both Firebase Auth and Firestore
export const createFacilitator = async (req, res) => {
    try {
        const generatedPassword = generatePassword();

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, req.body.email, generatedPassword);
        const user = userCredential.user;

        // Create facilitator in Firestore - without storing the password
        const facilitatorData = {
            uid: user.uid,
            surname: req.body.surname,
            name: req.body.name,
            email: req.body.email,
            location: req.body.location,
            role: req.body.role || 'facilitator',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, facilitatorsCollection, user.uid), facilitatorData);
        
        const responseData = {
            ...facilitatorData,
            temporaryPassword: generatedPassword,
            message: 'Please change this temporary password immediately upon first login'
        };

        console.log(`Created facilitator account for ${req.body.email}`);
        
        res.status(201).json(responseData);
    } catch (error) {
        console.error('Error creating facilitator:', error);
        res.status(400).json({ error: error.message });
    }
};

// Retrieves all facilitators from Firestore
export const getAllFacilitators = async (req, res) => {
    try {
        const facilitatorsSnapshot = await getDocs(collection(db, facilitatorsCollection));
        const facilitators = facilitatorsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(facilitators);
    } catch (error) {
        console.error('Error getting facilitators:', error);
        res.status(500).json({ error: error.message });
    }
};

// Retrieves a single facilitator by their UID
export const getFacilitator = async (req, res) => {
    try {
        const facilitatorDoc = await getDoc(doc(db, facilitatorsCollection, req.params.id));
        
        if (!facilitatorDoc.exists()) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }
        
        res.json({
            id: facilitatorDoc.id,
            ...facilitatorDoc.data()
        });
    } catch (error) {
        console.error('Error getting facilitator:', error);
        res.status(500).json({ error: error.message });
    }
};

// Updates a facilitator's information
export const updateFacilitator = async (req, res) => {
    try {
        const facilitatorDoc = await getDoc(doc(db, facilitatorsCollection, req.params.id));
        
        if (!facilitatorDoc.exists()) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        const facilitatorData = facilitatorDoc.data();

        // Check if user is updating their own profile or is a super admin
        if (facilitatorData.uid !== req.user.uid) {
            const requesterQuery = query(
                collection(db, facilitatorsCollection),
                where('uid', '==', req.user.uid)
            );
            const requesterSnapshot = await getDocs(requesterQuery);
            
            if (!requesterSnapshot.empty && requesterSnapshot.docs[0].data().role !== 'super_admin') {
                return res.status(403).json({ error: 'Unauthorized to edit this profile' });
            }
        }

        const updateData = {
            ...req.body,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, facilitatorsCollection, req.params.id), updateData);
        
        const updatedDoc = await getDoc(doc(db, facilitatorsCollection, req.params.id));
        res.json({
            id: updatedDoc.id,
            ...updatedDoc.data()
        });
    } catch (error) {
        console.error('Error updating facilitator:', error);
        res.status(400).json({ error: error.message });
    }
};

// Deletes a facilitator from both Firebase Auth and Firestore
export const deleteFacilitator = async (req, res) => {
    try {
        const facilitatorDoc = await getDoc(doc(db, facilitatorsCollection, req.params.id));
        
        if (!facilitatorDoc.exists()) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        const facilitatorData = facilitatorDoc.data();

        // Delete from Firebase Auth
        const user = auth.currentUser;
        if (user) {
            await deleteUser(user);
        }
        
        // Delete from Firestore
        await deleteDoc(doc(db, facilitatorsCollection, req.params.id));
        
        res.json({ message: 'Facilitator deleted successfully' });
    } catch (error) {
        console.error('Error deleting facilitator:', error);
        res.status(500).json({ error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = auth.currentUser;

        if (!user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Check if facilitator exists in Firestore
        const facilitatorQuery = query(
            collection(db, facilitatorsCollection),
            where('uid', '==', user.uid)
        );
        const facilitatorSnapshot = await getDocs(facilitatorQuery);

        if (facilitatorSnapshot.empty) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        // Update password in Firebase Auth
        await updatePassword(user, newPassword);

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: error.message });
    }
};