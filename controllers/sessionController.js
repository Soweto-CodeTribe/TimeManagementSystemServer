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

export const formatTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const checkTime = (checkInTime) => {
  const [hours, minutes] = checkInTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes < 480) {
    return "Early";
  } else if (totalMinutes >= 481 && totalMinutes <= 490) {
    return "Within grace period";
  } else if (totalMinutes > 496) {
    return "Late";
  } else {
    return "On time";
  }
};

const getTodayReportDoc = async (traineeId) => {
  const today = new Date().toISOString().split("T")[0];
  const reportRef = doc(db, `reports/${traineeId}`);
  const reportDoc = await getDoc(reportRef);

  if (!reportDoc.exists()) {
    // Initialize the document if it doesn't exist
    await setDoc(reportRef, {}, { merge: true });
  }

  return { ref: reportRef, today };
};

export const checkIn = async (req, res) => {
  try {
    const { traineeId, name, checkInTime, location } = req.body;

    console.log("Received Check-in Data:", {
      traineeId,
      name,
      checkInTime,
      location,
    });

    // Validate Required Fields
    if (!traineeId || !name || !checkInTime || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const timestamp = Date.now();

    // Update Realtime Database
    await set(ref(rtdb, `liveTracking/${traineeId}`), {
      name,
      checkInTime,
      location: location || "Unknown",
      lunchStatus: "Working",
      lastUpdated: timestamp,
    });

    // Create or update today's report in Firestore
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    await setDoc(
      reportRef,
      {
        [today]: {
          date: today,
          checkInTime,
          location: location || "Unknown",
          totalHoursWorked: 0,
          totalLunchMinutes: 0,
          name,
        },
      },
      { merge: true }
    );

    const timeStatus = checkTime(checkInTime);

    res
      .status(200)
      .json({ message: "Check-in successful", checkInTime, timeStatus });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Failed to check in" });
  }
};

export const lunchStart = async (req, res) => {
  try {
    const { traineeId, lunchStartTime } = req.body;
    // const lunchStartTime = formatTime();

    if (!traineeId || !lunchStartTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update Realtime Database
    await update(ref(rtdb, `liveTracking/${traineeId}`), {
      lunchStatus: "At Lunch",
      lunchStartTime,
      lastUpdated: Date.now(),
    });

    // Update today's report in Firestore
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    await updateDoc(reportRef, {
      [`${today}.lunchStartTime`]: lunchStartTime,
    });

    res.status(200).json({ message: "Lunch start recorded", lunchStartTime });
  } catch (error) {
    console.error("Lunch start error:", error);
    res.status(500).json({ error: "Failed to record lunch start" });
  }
};

export const lunchEnd = async (req, res) => {
  try {
    const { traineeId, lunchEndTime } = req.body;
    // const lunchEndTime = formatTime();

    if (!traineeId || !lunchEndTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    await updateDoc(reportRef, {
      [`${today}.lunchEndTime`]: lunchEndTime,
      [`${today}.totalLunchMinutes`]: lunchDurationMinutes,
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
    const { traineeId, checkOutTime } = req.body;
    // const checkOutTime = formatTime();

    if (!traineeId || !checkOutTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get current data from Realtime Database
    const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const rtdbData = rtdbSnapshot.val();

    if (!rtdbData?.checkInTime) {
      throw new Error("No check-in time found");
    }

    // Calculate total hours worked
    const checkInTime = new Date(`2000/01/01 ${rtdbData.checkInTime}`);
    const checkOut = new Date(`2000/01/01 ${checkOutTime}`);
    let totalMinutes = Math.round((checkOut - checkInTime) / (1000 * 60));

    // Get today's report document
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    const reportDoc = await getDoc(reportRef);
    const todayData = reportDoc.data()?.[today] || {};

    // Subtract lunch time if applicable
    const totalLunchMinutes = todayData.totalLunchMinutes || 0;
    const totalHours = ((totalMinutes - totalLunchMinutes) / 60).toFixed(2);

    // Update Firestore report
    await updateDoc(reportRef, {
      [`${today}.checkOutTime`]: checkOutTime,
      [`${today}.totalHoursWorked`]: parseFloat(totalHours),
    });

    // Remove from Realtime Database
    await set(ref(rtdb, `liveTracking/${traineeId}`), null);

    res.status(200).json({
      message: "Check-out successful",
      checkOutTime,
      totalHoursWorked: totalHours,
      totalLunchMinutes,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ error: "Failed to check out" });
  }
};

export const traineeStatus = async (req, res) => {
  try {
    const { traineeId } = req.body;
    const snapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const status = snapshot.val();

    res.status(200).json(status || { message: "Not checked in" });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
};
export const getTraineesByLocation = async (req, res) => {
  try {
    const { location } = req.body;

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

    res.status(200).json(traineesAtLocation);
  } catch (error) {
    console.error("Error fetching trainees by location:", error);
    res.status(500).json({ error: "Failed to fetch trainees by location" });
  }
};