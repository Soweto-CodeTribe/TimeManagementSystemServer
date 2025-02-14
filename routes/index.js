<<<<<<< HEAD
console.log("object")
=======
import express from "express";
import { login } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);

export default router;
>>>>>>> 25aa7d4 (initialize project structure with basic authentication and middleware setup)
