import express from "express";
import cors from "cors";
import miningRoutes from "./mining.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/mining", miningRoutes);

app.listen(3001, () => {
  console.log("🔐 Anti-cheat server running on http://localhost:3001");
});
