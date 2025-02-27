// import {
//   collection,
//   doc,
//   setDoc,
//   getDoc,
//   query,
//   where,
//   getDocs,
//   updateDoc,
// } from "firebase/firestore";
// import { ref, set, get, update } from "firebase/database";
// import { db, rtdb } from "../config/firebaseConfig.js";

// export const formatTime = () => {
//   return new Date().toLocaleTimeString("en-US", {
//     timeZone: "Africa/Johannesburg",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const checkTime = (checkInTime) => {
//   const [hours, minutes] = checkInTime.split(":").map(Number);
//   const totalMinutes = hours * 60 + minutes;

//   if (totalMinutes < 480) {
//     return "Early";
//   } else if (totalMinutes >= 481 && totalMinutes <= 490) {
//     return "Within grace period";
//   } else if (totalMinutes > 496) {
//     return "Late";
//   } else {
//     return "On time";
//   }
// };

// const getTodayReportDoc = async (traineeId) => {
//   const today = new Date().toISOString().split("T")[0];
//   const reportRef = doc(db, `reports/${traineeId}`);
//   const reportDoc = await getDoc(reportRef);

//   if (!reportDoc.exists()) {
//     // Initialize the document if it doesn't exist
//     await setDoc(reportRef, {}, { merge: true });
//   }

//   return { ref: reportRef, today };
// };

// export const checkIn = async (req, res) => {
//   try {
//     const { traineeId, name, checkInTime, location } = req.body;

//     console.log("Received Check-in Data:", { traineeId, name, checkInTime, location });

//     // Validate Required Fields
//     if (!traineeId || !name || !checkInTime) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const timestamp = Date.now();

//     // Update Realtime Database
//     await set(ref(rtdb, `liveTracking/${traineeId}`), {
//       name,
//       checkInTime,
//       location: location || "Unknown",
//       lunchStatus: "Working",
//       lastUpdated: timestamp,
//     });

//     // Create or update today's report in Firestore
//     const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
//     await setDoc(
//       reportRef,
//       {
//         [today]: {
//           date: today,
//           checkInTime,
//           location: location || "Unknown",
//           totalHoursWorked: 0,
//           totalLunchMinutes: 0,
//           name,
//         },
//       },
//       { merge: true }
//     );

//     const timeStatus = checkTime(checkInTime);

//     res.status(200).json({ message: "Check-in successful", checkInTime, timeStatus });
//   } catch (error) {
//     console.error("Check-in error:", error);
//     res.status(500).json({ error: "Failed to check in" });
//   }
// };


// export const lunchStart = async (req, res) => {
//   try {
//     const { traineeId } = req.body;
//     const lunchStartTime = formatTime();

//     // Update Realtime Database
//     await update(ref(rtdb, `liveTracking/${traineeId}`), {
//       lunchStatus: "At Lunch",
//       lunchStartTime,
//       lastUpdated: Date.now(),
//     });

//     // Update today's report in Firestore
//     const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
//     await updateDoc(reportRef, {
//       [`${today}.lunchStartTime`]: lunchStartTime,
//     });

//     res.status(200).json({ message: "Lunch start recorded", lunchStartTime });
//   } catch (error) {
//     console.error("Lunch start error:", error);
//     res.status(500).json({ error: "Failed to record lunch start" });
//   }
// };

// export const lunchEnd = async (req, res) => {
//   try {
//     const { traineeId } = req.body;
//     const lunchEndTime = formatTime();

//     // Get current lunch start time from Realtime Database
//     const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
//     const rtdbData = rtdbSnapshot.val();

//     if (!rtdbData?.lunchStartTime) {
//       throw new Error("No lunch start time found");
//     }

//     // Calculate lunch duration in minutes
//     const lunchStart = new Date(`2000/01/01 ${rtdbData.lunchStartTime}`);
//     const lunchEnd = new Date(`2000/01/01 ${lunchEndTime}`);
//     const lunchDurationMinutes = Math.round(
//       (lunchEnd - lunchStart) / (1000 * 60)
//     );

//     // Update Realtime Database
//     await update(ref(rtdb, `liveTracking/${traineeId}`), {
//       lunchStatus: "Working",
//       lunchEndTime,
//       lastUpdated: Date.now(),
//     });

//     // Update today's report in Firestore
//     const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
//     await updateDoc(reportRef, {
//       [`${today}.lunchEndTime`]: lunchEndTime,
//       [`${today}.totalLunchMinutes`]: lunchDurationMinutes,
//     });

