import express from "express";
import { upload_trainee_csv} from "../controllers/csvController.js";
import { verifyToken } from "../utilities/index.js";
import { isFacilitator } from "../middleware/auth.js";

const router = express.Router();

// Route for CSV upload - requires token and admin privileges
router.post("/upload-csv", verifyToken, isFacilitator, upload_trainee_csv);



export default router;