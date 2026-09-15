const COLORS=["#1b1b1b","#c23b22","#2b6cb0","#2f855a","#6b46c1","#b7791f","#dd6b20","#0f766e"];
const HATS=["none","cap","bow","antenna","halo","horns","flower","crown"];
const SPEED=220;
const saved=JSON.parse(localStorage.getItem("ns-look")||"{}");
const state={id:null,world:{w:3200,h:2100},range:420,pages:[],places:[],me:{name:saved.name||"Doodle",color:saved.color||"#1b1b1b",hat:saved.hat||"none",page:"cover",x:700,y:560,facing:1,walking:false,pose:"stand",chat:"",chatUntil:0},others:new Map(),marks:[],keys:{},cam:{x:0,y:0},lastSend:0,chatting:false,lookOpen:false,stick:{x:0,y:0,on:false},paper:null,goal:null};
const canvas=document.getElementById("game"); const ctx=canvas.getContext("2d");
const chatInput=document.getElementById("chat"); const chatLog=document.getElementById("chatlog");
const who=document.getElementById("who"); const roster=document.getElementById("roster");
const preview=document.getElementById("preview"); const mini=document.getElementById("mini");
const hereEl=document.getElementById("here");
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;}
addEventListener("resize",resize);resize();
function wsUrl(){return (location.protocol==="https:"?"wss:":"ws:")+"//"+location.host;}
function persist(){localStorage.setItem("ns-look",JSON.stringify({name:state.me.name,color:state.me.color,hat:state.me.hat}));}
let socket;
function connect(join){
  socket=new WebSocket(wsUrl());
  socket.onopen=()=>socket.send(JSON.stringify({type:"join",...join}));
  socket.onclose=()=>setTimeout(()=>connect(join),1100);
  socket.onmessage=(ev)=>{
    const msg=JSON.parse(ev.data);
    if(msg.type==="full"){logLine("Notebook is full.");return;}
    if(msg.type==="welcome"){applyWorld(msg);Object.assign(state.me,msg.you);loadCrowd(msg.players);bakePaper();refreshWho();drawPages();}
    if(msg.type==="page"){applyWorld(msg);Object.assign(state.me,msg.you);loadCrowd(msg.players);bakePaper();refreshWho();drawPages();logLine("Turned to "+pageName(state.me.page)+".");}
    if(msg.type==="join"&&msg.player.id!==state.id){state.others.set(msg.player.id,remote(msg.player));logLine(msg.player.name+" walked onto the page.");refreshWho();}
    if(msg.type==="leave"){const gone=state.others.get(msg.id);state.others.delete(msg.id);if(gone)logLine(gone.name+" left the page.");refreshWho();}
    if(msg.type==="move"&&msg.id!==state.id){const p=state.others.get(msg.id);if(p){p.tx=msg.x;p.ty=msg.y;p.facing=msg.facing;p.walking=msg.walking;if(msg.pose)p.pose=msg.pose;}}
    if(msg.type==="look"){if(msg.player.id===state.id)Object.assign(state.me,msg.player);else{const p=state.others.get(msg.player.id)||remote(msg.player);Object.assign(p,msg.player);state.others.set(msg.player.id,p);}refreshWho();}
    if(msg.type==="pose"){if(msg.id===state.id)state.me.pose=msg.pose;else{const p=state.others.get(msg.id);if(p){p.pose=msg.pose;if(msg.pose==="sit"||msg.pose==="sleep")p.walking=false;}}}
    if(msg.type==="chat"){const target=msg.id===state.id?state.me:state.others.get(msg.id);if(target){target.chat=msg.text;target.chatUntil=msg.until;}logLine((msg.shout?"[page] ":"")+msg.name+": "+msg.text);}
    if(msg.type==="whisper")logLine("[whisper "+msg.from+" → "+msg.to+"] "+msg.text);
    if(msg.type==="mark"){state.marks.push(msg.mark);logLine(msg.mark.name+" left a note.");}
  };
}
if(typeof bakePaper!=="function"){window.bakePaper=function(){const c=document.createElement("canvas");c.width=state.world.w;c.height=state.world.h;const g=c.getContext("2d");g.fillStyle="#f4eed8";g.fillRect(0,0,c.width,c.height);state.paper=c;}}
function applyWorld(msg){if(msg.world)state.world=msg.world;if(msg.pages)state.pages=msg.pages;if(msg.range)state.range=msg.range;state.places=msg.places||[];state.marks=msg.marks||[];}
function remote(p){return {...p,tx:p.x,ty:p.y};}
function loadCrowd(list){state.others.clear();for(const p of list||[])if(p.id!==state.id)state.others.set(p.id,remote(p));}
function logLine(text){const row=document.createElement("div");row.textContent=text;chatLog.prepend(row);while(chatLog.childElementCount>50)chatLog.lastChild.remove();}
function pageName(id){return (state.pages.find(p=>p.id===id)||{name:id}).name;}
function everyone(){return [state.me,...state.others.values()];}
function net(msg){if(socket&&socket.readyState===1)socket.send(JSON.stringify(msg));}
function nearestPlace(){let best=null,bestD=1e9;for(const pl of state.places){const d=Math.hypot(pl.x-state.me.x,pl.y-state.me.y);if(d<pl.r&&d<bestD){best=pl;bestD=d;}}return best;}
function refreshWho(){const spot=nearestPlace();who.textContent=pageName(state.me.page)+" · "+(1+state.others.size)+" here";if(hereEl)hereEl.textContent=spot?spot.name+" — "+spot.hint:"Walk the page.";const dest=document.getElementById("dest");if(dest){dest.innerHTML=state.places.map(pl=>`<button data-place="${pl.id}" class="${spot&&spot.id===pl.id?"on":""}">${pl.name}</button>`).join("");}if(roster)roster.innerHTML=everyone().map(p=>`<button data-id="${p.id}">${p.name}</button>`).join("");}
function drawPages(){const el=document.getElementById("pages");if(el)el.innerHTML=state.pages.map(p=>`<button class="${p.id===state.me.page?"on":""}" data-page="${p.id}">${p.name}</button>`).join("");}
function sendChat(raw){const text=raw.trim();if(!text)return;if(text.startsWith("/mark "))net({type:"mark",text:text.slice(6)});else net({type:"chat",text});}
addEventListener("keydown",e=>{
  if(e.key==="Enter"){if(document.activeElement===chatInput){sendChat(chatInput.value);chatInput.value="";chatInput.blur();state.chatting=false;}else{state.chatting=true;chatInput.focus();}e.preventDefault();return;}
  if(e.key==="Escape"){chatInput.blur();state.chatting=false;closeLook();}
  if(state.chatting)return;state.keys[e.key.toLowerCase()]=true;
  const k=e.key.toLowerCase();
  if(k==="c")setPose(state.me.pose==="sit"?"stand":"sit");
  if(k==="e")setPose(state.me.pose==="wave"?"stand":"wave");
  if(k==="x")setPose(state.me.pose==="dance"?"stand":"dance");
  if(k==="z")setPose(state.me.pose==="sleep"?"stand":"sleep");
  if(k==="l")toggleLook();
  if(k==="m"){const t=prompt("Leave a note on the page");if(t)net({type:"mark",text:t});}
});
addEventListener("keyup",e=>{state.keys[e.key.toLowerCase()]=false;});
function setPose(pose){state.me.pose=pose;if(pose==="sit"||pose==="sleep")state.me.walking=false;net({type:"pose",pose});}
function inputVector(){if(state.chatting||state.lookOpen||document.activeElement===chatInput)return{x:0,y:0};let x=0,y=0;if(state.keys.a||state.keys.arrowleft)x-=1;if(state.keys.d||state.keys.arrowright)x+=1;if(state.keys.w||state.keys.arrowup)y-=1;if(state.keys.s||state.keys.arrowdown)y+=1;if(state.stick.on){x+=state.stick.x;y+=state.stick.y;}const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}return{x,y};}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
let last=performance.now();
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;const v=inputVector();
  if(v.x||v.y){state.goal=null;}
  else if(state.goal){
    const gx=state.goal.x-state.me.x, gy=state.goal.y-state.me.y, gm=Math.hypot(gx,gy);
    if(gm<14){
      state.me.x=state.goal.x; state.me.y=state.goal.y; state.me.walking=false;
      if(state.goal.sit) setPose("sit");
      state.goal=null;
    } else { v.x=gx/gm; v.y=gy/gm; }
  }
  if(v.x||v.y){if(state.me.pose==="sit"||state.me.pose==="sleep")state.me.pose="stand";state.me.walking=state.me.pose!=="dance";if(v.x)state.me.facing=v.x<0?-1:1;state.me.x=clamp(state.me.x+v.x*SPEED*dt,70,state.world.w-48);state.me.y=clamp(state.me.y+v.y*SPEED*dt,90,state.world.h-24);}else if(state.me.pose!=="dance")state.me.walking=false;for(const p of state.others.values()){p.x+=(p.tx-p.x)*Math.min(1,dt*12);p.y+=(p.ty-p.y)*Math.min(1,dt*12);}state.cam.x+=(clamp(state.me.x-innerWidth/2,0,Math.max(0,state.world.w-innerWidth))-state.cam.x)*Math.min(1,dt*8);state.cam.y+=(clamp(state.me.y-innerHeight/2,0,Math.max(0,state.world.h-innerHeight))-state.cam.y)*Math.min(1,dt*8);if(now-state.lastSend>40){state.lastSend=now;net({type:"move",x:state.me.x,y:state.me.y,facing:state.me.facing,walking:state.me.walking});}state.marks=state.marks.filter(m=>m.until>Date.now());if(now%12<2)refreshWho();draw(now);drawMini();requestAnimationFrame(tick);}
