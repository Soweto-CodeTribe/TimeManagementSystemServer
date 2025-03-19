import express from "express";
import {
  checkEmail,
  getAllEvents,
  getEvent,
  guestCheckIn,
  guestQR,
} from "../controllers/eventsController.js";
import { verifyToken } from "../utilities/index.js";
import {
  isFacilitator,
  completeStakeholderAccess,
} from "../middleware/auth.js";

const router = express.Router();

router.post("/generate-event-QR", verifyToken, guestQR);
router.get("/event/:eventId", getEvent);
router.get("/all-events/", getAllEvents);
router.route("/event/check-in").patch(guestCheckIn).post(guestCheckIn);
router.post("/check-email", checkEmail);

// Stakeholder read-only routes
router.get("/event/:eventId", completeStakeholderAccess, getEvent);
router.get("/all-events/", completeStakeholderAccess, getAllEvents);

export default router;
