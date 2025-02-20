import express from "express";
import { guestQR } from "../controllers/eventsController.js";

const router = express.Router();

router.post("/generate-event-QR", guestQR);

export default router;
