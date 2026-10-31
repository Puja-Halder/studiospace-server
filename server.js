
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import studioRoutes from "./routes/studioRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

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

  app.listen(PORT, () => {
    console.log(`StudioSpace server running on port ${PORT}`);
  });
};

startServer();
