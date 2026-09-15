const COLORS = ["#1b1b1b","#c23b22","#2b6cb0","#2f855a","#6b46c1","#b7791f","#dd6b20","#0f766e"];
const HATS = ["none","cap","bow","antenna","halo","horns","flower","crown"];
const SPEED = 220;
const state = {
  id: null, world: { w: 2800, h: 1800 },
  me: { name:"Doodle", color:"#1b1b1b", hat:"none", x:700, y:560, facing:1, walking:false, pose:"stand", chat:"", chatUntil:0 },
  others: new Map(), keys: {}, cam: { x:0, y:0 }, lastSend: 0,
  chatting: false, lookOpen: false, stick: { x:0, y:0, on:false }, paper: null,
};
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const chatInput = document.getElementById("chat");
const chatLog = document.getElementById("chatlog");
const who = document.getElementById("who");
const preview = document.getElementById("preview");
function resize(){ canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; }
addEventListener("resize", resize); resize();
function wsUrl(){ return (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host; }
let socket;
function connect(join){
  socket = new WebSocket(wsUrl());
  socket.onopen = () => socket.send(JSON.stringify({ type:"join", ...join }));
  socket.onclose = () => setTimeout(() => connect(join), 1000);
  socket.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "full") { logLine("Notebook is full."); return; }
    if (msg.type === "welcome") {
      state.id = msg.id; state.world = msg.world; Object.assign(state.me, msg.you);
      state.others.clear();
      for (const p of msg.players) if (p.id !== state.id) state.others.set(p.id, remote(p));
      bakePaper(); refreshWho();
    }
    if (msg.type === "join" && msg.player.id !== state.id) {
      state.others.set(msg.player.id, remote(msg.player));
      logLine(msg.player.name + " opened the notebook."); refreshWho();
    }
    if (msg.type === "leave") {
      const gone = state.others.get(msg.id); state.others.delete(msg.id);
      if (gone) logLine(gone.name + " closed the book."); refreshWho();
    }
    if (msg.type === "move" && msg.id !== state.id) {
      const p = state.others.get(msg.id);
      if (p) { p.tx = msg.x; p.ty = msg.y; p.facing = msg.facing; p.walking = msg.walking; if (msg.pose) p.pose = msg.pose; }
    }
    if (msg.type === "look") {
      if (msg.player.id === state.id) Object.assign(state.me, msg.player);
      else {
        const p = state.others.get(msg.player.id) || remote(msg.player);
        Object.assign(p, msg.player); state.others.set(msg.player.id, p);
      }
    }
    if (msg.type === "pose") {
      if (msg.id === state.id) state.me.pose = msg.pose;
      else { const p = state.others.get(msg.id); if (p) { p.pose = msg.pose; if (msg.pose !== "stand") p.walking = false; } }
    }
    if (msg.type === "chat") {
      const target = msg.id === state.id ? state.me : state.others.get(msg.id);
      if (target) { target.chat = msg.text; target.chatUntil = msg.until; }
      logLine(msg.name + ": " + msg.text);
    }
  };
}
function remote(p){ return { ...p, tx: p.x, ty: p.y }; }
function logLine(text){
  const row = document.createElement("div"); row.textContent = text; chatLog.prepend(row);
  while (chatLog.childElementCount > 40) chatLog.lastChild.remove();
}
function refreshWho(){ who.textContent = (1 + state.others.size) + " doodling"; }
function everyone(){ return [state.me, ...state.others.values()]; }
function net(msg){ if (socket && socket.readyState === 1) socket.send(JSON.stringify(msg)); }
addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (document.activeElement === chatInput) {
      const text = chatInput.value.trim(); chatInput.value = ""; chatInput.blur(); state.chatting = false;
      if (text) net({ type:"chat", text });
    } else { state.chatting = true; chatInput.focus(); }
    e.preventDefault(); return;
  }
  if (e.key === "Escape") { chatInput.blur(); state.chatting = false; closeLook(); }
  if (state.chatting) return;
  state.keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === "c") setPose(state.me.pose === "sit" ? "stand" : "sit");
  if (e.key.toLowerCase() === "e") setPose(state.me.pose === "wave" ? "stand" : "wave");
  if (e.key.toLowerCase() === "l") toggleLook();
});
addEventListener("keyup", (e) => { state.keys[e.key.toLowerCase()] = false; });
function setPose(pose){ state.me.pose = pose; if (pose !== "stand") state.me.walking = false; net({ type:"pose", pose }); }
function inputVector(){
  if (state.chatting || state.lookOpen || document.activeElement === chatInput) return {x:0,y:0};
  let x = 0, y = 0;
  if (state.keys.a || state.keys.arrowleft) x -= 1;
  if (state.keys.d || state.keys.arrowright) x += 1;
  if (state.keys.w || state.keys.arrowup) y -= 1;
  if (state.keys.s || state.keys.arrowdown) y += 1;
  if (state.stick.on) { x += state.stick.x; y += state.stick.y; }
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  return { x, y };
}
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function bakePaper(){
  const off = document.createElement("canvas"); off.width = state.world.w; off.height = state.world.h;
  const g = off.getContext("2d");
  g.fillStyle = "#f4eed8"; g.fillRect(0,0,off.width,off.height);
  g.strokeStyle = "#c7d8ea"; g.lineWidth = 1;
  for (let y = 36; y < off.height; y += 32) { g.beginPath(); g.moveTo(0,y); g.lineTo(off.width,y); g.stroke(); }
  g.strokeStyle = "#efb4b4"; g.lineWidth = 2; g.beginPath(); g.moveTo(92,0); g.lineTo(92,off.height); g.stroke();
  g.fillStyle = "#d8cdb3";
  for (let y = 70; y < off.height; y += 92) { g.beginPath(); g.arc(46,y,10,0,Math.PI*2); g.fill(); }
  g.globalAlpha = 0.07;
  for (let i = 0; i < 180; i++) { g.fillStyle = i%2 ? "#7a6240" : "#2a2418"; g.fillRect(Math.random()*off.width, Math.random()*off.height, 2, 2); }
  g.globalAlpha = 1; doodleWorld(g); state.paper = off;
}
function doodleWorld(g){
  g.strokeStyle = "#1b1b1b"; g.fillStyle = "#1b1b1b"; g.lineWidth = 2.2;
  g.font = "18px Comic Sans MS, Segoe Print, cursive";
  box(g, 240, 200, 260, 140, "the lobby");
  box(g, 1080, 160, 300, 170, "quiet corner");
  box(g, 1880, 240, 280, 150, "math I gave up on");
  box(g, 420, 980, 340, 180, "picnic sketch");
  box(g, 1600, 1100, 320, 190, "back page");
  g.beginPath(); g.ellipse(620, 760, 40, 20, -0.25, 0, Math.PI*2);
  g.fillStyle = "rgba(170,90,40,.3)"; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(1340, 880, 9, 20, 0.5, 0, Math.PI*2); g.stroke();
  g.beginPath(); g.arc(390, 1280, 22, 0, Math.PI*2); g.stroke();
  g.fillStyle = "#1b1b1b"; g.fillText("hi", 378, 1286);
  g.beginPath(); g.moveTo(900, 600); g.quadraticCurveTo(1100, 540, 1300, 640); g.stroke();
  g.fillText("don't step on the equation", 940, 590);
}
function box(g,x,y,w,h,label){
  g.beginPath(); g.moveTo(x+3,y); g.lineTo(x+w,y+3); g.lineTo(x+w-2,y+h); g.lineTo(x,y+h-2);
  g.closePath(); g.stroke(); g.fillText(label, x+12, y+24);
}
let last = performance.now();
function tick(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const v = inputVector();
  if (v.x || v.y) {
    state.me.pose = "stand"; state.me.walking = true;
    if (v.x) state.me.facing = v.x < 0 ? -1 : 1;
    state.me.x = clamp(state.me.x + v.x * SPEED * dt, 48, state.world.w - 48);
    state.me.y = clamp(state.me.y + v.y * SPEED * dt, 90, state.world.h - 24);
  } else state.me.walking = false;
  for (const p of state.others.values()) {
    p.x += (p.tx - p.x) * Math.min(1, dt * 12);
    p.y += (p.ty - p.y) * Math.min(1, dt * 12);
  }
  state.cam.x += (clamp(state.me.x - innerWidth/2, 0, Math.max(0, state.world.w - innerWidth)) - state.cam.x) * Math.min(1, dt * 8);
  state.cam.y += (clamp(state.me.y - innerHeight/2, 0, Math.max(0, state.world.h - innerHeight)) - state.cam.y) * Math.min(1, dt * 8);
  if (now - state.lastSend > 40) {
    state.lastSend = now;
    net({ type:"move", x:state.me.x, y:state.me.y, facing:state.me.facing, walking:state.me.walking });
  }
  draw(now); requestAnimationFrame(tick);
}
function draw(now){
  const scale = devicePixelRatio;
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.fillStyle = "#f4eed8"; ctx.fillRect(0,0,innerWidth,innerHeight);
  ctx.save(); ctx.translate(-state.cam.x, -state.cam.y);
  if (state.paper) ctx.drawImage(state.paper, 0, 0);
  for (const p of everyone().sort((a,b)=>a.y-b.y)) drawStick(ctx, p, now, 1);
  ctx.restore(); drawStickPad();
}
function drawStick(g, p, now, scale){
  const walk = p.walking && p.pose !== "sit" ? Math.sin(now / 85) : 0;
  const facing = p.facing || 1; const sit = p.pose === "sit" ? 14 : 0;
  g.save(); g.translate(p.x, p.y); g.scale(facing * scale, scale);
  g.strokeStyle = p.color || "#1b1b1b"; g.lineWidth = 3.1; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.arc(0, -54 + sit, 14, 0, Math.PI*2); g.stroke();
  if (p.pose === "sit") {
    g.beginPath(); g.moveTo(0,-40); g.lineTo(0,-16); g.stroke();
    g.beginPath(); g.moveTo(0,-28); g.lineTo(-18,-18); g.moveTo(0,-28); g.lineTo(16,-12); g.stroke();
    g.beginPath(); g.moveTo(0,-16); g.lineTo(-16,-6); g.moveTo(0,-16); g.lineTo(20,-6); g.stroke();
  } else {
    g.beginPath(); g.moveTo(0,-40); g.lineTo(0,-8); g.stroke();
    const wave = p.pose === "wave" ? Math.sin(now/80)*10 : 0;
    g.beginPath();
    g.moveTo(0,-30); g.lineTo(-16, -16 + walk*6);
    g.moveTo(0,-30); g.lineTo(16, -18 - walk*6 - (p.pose==="wave"?18:0) + wave);
    g.stroke();
    g.beginPath(); g.moveTo(0,-8); g.lineTo(-12, 10-walk*8); g.moveTo(0,-8); g.lineTo(12, 10+walk*8); g.stroke();
  }
  hat(g, p.hat, sit); g.restore();
  g.font = "13px Comic Sans MS, Segoe Print, cursive"; g.fillStyle = p.color || "#1b1b1b"; g.textAlign = "center";
  g.fillText(p.name || "Doodle", p.x, p.y + 24);
  if (p.chat && Date.now() < (p.chatUntil || 0)) bubble(g, p.x, p.y - 92 + sit/2, p.chat);
}
function hat(g, kind, sit){
  const y = -66 + sit; g.beginPath();
  if (kind === "cap") { g.moveTo(-16,y); g.lineTo(18,y); g.moveTo(-10,y); g.lineTo(-10,y-10); g.lineTo(10,y-10); g.lineTo(10,y); g.stroke(); }
  else if (kind === "bow") { g.moveTo(-12,y-4); g.lineTo(0,y+2); g.lineTo(12,y-4); g.lineTo(0,y+6); g.closePath(); g.stroke(); }
  else if (kind === "antenna") { g.moveTo(0,y); g.lineTo(0,y-16); g.stroke(); g.beginPath(); g.arc(0,y-20,4,0,Math.PI*2); g.stroke(); }
  else if (kind === "halo") { g.ellipse(0,y-8,16,5,0,0,Math.PI*2); g.stroke(); }
  else if (kind === "horns") { g.moveTo(-8,y+2); g.lineTo(-16,y-14); g.moveTo(8,y+2); g.lineTo(16,y-14); g.stroke(); }
  else if (kind === "flower") { g.arc(-10,y-6,5,0,Math.PI*2); g.stroke(); g.beginPath(); g.arc(-10,y-6,2,0,Math.PI*2); g.stroke(); }
  else if (kind === "crown") { g.moveTo(-12,y); g.lineTo(-8,y-12); g.lineTo(0,y-2); g.lineTo(8,y-12); g.lineTo(12,y); g.stroke(); }
}
function bubble(g,x,y,text){
  g.font = "13px Comic Sans MS, Segoe Print, cursive";
  const width = Math.min(240, g.measureText(text).width + 18);
  g.fillStyle = "#fffdf4"; g.strokeStyle = "#1b1b1b"; g.lineWidth = 2; g.beginPath();
  if (g.roundRect) g.roundRect(x-width/2, y-16, width, 26, 6); else g.rect(x-width/2, y-16, width, 26);
  g.fill(); g.stroke(); g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.fillText(text, x, y+2);
}
function drawStickPad(){
  if (!("ontouchstart" in window) && !state.stick.on) return;
  const cx = 88, cy = innerHeight - 88;
  ctx.save(); ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.arc(cx,cy,52,0,Math.PI*2); ctx.strokeStyle="#1b1b1b"; ctx.lineWidth=3; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx+state.stick.x*28, cy+state.stick.y*28, 18,0,Math.PI*2); ctx.fillStyle="#1b1b1b"; ctx.fill();
  ctx.restore();
}
function bindTouch(){
  const on = (e) => { const t = e.changedTouches[0]; if (t.clientX > innerWidth * 0.45) return; state.stick.on = true; aimStick(t.clientX, t.clientY); e.preventDefault(); };
  const move = (e) => { if (!state.stick.on) return; const t = e.changedTouches[0]; aimStick(t.clientX, t.clientY); e.preventDefault(); };
  const off = () => { state.stick.on = false; state.stick.x = 0; state.stick.y = 0; };
  canvas.addEventListener("touchstart", on, { passive:false });
  canvas.addEventListener("touchmove", move, { passive:false });
  canvas.addEventListener("touchend", off); canvas.addEventListener("touchcancel", off);
}
function aimStick(x,y){
  const cx = 88, cy = innerHeight - 88; let dx = (x-cx)/50, dy = (y-cy)/50;
  const m = Math.hypot(dx,dy) || 1; if (m > 1) { dx /= m; dy /= m; }
  state.stick.x = dx; state.stick.y = dy;
}
function paintPreview(){
  if (!preview) return;
  const g = preview.getContext("2d");
  const dummy = { ...state.me, x: preview.width/2, y: preview.height - 18, walking:false };
  g.clearRect(0,0,preview.width,preview.height); g.fillStyle = "#f4eed8"; g.fillRect(0,0,preview.width,preview.height);
  drawStick(g, dummy, performance.now(), 1.15);
}
function fillChoices(root, items, current, onPick, swatch){
  root.innerHTML = "";
  items.forEach((item) => {
    const b = document.createElement("button");
    b.className = (swatch ? "swatch" : "hat") + (item === current ? " on" : "");
    if (swatch) b.style.background = item; else { b.textContent = item === "none" ? "·" : item[0].toUpperCase(); b.title = item; }
    b.onclick = () => { onPick(item); fillChoices(root, items, item, onPick, swatch); paintPreview(); };
    root.appendChild(b);
  });
}
function syncLook(){ net({ type:"look", name: state.me.name, color: state.me.color, hat: state.me.hat }); }
function toggleLook(){ state.lookOpen = !state.lookOpen; document.getElementById("look").classList.toggle("show", state.lookOpen); }
function closeLook(){ state.lookOpen = false; document.getElementById("look").classList.remove("show"); }
function startGame(){
  document.getElementById("boot").style.display = "none";
  connect({ name: state.me.name, color: state.me.color, hat: state.me.hat });
  bindTouch(); requestAnimationFrame(tick);
}
function bootUI(){
  fillChoices(document.getElementById("colors"), COLORS, state.me.color, (c)=>{ state.me.color=c; }, true);
  fillChoices(document.getElementById("hats"), HATS, state.me.hat, (h)=>{ state.me.hat=h; }, false);
  fillChoices(document.getElementById("look-colors"), COLORS, state.me.color, (c)=>{ state.me.color=c; syncLook(); }, true);
  fillChoices(document.getElementById("look-hats"), HATS, state.me.hat, (h)=>{ state.me.hat=h; syncLook(); }, false);
  paintPreview(); setInterval(paintPreview, 120);
  document.getElementById("go").onclick = () => {
    state.me.name = (document.getElementById("name").value.trim() || "Doodle").slice(0,16);
    startGame();
  };
  document.getElementById("look-toggle").onclick = toggleLook;
  document.getElementById("pose-sit").onclick = () => setPose(state.me.pose === "sit" ? "stand" : "sit");
  document.getElementById("pose-wave").onclick = () => setPose(state.me.pose === "wave" ? "stand" : "wave");
}
bootUI();
