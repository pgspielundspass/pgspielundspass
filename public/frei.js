let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

let matches = [];

async function submitMatch() {
  const p1Name = document.getElementById("p1Name").value.trim();
  const p1Class = document.getElementById("p1Class").value.trim();
  const p2Name = document.getElementById("p2Name").value.trim();
  const p2Class = document.getElementById("p2Class").value.trim();
  const result = document.getElementById("result").value;

  if (!p1Name || !p1Class || !p2Name || !p2Class) {
    alert("Bitte alle Felder ausfüllen!");
    return;
  }
  if (p1Name === p2Name) {
    alert("Spieler 1 und Spieler 2 dürfen nicht gleich sein!");
    return;
  }

  const res = await fetch("/api/frei/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p1: { name: p1Name, class: p1Class }, p2: { name: p2Name, class: p2Class }, result, deviceId }),
  });

  const data = await res.json();
  document.getElementById("status").textContent = data.message;

  if (res.ok) {
    // Formular leeren
    document.getElementById("p1Name").value = "";
    document.getElementById("p1Class").value = "";
    document.getElementById("p2Name").value = "";
    document.getElementById("p2Class").value = "";
    document.getElementById("result").value = "1";

    loadMatches();
  }
}

async function loadMatches() {
  const res = await fetch("/api/frei/leaderboard");
  matches = await res.json();
  renderLeaderboard();
}

function calculateStats(matches) {
  const stats = {};

  for (const match of matches) {
    const { p1, p2, result } = match;

    for (const p of [p1, p2]) {
      if (!stats[p.name]) {
        stats[p.name] = { name: p.name, class: p.class, points: 0, wins: 0, losses: 0, draws: 0 };
      }
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
    } else if (result === "draw") {
      stats[p1.name].draws++;
      stats[p2.name].draws++;
      // keine Punkte
    }
  }

  // Sortiere nach Punkten absteigend
  return Object.values(stats).sort((a, b) => b.points - a.points);
}

function renderLeaderboard() {
  const search = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const table = document.getElementById("leaderboard");
  const stats = calculateStats(matches);

  table.innerHTML =
    "<tr><th>Spieler</th><th>Klasse</th><th>Punkte</th><th>Siege</th><th>Niederlagen</th><th>Unentschieden</th></tr>";

  for (const s of stats) {
    if (!s.name.toLowerCase().includes(search)) continue;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.name}</td>
      <td>${s.class}</td>
      <td>${s.points}</td>
      <td>${s.wins}</td>
      <td>${s.losses}</td>
      <td>${s.draws}</td>
    `;
    table.appendChild(row);
  }
}

// initial laden
loadMatches();
