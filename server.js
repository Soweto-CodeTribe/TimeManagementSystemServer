import express from "express";
import cors from "cors";
import "dotenv/config";

import facilitatorRoutes from './routes/facilitatoRoutes.js';
import authRoutes from "./routes/index.js"
import authCheck from "./routes/authCheck.js"
import meetingRoutes from "./routes/meetingRoutes.js"
import sessionRoutes from "./routes/sessionRoutes.js"
import ticketRoutes from './routes/ticketsRoutes.js'

 
const PORT = process.env.PORT;
const app = express();



app.use(cors());
app.use(express.json());

app.use("/api/auth/", authRoutes);
app.use("/api/add-user/", authCheck);
app.use('/api/facilitators', facilitatorRoutes);
app.use("/api/", authCheck);
app.use("/api/", meetingRoutes);
app.use("/api/session", sessionRoutes);
app.use('/api/tickets', ticketRoutes);


app.all("*", (req, res) => res.send("error 404 page not found"));

app.listen(PORT, () =>
  console.log(
    `server connected and running on ${PORT}, http://localhost:${PORT}`
  )
);
