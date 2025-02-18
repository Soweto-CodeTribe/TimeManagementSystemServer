import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { ref, set, get, update } from "firebase/database";
import { db, rtdb } from "../config/firebaseConfig.js";

const formatTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getTodayReportDoc = async (traineeId) => {
  const today = new Date().toISOString().split("T")[0];
  const reportsRef = collection(db, `trainees/${traineeId}/reports`);
  const q = query(reportsRef, where("date", "==", today));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].ref;
  }

  // If no document exists for today, create a new one
  return doc(reportsRef);
};

export const checkIn = async (req, res) => {
  try {
    const { traineeId, name } = req.body;
    const checkInTime = formatTime();
    const timestamp = Date.now();

    // Update Realtime Database
    await set(ref(rtdb, `liveTracking/${traineeId}`), {
      name,
      checkInTime,
      lunchStatus: "Working",
      lastUpdated: timestamp,
    });

    // Create or update today's report in Firestore
    const reportDocRef = await getTodayReportDoc(traineeId);
    await setDoc(
      reportDocRef,
      {
        date: new Date().toISOString().split("T")[0],
        checkInTime,
        totalHoursWorked: 0,
        totalLunchMinutes: 0,
        name,
      },
      { merge: true }
    );

    res.status(200).json({ message: "Check-in successful", checkInTime });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Failed to check in" });
  }
};

export const lunchStart = async (req, res) => {
  try {
    const { traineeId } = req.body;
    const lunchStartTime = formatTime();

    // Update Realtime Database
    await update(ref(rtdb, `liveTracking/${traineeId}`), {
      lunchStatus: "At Lunch",
      lunchStartTime,
      lastUpdated: Date.now(),
    });

    // Update today's report in Firestore
    const reportDocRef = await getTodayReportDoc(traineeId);
    await updateDoc(reportDocRef, {
      lunchStartTime,
    });

    res.status(200).json({ message: "Lunch start recorded", lunchStartTime });
  } catch (error) {
    console.error("Lunch start error:", error);
    res.status(500).json({ error: "Failed to record lunch start" });
  }
};

export const lunchEnd = async (req, res) => {
  try {
    const { traineeId } = req.body;
    const lunchEndTime = formatTime();

    // Get current lunch start time from Realtime Database
    const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const rtdbData = rtdbSnapshot.val();

    if (!rtdbData?.lunchStartTime) {
      throw new Error("No lunch start time found");
    }

    // Calculate lunch duration in minutes
    const lunchStart = new Date(`2000/01/01 ${rtdbData.lunchStartTime}`);
    const lunchEnd = new Date(`2000/01/01 ${lunchEndTime}`);
    const lunchDurationMinutes = Math.round(
      (lunchEnd - lunchStart) / (1000 * 60)
    );

    // Update Realtime Database
    await update(ref(rtdb, `liveTracking/${traineeId}`), {
      lunchStatus: "Working",
      lunchEndTime,
      lastUpdated: Date.now(),
    });

    // Update today's report in Firestore
    const reportDocRef = await getTodayReportDoc(traineeId);
    await updateDoc(reportDocRef, {
      lunchEndTime,
      totalLunchMinutes: lunchDurationMinutes,
    });

    res.status(200).json({
      message: "Lunch end recorded",
      lunchEndTime,
      lunchDurationMinutes,
    });
  } catch (error) {
    console.error("Lunch end error:", error);
    res.status(500).json({ error: "Failed to record lunch end" });
  }
};

export const checkOut = async (req, res) => {
    try {
        const { traineeId } = req.body;
        const checkOutTime = formatTime();
    
        // Get current data from Realtime Database
        const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
        const rtdbData = rtdbSnapshot.val();
    
        if (!rtdbData?.checkInTime) {
          throw new Error('No check-in time found');
        }
    
        // Calculate total hours worked
        const checkInTime = new Date(`2000/01/01 ${rtdbData.checkInTime}`);
        const checkOut = new Date(`2000/01/01 ${checkOutTime}`);
        let totalMinutes = Math.round((checkOut - checkInTime) / (1000 * 60));
        
        // Get today's report document
        const reportDocRef = await getTodayReportDoc(traineeId);
        const reportDoc = await getDoc(reportDocRef);
        const reportData = reportDoc.data();
    
        // Subtract lunch time if applicable
        const totalLunchMinutes = reportData?.totalLunchMinutes || 0;
        const totalHours = ((totalMinutes - totalLunchMinutes) / 60).toFixed(2);
    
        // Update Firestore report
        await updateDoc(reportDocRef, {
          checkOutTime,
          totalHoursWorked: parseFloat(totalHours)
        });
    
        // Remove from Realtime Database
        await set(ref(rtdb, `liveTracking/${traineeId}`), null);
    
        res.status(200).json({ 
          message: 'Check-out successful', 
          checkOutTime,
          totalHoursWorked: totalHours,
          totalLunchMinutes 
        });
      } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ error: 'Failed to check out' });
      }
};
