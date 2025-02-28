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
  getTraineesByLocation
  

} from "../controllers/sessionController.js";
import { verifyToken } from "../utilities/index.js";
import { setBulkProgramStartDate, setProgramStartDate,getTraineeProgramInfo } from "../controllers/programStartDateController.js";



const router = express.Router();

// Original routes
router.post("/check-in", verifyToken, checkIn);
router.post("/lunch-start", verifyToken, lunchStart);
router.post("/lunch-end", verifyToken, lunchEnd);
router.post("/check-out", verifyToken, checkOut);
router.get("/session-status/:id", verifyToken, traineeStatus);
router.post("/session-status/",verifyToken, getTraineesByLocation);

// New routes for enhanced features
router.post("/record-absenteeism", verifyToken, recordAbsenteeism);
router.get("/trainee-history", verifyToken, getTraineeHistory);
router.get("/daily-report", verifyToken, getDailyReport);
router.get("/trainee-daily-report/:traineeId", verifyToken, getTraineeDailyReport);
router.get("/monthly-stats", verifyToken, getMonthlyStats);
router.get("/program-stats", verifyToken, getProgramStats)
router.get("/weekly-stats", verifyToken, getWeeklyStats);

// Program date management routes
router.post("/set-program-date", verifyToken, setProgramStartDate);
router.post("/set-bulk-program-date", verifyToken, setBulkProgramStartDate);
router.get("/trainee-program-info/:traineeId", verifyToken, getTraineeProgramInfo);

export default router;