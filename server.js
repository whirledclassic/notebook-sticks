#!/usr/bin/env node
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, "public");
const WORLD = { w: 2200, h: 1500 };
const MAX_CHAT = 140;
const HATS = new Set(["none", "cap", "bow", "antenna", "halo", "horns"]);
const COLORS = new Set(["#1b1b1b", "#c23b22", "#2b6cb0", "#2f855a", "#6b46c1", "#b7791f", "#dd6b20"]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const players = new Map();
let nextId = 1;

function sanitizeName(name) {
  const clean = String(name || "").replace(/[^\w \-.'!]/g, "").trim().slice(0, 16);
  return clean || "Doodle";
}
function pickColor(color) { return COLORS.has(color) ? color : "#1b1b1b"; }
function pickHat(hat) { return HATS.has(hat) ? hat : "none"; }
function spawn() {
  return { x: 400 + Math.random() * 600, y: 350 + Math.random() * 400 };
}
function publicPlayer(p) {
  return { id: p.id, name: p.name, color: p.color, hat: p.hat, x: p.x, y: p.y, facing: p.facing, walking: p.walking, chat: p.chat, chatUntil: p.chatUntil };
}
function broadcast(msg, except) {
  const raw = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p === except) continue;
    if (p.ws.readyState === 1) p.ws.send(raw);
  }
}
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  const id = String(nextId++);
  const pos = spawn();
  const player = { id, ws, name: "Doodle", color: "#1b1b1b", hat: "none", x: pos.x, y: pos.y, facing: 1, walking: false, chat: "", chatUntil: 0, joined: false };
  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(String(buf)); } catch { return; }
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "join" && !player.joined) {
      player.joined = true;
      player.name = sanitizeName(msg.name);
      player.color = pickColor(msg.color);
      player.hat = pickHat(msg.hat);
      players.set(id, player);
      send(ws, { type: "welcome", id, world: WORLD, you: publicPlayer(player), players: [...players.values()].map(publicPlayer) });
      broadcast({ type: "join", player: publicPlayer(player) }, player);
      return;
    }
    if (!player.joined) return;
    if (msg.type === "move") {
      const x = Number(msg.x), y = Number(msg.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      player.x = Math.max(40, Math.min(WORLD.w - 40, x));
      player.y = Math.max(80, Math.min(WORLD.h - 20, y));
      player.facing = msg.facing === -1 ? -1 : 1;
      player.walking = Boolean(msg.walking);
      broadcast({ type: "move", id, x: player.x, y: player.y, facing: player.facing, walking: player.walking }, player);
      return;
    }
    if (msg.type === "look") {
      player.color = pickColor(msg.color);
      player.hat = pickHat(msg.hat);
      player.name = sanitizeName(msg.name || player.name);
      broadcast({ type: "look", player: publicPlayer(player) });
      return;
    }
    if (msg.type === "chat") {
      const text = String(msg.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_CHAT);
      if (!text) return;
      player.chat = text;
      player.chatUntil = Date.now() + 5000;
      broadcast({ type: "chat", id, name: player.name, text, until: player.chatUntil });
    }
  });
  ws.on("close", () => {
    if (players.has(id)) {
      players.delete(id);
      broadcast({ type: "leave", id });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Notebook Sticks on http://localhost:${PORT}`);
});
