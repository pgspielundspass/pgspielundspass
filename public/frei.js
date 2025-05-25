let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

let leaderboardData = [];

async function submitMatch() {
  const p1 = document.getElementById("p1").value.trim();
  const p2 = document.getElementById("p2").value.trim();
  const result = document.getElementById("result").value;

  if (!p1 || !p2) {
    document.getElementById("status").textContent = "Bitte beide Spielernamen eingeben.";
    return;
  }

  try {
    const res = await fetch("/api/frei/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p1, p2, result, deviceId }),
    });

    const data = await res.json();
    document.getElementById("status").textContent = data.message;

    if (res.ok) {
      document.getElementById("p1").value = "";
      document.getElementById("p2").value = "";
      document.getElementById("result").value = "1";
      await loadLeaderboard();
    }
  } catch {
    document.getElementById("status").textContent = "Fehler beim Eintragen.";
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch("/api/frei/leaderboard");
    leaderboardData = await res.json();
    renderLeaderboard();
  } catch {
    document.getElementById("status").textContent = "Fehler beim Laden des Leaderboards.";
  }
}

function renderLeaderboard() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const table = document.getElementById("leaderboard");
  table.innerHTML = "<tr><th>Spieler</th><th>Siege</th></tr>";

  for (const player of leaderboardData) {
    if (!search || player.name.toLowerCase().includes(search)) {
      const row = `<tr><td>${player.name}</td><td>${player.wins}</td></tr>`;
      table.innerHTML += row;
    }
  }
}

loadLeaderboard();
