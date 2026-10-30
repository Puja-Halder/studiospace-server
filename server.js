
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`StudioSpace server running on port ${PORT}`);
});
