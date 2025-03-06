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
            fullName: req.body.fullName,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            idNumber: req.body.idNumber,
            street: req.body.street,
            city: req.body.city,
            postalCode: req.body.postalCode,
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

        // Delete from Firebase Auth
        const user = auth.currentUser;
        if (user) {
            await deleteUser(user);
        }
        // Delete from Firestore
        await deleteDoc(doc(db, stakeholdersCollection, req.params.id));
        
        res.json({ message: 'Stakeholder deleted successfully' });
    } catch (error) {
        console.error('Error deleting stakeholder:', error);
        res.status(500).json({ error: error.message });
    }
};


// Generate a new daily token for a stakeholder - ONLY callable by super admin
export const generateNewToken = async (req, res) => {
    try {
        const stakeholderDoc = await getDoc(doc(db, stakeholdersCollection, req.params.id));
        
        if (!stakeholderDoc.exists()) {
            return res.status(404).json({ error: 'Stakeholder not found' });
        }

        const stakeholder = {
            id: stakeholderDoc.id,
            ...stakeholderDoc.data()
        };
        
        // Generate new token
        const tokenData = {
            uid: stakeholder.id,
            email: stakeholder.email,
            name: stakeholder.name,
            role: 'stakeholder'
        };
        
        const token = generateStakeholderToken(tokenData);
        
        // Update stakeholder's token status
        await updateDoc(doc(db, stakeholdersCollection, stakeholder.id), {
            tokenStatus: 'active',
            updatedAt: serverTimestamp()
        });
        
        // If there was a pending token request, mark it as fulfilled
        const tokenRequestQuery = query(
            collection(db, tokenRequestsCollection), 
            where('stakeholderId', '==', stakeholder.id),
            where('status', '==', 'pending')
        );
        
        const tokenRequestSnapshot = await getDocs(tokenRequestQuery);
        
        if (!tokenRequestSnapshot.empty) {
            // Update the most recent token request
            const requestDoc = tokenRequestSnapshot.docs[0];
            await updateDoc(doc(db, tokenRequestsCollection, requestDoc.id), {
                status: 'fulfilled',
                fulfilledBy: req.user.uid,
                fulfilledAt: serverTimestamp()
            });
        }
        
        res.json({
            uid: stakeholder.id,
            email: stakeholder.email,
            name: stakeholder.name,
            accessToken: token,
            expiresIn: '24 hours'
        });
    } catch (error) {
        console.error('Error generating new token:', error);
        res.status(500).json({ error: error.message });
    }
};

// For stakeholders to request a new token when theirs expires
export const requestNewToken = async (req, res) => {
    try {
        const { email, stakeholderId } = req.body;
        
        if (!email || !stakeholderId) {
            return res.status(400).json({ error: 'Email and stakeholder ID are required' });
        }
        
        const stakeholderDoc = await getDoc(doc(db, 'stakeholders', stakeholderId));
        
        if (!stakeholderDoc.exists() || stakeholderDoc.data().email !== email) {
            return res.status(404).json({ error: 'Stakeholder not found or email mismatch' });
        }
        
        // Check if there's already a pending request
        const pendingRequestQuery = query(
            collection(db, 'tokenRequests'), 
            where('stakeholderId', '==', stakeholderId),
            where('status', '==', 'pending')
        );
        
        const pendingRequestSnapshot = await getDocs(pendingRequestQuery);
        
        if (!pendingRequestSnapshot.empty) {
            // A request is already pending
            return res.status(200).json({
                message: 'You already have a pending token request. A super admin will review your request shortly.',
                requestId: pendingRequestSnapshot.docs[0].id,
                requestedAt: pendingRequestSnapshot.docs[0].data().requestedAt
            });
        }
        
        // Create a new token request with additional information
        const requestData = {
            stakeholderId: stakeholderId,
            stakeholderEmail: email,
            stakeholderName: stakeholderDoc.data().name,
            phoneNumber: stakeholderDoc.data().phoneNumber,
            organization: stakeholderDoc.data().organization,
            requestedAt: serverTimestamp(),
            status: 'pending', // pending, fulfilled, rejected
            reason: req.body.reason || 'Regular access request',
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
        };
        
        const requestRef = doc(collection(db, 'tokenRequests'));
        await setDoc(requestRef, requestData);
        
        // Update stakeholder status to reflect they've requested a token
        await updateDoc(doc(db, 'stakeholders', stakeholderId), {
            tokenStatus: 'requested',
            lastTokenRequest: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        res.status(201).json({
            message: 'Token request submitted successfully. A super admin will review your request shortly.',
            requestId: requestRef.id
        });
    } catch (error) {
        console.error('Error requesting new token:', error);
        res.status(500).json({ error: error.message });
    }
};

// Modified function for super admins to approve token requests
export const approveTokenRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Get the token request
        const requestDoc = await getDoc(doc(db, 'tokenRequests', requestId));
        
        if (!requestDoc.exists()) {
            return res.status(404).json({ error: 'Token request not found' });
        }
        
        const requestData = requestDoc.data();
        
        if (requestData.status !== 'pending') {
            return res.status(400).json({ 
                error: `This request has already been ${requestData.status}` 
            });
        }
        
        // Get the stakeholder
        const stakeholderDoc = await getDoc(doc(db, 'stakeholders', requestData.stakeholderId));
        
        if (!stakeholderDoc.exists()) {
            return res.status(404).json({ error: 'Stakeholder not found' });
        }
        
        const stakeholder = stakeholderDoc.data();
        
        // Generate a new token
        const tokenData = {
            uid: requestData.stakeholderId,
            email: stakeholder.email,
            name: stakeholder.name,
            role: 'stakeholder'
        };
        
        const token = generateStakeholderToken(tokenData);
        
        // Update the token request
        await updateDoc(doc(db, 'tokenRequests', requestId), {
            status: 'fulfilled',
            fulfilledBy: req.user.uid, // Super admin ID
            fulfilledAt: serverTimestamp(),
            approvalNotes: req.body.notes || ''
        });
        
        // Update the stakeholder
        await updateDoc(doc(db, 'stakeholders', requestData.stakeholderId), {
            tokenStatus: 'active',
            lastTokenApproval: serverTimestamp(),
            tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            updatedAt: serverTimestamp()
        });
        
        res.json({
            message: 'Token request approved successfully',
            stakeholderId: requestData.stakeholderId,
            stakeholderEmail: stakeholder.email,
            token: token,
            expiresIn: '24 hours'
        });
        
    } catch (error) {
        console.error('Error approving token request:', error);
        res.status(500).json({ error: error.message });
    }
};

