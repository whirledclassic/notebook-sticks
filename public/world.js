function ink(g){g.strokeStyle="#1b1b1b";g.fillStyle="#1b1b1b";g.lineWidth=2.3;g.lineCap="round";g.lineJoin="round";}
function label(g,pl){g.font="18px Comic Sans MS, Segoe Print, cursive";g.fillStyle="#1b1b1b";g.textAlign="center";g.fillText(pl.name,pl.x,pl.y-pl.r*0.42);}
function drawKind(g,pl){
  const x=pl.x,y=pl.y,k=pl.kind||"sign";
  ink(g);
  if(k==="ring"){for(const s of [70,52,34]){g.beginPath();g.ellipse(x,y,s,s*0.62,-0.2,0,Math.PI*2);g.stroke();}g.globalAlpha=.18;g.fillStyle="#7a3b16";g.beginPath();g.ellipse(x,y,70,44,-0.2,0,Math.PI*2);g.fill();g.globalAlpha=1;}
  else if(k==="bench"){g.beginPath();g.moveTo(x-54,y);g.lineTo(x+54,y);g.moveTo(x-40,y);g.lineTo(x-40,y+22);g.moveTo(x+40,y);g.lineTo(x+40,y+22);g.moveTo(x-50,y-12);g.lineTo(x+50,y-10);g.stroke();}
  else if(k==="lockers"){for(let i=-2;i<=2;i++){const lx=x+i*46;g.strokeRect(lx-18,y-40,36,70);g.beginPath();g.arc(lx+10,y-6,3,0,Math.PI*2);g.stroke();}}
  else if(k==="sign"){g.strokeRect(x-90,y-40,180,70);g.beginPath();g.moveTo(x-8,y+30);g.lineTo(x-8,y+70);g.lineTo(x+8,y+70);g.stroke();}
  else if(k==="origin"){g.beginPath();g.moveTo(x-80,y);g.lineTo(x+80,y);g.moveTo(x,y-80);g.lineTo(x,y+80);g.stroke();g.fillText("0",x+10,y-10);}
  else if(k==="triangles"){for(const [ox,oy,s] of [[-70,20,50],[10,-30,60],[80,24,44]]){g.beginPath();g.moveTo(x+ox,y+oy);g.lineTo(x+ox+s,y+oy);g.lineTo(x+ox+s/2,y+oy-s);g.closePath();g.stroke();}}
  else if(k==="fountain"){for(const s of [26,48,68]){g.beginPath();g.arc(x,y,s,0,Math.PI*2);g.stroke();}g.font="28px Comic Sans MS, cursive";g.fillText("π",x,y+10);}
  else if(k==="panel"){g.lineWidth=4;g.strokeRect(x-140,y-90,280,180);g.lineWidth=2;g.beginPath();g.moveTo(x-120,y-60);g.lineTo(x-40,y-20);g.stroke();}
  else if(k==="splash"){g.lineWidth=5;g.strokeRect(x-220,y-130,440,260);g.font="22px Comic Sans MS, cursive";g.fillText("SPLASH",x,y-90);}
  else if(k==="clip"){g.beginPath();g.moveTo(x-16,y-40);g.lineTo(x-16,y+36);g.quadraticCurveTo(x,y+52,x+16,y+36);g.lineTo(x+16,y-28);g.quadraticCurveTo(x,y-44,x-8,y-28);g.lineTo(x-8,y+20);g.stroke();}
  else if(k==="stamp"){g.strokeRect(x-50,y-40,100,80);g.setLineDash([6,4]);g.strokeRect(x-44,y-34,88,68);g.setLineDash([]);g.fillText("AIR",x,y+6);}
  else if(k==="crumple"){g.beginPath();g.moveTo(x-40,y);g.lineTo(x-18,y-36);g.lineTo(x+22,y-28);g.lineTo(x+48,y+8);g.lineTo(x+10,y+36);g.lineTo(x-30,y+22);g.closePath();g.stroke();}
  else if(k==="grid"){for(let r=0;r<2;r++)for(let c=0;c<3;c++)g.strokeRect(x-90+c*62,y-50+r*52,54,44);}
  else if(k==="list"){for(let i=0;i<5;i++){g.beginPath();g.moveTo(x-50,y-30+i*16);g.lineTo(x+50,y-30+i*16);g.stroke();}}
  else if(k==="hop"){for(let i=0;i<4;i++)g.strokeRect(x-40+i*22,y-10+(i%2)*18,20,18);}
  else if(k==="counter"){g.strokeRect(x-110,y-30,220,50);g.beginPath();g.moveTo(x-90,y-30);g.lineTo(x-90,y+40);g.moveTo(x+90,y-30);g.lineTo(x+90,y+40);g.stroke();g.fillText("INK",x,y-40);}
  else if(k==="scribble"){g.beginPath();g.moveTo(x-60,y);g.bezierCurveTo(x-20,y-50,x+20,y+50,x+60,y);g.bezierCurveTo(x+20,y-40,x-20,y+40,x-60,y);g.stroke();}
  else {g.beginPath();g.ellipse(x,y,pl.r*0.5,pl.r*0.28,-0.08,0,Math.PI*2);g.stroke();}
  label(g,pl);
}
function bakePaper(){
  const off=document.createElement("canvas");off.width=state.world.w;off.height=state.world.h;const g=off.getContext("2d");
  const page=state.me.page;
  const paper=page==="graph"?"#eef3e6":page==="comic"?"#f7f1dc":page==="pocket"?"#edd9a6":page==="back"?"#ead9b8":page==="shop"?"#f3e6c8":"#f4eed8";
  g.fillStyle=paper;g.fillRect(0,0,off.width,off.height);
  if(page==="graph"){
    g.strokeStyle="#c5d4b8";g.lineWidth=1;
    for(let x=80;x<off.width;x+=28){g.beginPath();g.moveTo(x,0);g.lineTo(x,off.height);g.stroke();}
    for(let y=40;y<off.height;y+=28){g.beginPath();g.moveTo(0,y);g.lineTo(off.width,y);g.stroke();}
    g.strokeStyle="#7f9a78";g.lineWidth=1.6;g.beginPath();g.moveTo(80,off.height/2);g.lineTo(off.width,off.height/2);g.moveTo(off.width/2,0);g.lineTo(off.width/2,off.height);g.stroke();
  } else if(page==="comic"){
    g.fillStyle="#111";g.fillRect(0,0,off.width,18);g.fillRect(0,off.height-18,off.width,18);
  } else if(page==="shop"){
    g.fillStyle="#f6d56b";g.fillRect(0,0,off.width,90);
    g.fillStyle="#1b1b1b";g.font="28px Comic Sans MS, cursive";g.fillText("INK SHOP — hats, colors, extras",140,58);
  } else if(page==="pocket"){
    g.fillStyle="#d7b36a";g.fillRect(0,0,120,off.height);g.strokeStyle="#b0893a";g.lineWidth=3;g.beginPath();g.moveTo(120,0);g.lineTo(120,off.height);g.stroke();
  } else {
    g.strokeStyle="#c7d8ea";g.lineWidth=1;
    for(let y=36;y<off.height;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(off.width,y);g.stroke();}
    g.strokeStyle="#efb4b4";g.lineWidth=2;g.beginPath();g.moveTo(96,0);g.lineTo(96,off.height);g.stroke();
  }
  g.fillStyle="#c4b492";
  for(let y=64;y<off.height;y+=88){g.beginPath();g.arc(38,y,11,0,Math.PI*2);g.fill();g.strokeStyle="#8b7d62";g.lineWidth=2;g.beginPath();g.arc(38,y,16,0.2,Math.PI-0.2);g.stroke();}
  if(page==="back"){g.fillStyle="#d7c49a";g.beginPath();g.moveTo(off.width,0);g.lineTo(off.width-48,90);g.lineTo(off.width,170);g.lineTo(off.width-30,280);g.lineTo(off.width,off.height);g.closePath();g.fill();}
  g.globalAlpha=.05;for(let i=0;i<180;i++){g.fillStyle=i%2?"#7a6240":"#2a2418";g.fillRect(Math.random()*off.width,Math.random()*off.height,2,2);}g.globalAlpha=1;
  for(const pl of state.places) drawKind(g,pl);
  state.paper=off;
}
