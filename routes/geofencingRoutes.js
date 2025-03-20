import express from "express";
import { verifyToken } from "../utilities/index.js";
import {
  addAllowedLocation,
  getAllowedLocations,
  validateLocation,
  updateAllowedLocation,
  deleteAllowedLocation,
} from "../controllers/geofencingController.js";
import { isFacilitator, isSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/locations",  addAllowedLocation);
router.get("/locations",  getAllowedLocations);
router.put("/locations/:id",  updateAllowedLocation);
router.delete("/locations/:id",  deleteAllowedLocation);
router.post("/validate-location",  validateLocation);

export default router