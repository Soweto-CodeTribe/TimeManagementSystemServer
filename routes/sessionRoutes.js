import express from "express";
import { checkIn, checkOut, lunchEnd, lunchStart } from "../controllers/sessionController.js";
import {verifyToken} from '../utilities/index.js'

const router = express.Router();

router.post("/check-in", verifyToken, checkIn);
router.post("/lunch-start", verifyToken, lunchStart);
router.post("/lunch-end", verifyToken, lunchEnd)
router.post("/check-out", verifyToken, checkOut)


export default router;
