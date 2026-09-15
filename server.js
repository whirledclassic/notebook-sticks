#!/usr/bin/env node
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const eco = require("./economy");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC = path.join(__dirname, "public");
const WORLD = { w: 3200, h: 2100 };
const MAX_PLAYERS = 48;
const MAX_CHAT = 140;
const MAX_MARKS = 36;
const RANGE = 420;
const HATS = new Set(["none","cap","bow","antenna","halo","horns","flower","crown","fez","top","party"]);
const COLORS = new Set(["#1b1b1b","#c23b22","#2b6cb0","#2f855a","#6b46c1","#b7791f","#dd6b20","#0f766e","#e11d48"]);
const POSES = new Set(["stand","sit","wave","dance","sleep"]);
const EXTRAS = new Set(["none","glasses","scarf","pack","cape","bowtie"]);
const PAGES = [
  { id: "cover", name: "Cover" },
  { id: "graph", name: "Graph" },
  { id: "comic", name: "Comic" },
  { id: "pocket", name: "Pocket" },
  { id: "back", name: "Back page" },
  { id: "shop", name: "Ink shop" }
];
const PLACES = {
  cover: [
    { id: "title", name: "Title block", kind: "sign", x: 420, y: 260, r: 150, hint: "The front of the book." },
    { id: "lockers", name: "Locker row", kind: "lockers", x: 1680, y: 240, r: 160, hint: "Drawn metal. Empty." },
    { id: "coffee", name: "Coffee ring plaza", kind: "ring", x: 780, y: 900, r: 180, hint: "The fountain is a stain." },
    { id: "bench", name: "Quiet bench", kind: "bench", x: 2100, y: 720, r: 140, hint: "Sit with C." },
    { id: "hop", name: "Hopscotch", kind: "hop", x: 1280, y: 1280, r: 160, hint: "F throws a plane. Hop." }
  ],
  graph: [
    { id: "origin", name: "The origin", kind: "origin", x: 560, y: 1050, r: 150, hint: "(0, 0) more or less." },
    { id: "triangles", name: "Triangle village", kind: "triangles", x: 1680, y: 420, r: 180, hint: "Houses with three walls." },
    { id: "pi", name: "Pi fountain", kind: "fountain", x: 2300, y: 1200, r: 160, hint: "It never ends." }
  ],
  comic: [
    { id: "panel1", name: "Panel one", kind: "panel", x: 520, y: 380, r: 170, hint: "Once upon a line." },
    { id: "panel2", name: "Panel two", kind: "panel", x: 1600, y: 380, r: 170, hint: "Then somebody waved." },
    { id: "panel3", name: "Panel three", kind: "panel", x: 2600, y: 380, r: 170, hint: "Cut to wide." },
    { id: "splash", name: "Splash page", kind: "splash", x: 1500, y: 1300, r: 220, hint: "The big frame." }
  ],
  pocket: [
    { id: "clips", name: "Paperclip park", kind: "clip", x: 520, y: 520, r: 160, hint: "Bent silver trees." },
    { id: "stamp", name: "Stamp corner", kind: "stamp", x: 2200, y: 360, r: 150, hint: "Postage due." },
    { id: "crumple", name: "Crumpled courtyard", kind: "crumple", x: 1200, y: 1280, r: 190, hint: "Someone gave up." }
  ],
  shop: [
    { id: "counter", name: "Shop counter", kind: "counter", x: 900, y: 520, r: 200, hint: "Buy with ink." },
    { id: "fitting", name: "Fitting box", kind: "sign", x: 1900, y: 900, r: 160, hint: "Try it on." }
  ],
  back: [
    { id: "yearbook", name: "Yearbook wall", kind: "grid", x: 500, y: 360, r: 170, hint: "Leave a note." },
    { id: "phones", name: "Phone numbers", kind: "list", x: 2100, y: 320, r: 150, hint: "All fake." },
    { id: "exam", name: "Final exam panic", kind: "scribble", x: 1100, y: 1250, r: 190, hint: "Breathe. Dance. Sleep." }
  ]
};
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const players = new Map();
const marks = { cover: [], graph: [], comic: [], pocket: [], back: [], shop: [] };
let nextId = 1;
function sanitizeName(name) { return String(name || "").replace(/[^\w \-.'!]/g, "").trim().slice(0, 16) || "Doodle"; }
function pick(set, value, fallback) { return set.has(value) ? value : fallback; }
function pageOk(id) { return PAGES.some((p) => p.id === id) ? id : "cover"; }
function spawn() { return { x: 640 + Math.random() * 520, y: 560 + Math.random() * 280 }; }
function view(p) {
  return { id: p.id, name: p.name, color: p.color, hat: p.hat, extra: p.extra || "none", page: p.page, x: p.x, y: p.y, facing: p.facing, walking: p.walking, pose: p.pose, chat: p.chat, chatUntil: p.chatUntil };
}
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function onPage(page) { return [...players.values()].filter((p) => p.page === page); }
function toPage(page, msg, except) {
  const raw = JSON.stringify(msg);
  for (const p of onPage(page)) if (p !== except && p.ws.readyState === 1) p.ws.send(raw);
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function pruneMarks(page) {
  const now = Date.now();
  marks[page] = (marks[page] || []).filter((m) => m.until > now).slice(-MAX_MARKS);
}
function snapshot(page) {
  return { pages: PAGES, places: PLACES[page] || [], marks: marks[page] || [], players: onPage(page).map(view), world: WORLD, range: RANGE };
}
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, players: players.size, pages: PAGES.map((p) => p.id) }));
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});
const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  if (players.size >= MAX_PLAYERS) { send(ws, { type: "full" }); ws.close(); return; }
  const id = String(nextId++);
  const pos = spawn();
  const player = { id, ws, name: "Doodle", color: "#1b1b1b", hat: "none", extra: "none", page: "cover", x: pos.x, y: pos.y, facing: 1, walking: false, pose: "stand", chat: "", chatUntil: 0, lastChat: 0, lastMark: 0, lastMove: 0, lastPlane: 0, joined: false };
  ws.on("message", (buf) => {
    let msg; try { msg = JSON.parse(String(buf)); } catch { return; }
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "join" && !player.joined) {
      player.joined = true;
      player.name = sanitizeName(msg.name);
      player.color = pick(COLORS, msg.color, "#1b1b1b");
      player.hat = pick(HATS, msg.hat, "none");
      player.page = pageOk(msg.page);
      players.set(id, player);
      pruneMarks(player.page);
      send(ws, { type: "welcome", id, you: view(player), catalog: eco.CATALOG, wallet: eco.publicWallet(player.name), ...snapshot(player.page) });
      toPage(player.page, { type: "join", player: view(player) }, player);
      return;
    }
    if (!player.joined) return;
    if (msg.type === "move") {
      const x = Number(msg.x), y = Number(msg.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const now = Date.now();
      const dt = Math.max(16, Math.min(250, now - (player.lastMove || now)));
      player.lastMove = now;
      const maxStep = 280 * (dt / 1000) + 24;
      let nx = Math.max(70, Math.min(WORLD.w - 48, x));
      let ny = Math.max(90, Math.min(WORLD.h - 24, y));
      const step = Math.hypot(nx - player.x, ny - player.y);
      if (step > maxStep) { const k = maxStep / step; nx = player.x + (nx - player.x) * k; ny = player.y + (ny - player.y) * k; }
      player.x = nx; player.y = ny;
      player.facing = msg.facing === -1 ? -1 : 1;
      player.walking = Boolean(msg.walking);
      if (player.walking && player.pose !== "dance") player.pose = "stand";
      const here = (PLACES[player.page] || []).find((pl) => Math.hypot(pl.x - player.x, pl.y - player.y) < pl.r);
      if (here) {
        const stamped = eco.visit(player.name, player.page + ":" + here.id);
        if (stamped) send(ws, { type: "stamp", place: here.name, wallet: stamped });
      }
      return;
    }
    if (msg.type === "plane") {
      const now = Date.now();
      if (now - (player.lastPlane || 0) < 900) return;
      player.lastPlane = now;
      toPage(player.page, { type: "plane", name: player.name, x: player.x, y: player.y - 20, facing: player.facing });
      return;
    }
    if (msg.type === "page") {
      const next = pageOk(msg.page);
      if (next === player.page) return;
      toPage(player.page, { type: "leave", id }, player);
      player.page = next;
      const pos2 = spawn();
      player.x = pos2.x; player.y = pos2.y; player.walking = false; player.pose = "stand";
      pruneMarks(next);
      send(ws, { type: "page", page: next, you: view(player), ...snapshot(next) });
      toPage(next, { type: "join", player: view(player) }, player);
      return;
    }
    if (msg.type === "look") {
      const w = eco.wallet(player.name);
      if (HATS.has(msg.hat) && w.hats.includes(msg.hat)) player.hat = msg.hat;
      if (COLORS.has(msg.color) && w.colors.includes(msg.color)) player.color = msg.color;
      if (EXTRAS.has(msg.extra) && w.extras.includes(msg.extra)) player.extra = msg.extra;
      w.extra = player.extra;
      toPage(player.page, { type: "look", player: view(player) });
      send(ws, { type: "wallet", wallet: eco.publicWallet(player.name) });
      return;
    }
    if (msg.type === "buy") {
      const result = eco.buy(player.name, msg.kind, msg.id);
      send(ws, { type: "buy", ...result });
      if (result.ok) send(ws, { type: "wallet", wallet: result.wallet });
      return;
    }
    if (msg.type === "pose") {
      player.pose = pick(POSES, msg.pose, "stand");
      if (player.pose === "sit" || player.pose === "sleep") player.walking = false;
      toPage(player.page, { type: "pose", id, pose: player.pose });
      return;
    }
    if (msg.type === "mark") {
      const now = Date.now();
      if (now - player.lastMark < 2500) return;
      player.lastMark = now;
      const text = String(msg.text || "").replace(/\s+/g, " ").trim().slice(0, 48);
      if (!text) return;
      pruneMarks(player.page);
      const mark = { id: id + "-" + now, x: player.x, y: player.y + 18, text, name: player.name, color: player.color, until: now + 8 * 60 * 1000 };
      marks[player.page].push(mark);
      toPage(player.page, { type: "mark", mark });
      return;
    }
    if (msg.type === "chat") {
      const now = Date.now();
      if (now - player.lastChat < 350) return;
      player.lastChat = now;
      let text = String(msg.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_CHAT);
      if (!text) return;
      if (text.startsWith("/w ")) {
        const rest = text.slice(3); const sp = rest.indexOf(" "); if (sp < 1) return;
        const targetName = rest.slice(0, sp); const body = rest.slice(sp + 1).trim(); if (!body) return;
        const target = [...players.values()].find((p) => p.name.toLowerCase() === targetName.toLowerCase());
        const payload = { type: "whisper", from: player.name, to: target ? target.name : targetName, text: body };
        send(ws, payload); if (target && target !== player) send(target.ws, payload); return;
      }
      const shout = text.startsWith("!");
      if (shout) text = text.slice(1).trim();
      if (!text) return;
      player.chat = text; player.chatUntil = now + 5200;
      send(ws, { type: "wallet", wallet: eco.chatPay(player.name) });
      const packet = { type: "chat", id, name: player.name, text, until: player.chatUntil, shout };
      if (shout) toPage(player.page, packet);
      else {
        send(ws, packet);
        for (const other of onPage(player.page)) if (other !== player && dist(player, other) <= RANGE) send(other.ws, packet);
      }
    }
  });
  ws.on("close", () => {
    if (players.has(id)) { const page = player.page; players.delete(id); toPage(page, { type: "leave", id }); }
  });
});
setInterval(() => {
  const tnow = Date.now();
  for (const page of PAGES) {
    const list = onPage(page.id);
    if (!list.length) continue;
    toPage(page.id, { type: "snap", t: tnow, players: list.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), facing: p.facing, walking: p.walking, pose: p.pose })) });
  }
}, 50);
setInterval(() => {
  for (const p of players.values()) {
    if (!p.joined) continue;
    send(p.ws, { type: "wallet", wallet: eco.drip(p.name) });
  }
}, 60000);
const LINES = ["A pencil rolled under the binding.","The margin yawned.","Someone erased a secret.","The coffee ring grew.","A paper airplane missed the trash."];
setInterval(() => {
  if (!players.size) return;
  const text = LINES[Math.floor(Math.random() * LINES.length)];
  for (const page of PAGES) if (onPage(page.id).length) toPage(page.id, { type: "event", text });
}, 45000);
server.listen(PORT, HOST, () => console.log("Notebook Sticks http://" + HOST + ":" + PORT + "  (health /health)"));
