import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from 'mongoose';
import admin from "firebase-admin";
import serviceAccount from "./config/serviceAccountKey.json" assert { type: "json" };

import authRoutes from "./routes/index.js"
import authCheck from "./routes/authCheck.js"
import facilitatorRoutes from './routes/facilitatoRoutes.js';
 
const PORT = process.env.PORT;
const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());
app.use(express.json());

app.use("/api/auth/", authRoutes);
app.use("/api/add-user/", authCheck);
app.use('/api/facilitators', facilitatorRoutes);

app.all("*", (req, res) => res.send("error 404 page not found"));

app.listen(PORT, () =>
  console.log(
    `server connected and running on ${PORT}, http://localhost:${PORT}`
  )
);
