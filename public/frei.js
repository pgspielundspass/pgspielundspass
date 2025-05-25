let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

let leaderboardData = [];

async function submitMatch() {
  const p1 = document.getElementById("p1Name").value.trim();
  const c1 = document.getElementById("p1Class").value.trim();
  const p2 = document.getElementById("p2Name").value.trim();
  const c2 = document.getElementById("p2Class").value.trim();
  const result = document.getElementById("result").value;

  if (!p1 || !p2 || !c1 || !c2) {
    document.getElementById("status").textContent = "Bitte alle Felder ausfüllen.";
    return;
  }

  try {
    const res = await fetch("/api/frei/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p1, c1, p2, c2, result, deviceId }),
    });

    const data = await res.json();
    document.getElementById("status").textContent = data.message;

    if (res.ok) {
      document.querySelectorAll("input").forEach(i => i.value = "");
      document.getElementById("result").value = "1";
      await loadLeaderboard();
    }
  } catch {
    document.getElementById("status").textContent = "Fehler beim Senden.";
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
  const table = document.getElementById("leaderboard");
  const search = document.getElementById("searchInput").value.toLowerCase();
  const filtered = leaderboardData.filter(p =>
    p.name.toLowerCase().includes(search) || p.class.toLowerCase().includes(search)
  );

  table.innerHTML = `
    <tr>
      <th>Name</th><th>Klasse</th><th>Siege</th><th>Ndl.</th><th>Unent.</th><th>Punkte</th>
    </tr>
  `;

  for (const player of filtered) {
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

loadLeaderboard();

