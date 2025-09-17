import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cors from "cors";
import bodyParser from "body-parser";

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

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

// Example protected deploy route
app.post("/deploy", authenticateToken, (req, res) => {
  const { repo_url, session_id, phone_number } = req.body;

  if (!repo_url || !session_id || !phone_number) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Hapa unaweza kuunganisha na Docker/Render API/GitHub API
  res.json({
    message: "Deployment started",
    repo: repo_url,
    phone: phone_number,
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
