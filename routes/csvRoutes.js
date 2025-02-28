import express from "express";

import { verifyToken } from "../utilities/index.js";
import {  isSuperAdmin} from '../middleware/auth.js';
import { upload_trainee_csv } from "../controllers/csvController.js";
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/csv-upload", verifyToken, isSuperAdmin,upload.single('file'), upload_trainee_csv);

export default router;