//     res.status(200).json({
//       message: "Lunch end recorded",
//       lunchEndTime,
//       lunchDurationMinutes,
//     });
//   } catch (error) {
//     console.error("Lunch end error:", error);
//     res.status(500).json({ error: "Failed to record lunch end" });
//   }
// };

// export const checkOut = async (req, res) => {
//   try {
//     const { traineeId } = req.body;
//     const checkOutTime = formatTime();

//     // Get current data from Realtime Database
//     const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
//     const rtdbData = rtdbSnapshot.val();

//     if (!rtdbData?.checkInTime) {
//       throw new Error("No check-in time found");
//     }

//     // Calculate total hours worked
//     const checkInTime = new Date(`2000/01/01 ${rtdbData.checkInTime}`);
//     const checkOut = new Date(`2000/01/01 ${checkOutTime}`);
//     let totalMinutes = Math.round((checkOut - checkInTime) / (1000 * 60));

//     // Get today's report document
//     const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
//     const reportDoc = await getDoc(reportRef);
//     const todayData = reportDoc.data()?.[today] || {};

//     // Subtract lunch time if applicable
//     const totalLunchMinutes = todayData.totalLunchMinutes || 0;
//     const totalHours = ((totalMinutes - totalLunchMinutes) / 60).toFixed(2);

//     // Update Firestore report
//     await updateDoc(reportRef, {
//       [`${today}.checkOutTime`]: checkOutTime,
//       [`${today}.totalHoursWorked`]: parseFloat(totalHours),
//     });

//     // Remove from Realtime Database
//     await set(ref(rtdb, `liveTracking/${traineeId}`), null);

//     res.status(200).json({
//       message: "Check-out successful",
//       checkOutTime,
//       totalHoursWorked: totalHours,
//       totalLunchMinutes,
//     });
//   } catch (error) {
//     console.error("Check-out error:", error);
//     res.status(500).json({ error: "Failed to check out" });
//   }
// };

// export const traineeStatus = async (req, res) => {
//   try {
//     const { traineeId } = req.body;
//     const snapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
//     const status = snapshot.val();

//     res.status(200).json(status || { message: "Not checked in" });
//   } catch (error) {
//     console.error("Status check error:", error);
//     res.status(500).json({ error: "Failed to get status" });
//   }
// };

import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { ref, set, get, update } from "firebase/database";
import { db, rtdb } from "../config/firebaseConfig.js";
import axios from "axios";

// Utility functions
export const formatTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDate = () => {
  return new Date().toLocaleDateString("en-ZA", {
    timeZone: "Africa/Johannesburg",
  });
};

