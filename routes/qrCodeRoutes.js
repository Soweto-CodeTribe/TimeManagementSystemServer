import express from "express";
import { getQRcode, verifyQRCode } from "../controllers/qrCodeController.js";
import { verifyToken } from "../utilities/index.js";

const router = express.Router();

router.get("/get-QRcode", getQRcode);
router.post("/verify-QRcode", verifyToken, verifyQRCode);

export default router;
