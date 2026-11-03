const modal = document.getElementById("modal");
const dropName = document.getElementById("drop-name");
const balanceEl = document.getElementById("balance");
function showModal(name) { dropName.textContent = name; modal.classList.add("show"); modal.setAttribute("aria-hidden","false"); }
function closeModal() { modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); }
document.getElementById("close").addEventListener("click", closeModal);
document.getElementById("again").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.querySelectorAll(".open").forEach(button => button.addEventListener("click", async () => {
  button.disabled = true; const old = button.textContent; button.textContent = "ОТКРЫВАЕМ...";
  try {
    const response = await fetch(`/api/open/${button.dataset.case}`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) { alert(data.error || "Не удалось открыть кейс"); return; }
    if (balanceEl) balanceEl.textContent = `${data.balance} 🪙`;
    showModal(data.item);
  } catch { alert("Ошибка соединения"); }
  finally { button.disabled = false; button.textContent = old; }
}));
