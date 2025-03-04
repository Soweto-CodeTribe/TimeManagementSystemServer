import express from "express";
import {
  getAllEvents,
  getEvent,
  getEventQRcode,
  guestCheckIn,
  guestQR,
} from "../controllers/eventsController.js";
import { verifyToken } from "../utilities/index.js";
import { isFacilitator, completeStakeholderAccess } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate-event-QR", verifyToken, isFacilitator, guestQR);
router.get("/event/:eventId", getEvent);
router.get("/all-events/", getEventQRcode);
router.post("/event/:eventId/check-in", guestCheckIn);


// Stakeholder read-only routes
router.get("/event/:eventId", completeStakeholderAccess, getEvent);
router.get("/all-events/", completeStakeholderAccess, getAllEvents);

export default router;
