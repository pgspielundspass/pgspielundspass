const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const MATCHES_PATH = path.join(DATA_DIR, "matches.json");      // Admin-Matches
const FREI_MATCHES_PATH = path.join(DATA_DIR, "frei-matches.json"); // Öffentliche freie Matches
const FREI_LOG_PATH = path.join(DATA_DIR, "frei-log.json");
const ADMIN_HASH_PATH = path.join(__dirname, "admin.hash");

const adminHash = fs.existsSync(ADMIN_HASH_PATH)
  ? fs.readFileSync(ADMIN_HASH_PATH, "utf-8").trim()
  : null;

const activeSessions = new Set();

app.use(express.json());
app.use(express.static("public"));

// Hilfsfunktionen
function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) return [];
  return JSON.parse(fs.readFileSync(filepath));
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function getClientIP(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim();
}

function getUserAgent(req) {
  return req.headers["user-agent"] || "";
}

// Auth Middleware
function checkAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (token && activeSessions.has(token)) {
    next();
  } else {
    res.status(403).json({ error: "Nicht autorisiert" });
  }
}

// --- Login Route ---
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

// --- Admin Matches API ---

// Öffentliche Liste aller Admin-Matches
app.get("/api/matches", (req, res) => {
  const matches = loadJSON(MATCHES_PATH);
  res.json(matches);
});

// Nur Admin kann Matches hinzufügen
app.post("/api/matches", checkAuth, (req, res) => {
  const { p1, p2, result, date } = req.body;
  if (!p1 || !p2 || !result || !date) {
    return res.status(400).json({ error: "Unvollständige Spieldaten." });
  }
  const matches = loadJSON(MATCHES_PATH);
  matches.push({ p1, p2, result, date });
  saveJSON(MATCHES_PATH, matches);
  res.json({ success: true, message: "Match gespeichert." });
});

// Nur Admin kann letzten Match löschen
app.delete("/api/matches/last", checkAuth, (req, res) => {
  const matches = loadJSON(MATCHES_PATH);
  if (matches.length === 0) {
    return res.status(400).json({ error: "Keine Matches vorhanden." });
  }
  matches.pop();
  saveJSON(MATCHES_PATH, matches);
  res.json({ success: true, message: "Letztes Match entfernt." });
});

// --- Öffentlicher Freier Bereich ---

// Freie Matches hinzufügen (einmal pro Tag pro IP/Device/UserAgent)
app.post("/api/frei/add", (req, res) => {
  const { p1, p1Class, p2, p2Class, result, deviceId } = req.body;
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);

  if (!p1 || !p2 || !p1Class || !p2Class || !result || !deviceId) {
    return res.status(400).json({ message: "Ungültige Daten." });
  }

  const log = loadJSON(FREI_LOG_PATH);
  const today = new Date().toISOString().slice(0, 10);

  const alreadySubmitted = log.find(
    (entry) =>
      entry.date === today &&
      (entry.ip === ip || entry.deviceId === deviceId || entry.userAgent === userAgent)
  );

  if (alreadySubmitted) {
    return res.status(429).json({ message: "Nur ein Eintrag pro Tag erlaubt." });
  }

  const matches = loadJSON(FREI_MATCHES_PATH);
  matches.push({
    p1,
    p1Class,
    p2,
    p2Class,
    result,
    timestamp: Date.now(),
  });
  saveJSON(FREI_MATCHES_PATH, matches);

  log.push({ ip, deviceId, userAgent, date: today });
  saveJSON(FREI_LOG_PATH, log);

  res.json({ message: "Match gespeichert!" });
});

// Öffentliches Freies Leaderboard
app.get("/api/frei/leaderboard", (req, res) => {
  const matches = loadJSON(FREI_MATCHES_PATH);
  const stats = {};

  for (const match of matches) {
    const p1Key = `${match.p1} ${match.p1Class}`;
    const p2Key = `${match.p2} ${match.p2Class}`;

    if (!stats[p1Key])
      stats[p1Key] = {
        name: match.p1,
        class: match.p1Class,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
      };
    if (!stats[p2Key])
      stats[p2Key] = {
        name: match.p2,
        class: match.p2Class,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
      };

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

  const leaderboard = Object.values(stats).sort((a, b) => b.points - a.points);
  res.json(leaderboard);
});

// --- NEU: Spieler löschen im freien Bereich (admin-auth) ---
app.delete("/api/frei/player/:name/:class", checkAuth, (req, res) => {
  try {
    const playerName = decodeURIComponent(req.params.name);
    const playerClass = decodeURIComponent(req.params.class);

    if (!playerName || !playerClass) {
      return res.status(400).json({ error: "Name und Klasse müssen angegeben werden." });
    }

    const matches = loadJSON(FREI_MATCHES_PATH);
    if (!Array.isArray(matches)) {
      return res.status(500).json({ error: "Interner Fehler: Matchdaten nicht verfügbar." });
    }

    const filteredMatches = matches.filter(
      (m) =>
        !(
          (m.p1 === playerName && m.p1Class === playerClass) ||
          (m.p2 === playerName && m.p2Class === playerClass)
        )
    );

    if (filteredMatches.length === matches.length) {
      return res.status(404).json({ error: "Spieler mit dieser Klasse nicht gefunden." });
    }

    saveJSON(FREI_MATCHES_PATH, filteredMatches);
    res.json({
      success: true,
      message: `Spieler '${playerName}' (Klasse ${playerClass}) und alle seine Spiele wurden gelöscht.`,
    });
  } catch (err) {
    console.error("Fehler beim Löschen des Spielers:", err);
    res.status(500).json({ error: "Fehler beim Löschen des Spielers." });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
