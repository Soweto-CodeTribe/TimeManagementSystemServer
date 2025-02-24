import express from "express";
import { verifyToken } from "../utilities/index.js";
import {
  addAllowedLocation,
  getAllowedLocations,
  validateLocation,
  updateAllowedLocation,
  deleteAllowedLocation,
  getLocationLogs
} from "../controllers/geofencingController.js";
import { isSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/locations", verifyToken,isSuperAdmin, addAllowedLocation);
router.get("/locations", verifyToken,isSuperAdmin, getAllowedLocations);
router.put("/locations/:id", verifyToken,isSuperAdmin, updateAllowedLocation);
router.delete("/locations/:id", verifyToken,isSuperAdmin, deleteAllowedLocation);
router.post("/validate-location", verifyToken, validateLocation);
router.get("/location-logs", verifyToken,isSuperAdmin, getLocationLogs);

export default router