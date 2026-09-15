#!/usr/bin/env node
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, "public");
const WORLD = { w: 2800, h: 1800 };
const MAX_PLAYERS = 40;
const MAX_CHAT = 140;
const HATS = new Set(["none", "cap", "bow", "antenna", "halo", "horns", "flower", "crown"]);
const COLORS = new Set(["#1b1b1b", "#c23b22", "#2b6cb0", "#2f855a", "#6b46c1", "#b7791f", "#dd6b20", "#0f766e"]);
const POSES = new Set(["stand", "sit", "wave"]);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const players = new Map();
let nextId = 1;

function sanitizeName(name) {
  return String(name || "").replace(/[^\w \-.'!]/g, "").trim().slice(0, 16) || "Doodle";
}
function pick(set, value, fallback) {
  return set.has(value) ? value : fallback;
}
function spawn() {
  return { x: 520 + Math.random() * 700, y: 420 + Math.random() * 380 };
}
function view(p) {
  return {
    id: p.id, name: p.name, color: p.color, hat: p.hat,
    x: p.x, y: p.y, facing: p.facing, walking: p.walking,
    pose: p.pose, chat: p.chat, chatUntil: p.chatUntil,
  };
}
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcast(msg, except) {
  const raw = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p !== except && p.ws.readyState === 1) p.ws.send(raw);
  }
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
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
  if (players.size >= MAX_PLAYERS) {
    send(ws, { type: "full" });
    ws.close();
    return;
  }
  const id = String(nextId++);
  const pos = spawn();
  const player = {
    id, ws, name: "Doodle", color: "#1b1b1b", hat: "none",
    x: pos.x, y: pos.y, facing: 1, walking: false, pose: "stand",
    chat: "", chatUntil: 0, lastChat: 0, joined: false,
  };

  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(String(buf)); } catch { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "join" && !player.joined) {
      player.joined = true;
      player.name = sanitizeName(msg.name);
      player.color = pick(COLORS, msg.color, "#1b1b1b");
      player.hat = pick(HATS, msg.hat, "none");
      players.set(id, player);
      send(ws, { type: "welcome", id, world: WORLD, you: view(player), players: [...players.values()].map(view) });
      broadcast({ type: "join", player: view(player) }, player);
      return;
    }
    if (!player.joined) return;

    if (msg.type === "move") {
      const x = Number(msg.x), y = Number(msg.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      player.x = Math.max(48, Math.min(WORLD.w - 48, x));
      player.y = Math.max(90, Math.min(WORLD.h - 24, y));
      player.facing = msg.facing === -1 ? -1 : 1;
      player.walking = Boolean(msg.walking);
      if (player.walking) player.pose = "stand";
      broadcast({ type: "move", id, x: player.x, y: player.y, facing: player.facing, walking: player.walking, pose: player.pose }, player);
      return;
    }
    if (msg.type === "look") {
      player.color = pick(COLORS, msg.color, player.color);
      player.hat = pick(HATS, msg.hat, player.hat);
      if (msg.name) player.name = sanitizeName(msg.name);
      broadcast({ type: "look", player: view(player) });
      return;
    }
    if (msg.type === "pose") {
      player.pose = pick(POSES, msg.pose, "stand");
      if (player.pose !== "stand") player.walking = false;
      broadcast({ type: "pose", id, pose: player.pose });
      return;
    }
    if (msg.type === "chat") {
      const now = Date.now();
      if (now - player.lastChat < 400) return;
      player.lastChat = now;
      const text = String(msg.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_CHAT);
      if (!text) return;
      player.chat = text;
      player.chatUntil = now + 5200;
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

server.listen(PORT, () => console.log("Notebook Sticks http://localhost:" + PORT));
