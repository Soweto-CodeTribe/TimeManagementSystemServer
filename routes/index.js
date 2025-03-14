import express from "express";
import {
  login,
  login_Trainee,
  stakeholderLogin,
  enable2FA,
  verify2FA,
  disable2FA,
  forgotPassword,
  logout,
} from "../controllers/authController.js";
import { verifyToken } from "../utilities/index.js";

const router = express.Router();

router.post("/login", login);
router.post("/loginT", login_Trainee);
router.post("/login-stakeholder", stakeholderLogin);
router.post("/enable-2fa", verifyToken, enable2FA);
router.post("/verify-2fa", verify2FA);
router.post("/disable-2fa", verifyToken, disable2FA);
router.post("/forgot-password", forgotPassword);
// router.post("/resend-2fa", resendVerificationCode);
router.post("/logout", logout);

export default router;
