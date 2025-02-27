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
import { isFacilitator, isSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/locations", verifyToken,isFacilitator, addAllowedLocation);
router.get("/locations", verifyToken,isFacilitator, getAllowedLocations);
router.put("/locations/:id", verifyToken,isFacilitator, updateAllowedLocation);
router.delete("/locations/:id", verifyToken,isFacilitator, deleteAllowedLocation);
router.post("/validate-location", verifyToken, validateLocation);
router.get("/location-logs", verifyToken,isFacilitator, getLocationLogs);

export default router