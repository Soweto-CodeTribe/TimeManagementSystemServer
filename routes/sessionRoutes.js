import express from "express";
import {
  checkIn,
  checkOut,
  lunchEnd,
  lunchStart,
  traineeStatus,
} from "../controllers/sessionController.js";
import { verifyToken } from "../utilities/index.js";

const router = express.Router();

router.post("/check-in", checkIn);
router.post("/lunch-start", lunchStart);
router.post("/lunch-end", lunchEnd);
router.post("/check-out", checkOut);
router.get("/session-status/:id", verifyToken, traineeStatus);

export default router;
