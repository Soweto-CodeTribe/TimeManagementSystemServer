import express from "express";
import { verifyToken } from "../utilities/index.js";
import { 
  create_Message,
  delete_Message,
  update_Message,
  deleted_Messages,
  get_Messages,
  get_Trainee_Messages,
  mark_Message_Read
} from "../controllers/notificationsController.js";
import { isFacilitator } from "../middleware/auth.js";

const router = express.Router();

router.get("/messages", verifyToken,  get_Messages);
router.get("/messages/trainee/:traineeId", verifyToken,isFacilitator, get_Trainee_Messages);
router.post("/messages", verifyToken,isFacilitator, create_Message);
router.put("/messages/:id", verifyToken,isFacilitator, update_Message);
router.put("/messages/:id/read", verifyToken,isFacilitator, mark_Message_Read);
router.delete("/messages/:id", verifyToken,isFacilitator, delete_Message);
router.get("/deletedMessages", verifyToken,isFacilitator, deleted_Messages);

export default router;