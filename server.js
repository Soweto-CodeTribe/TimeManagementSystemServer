import express from "express";
import cors from "cors";
import "dotenv/config";

import facilitatorRoutes from "./routes/facilitatoRoutes.js";
import authRoutes from "./routes/index.js";
import authCheck from "./routes/authCheck.js";
import csvRoutes from "./routes/csvRoutes.js"
import meetingRoutes from "./routes/meetingRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import messageRoutes from "./routes/notificationRoutes.js";
import geofencingRoutes from "./routes/geofencingRoutes.js";
import qrCodeRoutes from "./routes/qrCodeRoutes.js";
import ticketRoutes from "./routes/ticketsRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import stakeholderRoutes from './routes/stakeholderRoutes.js';
import { scheduleQRCodeGeneration } from "./controllers/qrCodeController.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import facilitatorReport from "./routes/facilitatorReportRoutes.js";
import { autoCheckOutTrainees, scheduleAutoCheckOut, standardizeTimeFormat } from "./controllers/sessionController.js";
import { cleanupVerificationCodes } from "./controllers/authController.js";
import absenteeismRoutes from "./routes/absenteeismRoutes.js";
const PORT = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Call function to auto generate QR codes daily
scheduleQRCodeGeneration();
scheduleAutoCheckOut()
// const timeTest = standardizeTimeFormat("07:23 pm")
// console.log("converter time: ",timeTest)

//function to auto check out trainees
// autoCheckOutTrainees()

app.use("/api/auth/", authRoutes);
app.use("/api/add-user/", authCheck);
app.use("/api/facilitators", facilitatorRoutes);
app.use("/api/csv", csvRoutes)
app.use("/api/", authCheck);
app.use("/api/", meetingRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/", messageRoutes);
app.use("/api/", geofencingRoutes);
app.use("/api/QR", qrCodeRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/guests", eventsRoutes);
app.use("/api/stakeholder", stakeholderRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/", facilitatorReport);
app.use("/api/", absenteeismRoutes);
app.all("*", (req, res) => res.send("error 404 page not found"));


// Run cleanup
cleanupVerificationCodes()
  .then(result => {
    if (result.success) {
      console.log(`Startup cleanup: removed ${result.deletedCount} old verification codes`);
    }
  })
  .catch(err => console.error("Startup cleanup failed:", err));

app.listen(PORT, () =>
  console.log(
    `server connected and running on ${PORT}, http://localhost:${PORT}`
  )
);
