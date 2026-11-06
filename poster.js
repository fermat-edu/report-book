/* 페르마 통계포스터 만들기 – B4 세로(257×364mm) 자유 배치 편집기
   - 제목·글 상자·그래프·사진·도형·스티커를 마음대로 놓고, 크기와 색을 바꿔요.
   - 구글 설문지 응답을 붙여 넣으면 그래프가 만들어져요.
   - PDF용 그림은 html2canvas 없이 캔버스에 직접 그려요(편집 화면과 같은 규칙). */
(function(){
"use strict";
const W=1028, H=1456;               // 4px = 1mm
const LH=1.45;                      // 글 상자 줄 간격
const THEMES={
  mint:  {name:"민트",  bg:"#f3fbf8",main:"#2f9e7e",sub:"#cdeee2",accent:"#f2827f",ink:"#1f2a2c"},
  coral: {name:"코랄",  bg:"#fff6f3",main:"#e0605a",sub:"#fbd9d5",accent:"#3e9ca7",ink:"#2a1f1f"},
  blue:  {name:"블루",  bg:"#f3f7ff",main:"#3a6fd8",sub:"#d7e3fa",accent:"#f2a33a",ink:"#1d2433"},
  yellow:{name:"옐로",  bg:"#fffbea",main:"#d99a00",sub:"#ffecad",accent:"#3e7cb1",ink:"#2b2410"},
  purple:{name:"퍼플",  bg:"#f8f5ff",main:"#7b5cc9",sub:"#e4dbfa",accent:"#e9a03b",ink:"#241f33"},
  dark:  {name:"다크",  bg:"#1f2a2c",main:"#5fb8c2",sub:"#3a4a4e",accent:"#f2a29f",ink:"#f1f5f5"}
};
const PAL=["#3e9ca7","#f2827f","#f2c14e","#6a8fd8","#8bc28c","#b48ad6","#ef9a5b","#7a8b8d","#e46fa1","#4fb3a0"];
const FONTS=[["Noto Sans KR","본문체"],["Do Hyeon","도현체"],["Black Han Sans","검은고딕"],["Jua","주아체"],["Noto Serif KR","명조체"]];
const STK=["📊","📈","📉","🔍","💡","✅","❗","❓","⭐","🎯","📌","📱","📚","🏫","🍜","🌶️","😀","😮","🤔","👍","👥","🗳️","🧮","🌍","❤️","⚠️","➡️","🏆"];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const r4=v=>Math.round(v/4)*4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

let zoom=1, sizer=null, S=null, KEY="", O={}, root=null, wrap=null, board=null, bar=null, side=null, scale=1, sel=null, hist=[], tSave=null, typed=false, ro=null;
const th=()=>THEMES[S.theme]||THEMES.mint;
const find=id=>S.items.find(x=>x.id===id);
const blank=()=>({v:1,theme:"mint",bg:THEMES.mint.bg,items:[]});

/* ---------- 저장 · 되돌리기 ---------- */
function save(now){ clearTimeout(tSave); const go=()=>{ if(O.put) O.put(KEY,JSON.parse(JSON.stringify(S))).catch(()=>{}); }; if(now) go(); else tSave=setTimeout(go,500); if(O.onChange) O.onChange(); }
function snap(){ hist.push(JSON.stringify(S)); if(hist.length>40) hist.shift(); }
function undo(){ if(!hist.length) return; S=JSON.parse(hist.pop()); if(sel&&!find(sel)) sel=null; render(); save(); }

/* ---------- 새 요소 ---------- */
function mk(type,o){
  const t=th(), base={id:uid(),type,x:80,y:80,w:400,h:200};
  if(type==="text") Object.assign(base,{text:"여기에 글을 써요.",font:"Noto Sans KR",size:18,bold:false,color:t.ink,fill:S.theme==="dark"?t.sub:"#ffffff",stroke:t.sub,sw:2,radius:12,align:"left",valign:"top",pad:14});
  if(type==="title") Object.assign(base,{type:"text",role:"title",text:"제목",font:"Black Han Sans",size:40,bold:false,color:"#ffffff",fill:t.main,stroke:"",sw:0,radius:12,align:"center",valign:"middle",pad:12,h:80});
  if(type==="chart") Object.assign(base,{w:460,h:320,fill:S.theme==="dark"?t.sub:"#ffffff",stroke:t.sub,sw:2,radius:12,
    chart:{kind:"bar",title:"그래프 제목",labels:["항목 1","항목 2","항목 3"],values:[12,8,5],unit:"명",showVal:true,mono:false,color:t.main}});
  if(type==="image") Object.assign(base,{w:360,h:260,src:"",fit:"cover",radius:8,stroke:"",sw:0});
  if(type==="shape") Object.assign(base,{shape:"round",w:300,h:180,fill:t.sub,stroke:"",sw:0,radius:24});
  if(type==="sticker") Object.assign(base,{emoji:"⭐",w:90,h:90});
  return Object.assign(base,o||{});
}
function addItem(it){ snap(); // 화면에 보이는 위치에 놓기
  const r=wrap.getBoundingClientRect(), vy=clamp((-r.top+80)/scale,0,H-it.h);
  it.x=clamp(r4((W-it.w)/2),0,W-it.w); it.y=clamp(r4(vy),0,H-it.h);
  S.items.push(it); sel=it.id; render(); save(); }

/* ---------- 추천 배치 ---------- */
function template(){
  const t=th(), fillT=S.theme==="dark"?t.sub:"#ffffff", items=[];
  const box=(x,y,w,h,head,body)=>{ items.push(mk("title",{x,y,w,h:44,text:head,font:"Do Hyeon",size:24,align:"left",radius:10,pad:14,fill:t.main}));
    items.push(mk("text",{x,y:y+52,w,h:h-52,text:body,fill:fillT})); };
  items.push(mk("shape",{shape:"rect",x:0,y:0,w:W,h:200,fill:t.main,radius:0}));
  items.push(mk("title",{x:40,y:28,w:W-80,h:96,text:O.title&&O.title()||"포스터 제목을 써요",size:56,fill:"",radius:0}));
  items.push(mk("text",{x:40,y:128,w:W-80,h:44,text:"부제: 무엇을 조사했는지 한 줄로 써요",font:"Noto Sans KR",size:20,bold:true,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:6}));
  items.push(mk("text",{x:W-300,y:208,w:260,h:40,text:(O.team&&O.team())||"팀명 | 팀원 이름",size:15,color:t.ink,fill:"",stroke:"",sw:0,align:"right",valign:"middle",pad:4}));
  box(40,256,464,250,"탐구 동기 및 목적","생활 속에서 무엇이 궁금했나요?\n이 탐구로 무엇을 알아내고 싶나요?");
  box(524,256,464,250,"탐구 질문과 가설","질문 1)\n질문 2)\n가설: ~할수록 ~할 것이다.");
  box(40,526,948,150,"조사 방법","구글 설문지 · 대상: ○○중 1~3학년 ○○명 · 기간: ○월 ○일~○일\n사전조사 → 설문 만들기 → 배포 → 결과 정리 → 분석");
  items.push(mk("title",{x:40,y:696,w:948,h:44,text:"조사 결과와 분석",font:"Do Hyeon",size:24,align:"left",radius:10,pad:14,fill:t.main}));
  items.push(mk("chart",{x:40,y:748,w:464,h:300}));
  items.push(mk("chart",{x:524,y:748,w:464,h:300,chart:{kind:"pie",title:"그래프 제목",labels:["예","아니요","모르겠다"],values:[20,9,4],unit:"명",showVal:true,mono:false,color:t.main}}));
  items.push(mk("text",{x:40,y:1056,w:464,h:96,text:"해석: 사실(숫자) → 의미 → 이유",size:16,fill:fillT}));
  items.push(mk("text",{x:524,y:1056,w:464,h:96,text:"해석: 사실(숫자) → 의미 → 이유",size:16,fill:fillT}));
  box(40,1172,600,244,"결론 및 제언","질문마다 답하고, 가설이 맞았는지 써요.\n누구에게 무엇을 제안할까요?");
  box(660,1172,328,244,"느낀 점과 한계","배운 점, 아쉬운 점");
  return items;
}

/* ---------- 그래프 데이터 ---------- */
function parseData(txt,opt){
  let lines=String(txt||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  let title="";
  if(opt.header&&lines.length){ title=lines.shift(); }
  const pairs=lines.map(l=>{ const m=l.split(/\t|,|:|=/).map(s=>s.trim()).filter(s=>s!==""); const n=m.length>1?parseFloat(String(m[m.length-1]).replace(/[^\d.\-]/g,"")):NaN; return {lab:m.slice(0,-1).join(" "),n,raw:l}; });
  if(lines.length&&pairs.every(p=>p.lab&&!isNaN(p.n))) return {title,labels:pairs.map(p=>p.lab),values:pairs.map(p=>p.n),mode:"pair"};
  const cnt=new Map(); // 응답을 그대로 붙여 넣으면 같은 답끼리 세기
  lines.forEach(l=>{ (opt.multi?l.split(/,\s*/):[l]).map(s=>s.trim()).filter(Boolean).forEach(a=>cnt.set(a,(cnt.get(a)||0)+1)); });
  const arr=[...cnt.entries()]; if(opt.sort!==false) arr.sort((a,b)=>b[1]-a[1]);
  return {title,labels:arr.map(a=>a[0]),values:arr.map(a=>a[1]),mode:"count",n:lines.length};
}

/* ---------- 캔버스 그리기 (편집 화면과 PDF가 같이 씀) ---------- */
const fontStr=(bold,size,fam)=>(bold?"700 ":"400 ")+size+'px "'+fam+'", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
function rr(ctx,x,y,w,h,r){ r=Math.max(0,Math.min(r,w/2,h/2)); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function wrapLines(ctx,text,maxW){
  const out=[];
  String(text||"").split("\n").forEach(par=>{
    if(par===""){ out.push(""); return; }
    const toks=par.split(/(\s+)/); let line="";
    toks.forEach(tk=>{
      if(tk==="") return;
      const test=line+tk;
      if(ctx.measureText(test).width<=maxW||line===""&&/^\s+$/.test(tk)){ line=test; return; }
      if(/^\s+$/.test(tk)){ out.push(line); line=""; return; }
      if(line.trim()!==""){ out.push(line.replace(/\s+$/,"")); line=""; }
      if(ctx.measureText(tk).width<=maxW){ line=tk; return; }
      for(const ch of Array.from(tk)){ if(ctx.measureText(line+ch).width>maxW&&line){ out.push(line); line=ch; } else line+=ch; }
    });
    out.push(line.replace(/\s+$/,""));
  });
  return out;
}
function drawText(ctx,it){
  const p=it.pad||0, mw=it.w-2*p; ctx.font=fontStr(it.bold,it.size,it.font); ctx.fillStyle=it.color||"#222"; ctx.textBaseline="top";
  const lines=wrapLines(ctx,it.text,mw), lh=it.size*LH, total=lines.length*lh;
  let y=it.y+p+(it.valign==="middle"?(it.h-2*p-total)/2:0);
  ctx.save(); ctx.beginPath(); ctx.rect(it.x,it.y,it.w,it.h); ctx.clip();
  lines.forEach(l=>{ const lw=ctx.measureText(l).width; const x=it.align==="center"?it.x+(it.w-lw)/2:it.align==="right"?it.x+it.w-p-lw:it.x+p;
    ctx.fillText(l,x,y+(lh-it.size)/2); y+=lh; });
  ctx.restore();
}
function drawBox(ctx,it,x,y,w,h){
  const r=it.radius||0;
  if(it.fill){ rr(ctx,x,y,w,h,r); ctx.fillStyle=it.fill; ctx.fill(); }
  if(it.stroke&&it.sw){ ctx.lineWidth=it.sw; ctx.strokeStyle=it.stroke; rr(ctx,x+it.sw/2,y+it.sw/2,w-it.sw,h-it.sw,Math.max(0,r-it.sw/2)); ctx.stroke(); }
}
function drawShape(ctx,it,x,y,w,h){
  ctx.fillStyle=it.fill||"transparent"; ctx.strokeStyle=it.stroke||"transparent"; ctx.lineWidth=it.sw||0;
  if(it.shape==="ellipse"){ ctx.beginPath(); ctx.ellipse(x+w/2,y+h/2,Math.max(1,w/2-(it.sw||0)/2),Math.max(1,h/2-(it.sw||0)/2),0,0,Math.PI*2); if(it.fill) ctx.fill(); if(it.stroke&&it.sw) ctx.stroke(); return; }
  if(it.shape==="arrow"){ const sh=h*0.42, hx=x+w-Math.min(w*0.4,h); ctx.beginPath(); ctx.moveTo(x,y+(h-sh)/2); ctx.lineTo(hx,y+(h-sh)/2); ctx.lineTo(hx,y); ctx.lineTo(x+w,y+h/2); ctx.lineTo(hx,y+h); ctx.lineTo(hx,y+(h+sh)/2); ctx.lineTo(x,y+(h+sh)/2); ctx.closePath(); if(it.fill) ctx.fill(); if(it.stroke&&it.sw) ctx.stroke(); return; }
  if(it.shape==="line"){ ctx.strokeStyle=it.fill||it.stroke||"#333"; ctx.lineWidth=Math.max(2,h); ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke(); return; }
  drawBox(ctx,{fill:it.fill,stroke:it.stroke,sw:it.sw,radius:it.shape==="rect"?0:(it.radius||24)},x,y,w,h);
}
const fmtV=(v,u)=>(Math.round(v*10)/10).toLocaleString("ko-KR")+(u||"");
function drawChart(ctx,it,x,y,w,h){
  const c=it.chart||{}, t=th(), ink=(it.fill&&isDark(it.fill))?"#f1f5f5":t.ink, grid=(it.fill&&isDark(it.fill))?"#55666a":"#d9dfe0";
  const labels=c.labels||[], vals=(c.values||[]).map(v=>+v||0), n=Math.min(labels.length,vals.length);
  const col=i=>c.mono?(c.color||t.main):PAL[i%PAL.length];
  const P=16; let top=y+P;
  if(c.title){ ctx.font=fontStr(true,20,"Noto Sans KR"); ctx.fillStyle=ink; ctx.textBaseline="top"; const ls=wrapLines(ctx,c.title,w-2*P).slice(0,2);
    ls.forEach(l=>{ ctx.fillText(l,x+(w-ctx.measureText(l).width)/2,top); top+=26; }); top+=6; }
  const ax=x+P, aw=w-2*P, ah=y+h-P-top; if(!n||ah<40){ return; }
  const sum=vals.slice(0,n).reduce((a,b)=>a+b,0)||1, max=Math.max(...vals.slice(0,n),0)||1;
  ctx.textBaseline="alphabetic";
  if(c.kind==="pie"||c.kind==="donut"){
    const legendW=Math.min(aw*0.5,220), d=Math.min(ah,aw-legendW-12), cx=ax+d/2, cy=top+ah/2; let a=-Math.PI/2;
    for(let i=0;i<n;i++){ const s=vals[i]/sum*Math.PI*2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,d/2,a,a+s); ctx.closePath(); ctx.fillStyle=col(i); ctx.fill();
      if(c.showVal&&vals[i]/sum>=0.07){ const m=a+s/2, rr2=c.kind==="donut"?d*0.38:d*0.32; ctx.font=fontStr(true,15,"Noto Sans KR"); ctx.fillStyle="#ffffff"; const tx=Math.round(vals[i]/sum*100)+"%"; ctx.fillText(tx,cx+Math.cos(m)*rr2-ctx.measureText(tx).width/2,cy+Math.sin(m)*rr2+5); }
      a+=s; }
    if(c.kind==="donut"){ ctx.beginPath(); ctx.arc(cx,cy,d*0.25,0,Math.PI*2); ctx.fillStyle=it.fill||"#ffffff"; ctx.fill(); ctx.font=fontStr(true,16,"Noto Sans KR"); ctx.fillStyle=ink; const tt="n="+fmtV(sum,""); ctx.fillText(tt,cx-ctx.measureText(tt).width/2,cy+6); }
    const lx=ax+d+16, rowH=Math.min(30,ah/Math.max(n,1)); let ly=top+(ah-rowH*n)/2;
    ctx.font=fontStr(false,14,"Noto Sans KR");
    for(let i=0;i<n;i++){ ctx.fillStyle=col(i); rr(ctx,lx,ly+rowH/2-7,14,14,3); ctx.fill(); ctx.fillStyle=ink;
      let s=labels[i]+(c.showVal?" "+fmtV(vals[i],c.unit):""); while(ctx.measureText(s).width>aw-d-40&&s.length>2) s=s.slice(0,-2)+"…";
      ctx.fillText(s,lx+20,ly+rowH/2+5); ly+=rowH; }
    return;
  }
  if(c.kind==="hbar"){
    ctx.font=fontStr(false,14,"Noto Sans KR"); const lw=Math.min(aw*0.34,Math.max(...labels.slice(0,n).map(l=>ctx.measureText(l).width))+8), bw=aw-lw-50, rowH=ah/n, bh=Math.min(rowH*0.62,34);
    for(let i=0;i<n;i++){ const yy=top+rowH*i+(rowH-bh)/2; ctx.fillStyle=ink; let s=labels[i]; while(ctx.measureText(s).width>lw-6&&s.length>2) s=s.slice(0,-2)+"…"; ctx.fillText(s,ax+lw-8-ctx.measureText(s).width,yy+bh/2+5);
      const L=Math.max(2,vals[i]/max*bw); ctx.fillStyle=col(i); rr(ctx,ax+lw,yy,L,bh,4); ctx.fill();
      if(c.showVal){ ctx.fillStyle=ink; ctx.font=fontStr(true,14,"Noto Sans KR"); ctx.fillText(fmtV(vals[i],c.unit),ax+lw+L+6,yy+bh/2+5); ctx.font=fontStr(false,14,"Noto Sans KR"); } }
    return;
  }
  // 세로 막대 · 꺾은선
  ctx.font=fontStr(false,13,"Noto Sans KR");
  const labLines=labels.slice(0,n).map(l=>wrapLines(ctx,l,Math.max(30,aw/n-6)).slice(0,2)), labH=Math.max(...labLines.map(l=>l.length))*16+6;
  const ph=ah-labH-(c.showVal?20:4), base=top+(c.showVal?20:4)+ph, slot=aw/n;
  ctx.strokeStyle=grid; ctx.lineWidth=1; for(let g=0;g<=4;g++){ const gy=base-ph*g/4; ctx.beginPath(); ctx.moveTo(ax,gy); ctx.lineTo(ax+aw,gy); ctx.stroke(); }
  const pts=[];
  for(let i=0;i<n;i++){ const bh=vals[i]/max*ph, cx=ax+slot*i+slot/2;
    if(c.kind==="line") pts.push([cx,base-bh]);
    else{ const bw=Math.min(slot*0.62,70); ctx.fillStyle=col(i); rr(ctx,cx-bw/2,base-bh,bw,Math.max(bh,1),4); ctx.fill(); }
    if(c.showVal){ ctx.fillStyle=ink; ctx.font=fontStr(true,14,"Noto Sans KR"); const tx=fmtV(vals[i],c.unit); ctx.fillText(tx,cx-ctx.measureText(tx).width/2,base-bh-6-(c.kind==="line"?6:0)); }
    ctx.fillStyle=ink; ctx.font=fontStr(false,13,"Noto Sans KR"); labLines[i].forEach((l,k)=>ctx.fillText(l,cx-ctx.measureText(l).width/2,base+16+k*16)); }
  if(c.kind==="line"&&pts.length){ ctx.strokeStyle=c.color||t.main; ctx.lineWidth=3; ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke();
    pts.forEach(p=>{ ctx.beginPath(); ctx.arc(p[0],p[1],5,0,Math.PI*2); ctx.fillStyle=c.color||t.main; ctx.fill(); }); }
}
function isDark(hex){ const m=String(hex).match(/^#?([0-9a-f]{6})$/i); if(!m) return false; const n=parseInt(m[1],16); return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000<128; }
function paintCanvas(cv,it,kind){ // 편집 화면용 작은 캔버스
  const dpr=Math.min(2,(window.devicePixelRatio||1)*Math.max(scale,0.5)); cv.width=Math.max(1,Math.round(it.w*dpr)); cv.height=Math.max(1,Math.round(it.h*dpr));
  const ctx=cv.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,it.w,it.h);
  if(kind==="chart"){ drawBox(ctx,it,0,0,it.w,it.h); drawChart(ctx,it,0,0,it.w,it.h); }
  else drawShape(ctx,it,0,0,it.w,it.h);
}

/* ---------- 화면 그리기 ---------- */
function place(d,it){ d.style.left=it.x+"px"; d.style.top=it.y+"px"; d.style.width=it.w+"px"; d.style.height=it.h+"px"; }
function elFor(it){
  const d=document.createElement("div"); d.className="pi pi-"+it.type+(sel===it.id?" on":""); d.dataset.id=it.id; place(d,it);
  if(it.type==="text"){
    d.style.background=it.fill||"transparent"; d.style.borderRadius=(it.radius||0)+"px"; d.style.border=it.stroke&&it.sw?it.sw+"px solid "+it.stroke:"0";
    const t=document.createElement("div"); t.className="pt"; t.textContent=it.text;
    Object.assign(t.style,{fontFamily:'"'+it.font+'", "Noto Sans KR", sans-serif',fontSize:it.size+"px",fontWeight:it.bold?"700":"400",color:it.color,textAlign:it.align,lineHeight:String(LH),padding:Math.max(0,(it.pad||0)-(it.stroke&&it.sw?it.sw:0))+"px",justifyContent:it.valign==="middle"?"center":"flex-start"});
    if(sel===it.id){ try{ t.contentEditable="plaintext-only"; }catch(e){ t.contentEditable="true"; } t.spellcheck=false; }
    t.addEventListener("input",()=>{ if(!typed){ snap(); typed=true; } it.text=t.innerText.replace(/\n$/,""); save(); });
    t.addEventListener("paste",e=>{ e.preventDefault(); const s=(e.clipboardData||window.clipboardData).getData("text"); document.execCommand("insertText",false,s); });
    d.appendChild(t);
  } else if(it.type==="image"){
    d.style.borderRadius=(it.radius||0)+"px"; d.style.border=it.stroke&&it.sw?it.sw+"px solid "+it.stroke:"0"; d.style.overflow="hidden";
    if(it.src){ const im=document.createElement("img"); im.src=it.src; im.alt=""; im.draggable=false; im.style.objectFit=it.fit||"cover"; d.appendChild(im); }
    else d.innerHTML='<div class="pimg-empty">🖼 사진을 고르세요</div>';
  } else if(it.type==="sticker"){
    const s=document.createElement("div"); s.className="pst"; s.textContent=it.emoji; s.style.fontSize=Math.min(it.w,it.h)*0.8+"px"; d.appendChild(s);
  } else { const cv=document.createElement("canvas"); d.appendChild(cv); paintCanvas(cv,it,it.type); }
  if(sel===it.id){ d.insertAdjacentHTML("beforeend",'<button type="button" class="hm" title="옮기기" aria-label="옮기기">✥</button><span class="hr" title="크기 바꾸기"></span>'); }
  return d;
}
function upd(it){ const d=board.querySelector('[data-id="'+it.id+'"]'); if(!d) return; place(d,it);
  if(it.type==="chart"||it.type==="shape"){ const cv=d.querySelector("canvas"); if(cv) paintCanvas(cv,it,it.type); }
  if(it.type==="sticker"){ const s=d.querySelector(".pst"); if(s) s.style.fontSize=Math.min(it.w,it.h)*0.8+"px"; } }
function render(){
  board.style.background=S.bg; board.innerHTML="";
  S.items.forEach(it=>board.appendChild(elFor(it)));
  if(!S.items.length) board.insertAdjacentHTML("beforeend",'<div class="pempty"><b>B4 포스터 판</b><br>위에서 ‘추천 배치로 시작’을 누르거나<br>제목·글 상자·그래프를 하나씩 넣어 보세요.</div>');
  panel(); toolbarState();
}
function fit(){ const w=wrap.clientWidth||W; scale=w/W*zoom; sizer.style.width=Math.round(W*scale)+"px"; sizer.style.height=Math.round(H*scale)+"px"; board.style.transform="scale("+scale+")"; board.style.setProperty("--inv",(1/scale).toFixed(3)); wrap.style.height=zoom>1?Math.min(Math.round(H*scale),Math.round(window.innerHeight*0.75))+"px":Math.round(H*scale)+"px"; wrap.classList.toggle("zoomed",zoom>1); const z=bar&&bar.querySelector(".pzoom"); if(z) z.textContent=Math.round(zoom*100)+"%"; }

/* ---------- 도구 막대 ---------- */
function toolbar(){
  return '<div class="pbar">'+
   '<div class="prow"><span class="plab">넣기</span>'+
     '<button type="button" data-add="title">🔠 제목</button><button type="button" data-add="text">📝 글 상자</button><button type="button" data-add="chart">📊 그래프</button>'+
     '<button type="button" data-add="image">🖼 사진</button>'+
     '<span class="pdd"><button type="button" data-pop="shape">⬛ 도형 ▾</button><span class="ppop" data-popbox="shape" hidden>'+
       [["rect","네모"],["round","둥근 네모"],["ellipse","동그라미"],["arrow","화살표"],["line","선"]].map(([k,l])=>'<button type="button" data-shape="'+k+'">'+l+'</button>').join("")+'</span></span>'+
     '<span class="pdd"><button type="button" data-pop="stk">😀 스티커 ▾</button><span class="ppop pstk" data-popbox="stk" hidden>'+STK.map(e=>'<button type="button" data-stk="'+e+'">'+e+'</button>').join("")+'</span></span>'+
   '</div>'+
   '<div class="prow"><span class="plab">포스터</span>'+
     '<label class="pinl">테마 <select data-theme>'+Object.entries(THEMES).map(([k,v])=>'<option value="'+k+'">'+v.name+'</option>').join("")+'</select></label>'+
     '<label class="pinl">배경 <input type="color" data-bg></label>'+
     '<span class="pinl">보기 <button type="button" data-zoom="-1" aria-label="작게 보기">−</button><span class="pzoom pnum">100%</span><button type="button" data-zoom="1" aria-label="크게 보기">＋</button></span><button type="button" data-tpl="1">✨ 추천 배치로 시작</button><button type="button" data-undo="1">↶ 되돌리기</button><button type="button" data-clear="1" class="pdanger">모두 지우기</button>'+
   '</div>'+
   '<div class="prow psel" hidden></div>'+
  '</div>';
}
function toolbarState(){ const ts=bar.querySelector("[data-theme]"); if(ts) ts.value=S.theme; const bg=bar.querySelector("[data-bg]"); if(bg) bg.value=/^#[0-9a-f]{6}$/i.test(S.bg)?S.bg:"#ffffff"; }
const colIn=(k,v,label)=>'<label class="pinl">'+label+' <input type="color" data-k="'+k+'" value="'+(/^#[0-9a-f]{6}$/i.test(v)?v:"#ffffff")+'"></label>';
function panel(){
  const box=bar.querySelector(".psel"), it=sel&&find(sel); if(!it){ box.hidden=true; box.innerHTML=""; return; }
  let h='<span class="plab">고른 것</span>';
  if(it.type==="text"){
    h+='<select data-k="font" aria-label="글꼴">'+FONTS.map(([f,l])=>'<option value="'+esc(f)+'"'+(f===it.font?" selected":"")+'>'+l+'</option>').join("")+'</select>'+
      '<button type="button" data-size="-2" aria-label="글자 작게">가−</button><span class="pnum">'+it.size+'</span><button type="button" data-size="2" aria-label="글자 크게">가+</button>'+
      '<button type="button" data-tog="bold" aria-pressed="'+!!it.bold+'"><b>굵게</b></button>'+
      '<select data-k="align" aria-label="정렬"><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select>'+
      '<select data-k="valign" aria-label="세로 정렬"><option value="top">위</option><option value="middle">세로 가운데</option></select>'+
      colIn("color",it.color,"글자색");
  }
  if(it.type==="chart") h+='<button type="button" data-chart="1" class="pmain">📊 그래프 데이터·모양 바꾸기</button>';
  if(it.type==="image") h+='<button type="button" data-img="1">사진 바꾸기</button><button type="button" data-fit="1">'+(it.fit==="contain"?"꽉 채우기":"사진 전체 보이기")+'</button>';
  if(it.type==="sticker") h+='<span class="pnote">스티커는 오른쪽 아래 점을 끌어 크기를 바꿔요</span>';
  if(it.type!=="image"&&it.type!=="sticker"){
    h+=colIn("fill",it.fill,it.type==="shape"&&it.shape==="line"?"선 색":"채우기")+'<button type="button" data-nofill="1" aria-pressed="'+!it.fill+'">채우기 없음</button>';
  }
  if(it.type!=="sticker"&&!(it.type==="shape"&&it.shape==="line")){
    h+=colIn("stroke",it.stroke||"#333333","테두리")+'<select data-k="sw" aria-label="테두리 두께">'+[0,1,2,4,8].map(v=>'<option value="'+v+'"'+(+it.sw===v?" selected":"")+'>'+(v?"테두리 "+v:"테두리 없음")+'</option>').join("")+'</select>';
    if(!(it.type==="shape"&&(it.shape==="ellipse"||it.shape==="arrow"||it.shape==="rect")))
      h+='<select data-k="radius" aria-label="모서리">'+[[0,"각진 모서리"],[12,"둥근 모서리"],[28,"더 둥글게"],[999,"알약 모양"]].map(([v,l])=>'<option value="'+v+'"'+(+it.radius===v?" selected":"")+'>'+l+'</option>').join("")+'</select>';
  }
  h+='<button type="button" data-z="1">앞으로</button><button type="button" data-z="-1">뒤로</button><button type="button" data-dup="1">복제</button><button type="button" data-del="1" class="pdanger">삭제</button>';
  box.innerHTML=h; box.hidden=false;
  const a=box.querySelector('[data-k="align"]'); if(a) a.value=it.align; const v=box.querySelector('[data-k="valign"]'); if(v) v.value=it.valign||"top";
}

/* ---------- 그래프 편집 창 ---------- */
function chartModal(it){
  const c=JSON.parse(JSON.stringify(it.chart)); let src=c.src||c.labels.map((l,i)=>l+"\t"+c.values[i]).join("\n");
  const m=document.createElement("div"); m.className="pmodal";
  m.innerHTML='<div class="pmcard" role="dialog" aria-modal="true" aria-label="그래프 만들기"><h3>📊 그래프 만들기</h3>'+
   '<label class="pfld">그래프 제목<input type="text" data-ct value="'+esc(c.title)+'"></label>'+
   '<div class="pkinds">'+[["bar","세로 막대"],["hbar","가로 막대"],["pie","원"],["donut","도넛"],["line","꺾은선"]].map(([k,l])=>'<button type="button" data-ck="'+k+'" aria-pressed="'+(c.kind===k)+'">'+l+'</button>').join("")+'</div>'+
   '<label class="pfld">데이터 붙여 넣기<textarea data-cd rows="7" spellcheck="false">'+esc(src)+'</textarea></label>'+
   '<p class="pnote">① 구글 설문지 → 응답 → <b>스프레드시트에서 보기</b> → 한 질문의 칸(열)을 통째로 복사해 붙여 넣으면 같은 답끼리 자동으로 세어 줘요.<br>② 또는 <b>항목, 숫자</b>를 한 줄씩 써요. 예) 예, 20</p>'+
   '<div class="popts"><label><input type="checkbox" data-ch> 첫 줄은 질문 제목이에요 (빼고 세기)</label><label><input type="checkbox" data-cm> 여러 개 고른 답(쉼표로 나뉨)은 나눠서 세기</label>'+
   '<label><input type="checkbox" data-cv'+(c.showVal?" checked":"")+'> 숫자 보이기</label><label><input type="checkbox" data-cmono'+(c.mono?" checked":"")+'> 한 가지 색으로</label><label>단위 <input type="text" data-cu value="'+esc(c.unit||"")+'" style="width:56px"></label></div>'+
   '<p class="pnote" data-cinfo></p><canvas class="pprev"></canvas>'+
   '<div class="pmbtn"><button type="button" data-cancel="1">취소</button><button type="button" data-ok="1" class="pmain">그래프에 적용</button></div></div>';
  root.appendChild(m);
  const q=s=>m.querySelector(s), prevIt=()=>({...it,w:460,h:300,chart:c});
  function recompute(){ const d=parseData(q("[data-cd]").value,{header:q("[data-ch]").checked,multi:q("[data-cm]").checked});
    c.labels=d.labels.slice(0,12); c.values=d.values.slice(0,12); c.src=q("[data-cd]").value;
    if(d.title&&(!q("[data-ct]").value.trim()||q("[data-ct]").value.trim()==="그래프 제목")){ q("[data-ct]").value=d.title; }
    c.title=q("[data-ct]").value; c.unit=q("[data-cu]").value; c.showVal=q("[data-cv]").checked; c.mono=q("[data-cmono]").checked;
    q("[data-cinfo]").textContent=d.labels.length?(d.mode==="count"?"응답 "+d.n+"개를 세었어요 → 답 "+d.labels.length+"가지":"항목 "+d.labels.length+"개")+(d.labels.length>12?" (그래프에는 많은 순서로 12개까지만 보여요)":""):"데이터를 붙여 넣어 주세요.";
    const cv=q(".pprev"), pi=prevIt(); cv.width=920; cv.height=600; const ctx=cv.getContext("2d"); ctx.setTransform(2,0,0,2,0,0); drawBox(ctx,pi,0,0,460,300); drawChart(ctx,pi,0,0,460,300); }
  m.addEventListener("input",recompute); m.addEventListener("change",recompute);
  m.addEventListener("click",e=>{ const k=e.target.closest("[data-ck]"); if(k){ c.kind=k.dataset.ck; m.querySelectorAll("[data-ck]").forEach(b=>b.setAttribute("aria-pressed",String(b===k))); recompute(); }
    if(e.target.closest("[data-cancel]")||e.target===m) m.remove();
    if(e.target.closest("[data-ok]")){ snap(); it.chart=c; m.remove(); upd(it); save(); } });
  recompute(); setTimeout(()=>q("[data-cd]").focus(),30);
}

/* ---------- 사진 ---------- */
function pickImage(cb){
  const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return; const fr=new FileReader();
    fr.onload=()=>{ const im=new Image(); im.onload=()=>{ const mx=1600, s=Math.min(1,mx/Math.max(im.width,im.height)); const cv=document.createElement("canvas"); cv.width=Math.round(im.width*s); cv.height=Math.round(im.height*s);
      const g=cv.getContext("2d"); g.fillStyle="#ffffff"; g.fillRect(0,0,cv.width,cv.height); g.drawImage(im,0,0,cv.width,cv.height); cb(cv.toDataURL("image/jpeg",0.86),cv.width/cv.height); };
      im.onerror=()=>alertMsg("이 사진은 열 수 없어요. JPG나 PNG로 다시 저장해서 올려 주세요."); im.src=fr.result; };
    fr.readAsDataURL(f); };
  inp.click();
}
function alertMsg(s){ if(O.status) O.status(s); }

/* ---------- 마우스 · 손가락으로 옮기고 크기 바꾸기 ---------- */
function onDown(e){
  const pi=e.target.closest(".pi");
  if(!pi){ if(sel){ sel=null; typed=false; render(); } return; }
  const it=find(pi.dataset.id); if(!it) return;
  const isRes=e.target.classList.contains("hr"), isMove=e.target.classList.contains("hm"), inText=!!e.target.closest(".pt");
  if(sel===it.id&&inText&&!isRes&&!isMove) return;          // 글 고치는 중
  e.preventDefault();
  if(sel!==it.id){ sel=it.id; typed=false; render(); }
  const sx=e.clientX, sy=e.clientY, o={x:it.x,y:it.y,w:it.w,h:it.h}; let moved=false;
  const mv=ev=>{ const dx=(ev.clientX-sx)/scale, dy=(ev.clientY-sy)/scale; if(!moved&&Math.abs(dx)+Math.abs(dy)<3) return; if(!moved){ snap(); moved=true; }
    if(isRes){ let w=Math.max(30,r4(o.w+dx)), h=Math.max(24,r4(o.h+dy)); if(it.type==="sticker"){ w=h=Math.max(w,h); }
      it.w=Math.min(w,W-it.x); it.h=Math.min(h,H-it.y); }
    else{ it.x=clamp(r4(o.x+dx),-it.w+40,W-40); it.y=clamp(r4(o.y+dy),-it.h+40,H-40); }
    upd(it); };
  const up=()=>{ window.removeEventListener("pointermove",mv); window.removeEventListener("pointerup",up); window.removeEventListener("pointercancel",up); if(moved) save(); };
  window.addEventListener("pointermove",mv); window.addEventListener("pointerup",up); window.addEventListener("pointercancel",up);
}
function onKey(e){
  if(!sel||!root.contains(document.activeElement)&&document.activeElement!==document.body) return;
  if(e.target.closest&&e.target.closest(".pt,input,textarea,select")) return;
  const it=find(sel); if(!it) return;
  if(e.key==="Delete"||e.key==="Backspace"){ e.preventDefault(); snap(); S.items=S.items.filter(x=>x!==it); sel=null; render(); save(); return; }
  const st=e.shiftKey?20:4, mv={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];
  if(mv){ e.preventDefault(); snap(); it.x+=mv[0]; it.y+=mv[1]; upd(it); save(); }
}

/* ---------- 도구 막대 눌렀을 때 ---------- */
function recolor(oldT,newT){ const map={}; ["bg","main","sub","accent","ink"].forEach(k=>{ map[oldT[k].toLowerCase()]=newT[k]; });
  const m=v=>v&&map[String(v).toLowerCase()]||v;
  S.items.forEach(it=>{ ["fill","stroke","color"].forEach(k=>{ if(it[k]) it[k]=m(it[k]); }); if(it.chart&&it.chart.color) it.chart.color=m(it.chart.color); });
  if(String(S.bg).toLowerCase()===oldT.bg.toLowerCase()) S.bg=newT.bg; }
function onBar(e){
  const b=e.target.closest("button"); if(!b) return;
  const pop=b.dataset.pop; if(pop){ bar.querySelectorAll("[data-popbox]").forEach(p=>p.hidden=p.dataset.popbox!==pop||!p.hidden); return; }
  bar.querySelectorAll("[data-popbox]").forEach(p=>p.hidden=true);
  const it=sel&&find(sel);
  if(b.dataset.add){ const t=b.dataset.add;
    if(t==="image"){ pickImage((src,ar)=>{ const w=360; addItem(mk("image",{src,w,h:r4(clamp(w/ar,80,700))})); }); return; }
    addItem(mk(t)); if(t==="chart") setTimeout(()=>chartModal(find(sel)),50); return; }
  if(b.dataset.shape){ const s=b.dataset.shape; addItem(mk("shape",{shape:s,h:s==="line"?8:s==="arrow"?100:180,w:s==="line"?400:s==="arrow"?220:300,fill:s==="line"?th().ink:th().sub})); return; }
  if(b.dataset.stk){ addItem(mk("sticker",{emoji:b.dataset.stk})); return; }
  if(b.dataset.tpl){ if(S.items.length&&!b.dataset.sure){ b.dataset.sure="1"; b.textContent="지금 것을 지우고 시작할까요? 한 번 더 누르기"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="✨ 추천 배치로 시작"; },3500); return; }
    snap(); S.bg=th().bg; S.items=template(); sel=null; render(); save(); return; }
  if(b.dataset.zoom){ const Z=[1,1.5,2,3]; zoom=Z[clamp(Z.indexOf(zoom)+(+b.dataset.zoom),0,Z.length-1)]; fit(); return; }
  if(b.dataset.undo){ undo(); return; }
  if(b.dataset.clear){ if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent="정말 모두 지울까요? 한 번 더 누르기"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="모두 지우기"; },3500); return; }
    snap(); S.items=[]; sel=null; render(); save(); return; }
  if(!it) return;
  if(b.dataset.size){ snap(); it.size=clamp(it.size+(+b.dataset.size),10,140); render(); save(); return; }
  if(b.dataset.tog){ snap(); it[b.dataset.tog]=!it[b.dataset.tog]; render(); save(); return; }
  if(b.dataset.nofill){ snap(); it.fill=it.fill?"":(it.type==="text"?"#ffffff":th().sub); render(); save(); return; }
  if(b.dataset.chart){ chartModal(it); return; }
  if(b.dataset.img){ pickImage((src)=>{ snap(); it.src=src; render(); save(); }); return; }
  if(b.dataset.fit){ snap(); it.fit=it.fit==="contain"?"cover":"contain"; render(); save(); return; }
  if(b.dataset.z){ snap(); const i=S.items.indexOf(it); S.items.splice(i,1); if(+b.dataset.z>0) S.items.push(it); else S.items.unshift(it); render(); save(); return; }
  if(b.dataset.dup){ snap(); const c=JSON.parse(JSON.stringify(it)); c.id=uid(); c.x=Math.min(it.x+24,W-c.w); c.y=Math.min(it.y+24,H-c.h); S.items.push(c); sel=c.id; render(); save(); return; }
  if(b.dataset.del){ snap(); S.items=S.items.filter(x=>x!==it); sel=null; render(); save(); return; }
}
function onBarChange(e){
  const t=e.target;
  if(t.matches("[data-theme]")){ snap(); const o=th(); S.theme=t.value; recolor(o,th()); render(); save(); return; }
  if(t.matches("[data-bg]")){ snap(); S.bg=t.value; board.style.background=S.bg; save(); return; }
  const it=sel&&find(sel); if(!it||!t.dataset.k) return;
  snap(); let v=t.value; if(t.dataset.k==="sw"||t.dataset.k==="radius") v=+v; it[t.dataset.k]=v;
  if(t.dataset.k==="stroke"&&!it.sw) it.sw=2;
  if(t.type==="color"){ const d=board.querySelector('[data-id="'+it.id+'"]'); if(d){ d.replaceWith(elFor(it)); } } else render();
  save();
}

