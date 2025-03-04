import { db } from '../config/firebaseConfig.js';
import { collection, query, where, getDocs,getDoc, doc } from 'firebase/firestore';
import { stakeholderAccess} from '../utilities/index.js';

import { ref, get } from "firebase/database";
import { rtdb } from "../config/firebaseConfig.js";

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


export const isFacilitatorLocationTrainee = async (req, res, next) => {
  try {
    // Ensure req.user exists
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }

    // Check Firestore for user role
    const facilitatorRef = doc(db, 'facilitators', req.user.uid);
    const facilitatorDoc = await getDoc(facilitatorRef);

    if (!facilitatorDoc.exists()) {
      return res.status(403).json({ error: 'Unauthorized: Not a facilitator' });
    }

    const facilitatorLocation = facilitatorDoc.data().location;
    console.log("facilitator location: ", facilitatorLocation);

    if (!facilitatorLocation) {
      return res.status(400).json({ error: 'Facilitator location not set' });
    }

    // Query trainees collection with location filter
    const traineesRef = collection(db, "trainees");
    const locationQuery = query(traineesRef, where("location", "==", facilitatorLocation));
    const snapshot = await getDocs(locationQuery);
    console.log(locationQuery);

    const trainees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(trainees);

    // Attach trainees to req object
    req.trainees = trainees;

    next();
  } catch (error) {
    console.error('Trainee fetching error:', error);
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

//middleware to check if you are indeed a trainee at a certain location
export const getTraineesByLocations = async (req, res, next) => {
  try {
    const location = req.query.location;

    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    const traineesRef = ref(rtdb, 'liveTracking');
    const snapshot = await get(traineesRef);
    const traineesData = snapshot.val();

    if (!traineesData) {
      return res.status(404).json({ error: "No trainees found" });
    }

    const traineesAtLocation = Object.values(traineesData).filter(
      trainee => trainee.location === location
    );

    req.traineesAtLocation = traineesAtLocation;
    next();
  } catch (error) {
    console.error("Error fetching trainees by location:", error);
    res.status(500).json({ error: "Failed to fetch trainees by location" });
  }
};



// Middleware to verify stakeholder in database
export const verifyStakeholderInDb = async (req, res, next) => {
  try {
    // Ensure req.user exists from token verification
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }
    
    // Verify that the user is actually a stakeholder in our database
    const stakeholderQuery = query(
      collection(db, 'stakeholders'),
      where('uid', '==', req.user.uid)
    );
    
    const stakeholderSnapshot = await getDocs(stakeholderQuery);
    
    if (stakeholderSnapshot.empty) {
      return res.status(403).json({ error: 'Invalid stakeholder: Not found in database' });
    }
    
    next();
  } catch (error) {
    console.error('Stakeholder database check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Combined middleware for complete stakeholder access (verification + database check + read-only)
export const completeStakeholderAccess = [stakeholderAccess, verifyStakeholderInDb];

