import express from "express";
import { verifyToken } from "../utilities/index.js";
import { 
  create_Meeting, 
  delete_Meeting, 
  update_Meeting, 
  deleted_Meetings, 
  get_Meetings 
} from "../controllers/meetingController.js";
import { isFacilitator } from "../middleware/auth.js";

const router = express.Router();

router.get("/meetings", get_Meetings);
router.post("/meetings", verifyToken,isFacilitator, create_Meeting);
router.put("/meetings/:id", verifyToken,isFacilitator, update_Meeting);
router.delete("/meetings/:id", verifyToken,isFacilitator, delete_Meeting);
router.get("/deletedMeetings", verifyToken,isFacilitator, deleted_Meetings);

export default router;