import express from "express";
import { getAllEvents, getEvent, guestCheckIn, guestQR } from "../controllers/eventsController.js";
import { verifyToken } from "../utilities/index.js";
import { isFacilitator, completeStakeholderAccess } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate-event-QR",verifyToken,isFacilitator, guestQR);
router.get("/event/:eventId",verifyToken,isFacilitator, getEvent)
router.get("/all-events/",verifyToken, isFacilitator,getAllEvents)
router.post("/event/:eventId/check-in",verifyToken,isFacilitator, guestCheckIn)


// Stakeholder read-only routes
router.get("/event/:eventId", completeStakeholderAccess, getEvent);
router.get("/all-events/", completeStakeholderAccess, getAllEvents);

export default router;
