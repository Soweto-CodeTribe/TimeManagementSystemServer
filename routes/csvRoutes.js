import express from "express";

import { verifyToken } from "../utilities/index.js";
import { isSuperAdmin } from "../middleware/auth.js";
import { upload_trainee_csv, exportTraineesAsCSV, exportTraineeAsCSV } from "../controllers/csvController.js";

const router = express.Router();

router.post(
  "/csv-upload",
//   verifyToken,
//   isSuperAdmin,
  // upload.single("file"),
  upload_trainee_csv
);

router.get("/export-trainees", exportTraineesAsCSV);
router.get("/export-trainees/:id", exportTraineeAsCSV);


export default router;
