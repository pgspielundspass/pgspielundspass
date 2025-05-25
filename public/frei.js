let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

async function submitMatch() {
  const p1 = document.getElementById("p1").value.trim();
  const p2 = document.getElementById("p2").value.trim();
  const result = document.getElementById("result").value;
  const res = await fetch("/api/frei/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p1, p2, result, deviceId })
  });

  const data = await res.json();
  document.getElementById("status").textContent = data.message;
  if (res.ok) loadLeaderboard();
}

async function loadLeaderboard() {
  const res = await fetch("/api/frei/leaderboard");
  const data = await res.json();
  const table = document.getElementById("leaderboard");
  table.innerHTML = "<tr><th>Spieler</th><th>Siege</th></tr>";
  for (const player of data) {
    const row = `<tr><td>${player.name}</td><td>${player.wins}</td></tr>`;
    table.innerHTML += row;
  }
}

loadLeaderboard();
