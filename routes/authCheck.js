import express from "express";

import { verifyToken } from "../utilities/index.js";
import { create_user, delete_User, update_User, deleted_Users, get_Users, get_Users_By_Location, traineeManagementOverview } from "../controllers/userController.js";
import { getAllFeedback, submitFeedback, trainee_id, update_Trainee } from '../controllers/traineeController.js';
import {  isSuperAdmin, completeStakeholderAccess} from '../middleware/auth.js';

const router = express.Router();

router.get("/create-user",verifyToken, ()=>{console.log("user created")});

router.get("/trainees", 
    verifyToken, 
    get_Users);

router.get("/my-trainees", verifyToken, get_Users_By_Location);
router.post("/trainees", verifyToken, create_user);
router.put("/trainees/:id",verifyToken, update_User);
router.delete("/trainees/:id",verifyToken, delete_User);
router.get("/deletedTrainees",verifyToken, deleted_Users);

router.get("/trainee", verifyToken, trainee_id);
router.put("/profile-update", verifyToken, update_Trainee)
router.post("/feedback", verifyToken, submitFeedback)
router.get("/getFeedBack", verifyToken, getAllFeedback)
router.get("/trainee-overview",verifyToken, traineeManagementOverview);


// Stakeholder read-only routes
router.get("/trainees", completeStakeholderAccess, get_Users);
router.get("/my-trainees", completeStakeholderAccess, get_Users_By_Location);

export default router;
