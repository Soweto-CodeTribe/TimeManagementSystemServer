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

const AUTO_CHECKOUT_TIME = "17:00";

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

export const isWorkingDay = async (date) => {
  // Format as YYYY-MM-DD
  const formattedDate =
    date instanceof Date
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

    const response = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/ZA`
    );

    const holidays = response.data;
    const isHoliday = holidays.some(
      (holiday) => holiday.date === formattedDate
    );

    return !isHoliday;
  } catch (error) {
    console.error("Error checking holidays:", error);
    // If API fails, assume it's a working day if it's not a weekend
    return true;
  }
};

const checkTime = (checkInTime) => {
  if (!checkInTime || !checkInTime.includes(':')) {
    throw new Error(`Invalid time format: ${checkInTime}`);
  }
  
  const [hours, minutes] = checkInTime.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${checkInTime}`);
  }
  
  const totalMinutes = hours * 60 + minutes;
  
  if (totalMinutes < 480) {           
    return "Early";
  } else if (totalMinutes <= 490) {   
    return "Within grace period";
  } else {                            
    return "Late";
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

export const standardizeTimeFormat = (timeStr) => {
  if (!timeStr) return null;

  if (!timeStr.match(/\s?[APap][Mm]$/)) {
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0"
        )}`;
      }
    }
  }

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s?([APap][Mm])/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  let [_, hours, minutes, period] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${timeStr}`);
  }

  if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

