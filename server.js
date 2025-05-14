const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const PORT = 3000;

// Alle Daten landen im Speicher (alternativ: JSON-Datei oder DB)
let matches = [];

app.use(bodyParser.json());
app.use(express.static('public'));

// API zum Hinzufügen eines Spiels – nur mit Passwort
app.post('/api/addMatch', (req, res) => {
  const { player1, player2, winner, password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ message: 'Falsches Admin-Passwort' });
  }

  matches.push({ player1, player2, winner, timestamp: Date.now() });
  res.json({ message: 'Spiel erfolgreich gespeichert' });
});

// API zum Laden der Matches
app.get('/api/matches', (req, res) => {
  res.json(matches);
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
