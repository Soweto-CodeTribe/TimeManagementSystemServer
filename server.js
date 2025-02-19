import express from "express";
import cors from "cors";
import "dotenv/config";

import facilitatorRoutes from './routes/facilitatoRoutes.js';
import authRoutes from "./routes/index.js"
import authCheck from "./routes/authCheck.js"
import meetingRoutes from "./routes/meetingRoutes.js"
import sessionRoutes from "./routes/sessionRoutes.js"
import messageRoutes from "./routes/notificationRoutes.js"
import geofencingRoutes from "./routes/geofencingRoutes.js";
import qrCodeRoutes from "./routes/qrCodeRoutes.js"
import ticketRoutes from './routes/ticketsRoutes.js'
import { scheduleQRCodeGeneration } from "./controllers/qrCodeController.js";

 
const PORT = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json());

//Call function to auto generate QR codes daily
scheduleQRCodeGeneration();

app.use("/api/auth/", authRoutes);
app.use("/api/add-user/", authCheck);
app.use('/api/facilitators', facilitatorRoutes);
app.use("/api/", authCheck);
app.use("/api/", meetingRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/", messageRoutes)
app.use("/api/", geofencingRoutes);

app.use("/api/QR", qrCodeRoutes);
app.use('/api/tickets', ticketRoutes);


app.all("*", (req, res) => res.send("error 404 page not found"));

app.listen(PORT, () =>
  console.log(
    `server connected and running on ${PORT}, http://localhost:${PORT}`
  )
);
