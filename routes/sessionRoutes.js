import express from "express";
import { checkIn, checkOut, lunchEnd, lunchStart } from "../controllers/sessionController.js";

const router = express.Router();

router.post("/check-in", checkIn);
router.post("/lunch-start", lunchStart);
router.post("/lunch-end", lunchEnd)
router.post("/check-out", checkOut)


export default router;
