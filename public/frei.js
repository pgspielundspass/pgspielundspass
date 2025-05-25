// frei.js
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
});

function submitMatch() {
  const p1 = document.getElementById("p1Name").value.trim();
  const p2 = document.getElementById("p2Name").value.trim();
  const result = document.getElementById("result").value;

  fetch("/frei/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p1, p2, result })
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("status").textContent = data.message;
      if (data.success) {
        loadLeaderboard();
      }
    });
}

function loadLeaderboard() {
  fetch("/frei/leaderboard")
    .then(res => res.json())
    .then(data => {
      const table = document.getElementById("leaderboard");
      table.innerHTML = "<tr><th>Spieler</th><th>Siege</th><th>Niederlagen</th><th>Unentschieden</th></tr>";
      data.forEach(player => {
        const row = `<tr>
          <td>${player.name}</td>
          <td>${player.wins}</td>
          <td>${player.losses}</td>
          <td>${player.draws}</td>
        </tr>`;
        table.innerHTML += row;
      });
    });
}