// Check if the given date is a working day in South Africa
const isWorkingDay = async (date) => {
  // Format as YYYY-MM-DD
  const formattedDate = date instanceof Date 
    ? date.toISOString().split("T")[0] 
    : new Date(date).toISOString().split("T")[0];
  
  const dayOfWeek = new Date(formattedDate).getDay();
  
  // Weekend check (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Check if it's a holiday using Nager.Date API
  try {
    const year = formattedDate.split("-")[0];

    const response = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/ZA`);
    
    const holidays = response.data;
    const isHoliday = holidays.some(holiday => holiday.date === formattedDate);
    
    return !isHoliday;
  } catch (error) {
    console.error("Error checking holidays:", error);
    // If API fails, assume it's a working day if it's not a weekend
    return true;
  }
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

// Controller functions
export const checkIn = async (req, res) => {
  try {
    const { traineeId, name, checkInTime, location } = req.body;

    console.log("Received Check-in Data:", { traineeId, name, checkInTime, location });

    // Validate Required Fields
    if (!traineeId || !name || !checkInTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const timestamp = Date.now();
    const today = new Date().toISOString().split("T")[0];
    
    // Check if today is a working day
    const workingDay = await isWorkingDay(today);
    if (!workingDay) {
      return res.status(200).json({ 
        message: "Check-in recorded, but today is not a working day", 
        isWorkingDay: false 
      });
    }

    // Update Realtime Database
    await set(ref(rtdb, `liveTracking/${traineeId}`), {
      name,
      checkInTime,
      location: location || "Unknown",
      lunchStatus: "Working",
      lastUpdated: timestamp,
      currentDate: today,
    });

    // Create or update today's report in Firestore
    const { ref: reportRef, today: reportDate } = await getTodayReportDoc(traineeId);
    const timeStatus = checkTime(checkInTime);
    
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
          status: timeStatus,
          isWorkingDay: true,
        },
      },
      { merge: true }
    );

    res.status(200).json({ 
      message: "Check-in successful", 
      checkInTime, 
      timeStatus,
      isWorkingDay: true 
    });
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
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    await updateDoc(reportRef, {
      [`${today}.lunchStartTime`]: lunchStartTime,
    });

    // Calculate real-time worked hours before lunch
    const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const rtdbData = rtdbSnapshot.val();

    if (rtdbData?.checkInTime) {
      const checkInTime = new Date(`2000/01/01 ${rtdbData.checkInTime}`);
      const lunchStart = new Date(`2000/01/01 ${lunchStartTime}`);
      const minutesWorkedBeforeLunch = Math.round((lunchStart - checkInTime) / (1000 * 60));
      
      // Update real-time hours worked
      await update(ref(rtdb, `liveTracking/${traineeId}`), {
        currentHoursWorked: (minutesWorkedBeforeLunch / 60).toFixed(2),
      });
    }

    res.status(200).json({ 
      message: "Lunch start recorded", 
      lunchStartTime 
    });
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
    const lunchDurationMinutes = Math.round((lunchEnd - lunchStart) / (1000 * 60));

    // Update current total lunch minutes
    const currentTotalLunch = (rtdbData.totalLunchMinutes || 0) + lunchDurationMinutes;

    // Update Realtime Database
    await update(ref(rtdb, `liveTracking/${traineeId}`), {
      lunchStatus: "Working",
      lunchEndTime,
      lastUpdated: Date.now(),
      totalLunchMinutes: currentTotalLunch,
    });

    // Update today's report in Firestore
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    
    // Get current total lunch minutes from Firestore
    const reportDoc = await getDoc(reportRef);
    const todayData = reportDoc.data()?.[today] || {};
    const previousLunchMinutes = todayData.totalLunchMinutes || 0;
    
    await updateDoc(reportRef, {
      [`${today}.lunchEndTime`]: lunchEndTime,
      [`${today}.totalLunchMinutes`]: previousLunchMinutes + lunchDurationMinutes,
    });

    // Calculate and update real-time hours worked
    if (rtdbData?.checkInTime) {
      const checkInTime = new Date(`2000/01/01 ${rtdbData.checkInTime}`);
      const now = new Date(`2000/01/01 ${lunchEndTime}`);
      const totalMinutesElapsed = Math.round((now - checkInTime) / (1000 * 60));
      const hoursWorked = ((totalMinutesElapsed - currentTotalLunch) / 60).toFixed(2);
      
      await update(ref(rtdb, `liveTracking/${traineeId}`), {
        currentHoursWorked: hoursWorked,
      });
    }

    res.status(200).json({
      message: "Lunch end recorded",
      lunchEndTime,
      lunchDurationMinutes,
      totalLunchMinutes: currentTotalLunch,
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
    const totalLunchMinutes = rtdbData.totalLunchMinutes || todayData.totalLunchMinutes || 0;
    const totalHours = ((totalMinutes - totalLunchMinutes) / 60).toFixed(2);

    // Update Firestore report
    await updateDoc(reportRef, {
      [`${today}.checkOutTime`]: checkOutTime,
      [`${today}.totalHoursWorked`]: parseFloat(totalHours),
      [`${today}.totalLunchMinutes`]: totalLunchMinutes,
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
    const traineeId = req.params.id;
    const snapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const status = snapshot.val();

    if (status) {
      // Calculate real-time hours if checked in
      if (status.checkInTime) {
        const checkInTime = new Date(`2000/01/01 ${status.checkInTime}`);
        const now = new Date(`2000/01/01 ${formatTime()}`);
        const totalMinutesElapsed = Math.round((now - checkInTime) / (1000 * 60));
        const totalLunchMinutes = status.totalLunchMinutes || 0;
        const currentHoursWorked = ((totalMinutesElapsed - totalLunchMinutes) / 60).toFixed(2);
        
        status.currentHoursWorked = currentHoursWorked;
      }
      
      res.status(200).json(status);
    } else {
      res.status(200).json({ message: "Not checked in" });
    }
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
};

// New controllers for the enhanced features
export const recordAbsenteeism = async (req, res) => {
  try {
    const { date } = req.body;
    const checkDate = date || new Date().toISOString().split("T")[0];
    
    // Only proceed if it's a working day
    const workingDay = await isWorkingDay(checkDate);
    if (!workingDay) {
      return res.status(200).json({ 
        message: "No absenteeism recorded as this is not a working day",
        date: checkDate,
        isWorkingDay: false
      });
    }
    
    // Get all trainees
    const traineesQuery = query(collection(db, "trainees"));
    const traineesSnapshot = await getDocs(traineesQuery);
    
    const absentees = [];
    const promises = [];
    
    traineesSnapshot.forEach((traineeDoc) => {
      const trainee = { id: traineeDoc.id, ...traineeDoc.data() };
      
      // For each trainee, check if they have a report for today
      const checkPromise = (async () => {
        const reportRef = doc(db, `reports/${trainee.id}`);
        const reportDoc = await getDoc(reportRef);
        
        // If no report exists or no entry for today, mark as absent
        if (!reportDoc.exists() || !reportDoc.data()?.[checkDate]) {
          absentees.push(trainee);
          
          // Record the absence
          await setDoc(
            reportRef,
            {
              [checkDate]: {
                date: checkDate,
                name: trainee.name,
                status: "Absent",
                isWorkingDay: true,
                totalHoursWorked: 0,
                totalLunchMinutes: 0,
              },
            },
            { merge: true }
          );
          
          // Also record in a separate absenteeism collection
          await addDoc(collection(db, "absenteeism"), {
            traineeId: trainee.id,
            name: trainee.name,
            date: checkDate,
            reason: "Unrecorded",
            timestamp: Date.now(),
          });
        }
      })();
      
      promises.push(checkPromise);
    });
    
    await Promise.all(promises);
    
    res.status(200).json({
      message: "Absenteeism recorded successfully",
      date: checkDate,
      absenteesCount: absentees.length,
      absentees: absentees.map(a => ({ id: a.id, name: a.name })),
    });
  } catch (error) {
    console.error("Absenteeism recording error:", error);
    res.status(500).json({ error: "Failed to record absenteeism" });
  }
};

export const getTraineeHistory = async (req, res) => {
  try {
    const { traineeId, startDate, endDate } = req.query;
    
    if (!traineeId) {
      return res.status(400).json({ error: "Trainee ID is required" });
    }
    
    // Define date range
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - 30); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    const reportRef = doc(db, `reports/${traineeId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return res.status(404).json({ error: "No records found for this trainee" });
    }
    
    const reportData = reportDoc.data();
    const history = [];
    
    // Convert date strings to Date objects for comparison
    const startDateStr = start.toISOString().split("T")[0];
    const endDateStr = end.toISOString().split("T")[0];
    
    // Filter and collect reports within date range
    for (const [date, data] of Object.entries(reportData)) {
      if (date >= startDateStr && date <= endDateStr) {
        history.push({
          date,
          ...data,
        });
      }
    }
    
    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate summary statistics
    const summary = {
      totalDays: history.length,
      workingDays: history.filter(day => day.isWorkingDay).length,
      presentDays: history.filter(day => day.checkInTime && day.isWorkingDay).length,
      absentDays: history.filter(day => day.status === "Absent" && day.isWorkingDay).length,
      lateDays: history.filter(day => day.status === "Late" && day.isWorkingDay).length,
      totalHoursWorked: history.reduce((sum, day) => sum + (day.totalHoursWorked || 0), 0).toFixed(2),
      averageDailyHours: (history.reduce((sum, day) => sum + (day.totalHoursWorked || 0), 0) / 
                          Math.max(1, history.filter(day => day.checkInTime && day.isWorkingDay).length)).toFixed(2),
      averageLunchMinutes: (history.reduce((sum, day) => sum + (day.totalLunchMinutes || 0), 0) / 
                           Math.max(1, history.filter(day => day.lunchStartTime && day.isWorkingDay).length)).toFixed(0),
    };
    
    res.status(200).json({
      traineeId,
      summary,
      history,
    });
  } catch (error) {
    console.error("History retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve history" });
  }
};

