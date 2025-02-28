import express from "express";
import {
  getAllTraineesDailyReport,
  getAllTraineesWeeklyStats,
  getAllTraineesMonthlyStats,
  getAllTraineesProgramStats,
} from "../controllers/superAdminReportController.js";
import { verifyToken } from "../utilities/index.js";
import { getTraineesByLocation } from "../controllers/sessionController.js";

const router = express.Router();

// Get all trainees' daily report
router.get("/daily", verifyToken, getAllTraineesDailyReport);

// Get all trainees' weekly statistics
router.get("/weekly",verifyToken, getAllTraineesWeeklyStats);

// Get all trainees' monthly statistics
router.get("/monthly",verifyToken, getAllTraineesMonthlyStats);

// Get all trainees' program statistics
router.get("/program",verifyToken, getAllTraineesProgramStats);

export default router;