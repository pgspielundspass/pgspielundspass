async function submitMatch() {
  const p1 = document.getElementById("p1Name").value.trim();
  const p1Class = document.getElementById("p1Class").value.trim();
  const p2 = document.getElementById("p2Name").value.trim();
  const p2Class = document.getElementById("p2Class").value.trim();
  const result = document.getElementById("result").value;
  const status = document.getElementById("status");

  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }

  if (!p1 || !p2 || !p1Class || !p2Class) {
    status.textContent = "Bitte alle Felder ausfüllen.";
    return;
  }

  try {
    const res = await fetch("/api/frei/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p1, p1Class, p2, p2Class, result, deviceId }),
    });

    const data = await res.json();
    status.textContent = data.message;
    if (res.ok) {
      document.getElementById("p1Name").value = "";
      document.getElementById("p1Class").value = "";
      document.getElementById("p2Name").value = "";
      document.getElementById("p2Class").value = "";
      document.getElementById("result").value = "1";
      loadLeaderboard();
    }
  } catch {
    status.textContent = "Fehler beim Senden.";
  }
}

async function loadLeaderboard() {
  const res = await fetch("/api/frei/leaderboard");
  const data = await res.json();
  const table = document.getElementById("leaderboard");
  const filter = document.getElementById("searchInput").value.toLowerCase();

  table.innerHTML = `<tr>
    <th>Spieler</th>
    <th>Klasse</th>
    <th>Siege</th>
    <th>Niederlagen</th>
    <th>Unentschieden</th>
    <th>Punkte</th>
  </tr>`;

  for (const player of data) {
    if (player.name.toLowerCase().includes(filter)) {
      table.innerHTML += `
        <tr>
          <td>${player.name}</td>
          <td>${player.class}</td>
          <td>${player.wins}</td>
          <td>${player.losses}</td>
          <td>${player.draws}</td>
          <td>${player.points}</td>
        </tr>`;
    }
  }
}

loadLeaderboard();

let authToken = null;

async function adminLogin() {
  const password = document.getElementById("adminPassword").value;
  const loginMessage = document.getElementById("loginMessage");
  loginMessage.textContent = "";

  if (!password) {
    loginMessage.textContent = "Bitte Passwort eingeben.";
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      authToken = data.token;
      loginMessage.textContent = "Login erfolgreich.";
      document.getElementById("adminLogin").style.display = "none";
      document.getElementById("adminPanel").style.display = "block";
    } else {
      loginMessage.textContent = data.error || "Login fehlgeschlagen.";
    }
  } catch {
    loginMessage.textContent = "Fehler beim Login.";
  }
}

async function deletePlayer() {
  const playerName = document.getElementById("deletePlayerName").value.trim();
  const playerClass = document.getElementById("deletePlayerClass").value.trim();
  const deleteMessage = document.getElementById("deleteMessage");
  deleteMessage.textContent = "";

  if (!playerName || !playerClass) {
    deleteMessage.textContent = "Bitte Name und Klasse eingeben!";
    return;
  }
  if (!authToken) {
    deleteMessage.textContent = "Bitte erst als Admin einloggen.";
    return;
  }

  try {
    const res = await fetch(`/api/frei/player/${encodeURIComponent(playerName)}/${encodeURIComponent(playerClass)}`, {
      method: "DELETE",
      headers: { "Authorization": authToken }
    });

    const data = await res.json();

    if (res.ok) {
      deleteMessage.textContent = data.message || "Spieler gelöscht.";
      loadLeaderboard();
      document.getElementById("deletePlayerName").value = "";
      document.getElementById("deletePlayerClass").value = "";
    } else {
      deleteMessage.textContent = data.error || "Fehler beim Löschen.";
    }
  } catch {
    deleteMessage.textContent = "Fehler beim Löschen.";
  }
}