//get a specific trainee's report
export const getTraineeDailyReport = async (req, res) => {
  try {
    const { traineeId } = req.params;
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];
    
    // Validate input
    if (!traineeId) {
      return res.status(400).json({ error: "Trainee ID is required" });
    }
    
    // Check if it's a working day
    const workingDay = await isWorkingDay(reportDate);
    
    // Get trainee details to verify existence and get name
    const traineeRef = doc(db, `trainees/${traineeId}`);
    const traineeDoc = await getDoc(traineeRef);
    
    if (!traineeDoc.exists()) {
      return res.status(404).json({ error: "Trainee not found" });
    }
    
    const traineeName = traineeDoc.data().name;
    
    // Get the trainee's report for the specified date
    const reportRef = doc(db, `reports/${traineeId}`);
    const reportDoc = await getDoc(reportRef);
    
    // Check if report exists for the date
    if (reportDoc.exists() && reportDoc.data()?.[reportDate]) {
      const traineeDailyData = reportDoc.data()[reportDate];
      
      res.status(200).json({
        traineeId,
        name: traineeName,
        date: reportDate,
        isWorkingDay: workingDay,
        report: traineeDailyData
      });
    } else if (workingDay) {
      // If it's a working day but no report, consider absent
      res.status(200).json({
        traineeId,
        name: traineeName,
        date: reportDate,
        isWorkingDay: workingDay,
        report: {
          date: reportDate,
          status: "Absent",
          isWorkingDay: true,
          totalHoursWorked: 0,
          totalLunchMinutes: 0,
        }
      });
    } else {
      // Not a working day
      res.status(200).json({
        traineeId,
        name: traineeName,
        date: reportDate,
        isWorkingDay: false,
        report: {
          date: reportDate,
          status: "Non-working day",
          isWorkingDay: false,
        }
      });
    }
  } catch (error) {
    console.error("Trainee daily report error:", error);
    res.status(500).json({ error: "Failed to retrieve trainee daily report" });
  }
};

