import express from "express";
import {
  getAllTraineesDailyReport,
  getAllTraineesWeeklyStats,
  getAllTraineesMonthlyStats,
  getAllTraineesProgramStats,
} from "../controllers/superAdminReportController.js";
import { verifyToken } from "../utilities/index.js";
import {  isSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get all trainees' daily report
router.get("/daily", verifyToken, getAllTraineesDailyReport);

// Get all trainees' weekly statistics
router.get("/weekly",verifyToken, getAllTraineesWeeklyStats);

// Get all trainees' monthly statistics
router.get("/monthly",verifyToken,isSuperAdmin, getAllTraineesMonthlyStats);

// Get all trainees' program statistics
router.get("/program",verifyToken,isSuperAdmin, getAllTraineesProgramStats);



export default router;