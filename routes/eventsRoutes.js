import express from "express";
import { getAllEvents, getEvent, guestCheckIn, guestQR } from "../controllers/eventsController.js";
import { verifyToken } from "../utilities/index.js";
import { isFacilitator } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate-event-QR",verifyToken,isFacilitator, guestQR);
router.get("/event/:eventId",verifyToken,isFacilitator, getEvent)
router.get("/all-events/",verifyToken, isFacilitator,getAllEvents)
router.post("/event/:eventId/check-in",verifyToken,isFacilitator, guestCheckIn)

export default router;