/* ---------- 바깥에서 쓰는 함수 ---------- */
async function flush(){ if(tSave&&S&&KEY&&O.put){ clearTimeout(tSave); tSave=null; try{ await O.put(KEY,JSON.parse(JSON.stringify(S))); }catch(e){} } }
async function mount(el,opts){
  await flush();
  O=opts||{}; KEY=O.key; root=el; sel=null; hist=[];
  let data=null; try{ data=O.get?await O.get(KEY):null; }catch(e){}
  S=data&&Array.isArray(data.items)?data:blank();
  el.innerHTML='<div class="poster-ed">'+toolbar()+'<div class="pwrap"><div class="psizer"><div class="pboard"></div></div></div>'+
    '<p class="pnote">글 상자는 한 번 눌러 고르고, 다시 누르면 글을 고칠 수 있어요. ✥를 끌면 옮겨지고, 오른쪽 아래 점을 끌면 크기가 바뀌어요. 자동으로 저장돼요.</p></div>';
  bar=el.querySelector(".pbar"); wrap=el.querySelector(".pwrap"); sizer=el.querySelector(".psizer"); board=el.querySelector(".pboard"); zoom=1;
  board.style.width=W+"px"; board.style.height=H+"px";
  board.addEventListener("pointerdown",onDown); bar.addEventListener("click",onBar); bar.addEventListener("change",onBarChange); bar.addEventListener("input",e=>{ if(e.target.type==="color") onBarChange(e); });
  if(!mount.keyed){ document.addEventListener("keydown",e=>{ if(root&&document.body.contains(root)) onKey(e); }); mount.keyed=true; }
  if(ro) ro.disconnect(); let lastW=0; ro=new ResizeObserver(()=>{ if(wrap.clientWidth!==lastW){ lastW=wrap.clientWidth; fit(); } }); ro.observe(wrap); fit(); render();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(board&&document.body.contains(board)) render(); });
}
function hasContent(){ return !!(S&&S.items.length); }
async function toImage(){ // PDF에 넣을 B4 그림 (JPEG dataURL)
  const famSet=new Set(["Noto Sans KR"]); S.items.forEach(it=>{ if(it.font) famSet.add(it.font); });
  if(document.fonts&&document.fonts.load){ try{ await Promise.all([...famSet].flatMap(f=>[document.fonts.load('400 20px "'+f+'"',"가나다"),document.fonts.load('700 20px "'+f+'"',"가나다")])); }catch(e){} }
  const SC=2.4, cv=document.createElement("canvas"); cv.width=Math.round(W*SC); cv.height=Math.round(H*SC);
  const ctx=cv.getContext("2d"); ctx.scale(SC,SC); ctx.fillStyle=S.bg||"#ffffff"; ctx.fillRect(0,0,W,H);
  const imgs={}; await Promise.all(S.items.filter(it=>it.type==="image"&&it.src).map(it=>new Promise(res=>{ const im=new Image(); im.onload=()=>{ imgs[it.id]=im; res(); }; im.onerror=res; im.src=it.src; })));
  for(const it of S.items){
    ctx.save();
    if(it.type==="text"){ drawBox(ctx,it,it.x,it.y,it.w,it.h); drawText(ctx,it); }
    else if(it.type==="chart"){ drawBox(ctx,it,it.x,it.y,it.w,it.h); drawChart(ctx,it,it.x,it.y,it.w,it.h); }
    else if(it.type==="shape"){ drawShape(ctx,it,it.x,it.y,it.w,it.h); }
    else if(it.type==="sticker"){ const fs=Math.min(it.w,it.h)*0.8; ctx.font=fs+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textBaseline="middle"; const tw=ctx.measureText(it.emoji).width; ctx.fillText(it.emoji,it.x+(it.w-tw)/2,it.y+it.h/2+fs*0.06); }
    else if(it.type==="image"&&imgs[it.id]){ const im=imgs[it.id]; rr(ctx,it.x,it.y,it.w,it.h,it.radius||0); ctx.clip();
      const s=(it.fit==="contain"?Math.min:Math.max)(it.w/im.width,it.h/im.height), w=im.width*s, h=im.height*s; ctx.drawImage(im,it.x+(it.w-w)/2,it.y+(it.h-h)/2,w,h);
      ctx.restore(); ctx.save(); if(it.stroke&&it.sw) drawBox(ctx,{stroke:it.stroke,sw:it.sw,radius:it.radius},it.x,it.y,it.w,it.h); }
    ctx.restore();
  }
  const u=cv.toDataURL("image/jpeg",0.92); cv.width=cv.height=0; return u;
}
window.FPoster={mount,flush,hasContent,toImage,parseData,SIZE:{w:257,h:364}};
})();
