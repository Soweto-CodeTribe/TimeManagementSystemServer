// import express from "express";
// import { verifyToken } from "../utilities/index.js";
// import { 
//   create_Message,
//   delete_Message,
//   update_Message,
//   deleted_Messages,
//   get_Messages,
//   get_Trainee_Messages,
//   mark_Message_Read
// } from "../controllers/notificationsController.js";
// import { isFacilitator } from "../middleware/auth.js";

// const router = express.Router();

// router.get("/messages", verifyToken,  get_Messages);
// router.get("/messages/trainee/:traineeId", verifyToken,isFacilitator, get_Trainee_Messages);
// router.post("/messages", verifyToken,isFacilitator, create_Message);
// router.put("/messages/:id", verifyToken,isFacilitator, update_Message);
// router.put("/messages/:id/read", verifyToken,isFacilitator, mark_Message_Read);
// router.delete("/messages/:id", verifyToken,isFacilitator, delete_Message);
// router.get("/deletedMessages", verifyToken,isFacilitator, deleted_Messages);

// export default router;


import express from "express";
import { verifyToken } from "../utilities/index.js";
import { 
  create_Message,
  delete_Message,
  update_Message,
  deleted_Messages,
  get_Messages,
  get_Trainee_Messages,
  mark_Message_Read,
  get_Unread_Message_Count,
  get_Trainee_Notification_Status
} from "../controllers/notificationsController.js";
import { 
  registerDeviceToken,
  sendNotificationToRecipients,
  notifyAbsentTrainees,
  submitAbsenceProof
} from '../services/notificationService.js';
import { isFacilitator } from "../middleware/auth.js";

const router = express.Router();

// Message routes
router.get("/messages", verifyToken, get_Messages);
router.get("/messages/trainee/:traineeId", verifyToken, get_Trainee_Messages);
router.get("/messages/unread/:traineeId", verifyToken, get_Unread_Message_Count);
router.post("/messages", verifyToken, isFacilitator, create_Message);
router.put("/messages/:id", verifyToken, isFacilitator, update_Message);
router.put("/messages/:id/read", verifyToken, mark_Message_Read);
router.delete("/messages/:id", verifyToken, isFacilitator, delete_Message);
router.get("/deletedMessages", verifyToken, isFacilitator, deleted_Messages);

// FCM notification routes
router.post("/registerToken", verifyToken, registerDeviceToken);
router.post("/sendNotification", verifyToken, isFacilitator, sendNotificationToRecipients);
router.get("/notifications/status/:traineeId", verifyToken, get_Trainee_Notification_Status);

// Schedule/Absence notification routes
router.post("/notifications/absent", verifyToken, isFacilitator, notifyAbsentTrainees);
router.post("/absence/proof", verifyToken, submitAbsenceProof);

export default router;