export const checkIn = async (req, res) => {
  try {
    const { traineeId, name, checkInTime, location } = req.body;

    if (!traineeId || !name || !checkInTime || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Standardize time format to 24-hour
    const standardizedCheckInTime = standardizeTimeFormat(checkInTime);
    
    // Get time status using the 24-hour format time
    const timeStatus = checkTime(standardizedCheckInTime);
    
    const timestamp = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Check if today is a working day
    const workingDay = await isWorkingDay(today);
    if (!workingDay) {
      return res.status(200).json({
        message: "Check-in recorded, but today is not a working day",
        isWorkingDay: false,
      });
    }

    // Check if trainee already has a record for today in RTDB
    const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const rtdbData = rtdbSnapshot.val();

    if (rtdbData && rtdbData.currentDate === today) {
      return res.status(200).json({
        message: `${rtdbData.name} you have already checked in at ${rtdbData.checkInTime}`,
        checkInTime: rtdbData.checkInTime,
      });
    }

    // Update Realtime Database
    await set(ref(rtdb, `liveTracking/${traineeId}`), {
      name,
      checkInTime: standardizedCheckInTime,
      location: location || "Unknown",
      lunchStatus: "Working",
      lastUpdated: timestamp,
      currentDate: today,
    });

    // Create or update today's report in Firestore
    const { ref: reportRef, today: reportDate } = await getTodayReportDoc(
      traineeId
    );

    // Ensure we have a valid status before saving to Firestore
    if (!timeStatus) {
      throw new Error(`Failed to determine time status for: ${standardizedCheckInTime}`);
    }

    await setDoc(
      reportRef,
      {
        [today]: {
          date: today,
          checkInTime: standardizedCheckInTime,
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
      checkInTime: standardizedCheckInTime,
      timeStatus,
      isWorkingDay: true,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Failed to check in" });
  }
};

export const lunchStart = async (req, res) => {
  try {
    const { traineeId, lunchStartTime } = req.body;

    const standardizedLunchStartTime = standardizeTimeFormat(lunchStartTime);

    const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const rtdbData = rtdbSnapshot.val();

    if (rtdbData && rtdbData.lunchStartTime) {
      return res.status(200).json({
        message: `${rtdbData.name} you have already went to lunch at ${rtdbData.lunchStartTime}`,
        checkInTime: rtdbData.checkInTime,
      });
    }

    if (!traineeId || !standardizedLunchStartTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update Realtime Database
    await update(ref(rtdb, `liveTracking/${traineeId}`), {
      lunchStatus: "At Lunch",
      lunchStartTime: standardizedLunchStartTime,
      lastUpdated: Date.now(),
    });

    // Update today's report in Firestore
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    await updateDoc(reportRef, {
      [`${today}.lunchStartTime`]: standardizedLunchStartTime,
    });

    if (rtdbData?.checkInTime) {
      // Ensure check-in time is in 24-hour format
      const checkInTime24 = standardizeTimeFormat(rtdbData.checkInTime);

      const checkInTime = new Date(`2000/01/01 ${checkInTime24}`);
      const lunchStart = new Date(`2000/01/01 ${standardizedLunchStartTime}`);
      const minutesWorkedBeforeLunch = Math.round(
        (lunchStart - checkInTime) / (1000 * 60)
      );

      // Update real-time hours worked
      await update(ref(rtdb, `liveTracking/${traineeId}`), {
        currentHoursWorked: (minutesWorkedBeforeLunch / 60).toFixed(2),
      });
    }

    res.status(200).json({
      message: "Lunch start recorded",
      lunchStartTime: standardizedLunchStartTime,
    });
  } catch (error) {
    console.error("Lunch start error:", error);
    res.status(500).json({ error: "Failed to record lunch start" });
  }
};

export const lunchEnd = async (req, res) => {
  try {
    const { traineeId, lunchEndTime } = req.body;

    const standardizedLunchEndTime = standardizeTimeFormat(lunchEndTime);

    const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const rtdbData = rtdbSnapshot.val();

    if (rtdbData && rtdbData.lunchEndTime) {
      return res.status(200).json({
        message: `${rtdbData.name} you have already went to lunch and came back at ${rtdbData.lunchEndTime}`,
        checkInTime: rtdbData.checkInTime,
      });
    }

    if (!traineeId || !standardizedLunchEndTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!rtdbData?.lunchStartTime) {
      throw new Error("No lunch start time found");
    }

    const lunchStartTime24 = standardizeTimeFormat(rtdbData.lunchStartTime);

    // Calculate lunch duration in minutes
    const lunchStart = new Date(`2000/01/01 ${lunchStartTime24}`);
    const lunchEnd = new Date(`2000/01/01 ${standardizedLunchEndTime}`);
    const lunchDurationMinutes = Math.round(
      (lunchEnd - lunchStart) / (1000 * 60)
    );

    // Update current total lunch minutes
    const currentTotalLunch =
      (rtdbData.totalLunchMinutes || 0) + lunchDurationMinutes;

    // Update Realtime Database
    await update(ref(rtdb, `liveTracking/${traineeId}`), {
      lunchStatus: "Working",
      lunchEndTime: standardizedLunchEndTime,
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
      [`${today}.lunchEndTime`]: standardizedLunchEndTime,
      [`${today}.totalLunchMinutes`]:
        previousLunchMinutes + lunchDurationMinutes,
    });

    // Calculate and update real-time hours worked
    if (rtdbData?.checkInTime) {
      // Ensure check-in time is in 24-hour format
      const checkInTime24 = standardizeTimeFormat(rtdbData.checkInTime);

      const checkInTime = new Date(`2000/01/01 ${checkInTime24}`);
      const now = new Date(`2000/01/01 ${standardizedLunchEndTime}`);
      const totalMinutesElapsed = Math.round((now - checkInTime) / (1000 * 60));
      const hoursWorked = (
        (totalMinutesElapsed - currentTotalLunch) /
        60
      ).toFixed(2);

      await update(ref(rtdb, `liveTracking/${traineeId}`), {
        currentHoursWorked: hoursWorked,
      });
    }

    res.status(200).json({
      message: "Lunch end recorded",
      lunchEndTime: standardizedLunchEndTime,
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
    const { traineeId, checkOutTime } = req.body;

    if (!traineeId || !checkOutTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const standardizedCheckOutTime = standardizeTimeFormat(checkOutTime);

    // Get current data from Realtime Database
    const rtdbSnapshot = await get(ref(rtdb, `liveTracking/${traineeId}`));
    const rtdbData = rtdbSnapshot.val();

    if (!rtdbData?.checkInTime) {
      throw new Error("No check-in time found");
    }

    const checkInTime24 = standardizeTimeFormat(rtdbData.checkInTime);

    // Parse check-in and check-out times
    const [checkInHours, checkInMinutes] = checkInTime24.split(":").map(Number);
    const [checkOutHours, checkOutMinutes] = standardizedCheckOutTime
      .split(":")
      .map(Number);

    if (
      isNaN(checkInHours) ||
      isNaN(checkInMinutes) ||
      isNaN(checkOutHours) ||
      isNaN(checkOutMinutes)
    ) {
      throw new Error(
        `Invalid time values - Check-in: ${checkInTime24}, Check-out: ${standardizedCheckOutTime}`
      );
    }

    // Convert to total minutes
    const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;
    const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes;

    // Calculate total minutes worked
    let totalMinutes = checkOutTotalMinutes - checkInTotalMinutes;
    if (totalMinutes < 0) {
      // Handle case where checkout is next day (after midnight)
      totalMinutes += 24 * 60; // Add 24 hours worth of minutes
    }

    // Get today's report document
    const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
    const reportDoc = await getDoc(reportRef);
    const todayData = reportDoc.data()?.[today] || {};

    // Ensure totalLunchMinutes is a valid number
    const totalLunchMinutes = Number(
      rtdbData.totalLunchMinutes || todayData.totalLunchMinutes || 0
    );

    // Ensure subtraction doesn't cause NaN issues
    const totalHours = ((totalMinutes - totalLunchMinutes) / 60).toFixed(2);
    if (isNaN(totalHours)) {
      throw new Error("Invalid total hours calculation");
    }

    // Update Firestore report
    await updateDoc(reportRef, {
      [`${today}.checkOutTime`]: standardizedCheckOutTime,
      [`${today}.totalHoursWorked`]: parseFloat(totalHours),
      [`${today}.totalLunchMinutes`]: totalLunchMinutes,
    });

    // Remove from Realtime Database
    await set(ref(rtdb, `liveTracking/${traineeId}`), null);

    res.status(200).json({
      message: "Check-out successful",
      checkOutTime: standardizedCheckOutTime,
      totalHoursWorked: totalHours,
      totalLunchMinutes,
    });
  } catch (error) {
    console.error("Check-out error:", error.message);
    res.status(500).json({ error: error.message || "Failed to check out" });
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
        const totalMinutesElapsed = Math.round(
          (now - checkInTime) / (1000 * 60)
        );
        const totalLunchMinutes = status.totalLunchMinutes || 0;
        const currentHoursWorked = (
          (totalMinutesElapsed - totalLunchMinutes) /
          60
        ).toFixed(2);

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

export const getTraineesByLocation = async (req, res) => {
  try {
    const location = req.location;

    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    const traineesRef = ref(rtdb, "liveTracking");
    const snapshot = await get(traineesRef);
    const traineesData = snapshot.val();

    if (!traineesData) {
      return res.status(404).json({ error: "No trainees found" });
    }

    const traineesAtLocation = Object.values(traineesData).filter(
      (trainee) => trainee.location === location
    );

    res.status(200).json(traineesAtLocation);
  } catch (error) {
    console.error("Error fetching trainees by location:", error);
    res.status(500).json({ error: "Failed to fetch trainees by location" });
  }
};

export const getLiveTrainees = async (req, res) => {
  try {
    const traineesRef = ref(rtdb, "liveTracking");
    const snapshot = await get(traineesRef);
    const traineesData = snapshot.val();

    if (!traineesData) {
      return res.status(404).json({ error: "No trainees found" });
    }

    res.status(200).json(traineesData);
  } catch (error) {
    console.error("Error fetching trainees by location:", error);
    res.status(500).json({ error: "Failed to fetch trainees by location" });
  }
};

export const autoCheckOutTrainees = async () => {
  try {
    console.log("Running auto-checkout process...");

    const snapshot = await get(ref(rtdb, "liveTracking"));
    const liveTrainees = snapshot.val();

    if (!liveTrainees) {
      console.log("No trainees found for auto check-out.");
      return;
    }

    const checkOutPromises = Object.keys(liveTrainees).map(
      async (traineeId) => {
        const traineeData = liveTrainees[traineeId];

        if (!traineeData.checkInTime) {
          console.warn(
            `Trainee ${traineeId} has no check-in time. Skipping...`
          );
          return;
        }

        const { ref: reportRef, today } = await getTodayReportDoc(traineeId);
        const reportDoc = await getDoc(reportRef);
        const todayData = reportDoc.data()?.[today] || {};

        const checkInTime = new Date(`2000/01/01 ${traineeData.checkInTime}`);
        const checkOutTime = new Date(`2000/01/01 ${AUTO_CHECKOUT_TIME}`);
        let totalMinutes = Math.round(
          (checkOutTime - checkInTime) / (1000 * 60)
        );

        const totalLunchMinutes =
          traineeData.totalLunchMinutes || todayData.totalLunchMinutes || 0;
        const totalHours = ((totalMinutes - totalLunchMinutes) / 60).toFixed(2);

        await updateDoc(reportRef, {
          [`${today}.checkOutTime`]: AUTO_CHECKOUT_TIME,
          [`${today}.totalHoursWorked`]: parseFloat(totalHours),
          [`${today}.totalLunchMinutes`]: totalLunchMinutes,
        });

        await set(ref(rtdb, `liveTracking/${traineeId}`), null);

        console.log(
          `Trainee ${traineeId} auto checked out at ${AUTO_CHECKOUT_TIME}`
        );
      }
    );

    await Promise.all(checkOutPromises);
    console.log("Auto check-out process completed.");
  } catch (error) {
    console.error("Auto check-out error:", error);
  }
};

export function scheduleAutoCheckOut() {
  const now = new Date();
  const fivePm = new Date(now);

  fivePm.setHours(17, 30, 0, 0);
  if (fivePm < now) {
    fivePm.setDate(fivePm.getDate() + 1);
  }

  const timeUntilNext5AM = fivePm - now;
  console.log(
    `🕐 Trainees will be auto checked out at: ${fivePm.toLocaleString()}`
  );

  setTimeout(() => {
    autoCheckOutTrainees();
    setInterval(autoCheckOutTrainees, 24 * 60 * 60 * 1000); // Run every 24 hours
  }, timeUntilNext5AM);
}

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
        isWorkingDay: false,
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
      absentees: absentees.map((a) => ({ id: a.id, name: a.name })),
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
      return res
        .status(404)
        .json({ error: "No records found for this trainee" });
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
      workingDays: history.filter((day) => day.isWorkingDay).length,
      presentDays: history.filter((day) => day.checkInTime && day.isWorkingDay)
        .length,
      absentDays: history.filter(
        (day) => day.status === "Absent" && day.isWorkingDay
      ).length,
      lateDays: history.filter(
        (day) => day.status === "Late" && day.isWorkingDay
      ).length,
      totalHoursWorked: history
        .reduce((sum, day) => sum + (day.totalHoursWorked || 0), 0)
        .toFixed(2),
      averageDailyHours: (
        history.reduce((sum, day) => sum + (day.totalHoursWorked || 0), 0) /
        Math.max(
          1,
          history.filter((day) => day.checkInTime && day.isWorkingDay).length
        )
      ).toFixed(2),
      averageLunchMinutes: (
        history.reduce((sum, day) => sum + (day.totalLunchMinutes || 0), 0) /
        Math.max(
          1,
          history.filter((day) => day.lunchStartTime && day.isWorkingDay).length
        )
      ).toFixed(0),
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
        report: traineeDailyData,
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
        },
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
        },
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
    const { date, page = 1, limit = 5 } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 5);
    // Validate pagination parameters
    if (isNaN(pageNumber)) {
      return res.status(400).json({ error: "Invalid page number" });
    }
    if (isNaN(limitNumber)) {
      return res.status(400).json({ error: "Invalid limit value" });
    }
    // Rest of the function remains the same
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
    // Pagination logic
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = pageNumber * limitNumber;
    const paginatedReports = reports.slice(startIndex, endIndex);
    // Summary statistics
    const summary = {
      date: reportDate,
      isWorkingDay: workingDay,
      totalTrainees: reports.length,
      presentCount: reports.filter((r) => r.checkInTime).length,
      absentCount: reports.filter((r) => !r.checkInTime).length,
      lateCount: reports.filter((r) => r.status === "Late").length,
      totalHoursWorked: reports
        .reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0)
        .toFixed(2),
      averageHoursWorked: (
        reports.reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0) /
        Math.max(1, reports.filter((r) => r.checkInTime).length)
      ).toFixed(2),
    };
    res.status(200).json({
      summary,
      paginatedReports,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(reports.length / limitNumber),
        totalItems: reports.length,
      },
    });
  } catch (error) {
    console.error("Daily report error:", error);
    res.status(500).json({ error: "Failed to generate daily report" });
  }
};

export const getWeeklyStats = async (req, res) => {
  try {
    const { traineeId, date, weekStart, weekNumber, year } = req.query;

    if (!traineeId) {
      return res.status(400).json({ error: "Trainee ID is required" });
    }

    let startDate, endDate;
    let singleDayMode = false;

    // If a specific date is provided, get data for just that day
    if (date) {
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      // If we're requesting a single day
      singleDayMode = true;
      
      // Fix: Create date strings directly to avoid timezone issues
      const dateStr = date; // Use the exact string provided by the user
      startDate = new Date(dateStr);
      endDate = new Date(dateStr);
      
      // No need to adjust hours for database query since we're using the date string
    }
    // Rest of the code for weekStart, weekNumber, etc. remains the same
    else if (weekStart) {
      startDate = new Date(weekStart);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ error: "Invalid weekStart format" });
      }

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }
    else if (weekNumber && year) {
      // Existing code for week number calculation
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
    }
    else {
      // Default to the current week
      const currentDate = new Date();
      startDate = new Date(currentDate);
      const day = startDate.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Adjust for Sunday being 0
      startDate.setDate(startDate.getDate() + diff);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }

    const startDateStr = singleDayMode ? date : startDate.toISOString().split("T")[0];
    const endDateStr = singleDayMode ? date : endDate.toISOString().split("T")[0];

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
      return res
        .status(404)
        .json({ error: "No records found for this trainee" });
    }

    const reportData = reportDoc.data();
    const collectedData = [];

    // Calculate working days in the range
    const workingDaysInRange = [];
    let currentDay = new Date(startDate);

    while (currentDay <= endDate) {
      const dateStr = currentDay.toISOString().split("T")[0];
      const isWorkDay = await isWorkingDay(dateStr);

      if (isWorkDay) {
        workingDaysInRange.push(dateStr);
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Filter and collect reports within date range
    for (const [reportDate, data] of Object.entries(reportData)) {
      if (reportDate >= startDateStr && reportDate <= endDateStr) {
        collectedData.push({
          date: reportDate,
          ...data,
        });
      }
    }

    // Count attended days (days with check in)
    const attendedDays = collectedData.filter(
      (day) => day.checkInTime && day.isWorkingDay
    );

    // Calculate absent days (working days without attendance)
    const absentDays = workingDaysInRange.filter(
      (dateStr) => !collectedData.some((day) => day.date === dateStr && day.checkInTime)
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
    const lateDays = attendedDays.filter((day) => day.status === "Late").length;

    // Daily breakdown
    const dailyBreakdown = workingDaysInRange.map((dateStr) => {
      const dayData = collectedData.find((day) => day.date === dateStr);
      const dayOfWeek = new Date(dateStr).toLocaleString("default", {
        weekday: "long",
      });

      if (dayData && dayData.checkInTime) {
        // Day attended
        return {
          date: dateStr,
          dayOfWeek,
          attended: true,
          lunchStartTime: dayData.lunchStartTime || "N/A",
          lunchEndTime: dayData.lunchEndTime || "N/A",
          checkInTime: dayData.checkInTime,
          checkOutTime: dayData.checkOutTime || "N/A",
          hoursWorked: parseFloat(dayData.totalHoursWorked || 0).toFixed(2),
          lunchMinutes: dayData.totalLunchMinutes || 0,
          status: dayData.status || "N/A",
        };
      } else {
        // Day absent or no data
        return {
          date: dateStr,
          dayOfWeek,
          attended: false,
          status: "Absent",
        };
      }
    });

    // Fix attendance rate calculation for single day mode
    let attendanceRate;
    if (singleDayMode) {
      // For a single day, attendance is either 100% or 0%
      const isAttended = attendedDays.some(day => day.date === startDateStr);
      attendanceRate = isAttended ? "100.00%" : "0.00%";
    } else {
      // Weekly attendance rate calculation
      attendanceRate = (
        (attendedDays.length / Math.max(1, workingDaysInRange.length)) *
        100
      ).toFixed(2) + "%";
    }

    // Get week number for the result (or day info for single day mode)
    let responseTitle, timeframe;
    if (singleDayMode) {
      responseTitle = "Daily Stats";
      timeframe = startDateStr;
    } else {
      responseTitle = "Weekly Stats";
      timeframe = `Week ${getWeekNumber(startDate)}`;
    }

    // Statistics summary
    const stats = {
      traineeId,
      traineeName,
      timeframe,
      startDate: startDateStr,
      endDate: endDateStr,
      workingDaysInPeriod: singleDayMode ? (workingDaysInRange.includes(startDateStr) ? 1 : 0) : workingDaysInRange.length,
      attendedDays: singleDayMode ? (attendedDays.some(day => day.date === startDateStr) ? 1 : 0) : attendedDays.length,
      absentDays: singleDayMode ? (absentDays.includes(startDateStr) ? 1 : 0) : absentDays.length,
      lateDays: singleDayMode ? (attendedDays.some(day => day.date === startDateStr && day.status === "Late") ? 1 : 0) : lateDays,
      attendanceRate,
      totalWorkingHours: singleDayMode 
        ? (attendedDays.find(day => day.date === startDateStr)?.totalHoursWorked || "0.00") 
        : totalWorkingHours.toFixed(2),
      averageDailyHours: (
        totalWorkingHours / Math.max(1, attendedDays.length)
      ).toFixed(2),
      totalLunchMinutes: singleDayMode 
        ? (attendedDays.find(day => day.date === startDateStr)?.totalLunchMinutes || 0) 
        : totalLunchMinutes,
      totalLunchHours: singleDayMode
        ? ((attendedDays.find(day => day.date === startDateStr)?.totalLunchMinutes || 0) / 60).toFixed(2)
        : totalLunchHours,
      averageLunchMinutes: singleDayMode
        ? (attendedDays.find(day => day.date === startDateStr)?.totalLunchMinutes || 0)
        : (totalLunchMinutes / Math.max(1, attendedDays.length)).toFixed(0),
    };

    // If it's a single day, include the year and week info for context
    if (singleDayMode) {
      const weekNum = getWeekNumber(startDate);
      stats.year = startDate.getFullYear();
      stats.weekNumber = weekNum;
      stats.dayOfWeek = startDate.toLocaleString("default", { weekday: "long" });
    } else {
      stats.year = startDate.getFullYear();
      stats.weekNumber = getWeekNumber(startDate);
    }

    res.status(200).json({
      [singleDayMode ? "dailyStats" : "weeklyStats"]: stats,
      dailyBreakdown: singleDayMode 
        ? dailyBreakdown.filter(day => day.date === startDateStr) 
        : dailyBreakdown,
      workingDays: singleDayMode 
        ? workingDaysInRange.filter(day => day === startDateStr) 
        : workingDaysInRange,
      absentDays: singleDayMode 
        ? absentDays.filter(day => day === startDateStr) 
        : absentDays,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to retrieve statistics" });
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
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
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
      return res
        .status(404)
        .json({ error: "No records found for this trainee" });
    }

    const reportData = reportDoc.data();
    const monthlyData = [];

    // Get trainee name
    const traineeRef = doc(db, `trainees/${traineeId}`);
    const traineeDoc = await getDoc(traineeRef);
    const traineeName = traineeDoc.exists()
      ? traineeDoc.data().name
      : "Unknown";

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
    const attendedDays = monthlyData.filter(
      (day) => day.checkInTime && day.isWorkingDay
    );

    // Calculate absent days (working days without attendance)
    const absentDays = workingDaysInMonth.filter(
      (date) => !monthlyData.some((day) => day.date === date && day.checkInTime)
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
    const lateDays = attendedDays.filter((day) => day.status === "Late").length;

    // Monthly statistics summary
    const monthlyStats = {
      traineeId,
      traineeName,
      year: targetYear,
      month: targetMonth + 1,
      monthName: new Date(targetYear, targetMonth, 1).toLocaleString(
        "default",
        { month: "long" }
      ),
      workingDaysInMonth: workingDaysInMonth.length,
      attendedDays: attendedDays.length,
      absentDays: absentDays.length,
      lateDays,
      attendanceRate:
        ((attendedDays.length / workingDaysInMonth.length) * 100).toFixed(2) +
        "%",
      totalWorkingHours: totalWorkingHours.toFixed(2),
      averageDailyHours: (
        totalWorkingHours / Math.max(1, attendedDays.length)
      ).toFixed(2),
      totalLunchMinutes,
      totalLunchHours,
      averageLunchMinutes: (
        totalLunchMinutes / Math.max(1, attendedDays.length)
      ).toFixed(0),
    };

    res.status(200).json({
      monthlyStats,
      attendedDates: attendedDays.map((day) => ({
        date: day.date,
        checkInTime: day.checkInTime,
        checkOutTime: day.checkOutTime,
        hoursWorked: day.totalHoursWorked,
        lunchMinutes: day.totalLunchMinutes || 0,
        status: day.status,
      })),
      absentDates: absentDays,
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
      return res
        .status(404)
        .json({ error: "No records found for this trainee" });
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
    const attendedDays = programData.filter(
      (day) => day.checkInTime && day.isWorkingDay
    );

    // Calculate absent days (working days without attendance)
    const absentDays = workingDaysInProgram.filter(
      (date) => !programData.some((day) => day.date === date && day.checkInTime)
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
    const lateDays = attendedDays.filter((day) => day.status === "Late").length;

    // Group data by month for monthly breakdown
    const monthlyBreakdown = {};

    attendedDays.forEach((day) => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthName = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = {
          monthName,
          daysAttended: 0,
          hoursWorked: 0,
          lunchMinutes: 0,
          lateDays: 0,
        };
      }

      monthlyBreakdown[monthKey].daysAttended++;
      monthlyBreakdown[monthKey].hoursWorked += parseFloat(
        day.totalHoursWorked || 0
      );
      monthlyBreakdown[monthKey].lunchMinutes += parseInt(
        day.totalLunchMinutes || 0
      );

      if (day.status === "Late") {
        monthlyBreakdown[monthKey].lateDays++;
      }
    });

    // Convert to array and sort by month
    const monthlyStats = Object.entries(monthlyBreakdown)
      .map(([key, data]) => ({
        month: key,
        ...data,
        hoursWorked: parseFloat(data.hoursWorked.toFixed(2)),
        lunchHours: parseFloat((data.lunchMinutes / 60).toFixed(2)),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Program statistics summary
    const programStats = {
      traineeId,
      traineeName: traineeData.name,
      programStartDate: startDateStr,
      programEndDate: endDateStr,
      programDuration:
        Math.ceil((programEnd - programStart) / (1000 * 60 * 60 * 24)) +
        " days",
      workingDaysInProgram: workingDaysInProgram.length,
      attendedDays: attendedDays.length,
      absentDays: absentDays.length,
      lateDays,
      attendanceRate:
        ((attendedDays.length / workingDaysInProgram.length) * 100).toFixed(2) +
        "%",
      totalWorkingHours: totalWorkingHours.toFixed(2),
      averageDailyHours: (
        totalWorkingHours / Math.max(1, attendedDays.length)
      ).toFixed(2),
      totalLunchMinutes,
      totalLunchHours,
      averageLunchMinutes: (
        totalLunchMinutes / Math.max(1, attendedDays.length)
      ).toFixed(0),
    };

    res.status(200).json({
      programStats,
      monthlyBreakdown: monthlyStats,
      attendedDates: attendedDays.map((day) => ({
        date: day.date,
        checkInTime: day.checkInTime,
        checkOutTime: day.checkOutTime,
        hoursWorked: day.totalHoursWorked,
        lunchMinutes: day.totalLunchMinutes || 0,
        status: day.status,
      })),
      absentDates: absentDays,
    });
  } catch (error) {
    console.error("Program stats error:", error);
    res.status(500).json({ error: "Failed to retrieve program statistics" });
  }
};
