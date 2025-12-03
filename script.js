const API_URL = "https://script.google.com/macros/s/AKfycbwS8_uvGOsYkGRe9QEItW1F4tE8eGEXwvHJANRwTGTmxOKJJjkaTY-qqN5bW1OEIe8/exec";

// ================================
// Carrega torres (online + offline)
// ================================
async function loadTowers() {
  try {
    const response = await fetch(API_URL + "?action=getTowers");
    const data = await response.json();

    // salva no banco offline
    saveOffline("towers", data);

    renderTowers(data);
  } catch (e) {
    console.warn("Sem internet — usando dados offline");

    const offlineData = await loadOffline("towers");
    if (offlineData) renderTowers(offlineData);
  }
}

// Aqui você aplica os dados na interface
function renderTowers(data) {
  document.getElementById("saida").innerHTML =
    "<pre>" + JSON.stringify(data, null, 2) + "</pre>";
}

// ===================================
// Exemplo de atualização com fallback
// ===================================
async function updateTower( torre, updates ) {

  const body = {
    Torre: torre,
    updates: updates
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(body)
    });

    // salva também offline
    savePendingUpdate(body);

    alert("Atualizado online!");
  } catch (e) {
    // sem internet → salva no offline
    savePendingUpdate(body);
    alert("Sem internet — salvo offline para sincronizar depois.");
  }
}

// sincronizador automático quando voltar internet
setInterval(syncPending, 5000);
