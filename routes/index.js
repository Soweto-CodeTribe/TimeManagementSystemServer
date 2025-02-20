import express from "express";
import { login, login_Trainee } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/loginT", login_Trainee)

export default router;
