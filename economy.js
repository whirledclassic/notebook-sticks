"use strict";
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "data", "wallets.json");
const FREE_HATS = ["none", "cap", "bow", "antenna"];
const FREE_COLORS = ["#1b1b1b", "#c23b22", "#2b6cb0", "#2f855a"];
const FREE_EXTRAS = ["none"];
const CATALOG = [
  { kind: "hat", id: "halo", name: "Halo", cost: 40 },
  { kind: "hat", id: "horns", name: "Horns", cost: 35 },
  { kind: "hat", id: "flower", name: "Flower", cost: 25 },
  { kind: "hat", id: "crown", name: "Crown", cost: 80 },
  { kind: "hat", id: "fez", name: "Fez", cost: 45 },
  { kind: "hat", id: "top", name: "Top hat", cost: 60 },
  { kind: "hat", id: "party", name: "Party hat", cost: 28 },
  { kind: "color", id: "#6b46c1", name: "Violet ink", cost: 20 },
  { kind: "color", id: "#b7791f", name: "Gold ink", cost: 20 },
  { kind: "color", id: "#dd6b20", name: "Orange ink", cost: 20 },
  { kind: "color", id: "#0f766e", name: "Teal ink", cost: 20 },
  { kind: "color", id: "#e11d48", name: "Rose ink", cost: 50 },
  { kind: "extra", id: "glasses", name: "Glasses", cost: 30 },
  { kind: "extra", id: "scarf", name: "Scarf", cost: 35 },
  { kind: "extra", id: "pack", name: "Backpack", cost: 50 },
  { kind: "extra", id: "cape", name: "Cape", cost: 55 },
  { kind: "extra", id: "bowtie", name: "Bow tie", cost: 22 }
];
function emptyWallet() {
  return { ink: 40, hats: FREE_HATS.slice(), colors: FREE_COLORS.slice(), extras: FREE_EXTRAS.slice(), extra: "none", lastDrip: 0, stamps: [] };
}
function loadAll() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; }
}
function saveAll(all) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}
const db = loadAll();
function key(name) { return String(name || "Doodle").toLowerCase(); }
function wallet(name) {
  const k = key(name);
  if (!db[k]) db[k] = emptyWallet();
  const w = db[k];
  w.hats = [...new Set([].concat(FREE_HATS, w.hats || []))];
  w.colors = [...new Set([].concat(FREE_COLORS, w.colors || []))];
  w.extras = [...new Set([].concat(FREE_EXTRAS, w.extras || []))];
  if (w.ink == null) w.ink = 40;
  if (!w.stamps) w.stamps = [];
  return w;
}
function publicWallet(name) {
  const w = wallet(name);
  return { ink: w.ink, hats: w.hats, colors: w.colors, extras: w.extras, extra: w.extra || "none", stamps: w.stamps };
}
function drip(name) {
  const w = wallet(name);
  const now = Date.now();
  if (now - (w.lastDrip || 0) < 60000) return publicWallet(name);
  w.lastDrip = now;
  w.ink += 2;
  saveAll(db);
  return publicWallet(name);
}
function chatPay(name) {
  const w = wallet(name);
  w.ink += 1;
  saveAll(db);
  return publicWallet(name);
}
function visit(name, stampId) {
  const w = wallet(name);
  if (w.stamps.includes(stampId)) return null;
  w.stamps.push(stampId);
  w.ink += 3;
  saveAll(db);
  return publicWallet(name);
}
function owns(w, kind, id) {
  if (kind === "hat") return w.hats.includes(id);
  if (kind === "color") return w.colors.includes(id);
  if (kind === "extra") return w.extras.includes(id);
  return false;
}
function buy(name, kind, id) {
  const item = CATALOG.find((c) => c.kind === kind && c.id === id);
  if (!item) return { ok: false, error: "Not in the shop." };
  const w = wallet(name);
  if (owns(w, kind, id)) return { ok: false, error: "You already have that." };
  if (w.ink < item.cost) return { ok: false, error: "Not enough ink." };
  w.ink -= item.cost;
  if (kind === "hat") w.hats.push(id);
  if (kind === "color") w.colors.push(id);
  if (kind === "extra") w.extras.push(id);
  saveAll(db);
  return { ok: true, item, wallet: publicWallet(name) };
}
module.exports = { CATALOG, FREE_HATS, FREE_COLORS, FREE_EXTRAS, wallet, publicWallet, drip, chatPay, buy, owns, visit };
