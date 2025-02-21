// import admin from 'firebase-admin';
// import Facilitator from '../models/facilitatorModels.js';
import { db } from '../config/firebaseConfig.js';
import { collection, query, where, getDocs } from 'firebase/firestore';


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

//middleware to check if you are indeed
export const isFacilitator=async(req,res,next)=>{
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
    if (facilitator.role !== 'facilitator') {
      return res.status(403).json({ error: 'Unauthorized: Requires admin privileges' });
    }

    next();
  }catch(error){
  console.error('Facilitator check error',error)
  res.status(500).json({error:'Internal server error'})
}


}