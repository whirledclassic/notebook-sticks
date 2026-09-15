#!/usr/bin/env node
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC = path.join(__dirname, "public");
const WORLD = { w: 3000, h: 2000 };
const MAX_PLAYERS = 48;
const MAX_CHAT = 140;
const MAX_MARKS = 36;
const RANGE = 420;
const HATS = new Set(["none","cap","bow","antenna","halo","horns","flower","crown"]);
const COLORS = new Set(["#1b1b1b","#c23b22","#2b6cb0","#2f855a","#6b46c1","#b7791f","#dd6b20","#0f766e"]);
const POSES = new Set(["stand","sit","wave","dance","sleep"]);
const PAGES = [
  { id: "cover", name: "Cover" },
  { id: "graph", name: "Graph paper" },
  { id: "margin", name: "Margin notes" },
  { id: "back", name: "Back page" }
];
const PLACES = {
  cover: [
    { id: "title", name: "Title block", x: 380, y: 280, r: 140, hint: "This is the front." },
    { id: "coffee", name: "Coffee ring plaza", x: 720, y: 820, r: 160, hint: "Sit in the stain." },
    { id: "quiet", name: "Quiet corner", x: 1220, y: 240, r: 150, hint: "Whisper distance." },
    { id: "math", name: "Abandoned equation", x: 1980, y: 320, r: 150, hint: "Do not step on x." }
  ],
  graph: [
    { id: "origin", name: "The origin", x: 520, y: 980, r: 140, hint: "(0, 0) more or less." },
    { id: "triangles", name: "Triangle village", x: 1500, y: 420, r: 170, hint: "Geometry lives here." },
    { id: "pi", name: "Pi fountain", x: 2100, y: 1100, r: 150, hint: "It never ends." }
  ],
  margin: [
    { id: "sidenote", name: "Side notes cafe", x: 420, y: 320, r: 150, hint: "Teachers never look here." },
    { id: "pencil", name: "Lost pencil", x: 1040, y: 1180, r: 140, hint: "Someone is still looking." },
    { id: "tree", name: "Scribble tree", x: 1760, y: 560, r: 160, hint: "A tree made of loops." }
  ],
  back: [
    { id: "yearbook", name: "Yearbook wall", x: 480, y: 360, r: 150, hint: "Write a note." },
    { id: "phones", name: "Phone numbers", x: 1680, y: 300, r: 140, hint: "All fake." },
    { id: "exam", name: "Final exam panic", x: 900, y: 1120, r: 170, hint: "Breathe. Dance. Sleep." }
  ]
};
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const players = new Map();
const marks = { cover: [], graph: [], margin: [], back: [] };
let nextId = 1;
function sanitizeName(name) { return String(name || "").replace(/[^\w \-.'!]/g, "").trim().slice(0, 16) || "Doodle"; }
function pick(set, value, fallback) { return set.has(value) ? value : fallback; }
function pageOk(id) { return PAGES.some((p) => p.id === id) ? id : "cover"; }
function spawn() { return { x: 560 + Math.random() * 640, y: 500 + Math.random() * 320 }; }
function view(p) {
  return { id: p.id, name: p.name, color: p.color, hat: p.hat, page: p.page, x: p.x, y: p.y, facing: p.facing, walking: p.walking, pose: p.pose, chat: p.chat, chatUntil: p.chatUntil };
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
  const player = { id, ws, name: "Doodle", color: "#1b1b1b", hat: "none", page: "cover", x: pos.x, y: pos.y, facing: 1, walking: false, pose: "stand", chat: "", chatUntil: 0, lastChat: 0, lastMark: 0, joined: false };
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
      send(ws, { type: "welcome", id, you: view(player), ...snapshot(player.page) });
      toPage(player.page, { type: "join", player: view(player) }, player);
      return;
    }
    if (!player.joined) return;
    if (msg.type === "move") {
      const x = Number(msg.x), y = Number(msg.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      player.x = Math.max(70, Math.min(WORLD.w - 48, x));
      player.y = Math.max(90, Math.min(WORLD.h - 24, y));
      player.facing = msg.facing === -1 ? -1 : 1;
      player.walking = Boolean(msg.walking);
      if (player.walking && player.pose !== "dance") player.pose = "stand";
      toPage(player.page, { type: "move", id, x: player.x, y: player.y, facing: player.facing, walking: player.walking, pose: player.pose }, player);
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
      player.color = pick(COLORS, msg.color, player.color);
      player.hat = pick(HATS, msg.hat, player.hat);
      if (msg.name) player.name = sanitizeName(msg.name);
      toPage(player.page, { type: "look", player: view(player) });
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
server.listen(PORT, HOST, () => console.log("Notebook Sticks http://" + HOST + ":" + PORT + "  (health /health)"));
