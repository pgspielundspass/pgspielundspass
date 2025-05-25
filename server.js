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

// --- Admin Login ---
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!adminHash) return res.status(500).json({ success: false, error: "Admin-Hash fehlt" });

  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash === adminHash) {
    const token = Math.random().toString(36).substring(2);
    activeSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: "Falsches Passwort" });
  }
});

function checkAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (activeSessions.has(token)) {
    next();
  } else {
    res.status(403).json({ error: "Nicht autorisiert" });
  }
}

// --- API: Geschützte Matches (Admin) ---
app.get("/api/matches", (req, res) => {
  fs.readFile(DATA_PATH, (err, data) => {
    if (err) return res.status(500).json({ error: "Datei nicht lesbar" });
    res.json(JSON.parse(data));
  });
});

app.post("/api/matches", checkAuth, (req, res) => {
  const newMatch = req.body;
  const matches = loadJSON(DATA_PATH);
  matches.push(newMatch);
  saveJSON(DATA_PATH, matches);
  res.json({ success: true });
});

app.delete("/api/matches/last", checkAuth, (req, res) => {
  const matches = loadJSON(DATA_PATH);
  matches.pop();
  saveJSON(DATA_PATH, matches);
  res.json({ success: true });
});

// --- API: Freie Matches ---
app.post("/api/frei/add", (req, res) => {
  const { p1, p1Class, p2, p2Class, result, deviceId } = req.body;
  const ip = getClientIP(req);

  if (!p1 || !p2 || !p1Class || !p2Class || !result || !deviceId) {
    return res.status(400).json({ message: "Ungültige Daten." });
  }

  const log = loadJSON(FREI_LOG);
  const today = new Date().toISOString().slice(0, 10);

  const alreadySubmitted = log.find(
    entry => entry.ip === ip && entry.deviceId === deviceId && entry.date === today
  );

  if (alreadySubmitted) {
    return res.status(429).json({ message: "Nur ein Eintrag pro Tag erlaubt." });
  }

  const matches = loadJSON(FREI_MATCHES);
  matches.push({ p1, p1Class, p2, p2Class, result, timestamp: Date.now() });
  saveJSON(FREI_MATCHES, matches);

  log.push({ ip, deviceId, date: today });
  saveJSON(FREI_LOG, log);

  res.json({ message: "Match gespeichert!" });
});

app.get("/api/frei/leaderboard", (req, res) => {
  const matches = loadJSON(FREI_MATCHES);
  const stats = {};

  for (const match of matches) {
    const p1Key = `${match.p1} ${match.p1Class}`;
    const p2Key = `${match.p2} ${match.p2Class}`;

    if (!stats[p1Key]) stats[p1Key] = { name: match.p1, class: match.p1Class, wins: 0, losses: 0, draws: 0, points: 0 };
    if (!stats[p2Key]) stats[p2Key] = { name: match.p2, class: match.p2Class, wins: 0, losses: 0, draws: 0, points: 0 };

    if (match.result === "1") {
      stats[p1Key].wins++;
      stats[p1Key].points += 2;
      stats[p2Key].losses++;
      stats[p2Key].points -= 1;
    } else if (match.result === "2") {
      stats[p2Key].wins++;
      stats[p2Key].points += 2;
      stats[p1Key].losses++;
      stats[p1Key].points -= 1;
    } else if (match.result === "draw") {
      stats[p1Key].draws++;
      stats[p2Key].draws++;
    }
  }

  const leaderboard = Object.entries(stats)
    .map(([_, s]) => s)
    .sort((a, b) => b.points - a.points);

  res.json(leaderboard);
});

// --- Server starten ---
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
