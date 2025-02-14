import express from "express";
import cors from "cors";
import "dotenv/config";
import admin from "firebase-admin";
// import serviceAccount from "./config/serviceAccountKey"

import authRoutes from "./routes/index.js"
import authCheck from "./routes/authCheck.js"
 
const PORT = process.env.PORT;
const app = express();

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

app.use(cors());
app.use(express.json());

app.use("/api/auth/", authRoutes);
app.use("/api/", authCheck);

app.all("*", (req, res) => res.send("error 404 page not found"));

app.listen(PORT, () =>
  console.log(
    `server connected and running on ${PORT}, http://localhost:${PORT}`
  )
);