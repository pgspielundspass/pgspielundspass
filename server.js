const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, "data", "matches.json");
const HASH_PATH = path.join(__dirname, "admin.hash");

const FREI_MATCHES = path.join(__dirname, "data", "frei-matches.json");
const FREI_LOG = path.join(__dirname, "data", "frei-log.json");

const adminHash = fs.existsSync(HASH_PATH) ? fs.readFileSync(HASH_PATH, "utf-8").trim() : null;
const activeSessions = new Set();

app.use(express.json());
app.use(express.static("public"));

function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) return [];
  return JSON.parse(fs.readFileSync(filepath));
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function getClientIP(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

// --- Admin Auth ---

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!adminHash) return res.status(500).json({ success: false, error: "Admin-Hash fehlt" });
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash === adminHash) {
    const token = crypto.randomUUID();
    activeSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: "Falsches Passwort" });
  }
});

function checkAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (activeSessions.has(token)) next();
  else res.status(403).json({ error: "Nicht autorisiert" });
}

// --- Freies Match eintragen ---

app.post("/api/frei/add", (req, res) => {
  const { p1, p1Class, p2, p2Class, result, deviceId } = req.body;
  const ip = getClientIP(req);
  if (!p1 || !p2 || !result || !deviceId || !p1Class || !p2Class) {
    return res.status(400).json({ message: "Fehlende Daten." });
  }

  const log = loadJSON(FREI_LOG);
  const today = new Date().toISOString().slice(0, 10);
  const alreadySubmitted = log.find(e => e.ip === ip && e.deviceId === deviceId && e.date === today);
  if (alreadySubmitted) return res.status(429).json({ message: "Nur ein Eintrag pro Tag erlaubt." });

  const matches = loadJSON(FREI_MATCHES);
  matches.push({ p1, p1Class, p2, p2Class, result, timestamp: Date.now() });
  saveJSON(FREI_MATCHES, matches);

  log.push({ ip, deviceId, date: today });
  saveJSON(FREI_LOG, log);

  res.json({ message: "Match gespeichert!" });
});

// --- Leaderboard generieren ---

app.get("/api/frei/leaderboard", (req, res) => {
  const matches = loadJSON(FREI_MATCHES);
  const stats = {};

  for (const match of matches) {
    const { p1, p2, p1Class, p2Class, result } = match;

    if (!stats[p1]) stats[p1] = { name: p1, class: p1Class, wins: 0, losses: 0, draws: 0, points: 0 };
    if (!stats[p2]) stats[p2] = { name: p2, class: p2Class, wins: 0, losses: 0, draws: 0, points: 0 };

    if (result === "1") {
      stats[p1].wins++;
      stats[p1].points += 2;
      stats[p2].losses++;
      stats[p2].points -= 1;
    } else if (result === "2") {
      stats[p2].wins++;
      stats[p2].points += 2;
      stats[p1].losses++;
      stats[p1].points -= 1;
    } else if (result === "draw") {
      stats[p1].draws++;
      stats[p2].draws++;
    }
  }

  const leaderboard = Object.values(stats).sort((a, b) => b.points - a.points);
  res.json(leaderboard);
});

// --- Server starten ---
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

