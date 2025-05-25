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

// Admin-Login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!adminHash) return res.status(500).json({ success: false, error: "Admin-Hash nicht gefunden" });

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

// Freie Matches: Eintrag
app.post("/api/frei/add", (req, res) => {
  const { p1, p2, result, deviceId } = req.body;
  const ip = getClientIP(req);

  if (!p1 || !p2 || !result || !deviceId) {
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
  matches.push({ p1, p2, result, timestamp: Date.now() });
  saveJSON(FREI_MATCHES, matches);

  log.push({ ip, deviceId, date: today });
  saveJSON(FREI_LOG, log);

  res.json({ message: "Eintrag gespeichert!" });
});

// Freie Matches: Leaderboard
app.get("/api/frei/leaderboard", (req, res) => {
  const matches = loadJSON(FREI_MATCHES);
  const players = {};

  for (const match of matches) {
    const { p1, p2, result } = match;
    const name1 = p1.name.trim();
    const name2 = p2.name.trim();

    if (!players[name1]) players[name1] = { name: name1, class: p1.class, wins: 0, losses: 0, draws: 0, points: 0 };
    if (!players[name2]) players[name2] = { name: name2, class: p2.class, wins: 0, losses: 0, draws: 0, points: 0 };

    if (result === "1") {
      players[name1].wins++;
      players[name1].points += 3;
      players[name2].losses++;
    } else if (result === "2") {
      players[name2].wins++;
      players[name2].points += 3;
      players[name1].losses++;
    } else if (result === "draw") {
      players[name1].draws++;
      players[name2].draws++;
      players[name1].points += 1;
      players[name2].points += 1;
    }
  }

  const leaderboard = Object.values(players).sort((a, b) => b.points - a.points);
  res.json(leaderboard);
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

