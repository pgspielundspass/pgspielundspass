const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, "data", "matches.json");
const HASH_PATH = path.join(__dirname, "admin.hash");

const adminHash = fs.readFileSync(HASH_PATH, "utf-8").trim();
const activeSessions = new Set();

app.use(express.json());
app.use(express.static("public"));

// Admin-Login (vergleicht Passwort-Hash)
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash === adminHash) {
    const token = Math.random().toString(36).substring(2);
    activeSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: "Falsches Passwort" });
  }
});

// Middleware zum Prüfen des Tokens
function checkAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (activeSessions.has(token)) {
    next();
  } else {
    res.status(403).json({ error: "Nicht autorisiert" });
  }
}

// Alle Matches abrufen
app.get("/api/matches", (req, res) => {
  fs.readFile(DATA_PATH, (err, data) => {
    if (err) return res.status(500).json({ error: "Datei nicht lesbar" });
    res.json(JSON.parse(data));
  });
});

// Neues Match speichern (geschützt)
app.post("/api/matches", checkAuth, (req, res) => {
  const newMatch = req.body;
  fs.readFile(DATA_PATH, (err, data) => {
    if (err) return res.status(500).json({ error: "Lesefehler" });
    const matches = JSON.parse(data);
    matches.push(newMatch);
    fs.writeFile(DATA_PATH, JSON.stringify(matches, null, 2), err => {
      if (err) return res.status(500).json({ error: "Schreibfehler" });
      res.json({ success: true });
    });
  });
});

// Letztes Match löschen (geschützt)
app.delete("/api/matches/last", checkAuth, (req, res) => {
  fs.readFile(DATA_PATH, (err, data) => {
    if (err) return res.status(500).json({ error: "Lesefehler" });
    const matches = JSON.parse(data);
    matches.pop();
    fs.writeFile(DATA_PATH, JSON.stringify(matches, null, 2), err => {
      if (err) return res.status(500).json({ error: "Schreibfehler" });
      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
// Freie Website
const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
app.use(express.json());

const FREI_MATCHES = path.join(__dirname, "data/frei-matches.json");
const FREI_LOG = path.join(__dirname, "data/frei-log.json");

function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) return [];
  return JSON.parse(fs.readFileSync(filepath));
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function getClientIP(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
}

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

app.get("/api/frei/leaderboard", (req, res) => {
  const matches = loadJSON(FREI_MATCHES);
  const players = {};

  for (const match of matches) {
    if (match.result === "1") players[match.p1] = (players[match.p1] || 0) + 1;
    else if (match.result === "2") players[match.p2] = (players[match.p2] || 0) + 1;
  }

  const leaderboard = Object.entries(players)
    .map(([name, wins]) => ({ name, wins }))
    .sort((a, b) => b.wins - a.wins);

  res.json(leaderboard);
});
