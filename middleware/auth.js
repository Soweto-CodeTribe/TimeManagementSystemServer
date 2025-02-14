import admin from 'firebase-admin';
import Facilitator from '../models/facilitatorModels.js';


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
    // Check Firebase custom claims first
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Fallback to database check
    const facilitator = await Facilitator.findOne({ uid: req.user.uid });
    if (facilitator?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized: Requires super admin privileges' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
