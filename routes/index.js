import express from "express";
import { login, login_Trainee, enable2FA, verify2FA, disable2FA } from "../controllers/authController.js";
import { verifyToken } from "../utilities/index.js";

const router = express.Router();

router.post("/login", login);
router.post("/loginT", login_Trainee);
router.post("/enable-2fa", verifyToken, enable2FA);
router.post("/verify-2fa", verify2FA);
router.post("/disable-2fa", verifyToken, disable2FA);

export default router;
