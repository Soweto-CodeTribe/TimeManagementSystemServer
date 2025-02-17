import express from "express";
import { verifyToken } from "../utilities/index.js";
import { 
  create_Meeting, 
  delete_Meeting, 
  update_Meeting, 
  deleted_Meetings, 
  get_Meetings 
} from "../controllers/meetingController.js";

const router = express.Router();

router.get("/meetings", get_Meetings);
router.post("/meetings", verifyToken, create_Meeting);
router.put("/meetings/:id", verifyToken, update_Meeting);
router.delete("/meetings/:id", verifyToken, delete_Meeting);
router.get("/deletedMeetings", verifyToken, deleted_Meetings);

export default router;