function draw(now){const scale=devicePixelRatio;ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle="#f4eed8";ctx.fillRect(0,0,innerWidth,innerHeight);ctx.save();ctx.translate(-state.cam.x,-state.cam.y);if(state.paper)ctx.drawImage(state.paper,0,0);for(const m of state.marks){ctx.font="13px Comic Sans MS, cursive";ctx.fillStyle=m.color||"#1b1b1b";ctx.textAlign="center";ctx.fillText("✎ "+m.text,m.x,m.y);}ctx.strokeStyle="rgba(43,108,176,.16)";ctx.beginPath();ctx.arc(state.me.x,state.me.y,state.range,0,Math.PI*2);ctx.stroke();for(const p of everyone().sort((a,b)=>a.y-b.y))drawStick(ctx,p,now,1);ctx.restore();drawStickPad();}
function drawStick(g,p,now,scale){
  const t=now/1000;
  const walking=(p.walking||p.pose==="dance")&&p.pose!=="sit"&&p.pose!=="sleep";
  const phase=t*(p.pose==="dance"?14:10);
  const bob=walking?Math.abs(Math.sin(phase))*5:Math.sin(t*2.2)*1.4;
  const contact=Math.sin(phase);
  const pass=Math.sin(phase+Math.PI);
  const blink=Math.floor(t*2)%8===0;
  const facing=p.facing||1; const sit=p.pose==="sit"||p.pose==="sleep"?16:0;
  g.save(); g.translate(p.x,p.y-bob); g.scale(facing*scale,scale);
  g.strokeStyle=p.color||"#1b1b1b"; g.lineWidth=3.2; g.lineCap="round"; g.lineJoin="round";
  g.beginPath(); g.arc(0,-56+sit,14,0,Math.PI*2); g.stroke();
  if(!blink){g.beginPath();g.moveTo(-5,-58+sit);g.lineTo(-3,-58+sit);g.moveTo(3,-58+sit);g.lineTo(5,-58+sit);g.stroke();}
  if(p.pose==="sleep"){
    g.beginPath();g.moveTo(0,-42);g.lineTo(20,-24);g.stroke();
    g.beginPath();g.moveTo(8,-30);g.lineTo(-8,-16);g.moveTo(14,-26);g.lineTo(28,-12);g.stroke();
  } else if(p.pose==="sit"){
    g.beginPath();g.moveTo(0,-42);g.lineTo(0,-18);g.stroke();
    g.beginPath();g.moveTo(0,-30);g.lineTo(-18,-18);g.moveTo(0,-30);g.lineTo(16,-12);g.stroke();
    g.beginPath();g.moveTo(0,-18);g.lineTo(-16,-6);g.moveTo(0,-18);g.lineTo(22,-6);g.stroke();
  } else {
    g.beginPath();g.moveTo(0,-42);g.lineTo(0,-10);g.stroke();
    const wave=p.pose==="wave"?Math.sin(t*12)*11:0;
    g.beginPath();g.moveTo(0,-32);g.lineTo(-15,-16+pass*7);g.moveTo(0,-32);g.lineTo(15,-16+contact*7-(p.pose==="wave"?16:0)+wave);g.stroke();
    g.beginPath();g.moveTo(0,-10);g.lineTo(-13,12-contact*10);g.moveTo(0,-10);g.lineTo(13,12-pass*10);g.stroke();
  }
  hat(g,p.hat,sit); g.restore();
  g.font="13px Comic Sans MS, cursive"; g.fillStyle=p.color||"#1b1b1b"; g.textAlign="center";
  g.fillText(p.name||"Doodle",p.x,p.y+26);
  if(p.pose==="sleep")g.fillText("z z",p.x+24,p.y-74);
  if(p.chat&&Date.now()<(p.chatUntil||0))bubble(g,p.x,p.y-96+sit/2,p.chat);
}
function hat(g,kind,sit){const y=-68+sit;g.beginPath();if(kind==="cap"){g.moveTo(-16,y);g.lineTo(18,y);g.moveTo(-10,y);g.lineTo(-10,y-10);g.lineTo(10,y-10);g.lineTo(10,y);g.stroke();}else if(kind==="bow"){g.moveTo(-12,y-4);g.lineTo(0,y+2);g.lineTo(12,y-4);g.lineTo(0,y+6);g.closePath();g.stroke();}else if(kind==="antenna"){g.moveTo(0,y);g.lineTo(0,y-16);g.stroke();g.beginPath();g.arc(0,y-20,4,0,Math.PI*2);g.stroke();}else if(kind==="halo"){g.ellipse(0,y-8,16,5,0,0,Math.PI*2);g.stroke();}else if(kind==="horns"){g.moveTo(-8,y+2);g.lineTo(-16,y-14);g.moveTo(8,y+2);g.lineTo(16,y-14);g.stroke();}else if(kind==="flower"){g.arc(-10,y-6,5,0,Math.PI*2);g.stroke();g.beginPath();g.arc(-10,y-6,2,0,Math.PI*2);g.stroke();}else if(kind==="crown"){g.moveTo(-12,y);g.lineTo(-8,y-12);g.lineTo(0,y-2);g.lineTo(8,y-12);g.lineTo(12,y);g.stroke();}}
function bubble(g,x,y,text){g.font="13px Comic Sans MS, cursive";const width=Math.min(240,g.measureText(text).width+18);g.fillStyle="#fffdf4";g.strokeStyle="#1b1b1b";g.lineWidth=2;g.beginPath();if(g.roundRect)g.roundRect(x-width/2,y-16,width,26,6);else g.rect(x-width/2,y-16,width,26);g.fill();g.stroke();g.fillStyle="#1b1b1b";g.textAlign="center";g.fillText(text,x,y+2);}
function drawMini(){if(!mini)return;const g=mini.getContext("2d");g.fillStyle="#f4eed8";g.fillRect(0,0,mini.width,mini.height);g.strokeStyle="#1b1b1b";g.strokeRect(.5,.5,mini.width-1,mini.height-1);const sx=mini.width/state.world.w,sy=mini.height/state.world.h;for(const pl of state.places){g.strokeStyle="#8aa";g.beginPath();g.arc(pl.x*sx,pl.y*sy,3,0,Math.PI*2);g.stroke();}for(const p of everyone()){g.fillStyle=p===state.me?"#c23b22":(p.color||"#1b1b1b");g.fillRect(p.x*sx-2,p.y*sy-2,4,4);}}
function drawStickPad(){if(!("ontouchstart"in window)&&!state.stick.on)return;const cx=88,cy=innerHeight-88;ctx.save();ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(cx,cy,52,0,Math.PI*2);ctx.strokeStyle="#1b1b1b";ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.arc(cx+state.stick.x*28,cy+state.stick.y*28,18,0,Math.PI*2);ctx.fillStyle="#1b1b1b";ctx.fill();ctx.restore();}
function bindTouch(){const on=e=>{const t=e.changedTouches[0];if(t.clientX>innerWidth*.45)return;state.stick.on=true;aimStick(t.clientX,t.clientY);e.preventDefault();};const move=e=>{if(!state.stick.on)return;aimStick(e.changedTouches[0].clientX,e.changedTouches[0].clientY);e.preventDefault();};const off=()=>{state.stick.on=false;state.stick.x=0;state.stick.y=0;};canvas.addEventListener("touchstart",on,{passive:false});canvas.addEventListener("touchmove",move,{passive:false});canvas.addEventListener("touchend",off);canvas.addEventListener("touchcancel",off);}
function aimStick(x,y){let dx=(x-88)/50,dy=(y-(innerHeight-88))/50;const m=Math.hypot(dx,dy)||1;if(m>1){dx/=m;dy/=m;}state.stick.x=dx;state.stick.y=dy;}
function paintPreview(){if(!preview)return;const g=preview.getContext("2d");g.fillStyle="#f4eed8";g.fillRect(0,0,preview.width,preview.height);drawStick(g,{...state.me,x:preview.width/2,y:preview.height-18,walking:true,pose:"stand"},performance.now(),1.15);}
function fillChoices(root,items,current,onPick,swatch){if(!root)return;root.innerHTML="";items.forEach(item=>{const b=document.createElement("button");b.className=(swatch?"swatch":"hat")+(item===current?" on":"");if(swatch)b.style.background=item;else{b.textContent=item==="none"?"·":item[0].toUpperCase();b.title=item;}b.onclick=()=>{onPick(item);fillChoices(root,items,item,onPick,swatch);paintPreview();persist();};root.appendChild(b);});}
function syncLook(){persist();net({type:"look",name:state.me.name,color:state.me.color,hat:state.me.hat});}
function toggleLook(){state.lookOpen=!state.lookOpen;document.getElementById("look").classList.toggle("show",state.lookOpen);}
function closeLook(){state.lookOpen=false;document.getElementById("look").classList.remove("show");}
function startGame(){persist();document.getElementById("boot").style.display="none";connect({name:state.me.name,color:state.me.color,hat:state.me.hat,page:"cover"});bindTouch();requestAnimationFrame(tick);}
function bootUI(){document.getElementById("name").value=state.me.name==="Doodle"?"":state.me.name;fillChoices(document.getElementById("colors"),COLORS,state.me.color,c=>{state.me.color=c;},true);fillChoices(document.getElementById("hats"),HATS,state.me.hat,h=>{state.me.hat=h;},false);fillChoices(document.getElementById("look-colors"),COLORS,state.me.color,c=>{state.me.color=c;syncLook();},true);fillChoices(document.getElementById("look-hats"),HATS,state.me.hat,h=>{state.me.hat=h;syncLook();},false);paintPreview();setInterval(paintPreview,90);document.getElementById("go").onclick=()=>{state.me.name=(document.getElementById("name").value.trim()||"Doodle").slice(0,16);startGame();};document.getElementById("look-toggle").onclick=toggleLook;document.getElementById("pose-sit").onclick=()=>setPose(state.me.pose==="sit"?"stand":"sit");document.getElementById("pose-wave").onclick=()=>setPose(state.me.pose==="wave"?"stand":"wave");document.getElementById("pose-dance").onclick=()=>setPose(state.me.pose==="dance"?"stand":"dance");const destBox=document.getElementById("dest");
  if(destBox) destBox.addEventListener("click",e=>{
    const id=e.target.dataset.place; if(!id)return;
    const pl=state.places.find(p=>p.id===id); if(!pl)return;
    state.goal={x:pl.x,y:pl.y+24,sit:pl.kind==="bench"};
  });
  canvas.addEventListener("click",e=>{
    if(state.chatting||state.lookOpen)return;
    const x=e.clientX+state.cam.x, y=e.clientY+state.cam.y;
    state.goal={x:clamp(x,70,state.world.w-48),y:clamp(y,90,state.world.h-24),sit:false};
  });
  document.getElementById("pages").addEventListener("click",e=>{const page=e.target.dataset.page;if(page)net({type:"page",page});});if(roster)roster.addEventListener("click",e=>{const id=e.target.dataset.id;if(!id)return;const p=id===state.id?state.me:state.others.get(id);if(p){chatInput.value="/w "+p.name+" ";chatInput.focus();state.chatting=true;}});}
bootUI();
