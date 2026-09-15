function renderInk() {
  const el = document.getElementById("ink");
  if (el) el.textContent = (state.wallet && state.wallet.ink != null ? state.wallet.ink : 0) + " ink";
}
function owned(kind, id) {
  const w = state.wallet || { hats: [], colors: [], extras: [] };
  if (kind === "hat") return (w.hats || []).includes(id);
  if (kind === "color") return (w.colors || []).includes(id);
  if (kind === "extra") return (w.extras || []).includes(id);
  return false;
}
function renderShop() {
  const box = document.getElementById("shop");
  if (!box) return;
  const atShop = state.me.page === "shop" || (nearestPlace() && nearestPlace().id === "counter");
  box.classList.toggle("show", atShop);
  if (!atShop) return;
  const items = state.catalog || [];
  const stamps = (state.wallet && state.wallet.stamps) ? state.wallet.stamps.length : 0;
  box.innerHTML = "<b>Ink shop</b><div class='sub'>"+stamps+" stamps collected. Talk. Spend.</div>" + items.map((it) => {
    const have = owned(it.kind, it.id);
    return `<button data-kind="${it.kind}" data-id="${it.id}" ${have ? "disabled" : ""}>${it.name} · ${have ? "yours" : it.cost + " ink"}</button>`;
  }).join("");
}
function bindShop() {
  const box = document.getElementById("shop");
  if (!box) return;
  box.addEventListener("click", (e) => {
    const kind = e.target.dataset.kind, id = e.target.dataset.id;
    if (!kind || !id) return;
    net({ type: "buy", kind, id });
  });
}
function applyWallet(w) {
  if (!w) return;
  state.wallet = w;
  renderInk();
  renderShop();
}
function extraPath(g, extra, sit) {
  if (!extra || extra === "none") return;
  g.beginPath();
  if (extra === "glasses") {
    g.ellipse(-6, -56 + sit, 5, 3.5, 0, 0, Math.PI * 2);
    g.ellipse(6, -56 + sit, 5, 3.5, 0, 0, Math.PI * 2);
    g.moveTo(-1, -56 + sit); g.lineTo(1, -56 + sit);
    g.stroke();
  } else if (extra === "scarf") {
    g.moveTo(-8, -40 + sit); g.lineTo(10, -38 + sit); g.lineTo(6, -20 + sit);
    g.stroke();
  } else if (extra === "pack") {
    g.strokeRect(-7, -28 + sit, 8, 14);
  } else if (extra === "cape") {
    g.moveTo(0, -40 + sit); g.lineTo(-16, -8 + sit); g.lineTo(0, -16 + sit);
    g.stroke();
  } else if (extra === "bowtie") {
    g.moveTo(-8, -40 + sit); g.lineTo(0, -36 + sit); g.lineTo(8, -40 + sit); g.lineTo(0, -32 + sit); g.closePath(); g.stroke();
  }
}
