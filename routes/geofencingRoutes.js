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
// import { isSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/locations", verifyToken, addAllowedLocation);
router.get("/locations", verifyToken, getAllowedLocations);
router.put("/locations/:id", verifyToken, updateAllowedLocation);
router.delete("/locations/:id", verifyToken, deleteAllowedLocation);
router.post("/validate-location", verifyToken, validateLocation);
router.get("/location-logs", verifyToken, getLocationLogs);

export default router