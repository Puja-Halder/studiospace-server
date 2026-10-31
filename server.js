import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import connectDB from "./config/db.js";
import { auth, connectAuthDB } from "./config/auth.js";
import studioRoutes from "./routes/studioRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to StudioSpace API!");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StudioSpace server is running successfully!",
  });
});

app.use("/api/studios", studioRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await connectAuthDB();

  app.listen(PORT, () => {
    console.log(`StudioSpace server running on port ${PORT}`);
  });
};

startServer();