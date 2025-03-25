import express from "express";
import {
  checkEmail,
  closeEvent,
  getAllEvents,
  getEvent,
  getEventQRcode,
  getGuests,
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
router.get("/getGuests", verifyToken, getGuests);
router.post("/events/close", closeEvent);
router.get("/event/event-QR", getEventQRcode);

// Stakeholder read-only routes
router.get("/event/:eventId", completeStakeholderAccess, getEvent);
router.get("/all-events/", completeStakeholderAccess, getAllEvents);

export default router;
