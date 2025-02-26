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
  lunchEnd,
  lunchStart,
  traineeStatus,
  recordAbsenteeism,
  getTraineeHistory,
  getDailyReport,
  getProgramStats,
  getMonthlyStats
} from "../controllers/sessionController.js";
import { verifyToken } from "../utilities/index.js";



const router = express.Router();

// Original routes
router.post("/check-in", verifyToken, checkIn);
router.post("/lunch-start", verifyToken, lunchStart);
router.post("/lunch-end", verifyToken, lunchEnd);
router.post("/check-out", verifyToken, checkOut);
router.get("/session-status/:id", verifyToken, traineeStatus);

// New routes for enhanced features
router.post("/record-absenteeism", verifyToken, recordAbsenteeism);
router.get("/trainee-history", verifyToken, getTraineeHistory);
router.get("/daily-report", verifyToken, getDailyReport);
router.get("/monthly-stats", verifyToken, getMonthlyStats);
router.get("/program-stats", verifyToken, getProgramStats)

export default router;