const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_PATH = path.join(__dirname, "data", "matches.json");

app.use(express.json());
app.use(express.static("public"));

// Matches laden
app.get("/api/matches", (req, res) => {
  fs.readFile(DATA_PATH, (err, data) => {
    if (err) return res.status(500).json({ error: "Datei nicht lesbar" });
    res.json(JSON.parse(data));
  });
});

// Neues Match speichern
app.post("/api/matches", (req, res) => {
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

// Letztes Match löschen
app.delete("/api/matches/last", (req, res) => {
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
