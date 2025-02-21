import express from "express";
import { getAllEvents, getEvent, guestCheckIn, guestQR } from "../controllers/eventsController.js";

const router = express.Router();

router.post("/generate-event-QR", guestQR);
router.get("/event/:eventId", getEvent)
router.get("/all-events/", getAllEvents)
router.post("/event/:eventId/check-in", guestCheckIn)

export default router;
