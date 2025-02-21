import express from "express";
import { getAllEvents, getEvent, guestQR } from "../controllers/eventsController.js";

const router = express.Router();

router.post("/generate-event-QR", guestQR);
router.get("/event/:eventId", getEvent)
router.get("/all-events/", getAllEvents)

export default router;
