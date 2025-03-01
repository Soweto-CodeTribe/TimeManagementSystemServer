import express from "express";

import { verifyToken } from "../utilities/index.js";
import { isFacilitator } from "../middleware/auth.js";
import { isFacilitatorLocationTrainee } from "../middleware/auth.js";
import {
  getFacilitatorTraineesDailyReport,
  getFacilitatorTraineesWeeklyStats,
  getFacilitatorTraineesMonthlyStats,
  getFacilitatorTraineesProgramStats,
} from "../controllers/facilitatorReportController.js";
// import { getTraineesByLocation } from "../controllers/sessionController.js";

const router = express.Router();


router.get("/facilitator/daily", verifyToken, isFacilitator, isFacilitatorLocationTrainee, getFacilitatorTraineesDailyReport);
router.get("/facilitator/weekly", verifyToken, isFacilitator, isFacilitatorLocationTrainee, getFacilitatorTraineesWeeklyStats);
router.get("/facilitator/monthly", verifyToken, isFacilitator, isFacilitatorLocationTrainee, getFacilitatorTraineesMonthlyStats);
router.get("/facilitator/program", verifyToken, isFacilitator, isFacilitatorLocationTrainee, getFacilitatorTraineesProgramStats);

export default router;