//get all the trainee's reports, you can filter with the date
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];
    
    // Check if it's a working day
    const workingDay = await isWorkingDay(reportDate);
    
    // Get all trainees
    const traineesQuery = query(collection(db, "trainees"));
    const traineesSnapshot = await getDocs(traineesQuery);
    
    const reports = [];
    const promises = [];
    
    traineesSnapshot.forEach((traineeDoc) => {
      const trainee = { id: traineeDoc.id, ...traineeDoc.data() };
      
      // For each trainee, get their report for the specified date
      const checkPromise = (async () => {
        const reportRef = doc(db, `reports/${trainee.id}`);
        const reportDoc = await getDoc(reportRef);
        
        if (reportDoc.exists() && reportDoc.data()?.[reportDate]) {
          reports.push({
            traineeId: trainee.id,
            name: trainee.name,
            ...reportDoc.data()[reportDate],
          });
        } else if (workingDay) {
          // If it's a working day but no report, consider absent
          reports.push({
            traineeId: trainee.id,
            name: trainee.name,
            date: reportDate,
            status: "Absent",
            isWorkingDay: true,
            totalHoursWorked: 0,
            totalLunchMinutes: 0,
          });
        }
      })();
      
      promises.push(checkPromise);
    });
    
    await Promise.all(promises);
    
    // Summary statistics
    const summary = {
      date: reportDate,
      isWorkingDay: workingDay,
      totalTrainees: reports.length,
      presentCount: reports.filter(r => r.checkInTime).length,
      absentCount: reports.filter(r => !r.checkInTime).length,
      lateCount: reports.filter(r => r.status === "Late").length,
      totalHoursWorked: reports.reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0).toFixed(2),
      averageHoursWorked: (reports.reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0) / 
                          Math.max(1, reports.filter(r => r.checkInTime).length)).toFixed(2),
    };
    
    res.status(200).json({
      summary,
      reports,
    });
  } catch (error) {
    console.error("Daily report error:", error);
    res.status(500).json({ error: "Failed to generate daily report" });
  }
};

