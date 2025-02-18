import admin from 'firebase-admin';
// import Facilitator from '../models/facilitatorModels.js';
import { db } from '../config/firebaseConfig.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

//Middleware to authenticate requests using Firebase token
export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};


//Middleware to check if user has super_admin privileges
export const isSuperAdmin = async (req, res, next) => {
  try {
    // Ensure req.user exists
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }

    // Check Firestore for user role
    const facilitatorQuery = query(
      collection(db, 'facilitators'),
      where('uid', '==', req.user.uid)
    );

    const facilitatorSnapshot = await getDocs(facilitatorQuery);

    if (facilitatorSnapshot.empty) {
      return res.status(403).json({ error: 'Unauthorized: User not found' });
    }

    const facilitator = facilitatorSnapshot.docs[0].data();
    if (facilitator.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Requires super admin privileges' });
    }

    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};