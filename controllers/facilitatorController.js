import admin from 'firebase-admin';
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
        const db = admin.firestore();
        // Generate a secure password
        const generatedPassword = generatePassword();

        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: req.body.email,
            password: generatedPassword,
            displayName: req.body.name
        });

        // Create facilitator in Firestore - without storing the password
        const facilitatorData = {
            uid: userRecord.uid,
            surname: req.body.surname,
            name: req.body.name,
            email: req.body.email,
            location: req.body.location,
            role: req.body.role || 'facilitator',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(facilitatorsCollection).doc(userRecord.uid).set(facilitatorData);
        
        // Only send the temporary password in the initial response
        // The user should be required to change this password on first login
        const responseData = {
            ...facilitatorData,
            temporaryPassword: generatedPassword,
            message: 'Please change this temporary password immediately upon first login'
        };

        // Log creation without the password
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
        const db = admin.firestore();
        const facilitatorsSnapshot = await db.collection(facilitatorsCollection).get();
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
        const db = admin.firestore();
        const facilitatorDoc = await db.collection(facilitatorsCollection).doc(req.params.id).get();
        
        if (!facilitatorDoc.exists) {
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
        const db = admin.firestore();
        const facilitatorDoc = await db.collection(facilitatorsCollection).doc(req.params.id).get();
        
        if (!facilitatorDoc.exists) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        const facilitatorData = facilitatorDoc.data();

        // Check if user is updating their own profile or is a super admin
        if (facilitatorData.uid !== req.user.uid) {
            const requesterDoc = await db.collection(facilitatorsCollection)
                .where('uid', '==', req.user.uid)
                .get();
            
            if (!requesterDoc.empty && requesterDoc.docs[0].data().role !== 'super_admin') {
                return res.status(403).json({ error: 'Unauthorized to edit this profile' });
            }
        }

        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(facilitatorsCollection).doc(req.params.id).update(updateData);
        
        const updatedDoc = await db.collection(facilitatorsCollection).doc(req.params.id).get();
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
        const db = admin.firestore();
        const facilitatorDoc = await db.collection(facilitatorsCollection).doc(req.params.id).get();
        
        if (!facilitatorDoc.exists) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        const facilitatorData = facilitatorDoc.data();

        // Delete from Firebase Auth
        await admin.auth().deleteUser(facilitatorData.uid);
        
        // Delete from Firestore
        await db.collection(facilitatorsCollection).doc(req.params.id).delete();
        
        res.json({ message: 'Facilitator deleted successfully' });
    } catch (error) {
        console.error('Error deleting facilitator:', error);
        res.status(500).json({ error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userUid = req.user.uid;

        // Check if facilitator exists in Firestore
        const db = admin.firestore();
        const facilitatorDoc = await db.collection(facilitatorsCollection)
            .where('uid', '==', userUid)
            .get();

        if (facilitatorDoc.empty) {
            return res.status(404).json({ error: 'Facilitator not found' });
        }

        // Update password in Firebase Auth
        await admin.auth().updateUser(userUid, { password: newPassword });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: error.message });
    }
};