export const getWeeklyStats = async (req, res) => {
  try {
    const { traineeId, weekStart, weekNumber, year } = req.query;
    
    if (!traineeId) {
      return res.status(400).json({ error: "Trainee ID is required" });
    }
    
    // Define date range for the specified week
    let startDate, endDate;
    
    if (weekStart) {
      // If a specific start date is provided, use it and calculate the end date (6 days later)
      startDate = new Date(weekStart);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    } else if (weekNumber && year) {
      // Calculate the start date based on week number and year
      // Week 1 is the first week with a Thursday in January
      // https://en.wikipedia.org/wiki/ISO_week_date
      const parsedYear = parseInt(year);
      const parsedWeek = parseInt(weekNumber);
      
      // Find January 4th for the given year (guaranteed to be in week 1)
      const jan4th = new Date(parsedYear, 0, 4);
      // Find the Monday of the week containing January 4th
      const firstMonday = new Date(jan4th);
      const dayOfWeek = jan4th.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday being 0
      firstMonday.setDate(jan4th.getDate() + diff);
      
      // Calculate the Monday of the requested week
      startDate = new Date(firstMonday);
      startDate.setDate(firstMonday.getDate() + (parsedWeek - 1) * 7);
      
      // Calculate the Sunday of the requested week
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Default to current week (Monday to Sunday)
      const currentDate = new Date();
      startDate = new Date(currentDate);
      const day = startDate.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Adjust for Sunday being 0
      startDate.setDate(startDate.getDate() + diff);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }
    
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    
    // Get trainee info
    const traineeRef = doc(db, `trainees/${traineeId}`);
    const traineeDoc = await getDoc(traineeRef);
    
    if (!traineeDoc.exists()) {
      return res.status(404).json({ error: "Trainee not found" });
    }
    
    const traineeName = traineeDoc.data().name;
    
    // Get trainee's report document
    const reportRef = doc(db, `reports/${traineeId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return res.status(404).json({ error: "No records found for this trainee" });
    }
    
    const reportData = reportDoc.data();
    const weeklyData = [];
    
    // Calculate all working days in the week
    const workingDaysInWeek = [];
    let currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      const dateStr = currentDay.toISOString().split("T")[0];
      const isWorkDay = await isWorkingDay(dateStr);
      
      if (isWorkDay) {
        workingDaysInWeek.push(dateStr);
      }
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    // Filter and collect reports within date range
    for (const [date, data] of Object.entries(reportData)) {
      if (date >= startDateStr && date <= endDateStr) {
        weeklyData.push({
          date,
          ...data,
        });
      }
    }
    
    // Count attended days (days with check in)
    const attendedDays = weeklyData.filter(day => day.checkInTime && day.isWorkingDay);
    
    // Calculate absent days (working days without attendance)
    const absentDays = workingDaysInWeek.filter(date => 
      !weeklyData.some(day => day.date === date && day.checkInTime)
    );
    
    // Calculate total working hours
    const totalWorkingHours = attendedDays.reduce(
      (sum, day) => sum + (parseFloat(day.totalHoursWorked) || 0),
      0
    );
    
    // Calculate total lunch hours
    const totalLunchMinutes = attendedDays.reduce(
      (sum, day) => sum + (parseInt(day.totalLunchMinutes) || 0),
      0
    );
    const totalLunchHours = (totalLunchMinutes / 60).toFixed(2);
    
    // Calculate late days
    const lateDays = attendedDays.filter(day => day.status === "Late").length;
    
    // Daily breakdown
    const dailyBreakdown = workingDaysInWeek.map(dateStr => {
      const dayData = weeklyData.find(day => day.date === dateStr);
      const dayOfWeek = new Date(dateStr).toLocaleString('default', { weekday: 'long' });
      
      if (dayData && dayData.checkInTime) {
        // Day attended
        return {
          date: dateStr,
          dayOfWeek,
          attended: true,
          checkInTime: dayData.checkInTime,
          checkOutTime: dayData.checkOutTime || "N/A",
          hoursWorked: parseFloat(dayData.totalHoursWorked || 0).toFixed(2),
          lunchMinutes: dayData.totalLunchMinutes || 0,
          status: dayData.status || "N/A"
        };
      } else {
        // Day absent or no data
        return {
          date: dateStr,
          dayOfWeek,
          attended: false,
          status: "Absent"
        };
      }
    });
    
    // Get week number for the result
    const weekNum = getWeekNumber(startDate);
    
    // Weekly statistics summary
    const weeklyStats = {
      traineeId,
      traineeName,
      weekNumber: weekNum,
      year: startDate.getFullYear(),
      startDate: startDateStr,
      endDate: endDateStr,
      workingDaysInWeek: workingDaysInWeek.length,
      attendedDays: attendedDays.length,
      absentDays: absentDays.length,
      lateDays,
      attendanceRate: ((attendedDays.length / Math.max(1, workingDaysInWeek.length)) * 100).toFixed(2) + "%",
      totalWorkingHours: totalWorkingHours.toFixed(2),
      averageDailyHours: (totalWorkingHours / Math.max(1, attendedDays.length)).toFixed(2),
      totalLunchMinutes,
      totalLunchHours,
      averageLunchMinutes: (totalLunchMinutes / Math.max(1, attendedDays.length)).toFixed(0),
    };
    
    res.status(200).json({
      weeklyStats,
      dailyBreakdown,
      workingDays: workingDaysInWeek,
      absentDays
    });
  } catch (error) {
    console.error("Weekly stats error:", error);
    res.status(500).json({ error: "Failed to retrieve weekly statistics" });
  }
};

// Helper function to get ISO week number
function getWeekNumber(date) {
  const target = new Date(date);
  const dayNumber = (target.getDay() + 6) % 7; // Adjust so that Monday is 0
  target.setDate(target.getDate() - dayNumber + 3); // Nearest Thursday
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

//get the total days, hours for lunch and for working as well as the number of times you've been absent monthly
export const getMonthlyStats = async (req, res) => {
  try {
    const { traineeId, month, year } = req.query;
    
    if (!traineeId) {
      return res.status(400).json({ error: "Trainee ID is required" });
    }
    
    // Define date range for the specified month
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth(); // JS months are 0-indexed
    
    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    
    const firstDayStr = firstDay.toISOString().split("T")[0];
    const lastDayStr = lastDay.toISOString().split("T")[0];
    
    // Get trainee's report document
    const reportRef = doc(db, `reports/${traineeId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return res.status(404).json({ error: "No records found for this trainee" });
    }
    
    const reportData = reportDoc.data();
    const monthlyData = [];
    
    // Get trainee name
    const traineeRef = doc(db, `trainees/${traineeId}`);
    const traineeDoc = await getDoc(traineeRef);
    const traineeName = traineeDoc.exists() ? traineeDoc.data().name : "Unknown";
    
    // Calculate working days in the month
    const workingDaysInMonth = [];
    let currentDay = new Date(firstDay);
    
    while (currentDay <= lastDay) {
      const dateStr = currentDay.toISOString().split("T")[0];
      const isWorkDay = await isWorkingDay(dateStr);
      
      if (isWorkDay) {
        workingDaysInMonth.push(dateStr);
      }
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    // Filter and collect reports within date range
    for (const [date, data] of Object.entries(reportData)) {
      if (date >= firstDayStr && date <= lastDayStr) {
        monthlyData.push({
          date,
          ...data,
        });
      }
    }
    
    // Count attended days (days with check in)
    const attendedDays = monthlyData.filter(day => day.checkInTime && day.isWorkingDay);
    
    // Calculate absent days (working days without attendance)
    const absentDays = workingDaysInMonth.filter(date => 
      !monthlyData.some(day => day.date === date && day.checkInTime)
    );
    
    // Calculate total working hours
    const totalWorkingHours = attendedDays.reduce(
      (sum, day) => sum + (parseFloat(day.totalHoursWorked) || 0),
      0
    );
    
    // Calculate total lunch hours
    const totalLunchMinutes = attendedDays.reduce(
      (sum, day) => sum + (parseInt(day.totalLunchMinutes) || 0),
      0
    );
    const totalLunchHours = (totalLunchMinutes / 60).toFixed(2);
    
    // Calculate late days
    const lateDays = attendedDays.filter(day => day.status === "Late").length;
    
    // Monthly statistics summary
    const monthlyStats = {
      traineeId,
      traineeName,
      year: targetYear,
      month: targetMonth + 1,
      monthName: new Date(targetYear, targetMonth, 1).toLocaleString('default', { month: 'long' }),
      workingDaysInMonth: workingDaysInMonth.length,
      attendedDays: attendedDays.length,
      absentDays: absentDays.length,
      lateDays,
      attendanceRate: ((attendedDays.length / workingDaysInMonth.length) * 100).toFixed(2) + "%",
      totalWorkingHours: totalWorkingHours.toFixed(2),
      averageDailyHours: (totalWorkingHours / Math.max(1, attendedDays.length)).toFixed(2),
      totalLunchMinutes,
      totalLunchHours,
      averageLunchMinutes: (totalLunchMinutes / Math.max(1, attendedDays.length)).toFixed(0),
    };
    
    res.status(200).json({
      monthlyStats,
      attendedDates: attendedDays.map(day => ({ 
        date: day.date, 
        checkInTime: day.checkInTime,
        checkOutTime: day.checkOutTime,
        hoursWorked: day.totalHoursWorked,
        lunchMinutes: day.totalLunchMinutes || 0,
        status: day.status
      })),
      absentDates: absentDays
    });
  } catch (error) {
    console.error("Monthly stats error:", error);
    res.status(500).json({ error: "Failed to retrieve monthly statistics" });
  }
};

//get the total days, hours for lunch and for working as well as the number of times you've been absent for the duration of the program
export const getProgramStats = async (req, res) => {
  try {
    const { traineeId, startDate, endDate } = req.query;
    
    if (!traineeId) {
      return res.status(400).json({ error: "Trainee ID is required" });
    }
    
    // Get trainee info
    const traineeRef = doc(db, `trainees/${traineeId}`);
    const traineeDoc = await getDoc(traineeRef);
    
    if (!traineeDoc.exists()) {
      return res.status(404).json({ error: "Trainee not found" });
    }
    
    const traineeData = traineeDoc.data();
    
    // Define program date range
    // If specific dates are provided, use them; otherwise, use trainee's program dates or default to last 9 months
    let programStart, programEnd;
    
    if (startDate) {
      programStart = new Date(startDate);
    } else if (traineeData.programStartDate) {
      programStart = new Date(traineeData.programStartDate);
    } else {
      // Default to 9 months ago
      programStart = new Date();
      programStart.setMonth(programStart.getMonth() - 9);
    }
    
    if (endDate) {
      programEnd = new Date(endDate);
    } else if (traineeData.programEndDate) {
      programEnd = new Date(traineeData.programEndDate); 
    } else {
      // Default to today
      programEnd = new Date();
    }
    
    const startDateStr = programStart.toISOString().split("T")[0];
    const endDateStr = programEnd.toISOString().split("T")[0];
    
    // Get trainee's report document
    const reportRef = doc(db, `reports/${traineeId}`);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return res.status(404).json({ error: "No records found for this trainee" });
    }
    
    const reportData = reportDoc.data();
    const programData = [];
    
    // Calculate all working days in the program period
    const workingDaysInProgram = [];
    let currentDay = new Date(programStart);
    
    while (currentDay <= programEnd) {
      const dateStr = currentDay.toISOString().split("T")[0];
      const isWorkDay = await isWorkingDay(dateStr);
      
      if (isWorkDay) {
        workingDaysInProgram.push(dateStr);
      }
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    // Filter and collect reports within date range
    for (const [date, data] of Object.entries(reportData)) {
      if (date >= startDateStr && date <= endDateStr) {
        programData.push({
          date,
          ...data,
        });
      }
    }
    
    // Count attended days (days with check in)
    const attendedDays = programData.filter(day => day.checkInTime && day.isWorkingDay);
    
    // Calculate absent days (working days without attendance)
    const absentDays = workingDaysInProgram.filter(date => 
      !programData.some(day => day.date === date && day.checkInTime)
    );
    
    // Calculate total working hours
    const totalWorkingHours = attendedDays.reduce(
      (sum, day) => sum + (parseFloat(day.totalHoursWorked) || 0),
      0
    );
    
    // Calculate total lunch hours
    const totalLunchMinutes = attendedDays.reduce(
      (sum, day) => sum + (parseInt(day.totalLunchMinutes) || 0),
      0
    );
    const totalLunchHours = (totalLunchMinutes / 60).toFixed(2);
    
    // Calculate late days
    const lateDays = attendedDays.filter(day => day.status === "Late").length;
    
    // Group data by month for monthly breakdown
    const monthlyBreakdown = {};
    
    attendedDays.forEach(day => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = {
          monthName,
          daysAttended: 0,
          hoursWorked: 0,
          lunchMinutes: 0,
          lateDays: 0
        };
      }
      
      monthlyBreakdown[monthKey].daysAttended++;
      monthlyBreakdown[monthKey].hoursWorked += parseFloat(day.totalHoursWorked || 0);
      monthlyBreakdown[monthKey].lunchMinutes += parseInt(day.totalLunchMinutes || 0);
      
      if (day.status === "Late") {
        monthlyBreakdown[monthKey].lateDays++;
      }
    });
    
    // Convert to array and sort by month
    const monthlyStats = Object.entries(monthlyBreakdown).map(([key, data]) => ({
      month: key,
      ...data,
      hoursWorked: parseFloat(data.hoursWorked.toFixed(2)),
      lunchHours: parseFloat((data.lunchMinutes / 60).toFixed(2))
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    // Program statistics summary
    const programStats = {
      traineeId,
      traineeName: traineeData.name,
      programStartDate: startDateStr,
      programEndDate: endDateStr,
      programDuration: Math.ceil((programEnd - programStart) / (1000 * 60 * 60 * 24)) + " days",
      workingDaysInProgram: workingDaysInProgram.length,
      attendedDays: attendedDays.length,
      absentDays: absentDays.length,
      lateDays,
      attendanceRate: ((attendedDays.length / workingDaysInProgram.length) * 100).toFixed(2) + "%",
      totalWorkingHours: totalWorkingHours.toFixed(2),
      averageDailyHours: (totalWorkingHours / Math.max(1, attendedDays.length)).toFixed(2),
      totalLunchMinutes,
      totalLunchHours,
      averageLunchMinutes: (totalLunchMinutes / Math.max(1, attendedDays.length)).toFixed(0),
    };
    
    res.status(200).json({
      programStats,
      monthlyBreakdown: monthlyStats,
      attendedDates: attendedDays.map(day => ({ 
        date: day.date, 
        checkInTime: day.checkInTime,
        checkOutTime: day.checkOutTime,
        hoursWorked: day.totalHoursWorked,
        lunchMinutes: day.totalLunchMinutes || 0,
        status: day.status
      })),
      absentDates: absentDays
    });
  } catch (error) {
    console.error("Program stats error:", error);
    res.status(500).json({ error: "Failed to retrieve program statistics" });
  }
};