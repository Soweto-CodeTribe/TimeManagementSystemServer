import express from "express";
import {
  getAllEvents,
  getEvent,
  getEventQRcode,
  guestCheckIn,
  guestQR,
} from "../controllers/eventsController.js";
import { verifyToken } from "../utilities/index.js";
import { isFacilitator } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate-event-QR", verifyToken, isFacilitator, guestQR);
router.get("/event/:eventId", getEvent);
router.get("/all-events/", getEventQRcode);
router.post("/event/:eventId/check-in", guestCheckIn);

export default router;
