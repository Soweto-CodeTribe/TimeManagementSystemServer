import express from "express";
import { verifyToken } from "../utilities/index.js";
import { create_user, delete_User, update_User, deleted_Users, get_Users } from "../controllers/userController.js";
import { trainee_id, update_Trainee } from "../controllers/traineeController.js";

const router = express.Router();

router.get("/create-user",verifyToken, ()=>{console.log("user created")});
router.get("/trainees",verifyToken, get_Users);
router.post("/trainees", verifyToken, create_user);
router.put("/trainees/:id",verifyToken, update_User);
router.delete("/trainees/:id",verifyToken, delete_User);
router.get("/deletedTrainees",verifyToken, deleted_Users);
// Routes to fetch trainee info and edit
router.get("/trainee", verifyToken, trainee_id)
router.post("/trainee/update", verifyToken, update_Trainee)

export default router;