// Function to reject a token request
export const rejectTokenRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Get the token request
        const requestDoc = await getDoc(doc(db, 'tokenRequests', requestId));
        
        if (!requestDoc.exists()) {
            return res.status(404).json({ error: 'Token request not found' });
        }
        
        const requestData = requestDoc.data();
        
        if (requestData.status !== 'pending') {
            return res.status(400).json({ 
                error: `This request has already been ${requestData.status}` 
            });
        }
        
        // Update the token request
        await updateDoc(doc(db, 'tokenRequests', requestId), {
            status: 'rejected',
            rejectedBy: req.user.uid, // Super admin ID
            rejectedAt: serverTimestamp(),
            rejectionReason: req.body.reason || 'No reason provided'
        });
        
        // Update the stakeholder
        await updateDoc(doc(db, 'stakeholders', requestData.stakeholderId), {
            tokenStatus: 'rejected',
            updatedAt: serverTimestamp()
        });
        
        res.json({
            message: 'Token request rejected successfully',
            stakeholderId: requestData.stakeholderId,
            rejectionReason: req.body.reason || 'No reason provided'
        });
        
    } catch (error) {
        console.error('Error rejecting token request:', error);
        res.status(500).json({ error: error.message });
    }
};


// For super admins to view pending token requests
export const getTokenRequests = async (req, res) => {
    try {
        const query = req.query.status 
            ? query(collection(db, tokenRequestsCollection), where('status', '==', req.query.status))
            : collection(db, tokenRequestsCollection);
            
        const requestsSnapshot = await getDocs(query);
        
        const requests = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json(requests);
    } catch (error) {
        console.error('Error retrieving token requests:', error);
        res.status(500).json({ error: error.message });
    }
};


// Auto-expire tokens after 24 hours - should be run by a scheduled function
export const expireStakeholderTokens = async () => {
    try {
      // Get all stakeholders with active tokens
        const stakeholdersRef = collection(db, 'stakeholders');
        const activeTokensQuery = query(stakeholdersRef, where('tokenStatus', '==', 'active'));
        const stakeholderSnapshot = await getDocs(activeTokensQuery);
        
        if (stakeholderSnapshot.empty) {
            console.log('No active stakeholder tokens found');
            return { success: true, message: 'No active tokens to check', expired: 0 };
        }
        
        let expiredCount = 0;
        const currentTime = new Date();
        
        // Check each stakeholder's token expiration time
        const updatePromises = stakeholderSnapshot.docs.map(async (docSnapshot) => {
        const stakeholderData = docSnapshot.data();
        
        // If tokenLastUpdated is more than 24 hours ago, expire the token
        if (stakeholderData.tokenLastUpdated) {
            const tokenUpdateTime = stakeholderData.tokenLastUpdated.toDate();
            const timeDifference = currentTime - tokenUpdateTime;
            const hoursDifference = timeDifference / (1000 * 60 * 60);
            
            // Check if token is older than 24 hours
            if (hoursDifference >= 24) {
                expiredCount++;
                await updateDoc(doc(db, 'stakeholders', docSnapshot.id), {
                    tokenStatus: 'expired',
                    tokenExpirationDate: serverTimestamp()
                });
                
                console.log(`Expired token for stakeholder: ${docSnapshot.id}`);
                return true;
            }
        }
            return false;
        });
        
        await Promise.all(updatePromises);
        
        return {
            success: true,
            message: `Checked ${stakeholderSnapshot.size} active tokens`,
            expired: expiredCount
        };
    } catch (error) {
        console.error('Error expiring stakeholder tokens:', error);
        return {
            success: false,
            message: error.message
        };
    }
};