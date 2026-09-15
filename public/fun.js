const Fun = { planes: [], pops: [], note: "" };
const EVENTS_FALLBACK = ["A pencil rolled under the binding.", "The margin yawned.", "Someone erased a secret.", "Coffee ring widened by one millimeter."];
function throwPlane() {
  net({ type: "plane" });
}
function addPlane(msg) {
  Fun.planes.push({ x: msg.x, y: msg.y, facing: msg.facing || 1, life: 2200, from: msg.name || "" });
}
function addPop(x, y, text) {
  Fun.pops.push({ x, y, text, life: 1400 });
}
function tickFun(dt) {
  const ms = dt * 1000;
  for (const p of Fun.planes) { p.x += p.facing * 220 * dt; p.y += Math.sin(p.x / 40) * 18 * dt; p.life -= ms; }
  Fun.planes = Fun.planes.filter((p) => p.life > 0);
  for (const p of Fun.pops) p.life -= ms;
  Fun.pops = Fun.pops.filter((p) => p.life > 0);
}
function drawFun(g) {
  g.save();
  for (const p of Fun.planes) {
    g.strokeStyle = "#1b1b1b"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.facing * 18, p.y + 4); g.lineTo(p.x, p.y + 8); g.closePath(); g.stroke();
  }
  g.font = "14px Comic Sans MS, cursive"; g.textAlign = "center"; g.fillStyle = "#c23b22";
  for (const p of Fun.pops) g.fillText(p.text, p.x, p.y - (1400 - p.life) / 40);
  g.restore();
}
