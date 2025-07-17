import { auth, db, serverTimestamp } from '../config/firebaseConfig.js';
import { createUserWithEmailAndPassword, deleteUser, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
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

        // Send password reset email
        await sendPasswordResetEmail(auth, req.body.email);

        // Create facilitator in Firestore - without storing the password
        const facilitatorData = {
            uid: user.uid,
            surname: req.body.surname,
            fullName: req.body.fullName,
            email: req.body.email,
            location: req.body.location,
            idNumber: req.body.idNumber,
            street: req.body.street,
            city: req.body.city,
            postalCode: req.body.postalCode,
            role: req.body.role || 'facilitator',
            twoFactorEnabled: true, // Set two-factor authentication to enabled by default
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
// export const getAllFacilitators = async (req, res) => {
//     try {
//         const facilitatorsSnapshot = await getDocs(collection(db, facilitatorsCollection));
//         const facilitators = facilitatorsSnapshot.docs.map(doc => ({
//             id: doc.id,
//             ...doc.data()
//         }));
//         res.json(facilitators);
//     } catch (error) {
//         console.error('Error getting facilitators:', error);
//         res.status(500).json({ error: error.message });
//     }
// };


// Retrieves all facilitators from Firestore with pagination
export const getAllFacilitators = async (req, res) => {
    try {
        // Get pagination parameters from query string
        const { page = 1, limit: limitParam = 10 } = req.query;
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limitParam, 10);
        
        // Validate pagination parameters
        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).json({ error: "Invalid page number" });
        }
        if (isNaN(limitNumber) || limitNumber < 1) {
            return res.status(400).json({ error: "Invalid limit value" });
        }
        
        // Calculate how many documents to skip
        const skipCount = (pageNumber - 1) * limitNumber;
        
        // Create query - filter by role and order by email
        const facilitatorsQuery = query(
            collection(db, facilitatorsCollection),
            where('role', '==', 'facilitator'),
            orderBy('email'),
            limit(limitNumber)
        );
        
        try {
            // Get total count first (for pagination info)
            const countQuery = query(
                collection(db, facilitatorsCollection),
                where('role', '==', 'facilitator')
            );
            const countSnapshot = await getDocs(countQuery);
            const totalCount = countSnapshot.size;
            
            // If we need to skip documents for pagination
            let paginatedQuery = facilitatorsQuery;
            if (skipCount > 0) {
                // Get all facilitators and paginate in memory
                // This is not ideal for large collections but works for demonstration
                const allFacilitatorsSnapshot = await getDocs(query(
                    collection(db, facilitatorsCollection),
                    where('role', '==', 'facilitator'),
                    orderBy('email')
                ));
                
                const allFacilitators = allFacilitatorsSnapshot.docs;
                
                // Apply pagination manually
                const startIndex = skipCount;
                const endIndex = Math.min(startIndex + limitNumber, allFacilitators.length);
                const paginatedDocs = allFacilitators.slice(startIndex, endIndex);
                
                // Extract data from the paginated docs
                const facilitators = paginatedDocs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Return results with pagination metadata
                return res.status(200).json({
                    facilitators: facilitators,
                    pagination: {
                        currentPage: pageNumber,
                        totalPages: Math.ceil(totalCount / limitNumber),
                        totalItems: totalCount,
                        pageSize: limitNumber
                    }
                });
            } else {
                // Get facilitators with the limit
                const facilitatorsSnapshot = await getDocs(paginatedQuery);
                
                // Extract data from documents
                const facilitators = facilitatorsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Return results with pagination metadata
                return res.status(200).json({
                    facilitators: facilitators,
                    pagination: {
                        currentPage: pageNumber,
                        totalPages: Math.ceil(totalCount / limitNumber),
                        totalItems: totalCount,
                        pageSize: limitNumber
                    }
                });
            }
        } catch (error) {
            console.error('Error processing facilitators:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error getting facilitators:', error);
        res.status(500).json({ 
            error: error.message,
            hint: error.code === 'failed-precondition' ? 
                "You may need to create an index for this query. Check the Firebase console for the index creation link." : 
                undefined
        });
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
        const facilitatorRef = doc(db, facilitatorsCollection, req.params.id);
        const facilitatorDoc = await getDoc(facilitatorRef);
        
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
            // Uncomment and adjust the following if you want to restrict editing to super admins only
            // if (!requesterSnapshot.empty && requesterSnapshot.docs[0].data().role !== 'super_admin') {
            //     return res.status(403).json({ error: 'Unauthorized to edit this profile' });
            // }
        }

        // Only update fields present in req.body and filter out undefined
        const updateData = Object.keys(req.body).reduce((acc, key) => {
            if (req.body[key] !== undefined) {
                acc[key] = req.body[key];
            }
            return acc;
        }, {});
        updateData.updatedAt = serverTimestamp();

        // Validate required fields are not removed
        const requiredFields = ['fullName', 'surname', 'email', 'role'];
        const mergedData = { ...facilitatorData, ...updateData };
        for (const field of requiredFields) {
            if (!mergedData[field]) {
                return res.status(400).json({ error: `Missing required field after update: ${field}` });
            }
        }

        await updateDoc(facilitatorRef, updateData);
        
        const updatedDoc = await getDoc(facilitatorRef);
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