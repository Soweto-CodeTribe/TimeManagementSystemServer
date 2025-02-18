import express from "express";
import { generateQRCode, verifyQRCode } from "../controllers/qrCodeController.js";

const router = express.Router();

router.get("/get-QRcode", generateQRCode);
router.post("/verify-QRcode", verifyQRCode);



export default router;
