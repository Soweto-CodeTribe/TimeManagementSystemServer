import express from "express";
import { verifyToken } from "../utilities/index.js";
import { create_user, delete_User, update_User, deleted_Users, get_Users } from "../controllers/userController.js";

const router = express.Router();

router.get("/create-user",verifyToken, ()=>{console.log("user created")});
router.get("/trainees", get_Users);
router.post("/trainees", create_user);
router.put("/trainees/:id",verifyToken, update_User);
router.delete("/trainees/:id",verifyToken, delete_User);
router.get("/deletedTrainees",verifyToken, deleted_Users);

export default router;
