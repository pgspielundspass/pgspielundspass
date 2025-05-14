let matches = [];
let authToken = null;

document.addEventListener("DOMContentLoaded", fetchMatches);

function login() {
  const pw = document.getElementById("password").value;
  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pw })
  })
  .then(res => {
    if (!res.ok) throw new Error("Login fehlgeschlagen");
    return res.json();
  })
  .then(data => {
    authToken = data.token;
    document.getElementById("admin").style.display = "block";
    document.getElementById("login").style.display = "none";
  })
  .catch(() => alert("Falsches Passwort!"));
}

function fetchMatches() {
  fetch("/api/matches")
    .then(res => res.json())
    .then(data => {
      matches = data;
      renderLeaderboard();
    });
}

function addMatch() {
  const p1 = { name: p1Name.value.trim(), class: p1Class.value.trim() };
  const p2 = { name: p2Name.value.trim(), class: p2Class.value.trim() };
  const result = resultSelect.value;
  if (!p1.name || !p2.name || !p1.class || !p2.class) return alert("Alle Felder ausfüllen!");

  fetch("/api/matches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authToken
    },
    body: JSON.stringify({ p1, p2, result, date: new Date().toISOString() })
  }).then(fetchMatches);
}

function undoLast() {
  fetch("/api/matches/last", {
    method: "DELETE",
    headers: { "Authorization": authToken }
  }).then(fetchMatches);
}

function calculateStats(matches) {
  const stats = {};
  for (let match of matches) {
    const { p1, p2, result } = match;
    for (let p of [p1, p2]) {
      if (!stats[p.name]) stats[p.name] = { name: p.name, class: p.class, points: 0, wins: 0, losses: 0, draws: 0 };
    }
    if (result === "1") {
      stats[p1.name].points += 2;
      stats[p1.name].wins++;
      stats[p2.name].points -= 1;
      stats[p2.name].losses++;
    } else if (result === "2") {
      stats[p2.name].points += 2;
      stats[p2.name].wins++;
      stats[p1.name].points -= 1;
      stats[p1.name].losses++;
    } else {
      stats[p1.name].draws++;
      stats[p2.name].draws++;
    }
  }
  return Object.values(stats).sort((a, b) => b.points - a.points);
}

function renderLeaderboard() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const table = document.getElementById("leaderboard");
  const stats = calculateStats(matches);
  table.innerHTML = "<tr><th>Spieler</th><th>Klasse</th><th>Punkte</th><th>Siege</th><th>Niederlagen</th><th>Unentschieden</th></tr>";
  for (let s of stats) {
    if (!s.name.toLowerCase().includes(search)) continue;
    const row = table.insertRow();
    row.innerHTML = `<td><a href="#" onclick="showDetails('${s.name}')">${s.name}</a></td><td>${s.class}</td><td>${s.points}</td><td>${s.wins}</td><td>${s.losses}</td><td>${s.draws}</td>`;
  }
}

function showDetails(name) {
  const filtered = matches.filter(m => m.p1.name === name || m.p2.name === name);
  const wins = filtered.filter(m => (m.result === "1" && m.p1.name === name) || (m.result === "2" && m.p2.name === name)).length;
  const losses = filtered.filter(m => (m.result === "2" && m.p1.name === name) || (m.result === "1" && m.p2.name === name)).length;
  const draws = filtered.filter(m => m.result === "draw").length;
  const total = filtered.length;

  const details = document.getElementById("playerDetails");
  details.innerHTML = `
    <h3>${name}</h3>
    <p>Spiele: ${total}, Siege: ${wins}, Niederlagen: ${losses}, Unentschieden: ${draws}</p>
    <h4>Match-Historie</h4>
    <ul>${filtered.map(m => `<li>${m.date.split("T")[0]}: ${m.p1.name} vs ${m.p2.name} - ${getMatchResultText(m, name)}</li>`).join("")}</ul>
  `;
}

function getMatchResultText(match, name) {
  if (match.result === "draw") return "Unentschieden";
  if ((match.result === "1" && match.p1.name === name) || (match.result === "2" && match.p2.name === name)) return "Gewonnen";
  return "Verloren";
}
