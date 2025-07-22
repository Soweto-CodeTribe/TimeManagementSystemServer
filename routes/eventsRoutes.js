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
  updateGuest
} from "../controllers/eventsController.js";
import { verifyToken } from "../utilities/index.js";
import {
  isFacilitator,
  completeStakeholderAccess,
  isFacilitatorOrSuperAdmin
} from "../middleware/auth.js";

const router = express.Router();

router.post("/generate-event-QR", verifyToken, guestQR);
router.get("/event/:eventId", getEvent);
router.get("/all-events/", getAllEvents);
router.route("/event/check-in").patch(guestCheckIn).post(guestCheckIn);
router.post("/check-email", checkEmail);
router.get("/getGuests", verifyToken, getGuests);
router.post("/events/close", closeEvent);
router.get("/event-QR", getEventQRcode);
// Change guest update route to '/:id' for correct endpoint
router.put('/:id', verifyToken, isFacilitatorOrSuperAdmin, updateGuest);

// Stakeholder read-only routes
router.get("/event/:eventId", completeStakeholderAccess, getEvent);
router.get("/all-events/", completeStakeholderAccess, getAllEvents);

export default router;
