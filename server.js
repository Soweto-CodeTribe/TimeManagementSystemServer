// import express from "express";
// import cors from "cors";
// import "dotenv/config";

// import facilitatorRoutes from "./routes/facilitatoRoutes.js";
// import authRoutes from "./routes/index.js";
// import authCheck from "./routes/authCheck.js";
// import csvRoutes from "./routes/csvRoutes.js"
// import meetingRoutes from "./routes/meetingRoutes.js";
// import sessionRoutes from "./routes/sessionRoutes.js";
// import messageRoutes from "./routes/notificationRoutes.js";
// import geofencingRoutes from "./routes/geofencingRoutes.js";
// import qrCodeRoutes from "./routes/qrCodeRoutes.js";
// import ticketRoutes from "./routes/ticketsRoutes.js";
// import eventsRoutes from "./routes/eventsRoutes.js";
// import stakeholderRoutes from './routes/stakeholderRoutes.js';
// import { scheduleQRCodeGeneration } from "./controllers/qrCodeController.js";
// import superAdminRoutes from "./routes/superAdminRoutes.js";
// import facilitatorReport from "./routes/facilitatorReportRoutes.js";
// import { autoCheckOutTrainees, scheduleAutoCheckOut, standardizeTimeFormat } from "./controllers/sessionController.js";
// import { cleanupVerificationCodes } from "./controllers/authController.js";
// import absenteeismRoutes from "./routes/absenteeismRoutes.js";
// const PORT = process.env.PORT;
// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// //Call function to auto generate QR codes daily
// scheduleQRCodeGeneration();
// // scheduleAutoCheckOut()
// // const timeTest = standardizeTimeFormat("07:23 pm")
// // console.log("converter time: ",timeTest)

// //function to auto check out trainees
// // autoCheckOutTrainees()

// app.use("/api/auth/", authRoutes);
// app.use("/api/add-user/", authCheck);
// app.use("/api/facilitators", facilitatorRoutes);
// app.use("/api/csv", csvRoutes)
// app.use("/api/", authCheck);
// app.use("/api/", meetingRoutes);
// app.use("/api/session", sessionRoutes);
// app.use("/api/", messageRoutes);
// app.use("/api/", geofencingRoutes);
// app.use("/api/QR", qrCodeRoutes);
// app.use("/api/tickets", ticketRoutes);
// app.use("/api/guests", eventsRoutes);
// app.use("/api/stakeholder", stakeholderRoutes);
// app.use("/api/super-admin", superAdminRoutes);
// app.use("/api/", facilitatorReport);
// app.use("/api/", absenteeismRoutes);
// app.all("*", (req, res) => res.send("error 404 page not found"));


// // Run cleanup
// cleanupVerificationCodes()
//   .then(result => {
//     if (result.success) {
//       console.log(`Startup cleanup: removed ${result.deletedCount} old verification codes`);
//     }
//   })
//   .catch(err => console.error("Startup cleanup failed:", err));

// app.listen(PORT, () =>
//   console.log(
//     `server connected and running on ${PORT}, http://localhost:${PORT}`
//   )
// );
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import "dotenv/config";

// Import Firebase admin from your existing file
import {admin,db} from './config/firebaseAdminConfig.js';

// Routes imports
import facilitatorRoutes from "./routes/facilitatoRoutes.js";
import authRoutes from "./routes/index.js";
import authCheck from "./routes/authCheck.js";
import csvRoutes from "./routes/csvRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import messageRoutes from "./routes/notificationRoutes.js";
import geofencingRoutes from "./routes/geofencingRoutes.js";
import qrCodeRoutes from "./routes/qrCodeRoutes.js";
import ticketRoutes from "./routes/ticketsRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import stakeholderRoutes from './routes/stakeholderRoutes.js';
import superAdminRoutes from "./routes/superAdminRoutes.js";
import facilitatorReport from "./routes/facilitatorReportRoutes.js";
import absenteeismRoutes from "./routes/absenteeismRoutes.js";
import notificationRoutes from './routes/notifRoutes.js';

// Controllers imports
import { scheduleQRCodeGeneration } from "./controllers/qrCodeController.js";
import { autoCheckOutTrainees, scheduleAutoCheckOut, standardizeTimeFormat } from "./controllers/sessionController.js";
import { cleanupVerificationCodes } from "./controllers/authController.js";

// Import Socket.IO authentication middleware
import { socketAuth } from './utilities/index.js';

// Initialize Express and create HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io available to the routes via request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO middleware for authentication
io.use(socketAuth);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join user to their own room for targeted notifications
  if (socket.user && socket.user.id) {
    socket.join(`user-${socket.user.id}`);
    console.log(`User ${socket.user.id} joined their room`);
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Scheduled tasks
scheduleQRCodeGeneration();
// scheduleAutoCheckOut();
// autoCheckOutTrainees();

// Routes
app.use("/api/auth/", authRoutes);
app.use("/api/add-user/", authCheck);
app.use("/api/facilitators", facilitatorRoutes);
app.use("/api/csv", csvRoutes);
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
app.use("/api", notificationRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Trainee Management API is running');
});

// Catch-all route
app.all("*", (req, res) => res.send("error 404 page not found"));

// Run cleanup
cleanupVerificationCodes()
  .then(result => {
    if (result.success) {
      console.log(`Startup cleanup: removed ${result.deletedCount} old verification codes`);
    }
  })
  .catch(err => console.error("Startup cleanup failed:", err));

// Start server
server.listen(PORT, () => 
  console.log(`Server connected and running on ${PORT}, http://localhost:${PORT}`)
);

// Export io for external use if needed
export { io };
