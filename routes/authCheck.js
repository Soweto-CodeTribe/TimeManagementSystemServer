import express from "express";
import { verifyToken } from "../utilities/index.js";

const router = express.Router();

router.get("/create-user",verifyToken, ()=>{console.log("user created")});

export default router;