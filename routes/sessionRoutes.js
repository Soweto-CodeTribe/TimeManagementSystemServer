// import express from "express";
// import {
//   checkIn,
//   checkOut,
//   lunchEnd,
//   lunchStart,
//   traineeStatus,
// } from "../controllers/sessionController.js";
// import { verifyToken } from "../utilities/index.js";

// const router = express.Router();

// router.post("/check-in", verifyToken, checkIn);
// router.post("/lunch-start",verifyToken, lunchStart);
// router.post("/lunch-end",verifyToken, lunchEnd);
// router.post("/check-out",verifyToken, checkOut);
// router.get("/session-status/:id", verifyToken, traineeStatus);

// export default router;

import express from "express";
import {
  checkIn,
  checkOut,
  getTraineesByLocation,
  lunchEnd,
  lunchStart,
  traineeStatus,
  recordAbsenteeism,
  getTraineeHistory,
  getDailyReport,
  getProgramStats,
  getMonthlyStats,
  getTraineeDailyReport,
  getWeeklyStats,
  getLiveTrainees,
} from "../controllers/sessionController.js";
import { verifyToken } from "../utilities/index.js";
import { setBulkProgramStartDate, setProgramStartDate,getTraineeProgramInfo } from "../controllers/programStartDateController.js";
import { completeStakeholderAccess } from "../middleware/auth.js";
import { getLiveActivitiesByLocation } from "../controllers/adminNotifications.js";
import { getLiveActivities } from "../controllers/adminNotifications.js";

const router = express.Router();

// Original routes
router.post("/check-in", verifyToken, checkIn);
router.post("/lunch-start", verifyToken, lunchStart);
router.post("/lunch-end", verifyToken, lunchEnd);
router.post("/check-out", verifyToken, checkOut);
router.get("/session-status/:id", verifyToken, traineeStatus);
router.post("/session-status/",verifyToken, getTraineesByLocation);
router.get("/all-session-status/",verifyToken, getLiveTrainees);

// New routes for enhanced features
router.post("/record-absenteeism", verifyToken, recordAbsenteeism);
router.get("/trainee-history", verifyToken, getTraineeHistory);
router.get("/daily-report", verifyToken, getDailyReport);
router.get("/trainee-daily-report/:traineeId", verifyToken, getTraineeDailyReport);
router.get("/monthly-stats", verifyToken, getMonthlyStats);
router.get("/program-stats", verifyToken, getProgramStats)
router.get("/weekly-stats", verifyToken, getWeeklyStats);
router.get("/live-trainees", getLiveActivities);
router.get("/trainees-by-location", getLiveActivitiesByLocation);
// Program date management routes
router.post("/set-program-date", setProgramStartDate);
router.post("/set-bulk-program-date", setBulkProgramStartDate);
router.get("/trainee-program-info/:traineeId", getTraineeProgramInfo);


// Stakeholder read-only routes
router.get("/session-status/:id", completeStakeholderAccess, traineeStatus);
router.get("/trainee-history", completeStakeholderAccess, getTraineeHistory);
router.get("/daily-report", completeStakeholderAccess, getDailyReport);
router.get("/trainee-daily-report/:traineeId", completeStakeholderAccess, getTraineeDailyReport);
router.get("/monthly-stats", completeStakeholderAccess, getMonthlyStats);
router.get("/program-stats", completeStakeholderAccess, getProgramStats);
router.get("/weekly-stats", completeStakeholderAccess, getWeeklyStats);

export default router;