import express from "express";

import { verifyToken } from "../utilities/index.js";
import { create_user, delete_User, update_User, deleted_Users, get_Users, get_Users_By_Location } from "../controllers/userController.js";
import { getTraineeProfile, updateTraineeProfile } from '../controllers/traineeController.js';
import { authenticateUser, isSuperAdmin} from '../middleware/auth.js';

const router = express.Router();

router.get("/create-user",verifyToken, ()=>{console.log("user created")});
router.get("/trainees", verifyToken, isSuperAdmin, get_Users);
router.get("/my-trainees", verifyToken, get_Users_By_Location);
router.post("/trainees", verifyToken, create_user);
router.put("/trainees/:id",verifyToken, update_User);
router.delete("/trainees/:id",verifyToken, delete_User);
router.get("/deletedTrainees",verifyToken, deleted_Users);



export default router;
