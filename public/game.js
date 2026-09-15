const COLORS = ["#1b1b1b", "#c23b22", "#2b6cb0", "#2f855a", "#6b46c1", "#b7791f", "#dd6b20"];
const HATS = ["none", "cap", "bow", "antenna", "halo", "horns"];
const SPEED = 210;
const state = {
  id: null,
  world: { w: 2200, h: 1500 },
  me: { name: "Doodle", color: "#1b1b1b", hat: "none", x: 700, y: 600, facing: 1, walking: false, chat: "", chatUntil: 0 },
  others: new Map(),
  keys: {},
  cam: { x: 0, y: 0 },
  lastSend: 0,
  chatting: false,
};
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const chatInput = document.getElementById("chat");
const chatLog = document.getElementById("chatlog");
const who = document.getElementById("who");
function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
}
addEventListener("resize", resize);
resize();
function wsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return proto + "//" + location.host;
}
let socket;
function connect(join) {
  socket = new WebSocket(wsUrl());
  socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "join", ...join })));
  socket.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "welcome") {
      state.id = msg.id;
      state.world = msg.world;
      Object.assign(state.me, msg.you);
      state.others.clear();
      for (const p of msg.players) if (p.id !== state.id) state.others.set(p.id, p);
      refreshWho();
    }
    if (msg.type === "join" && msg.player.id !== state.id) {
      state.others.set(msg.player.id, msg.player);
      logLine(msg.player.name + " opened the notebook.");
      refreshWho();
    }
    if (msg.type === "leave") {
      const gone = state.others.get(msg.id);
      state.others.delete(msg.id);
      if (gone) logLine(gone.name + " closed the book.");
      refreshWho();
    }
    if (msg.type === "move" && msg.id !== state.id) {
      const p = state.others.get(msg.id);
      if (p) { p.x = msg.x; p.y = msg.y; p.facing = msg.facing; p.walking = msg.walking; }
    }
    if (msg.type === "look") {
      if (msg.player.id === state.id) Object.assign(state.me, msg.player);
      else state.others.set(msg.player.id, { ...(state.others.get(msg.player.id) || {}), ...msg.player });
    }
    if (msg.type === "chat") {
      if (msg.id === state.id) { state.me.chat = msg.text; state.me.chatUntil = msg.until; }
      else {
        const p = state.others.get(msg.id);
        if (p) { p.chat = msg.text; p.chatUntil = msg.until; }
      }
      logLine(msg.name + ": " + msg.text);
    }
  });
  socket.addEventListener("close", () => setTimeout(() => connect(join), 1200));
}
function logLine(text) {
  const row = document.createElement("div");
  row.textContent = text;
  chatLog.prepend(row);
}
function refreshWho() {
  who.textContent = 1 + state.others.size + " in the notebook";
}
function everyone() { return [state.me, ...state.others.values()]; }
addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (document.activeElement === chatInput) {
      const text = chatInput.value.trim();
      chatInput.value = "";
      chatInput.blur();
      state.chatting = false;
      if (text && socket?.readyState === 1) socket.send(JSON.stringify({ type: "chat", text }));
    } else {
      state.chatting = true;
      chatInput.focus();
    }
    e.preventDefault();
    return;
  }
  if (e.key === "Escape") { chatInput.blur(); state.chatting = false; }
  if (!state.chatting) state.keys[e.key.toLowerCase()] = true;
});
addEventListener("keyup", (e) => { state.keys[e.key.toLowerCase()] = false; });
function inputVector() {
  if (state.chatting || document.activeElement === chatInput) return { x: 0, y: 0 };
  let x = 0, y = 0;
  if (state.keys.a || state.keys.arrowleft) x -= 1;
  if (state.keys.d || state.keys.arrowright) x += 1;
  if (state.keys.w || state.keys.arrowup) y -= 1;
  if (state.keys.s || state.keys.arrowdown) y += 1;
  if (x && y) { x *= 0.707; y *= 0.707; }
  return { x, y };
}
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  const v = inputVector();
  state.me.walking = Boolean(v.x || v.y);
  if (v.x) state.me.facing = v.x < 0 ? -1 : 1;
  state.me.x = clamp(state.me.x + v.x * SPEED * dt, 40, state.world.w - 40);
  state.me.y = clamp(state.me.y + v.y * SPEED * dt, 80, state.world.h - 20);
  if (now - state.lastSend > 50 && socket?.readyState === 1) {
    state.lastSend = now;
    socket.send(JSON.stringify({ type: "move", x: state.me.x, y: state.me.y, facing: state.me.facing, walking: state.me.walking }));
  }
  draw(now);
  requestAnimationFrame(tick);
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function draw(now) {
  const scale = devicePixelRatio;
  state.cam.x = clamp(state.me.x - innerWidth / 2, 0, Math.max(0, state.world.w - innerWidth));
  state.cam.y = clamp(state.me.y - innerHeight / 2, 0, Math.max(0, state.world.h - innerHeight));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#f6f1de";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.save();
  ctx.translate(-state.cam.x, -state.cam.y);
  paper(state.world.w, state.world.h);
  doodads();
  for (const p of everyone().sort((a, b) => a.y - b.y)) stick(p, now);
  ctx.restore();
}
function paper(w, h) {
  ctx.fillStyle = "#f6f1de";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#c8ddf0";
  ctx.lineWidth = 1;
  for (let y = 40; y < h; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.strokeStyle = "#f2b6b6";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(88, 0); ctx.lineTo(88, h); ctx.stroke();
  ctx.fillStyle = "#ddd3b8";
  for (let y = 70; y < h; y += 96) {
    ctx.beginPath(); ctx.arc(44, y, 11, 0, Math.PI * 2); ctx.fill();
  }
}
function doodads() {
  ctx.save();
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = 2.2;
  scribbleRect(260, 220, 220, 120, "the lobby");
  scribbleRect(980, 180, 260, 160, "quiet corner");
  scribbleRect(1500, 720, 240, 150, "back page");
  coffee(520, 780);
  paperclip(1200, 900);
  star(400, 1100);
  ctx.restore();
}
function scribbleRect(x, y, w, h, label) {
  ctx.beginPath();
  ctx.moveTo(x + 2, y);
  ctx.lineTo(x + w - 1, y + 2);
  ctx.lineTo(x + w, y + h - 2);
  ctx.lineTo(x + 1, y + h);
  ctx.closePath();
  ctx.stroke();
  ctx.font = "16px Comic Sans MS, cursive";
  ctx.fillStyle = "#1b1b1b";
  ctx.fillText(label, x + 10, y + 22);
}
function coffee(x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 34, 18, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(194, 120, 70, .28)";
  ctx.fill();
  ctx.stroke();
}
function paperclip(x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 18, 0.4, 0, Math.PI * 2);
  ctx.stroke();
}
function star(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillText("hi", x - 8, y + 4);
}
function stick(p, now) {
  const walk = p.walking ? Math.sin(now / 90) : 0;
  const facing = p.facing || 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(facing, 1);
  ctx.strokeStyle = p.color || "#1b1b1b";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, -52, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, -8); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -30); ctx.lineTo(-16, -16 + walk * 6);
  ctx.moveTo(0, -30); ctx.lineTo(16, -16 - walk * 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(-12, 10 - walk * 8);
  ctx.moveTo(0, -8); ctx.lineTo(12, 10 + walk * 8);
  ctx.stroke();
  hat(p.hat);
  ctx.restore();
  ctx.font = "14px Comic Sans MS, cursive";
  ctx.fillStyle = p.color || "#1b1b1b";
  ctx.textAlign = "center";
  ctx.fillText(p.name || "Doodle", p.x, p.y + 26);
  if (p.chat && Date.now() < (p.chatUntil || 0)) bubble(p.x, p.y - 88, p.chat);
}
function hat(kind) {
  ctx.beginPath();
  if (kind === "cap") {
    ctx.moveTo(-16, -62); ctx.lineTo(18, -62);
    ctx.moveTo(-10, -62); ctx.lineTo(-10, -72); ctx.lineTo(10, -72); ctx.lineTo(10, -62);
    ctx.stroke();
  } else if (kind === "bow") {
    ctx.moveTo(-12, -66); ctx.lineTo(0, -60); ctx.lineTo(12, -66); ctx.lineTo(0, -56);
    ctx.closePath(); ctx.stroke();
  } else if (kind === "antenna") {
    ctx.moveTo(0, -66); ctx.lineTo(0, -82); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -86, 4, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === "halo") {
    ctx.ellipse(0, -74, 16, 5, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === "horns") {
    ctx.moveTo(-8, -64); ctx.lineTo(-16, -80);
    ctx.moveTo(8, -64); ctx.lineTo(16, -80);
    ctx.stroke();
  }
}
function bubble(x, y, text) {
  ctx.font = "13px Comic Sans MS, cursive";
  const width = Math.min(220, ctx.measureText(text).width + 16);
  ctx.fillStyle = "#fffdf6";
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - width / 2, y - 16, width, 24, 6);
  else ctx.rect(x - width / 2, y - 16, width, 24);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1b1b1b";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}
function startGame(join) {
  document.getElementById("boot").style.display = "none";
  connect(join);
  requestAnimationFrame(tick);
}
function bootUI() {
  const colors = document.getElementById("colors");
  const hats = document.getElementById("hats");
  COLORS.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "swatch" + (i === 0 ? " on" : "");
    b.style.background = c;
    b.onclick = () => {
      state.me.color = c;
      colors.querySelectorAll(".swatch").forEach((n) => n.classList.remove("on"));
      b.classList.add("on");
    };
    colors.appendChild(b);
  });
  HATS.forEach((h, i) => {
    const b = document.createElement("button");
    b.className = "hat" + (i === 0 ? " on" : "");
    b.textContent = h[0].toUpperCase();
    b.title = h;
    b.onclick = () => {
      state.me.hat = h;
      hats.querySelectorAll(".hat").forEach((n) => n.classList.remove("on"));
      b.classList.add("on");
    };
    hats.appendChild(b);
  });
  document.getElementById("go").onclick = () => {
    const name = document.getElementById("name").value.trim() || "Doodle";
    state.me.name = name.slice(0, 16);
    startGame({ name: state.me.name, color: state.me.color, hat: state.me.hat });
  };
}
bootUI();
