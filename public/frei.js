let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

async function submitMatch() {
  const p1Name = document.getElementById("p1Name").value.trim();
  const p1Class = document.getElementById("p1Class").value.trim();
  const p2Name = document.getElementById("p2Name").value.trim();
  const p2Class = document.getElementById("p2Class").value.trim();
  const result = document.getElementById("result").value;

  if (!p1Name || !p1Class || !p2Name || !p2Class) {
    document.getElementById("status").textContent = "Bitte alle Felder ausfüllen.";
    return;
  }

  const match = {
    p1: { name: p1Name, class: p1Class },
    p2: { name: p2Name, class: p2Class },
    result,
    deviceId
  };

  try {
    const res = await fetch("/api/frei/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match)
    });

    const data = await res.json();
    document.getElementById("status").textContent = data.message;

    if (res.ok) {
      loadLeaderboard();
      // Formular leeren
      ["p1Name", "p1Class", "p2Name", "p2Class"].forEach(id => document.getElementById(id).value = "");
      document.getElementById("result").value = "1";
    }
  } catch {
    document.getElementById("status").textContent = "Fehler beim Senden der Daten.";
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch("/api/frei/leaderboard");
    const data = await res.json();
    window.leaderboardData = data;
    renderLeaderboard();
  } catch {
    document.getElementById("status").textContent = "Fehler beim Laden des Leaderboards.";
  }
}

function renderLeaderboard() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const table = document.getElementById("leaderboard");

  table.innerHTML = `
    <tr>
      <th>Spieler</th>
      <th>Klasse</th>
      <th>Siege</th>
      <th>Niederlagen</th>
      <th>Unentschieden</th>
      <th>Punkte</th>
    </tr>
  `;

  for (const player of window.leaderboardData || []) {
    if (player.name.toLowerCase().includes(search)) {
      table.innerHTML += `
        <tr>
          <td>${player.name}</td>
          <td>${player.class}</td>
          <td>${player.wins}</td>
          <td>${player.losses}</td>
          <td>${player.draws}</td>
          <td>${player.points}</td>
        </tr>
      `;
    }
  }
}

loadLeaderboard();
