import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cors from "cors";
import bodyParser from "body-parser";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Values from .env
const ADMIN_USER = process.env.ADMIN_USER || "peter";
const ADMIN_PASS = process.env.ADMIN_PASS || "12345";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Middleware to protect routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

// Deploy
app.post("/deploy", authenticateToken, async (req, res) => {
  const { repo_url, session_id, phone_number } = req.body;

  if (!repo_url || !session_id || !phone_number) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const repoName = repo_url.split("/").pop().replace(".git", "");
  const deployDir = path.join("/tmp", repoName);

  // Hakikisha folder tupu
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }

  // 1. Clone repo
  exec(`git clone ${repo_url} ${deployDir}`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: "Clone failed", details: stderr });
    }

    // 2. Weka SESSION_ID kwenye env file ya project
    fs.writeFileSync(
      path.join(deployDir, ".env"),
      `SESSION_ID=${session_id}\nOWNER_NUMBER=${phone_number}\n`
    );

    // 3. Install dependencies
    exec(`cd ${deployDir} && npm install`, (err2, stdout2, stderr2) => {
      if (err2) {
        return res.status(500).json({ error: "npm install failed", details: stderr2 });
      }

      // 4. Run bot process (background)
      exec(`cd ${deployDir} && npm start`, (err3, stdout3, stderr3) => {
        if (err3) {
          console.error("Bot run error:", stderr3);
        }
        console.log("Bot running:", stdout3);
      });

      res.json({
        message: "Deployment started",
        repo: repo_url,
        phone: phone_number,
      });
    });
  });
});

// Default
app.get("/", (req, res) => {
  res.send("🚀 Secure Repo Deployer Backend is running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
