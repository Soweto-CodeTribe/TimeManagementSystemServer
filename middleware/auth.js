// import admin from 'firebase-admin';
// import Facilitator from '../models/facilitatorModels.js';


//Middleware to authenticate requests using Firebase token



//Middleware to check if user has super_admin privileges
export const isSuperAdmin = async (req, res, next) => {
  try {
    const db = admin.firestore();
    
    // Check Firebase custom claims first
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Fallback to Firestore check
    const facilitatorSnapshot = await db.collection('facilitators')
      .where('uid', '==', req.user.uid)
      .get();

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