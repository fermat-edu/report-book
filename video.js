/* 페르마 발표 영상 다듬기
   - 영상 여러 개를 순서대로 이어 붙이고, 실수한 부분을 골라 지워요.
   - 카카오톡으로 보낼 수 있게 크기를 줄여요 (화면 크기·화질 낮추기).
   - 브라우저 안에서 영상을 다시 재생하면서 녹화하는 방식이라, 남길 영상 길이만큼 시간이 걸려요. */
(function(){
"use strict";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const QUAL={normal:{h:720,vb:1500000,label:"보통 (720p)"},small:{h:480,vb:700000,label:"작게 (480p)"},tiny:{h:360,vb:400000,label:"아주 작게 (360p)"}};
const AB=96000, KAKAO=300*1048576;
const fmtT=t=>{ t=Math.max(0,t||0); const m=Math.floor(t/60), s=t-m*60; return m+":"+(s<10?"0":"")+s.toFixed(1); };
const fmtMB=b=>(b/1048576).toFixed(b>10485760?0:1)+"MB";
const CL={}; // 양식(통계·꿈조사)마다 고른 영상을 따로 기억
let O={}, root=null, clips=[], cur=0, markA=null, qual="normal", busy=false, cancel=false, result=null, skipPrev=true, level=false, pac=null, resumeFn=null;
const BRIS=[[0.8,"어둡게"],[1,"그대로"],[1.2,"조금 밝게"],[1.4,"밝게"],[1.65,"아주 밝게"]];
let FILTER_OK=null; const filterOK=g=>{ if(FILTER_OK==null){ try{ g.filter="brightness(1.5)"; FILTER_OK=g.filter==="brightness(1.5)"; g.filter="none"; }catch(e){ FILTER_OK=false; } } return FILTER_OK; };
/* 밝기: 캔버스 필터가 되면 그대로, 안 되는 브라우저(옛 사파리)는 겹쳐 칠하기로 비슷하게 */
function drawBright(g,v,x,y,w,h,b){
  if(b===1||!b){ g.drawImage(v,x,y,w,h); return; }
  if(filterOK(g)){ g.filter="brightness("+b+")"+(b>1?" contrast(1.05)":""); g.drawImage(v,x,y,w,h); g.filter="none"; return; }
  g.drawImage(v,x,y,w,h); g.save(); if(b>1){ g.globalCompositeOperation="screen"; const k=Math.min(0.6,(b-1)*0.75); g.fillStyle="rgba(255,255,255,"+k+")"; }
  else { g.globalCompositeOperation="multiply"; const k=Math.round(255*b); g.fillStyle="rgb("+k+","+k+","+k+")"; } g.fillRect(x,y,w,h); g.restore(); }
const VOLS=[[0.5,"작게"],[1,"그대로"],[1.5,"조금 크게"],[2,"크게"],[3,"아주 크게"]];
const segGain=(c,t)=>{ const x=(c.vsegs||[]).find(k=>t>=k.a&&t<k.b); return x?x.g:1; };
const audioCustom=()=>level||clips.some(c=>c.vol!==1||(c.vsegs||[]).length);
/* 소리: 구간 소리 → 영상 전체 소리 → (목소리 고르게) → 찢어지지 않게 막기 */
function chain(ac,src,out){
  const seg=ac.createGain(), master=ac.createGain(), lim=ac.createDynamicsCompressor();
  lim.threshold.value=-2; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.002; lim.release.value=0.1;
  src.connect(seg); seg.connect(master); let last=master;
  if(level){ const comp=ac.createDynamicsCompressor(), mk=ac.createGain(); comp.threshold.value=-42; comp.knee.value=24; comp.ratio.value=6; comp.attack.value=0.005; comp.release.value=0.3; mk.gain.value=2.0; master.connect(comp); comp.connect(mk); last=mk; }
  last.connect(lim); lim.connect(out);
  return {set:(c,t)=>{ const n=ac.currentTime; master.gain.setTargetAtTime(c.vol||1,n,0.02); seg.gain.setTargetAtTime(segGain(c,t),n,0.04); }};
}
const hevcOK=()=>{ try{ const v=document.createElement("video"); return !!(v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"')||v.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"')); }catch(e){ return false; } };

function supported(){ return !!(window.MediaRecorder&&HTMLCanvasElement.prototype.captureStream&&(window.AudioContext||window.webkitAudioContext)); }
function pickMime(){ const L=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4;codecs=avc1,mp4a","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
  for(const m of L){ try{ if(MediaRecorder.isTypeSupported(m)) return m; }catch(e){} } return ""; }
const keepOf=c=>{ const cuts=c.cuts.slice().sort((a,b)=>a.a-b.a), out=[]; let t=0; cuts.forEach(x=>{ if(x.a>t+0.05) out.push({a:t,b:x.a}); t=Math.max(t,x.b); }); if(c.dur>t+0.05) out.push({a:t,b:c.dur}); return out; };
const keptDur=()=>clips.reduce((s,c)=>s+keepOf(c).reduce((a,k)=>a+k.b-k.a,0),0);
const estSize=()=>keptDur()*(QUAL[qual].vb+AB)/8*1.08;
function status(m){ if(O.status) O.status(m); }

/* 아이폰 .MOV(고효율 HEVC·높은 호환성 H.264), 갤럭시 .mp4(H.264·고효율 HEVC) 모두 열기.
   MOV는 크롬이 이름만 보고 거절할 때가 있어서 mp4로 알려 주고 열어요. 영상이 안 보이고 소리만 나오면 HEVC를 이 기기가 못 여는 거예요. */
function meta(file){ return new Promise(res=>{
  const mov=/quicktime/i.test(file.type)||/\.mov$/i.test(file.name), probe=document.createElement("video");
  const blob=mov&&!probe.canPlayType("video/quicktime")?new Blob([file],{type:"video/mp4"}):file, url=URL.createObjectURL(blob);
  const v=document.createElement("video"); v.preload="metadata"; v.muted=true; v.playsInline=true; v.setAttribute("playsinline","");
  let done=false; const fin=o=>{ if(done) return; done=true; clearTimeout(to); res(Object.assign({url,mov},o)); };
  const to=setTimeout(()=>fin({err:"slow"}),20000);
  const ok=()=>{ if(!v.videoWidth) return fin({err:"novideo",dur:v.duration}); fin({dur:v.duration,w:v.videoWidth,h:v.videoHeight}); };
  v.onloadedmetadata=()=>{ if(!isFinite(v.duration)){ v.currentTime=1e7; v.ontimeupdate=()=>{ v.ontimeupdate=null; ok(); }; return; } ok(); };
  v.onerror=()=>fin({err:"decode"}); v.src=url; }); }
function whyBad(m,f){
  const big=f.size>1024*1048576?" 영상이 1GB가 넘으면 휴대폰에서 열기 어려울 수 있어요.":"";
  if(m.err==="novideo"||m.err==="decode"&&(m.mov||!hevcOK()))
    return "‘"+f.name+"’은(는) 이 기기에서 화면을 열 수 없어요. 아이폰 ‘고효율(HEVC)’ 영상일 가능성이 커요. ① 영상을 찍은 휴대폰에서 이 페이지를 열어 다듬거나, ② 아이폰 설정 → 카메라 → 포맷 → ‘높은 호환성’으로 바꾼 뒤 다시 찍어 주세요."+big;
  if(m.err==="slow") return "‘"+f.name+"’을(를) 여는 데 너무 오래 걸려요. 와이파이가 좋은 곳에서 다시 골라 주세요."+big;
  return "‘"+f.name+"’은(는) 열 수 없는 영상이에요. 휴대폰 기본 카메라로 찍은 mp4·mov 영상인지 확인해 주세요."+big; }

/* ---------- 화면 ---------- */
function html(){
  if(!supported()) return '<p class="guide" style="color:var(--brand)">이 브라우저에서는 영상 다듬기를 할 수 없어요. 크롬이나 사파리 최신 버전으로 열어 주세요. 다듬지 않은 영상은 아래 ‘원본 그대로 쓰기’로 올릴 수 있어요.</p>'+pickRow();
  if(!clips.length) return pickRow()+resultBox();
  const c=clips[cur];
  return '<div class="vclips">'+clips.map((x,i)=>'<button type="button" class="vclip'+(i===cur?' on':'')+'" data-vgo="'+i+'"><b>'+(i+1)+'</b> '+esc(x.name)+' <small>'+fmtT(x.dur)+(x.cuts.length?' · 지울 곳 '+x.cuts.length:'')+'</small></button>').join("")+
    '<button type="button" class="mini" data-vadd="1">＋ 영상 더 붙이기</button></div>'+
    '<video class="vplayer" playsinline controls preload="metadata" src="'+c.url+'"></video>'+
    '<div class="vtl" data-vtl="1">'+(c.vsegs||[]).map(x=>'<span class="vvol'+(x.g<1?' dn':'')+'" style="left:'+(x.a/c.dur*100)+'%;width:'+((x.b-x.a)/c.dur*100)+'%"></span>').join("")+c.cuts.map((x,i)=>'<span class="vcut" style="left:'+(x.a/c.dur*100)+'%;width:'+((x.b-x.a)/c.dur*100)+'%"></span>').join("")+(markA!=null?'<span class="vmark" style="left:'+(markA/c.dur*100)+'%"></span>':'')+'<span class="vpos"></span></div>'+
    '<div class="vrow"><span class="vtime">0:00.0 / '+fmtT(c.dur)+'</span>'+
      '<button type="button" class="mini" data-vstep="-1">◀ 1초</button><button type="button" class="mini" data-vstep="-0.2">◀ 0.2</button><button type="button" class="mini" data-vstep="0.2">0.2 ▶</button><button type="button" class="mini" data-vstep="1">1초 ▶</button></div>'+
    '<div class="vrow">'+(markA==null?'<button type="button" class="vbtn vred" data-vA="1">📍 여기부터 (지우기·소리 바꾸기)</button>':'<span class="vnote">'+fmtT(markA)+'부터 지금까지를</span><button type="button" class="vbtn vred" data-vB="1">✂ 지우기</button><button type="button" class="vbtn vblue" data-vG="2">🔊 소리 크게</button><button type="button" class="vbtn vgray" data-vG="0.5">🔉 소리 작게</button><button type="button" class="mini" data-vAx="1">취소</button>')+
      '<label class="vchk"><input type="checkbox" data-vskip'+(skipPrev?' checked':'')+'> 재생할 때 지울 부분 건너뛰기</label></div>'+
    (c.cuts.length||(c.vsegs||[]).length?'<div class="vcuts">'+c.cuts.slice().sort((a,b)=>a.a-b.a).map(x=>'<span class="vchip">'+fmtT(x.a)+' ~ '+fmtT(x.b)+' 지우기 <button type="button" data-vdel="'+c.cuts.indexOf(x)+'" aria-label="되살리기">✕</button></span>').join("")+
      c.vsegs.slice().sort((a,b)=>a.a-b.a).map(x=>'<span class="vchip vchipb">'+fmtT(x.a)+' ~ '+fmtT(x.b)+' 소리 '+(x.g>1?'크게 ×'+x.g:'작게 ×'+x.g)+' <button type="button" data-vgdel="'+c.vsegs.indexOf(x)+'" aria-label="원래대로">✕</button></span>').join("")+'</div>':'')+
    '<div class="vout"><b>🔆 화면 밝기</b><div class="vrow"><span class="vnote">'+(clips.length>1?(cur+1)+'번 영상':'영상')+' 밝기</span>'+BRIS.map(([g,l])=>'<button type="button" class="vq vsm'+((c.bri||1)===g?' on':'')+'" data-vbri="'+g+'">'+l+'</button>').join("")+(clips.length>1?'<button type="button" class="mini" data-vbriall="1">모든 영상에 똑같이</button>':'')+'</div>'+
      '<p class="vest" style="color:var(--muted)">교실이 어두워 얼굴이 잘 안 보이면 ‘밝게’를 골라요. 위 화면에 바로 보여요.</p></div>'+
    '<div class="vout"><b>🔈 소리 조절</b><div class="vrow"><span class="vnote">'+(clips.length>1?(cur+1)+'번 영상':'영상')+' 전체 소리</span>'+VOLS.map(([g,l])=>'<button type="button" class="vq vsm'+((c.vol||1)===g?' on':'')+'" data-vvol="'+g+'">'+l+(g!==1?' ×'+g:'')+'</button>').join("")+(clips.length>1?'<button type="button" class="mini" data-vvolall="1">모든 영상에 똑같이</button>':'')+'</div>'+
      '<label class="vchk"><input type="checkbox" data-vlevel'+(level?' checked':'')+'> 🎚 <b>목소리 고르게 맞추기</b> – 작은 목소리는 키우고 큰 소리는 줄여요 (여러 명이 발표할 때 추천)</label>'+
      '<p class="vest" style="color:var(--muted)">특정 친구 목소리만 작으면 그 부분에서 ‘📍 여기부터’ → 끝나는 곳에서 ‘🔊 소리 크게’를 눌러요. 재생해 보면 바뀐 소리로 들려요.</p></div>'+
    '<div class="vrow vord">'+(clips.length>1?'<button type="button" class="mini" data-vup="1"'+(cur?'':' disabled')+'>이 영상 앞으로</button>':'')+'<button type="button" class="mini danger" data-vrm="1">이 영상 빼기</button></div>'+
    '<div class="vout"><b>크기 줄이기</b><div class="vrow">'+Object.entries(QUAL).map(([k,q])=>'<button type="button" class="vq'+(k===qual?' on':'')+'" data-vq="'+k+'">'+q.label+'<small>1분에 약 '+Math.round((q.vb+AB)/8*60*1.08/1048576)+'MB</small></button>').join("")+'</div>'+
    '<p class="vest">남는 길이 <b>'+fmtT(keptDur())+'</b> · 예상 크기 <b>약 '+fmtMB(estSize())+'</b>'+(estSize()>KAKAO*0.9?' <span style="color:var(--brand)">→ 카카오톡(300MB)에 너무 커요. 더 작게 골라 주세요.</span>':' → 카카오톡으로 보낼 수 있어요')+'</p>'+
    '<div class="vrow"><button type="button" class="vbtn vgo" data-vmake="1">🎬 다듬은 영상 만들기</button>'+(clips.length===1&&!clips[0].cuts.length?'<button type="button" class="mini" data-vraw="1">다듬지 않고 원본 그대로 쓰기 ('+fmtMB(clips[0].size)+')</button>':'')+'</div>'+
    '<div class="vprog" hidden><div class="vbar"><i></i></div><span></span><button type="button" class="vbtn vgo" data-vresume="1" hidden>▶ 이어서 만들기</button><button type="button" class="mini danger" data-vstop="1">멈추기</button></div></div>'+
    resultBox();
}
function pickRow(){ return '<div class="vrow"><button type="button" class="addrep" data-vadd="1">＋ 발표 영상 고르기 (여러 개면 순서대로 이어 붙여요)</button></div>'+(supported()?'':'<div class="vrow"><button type="button" class="mini" data-vrawpick="1">원본 그대로 쓰기 (영상 고르기)</button></div>'); }
function resultBox(){ if(!result) return "";
  return '<div class="vres"><b>✅ 올릴 영상</b> '+esc(result.name)+' ('+fmtMB(result.size)+(result.dur?' · '+fmtT(result.dur):'')+')'+(result.size>KAKAO?' <span style="color:var(--brand)">카카오톡에는 너무 커요</span>':'')+
    (result.url?'<video class="vplayer vsmall" playsinline controls preload="metadata" src="'+result.url+'"></video>':'')+
    '<div class="vrow"><button type="button" class="mini" data-vsave="1">💾 파일로 저장</button><button type="button" class="mini" data-vshare="1">📤 카톡으로 보내기</button><button type="button" class="mini danger" data-vclear="1">이 영상 지우기</button></div>'+
    '<p class="guide" style="margin:4px 0 0">아래 노란 ‘영상 제출’ 버튼을 누르면 선생님께 우리 조 영상으로 올라가요.</p></div>'; }

function draw(){ if(!root) return; root.innerHTML='<div class="vedit">'+html()+'</div>'; wirePlayer(); }
function wirePlayer(){
  const v=root.querySelector(".vplayer:not(.vsmall)"); if(!v) return; const c=clips[cur]; if(c.bri&&c.bri!==1) v.style.filter="brightness("+c.bri+")"+(c.bri>1?" contrast(1.05)":"");
  const pos=root.querySelector(".vpos"), tm=root.querySelector(".vtime");
  const tick=()=>{ if(pos) pos.style.left=(v.currentTime/c.dur*100)+"%"; if(tm) tm.textContent=fmtT(v.currentTime)+" / "+fmtT(c.dur);
    if(skipPrev&&!v.paused){ const x=c.cuts.find(k=>v.currentTime>=k.a&&v.currentTime<k.b-0.05); if(x) v.currentTime=x.b; } };
  v.addEventListener("timeupdate",tick); v.addEventListener("seeked",tick);
  if(audioCustom()){ try{ const AC=window.AudioContext||window.webkitAudioContext; if(!pac) pac=new AC();
      const ch=chain(pac,pac.createMediaElementSource(v),pac.destination); let raf=0;
      const upd=()=>{ ch.set(c,v.currentTime); if(!v.paused) raf=requestAnimationFrame(upd); };
      v.addEventListener("play",()=>{ pac.resume&&pac.resume(); cancelAnimationFrame(raf); upd(); }); v.addEventListener("seeked",()=>ch.set(c,v.currentTime)); ch.set(c,v.currentTime);
    }catch(e){ console.warn(e); } }
  if(c.t) v.currentTime=c.t; v.addEventListener("pause",()=>{ c.t=v.currentTime; });
}
const player=()=>root.querySelector(".vplayer:not(.vsmall)");

/* ---------- 버튼 ---------- */
const picker=document.createElement("input"); picker.type="file"; picker.accept="video/*"; picker.multiple=true; picker.hidden=true; let rawMode=false;
picker.addEventListener("change",async()=>{
  const files=[...picker.files]; if(!files.length) return;
  if(rawMode){ rawMode=false; const f=files[0]; setResult(f,f.name,null); return; }
  status("영상을 불러오는 중… (큰 영상은 조금 걸려요)"); const bad=[]; const n0=clips.length;
  for(const f of files){ const m=await meta(f); if(m.err||!m.dur||!m.w){ URL.revokeObjectURL(m.url); bad.push(whyBad(m,f)); continue; } clips.push({name:f.name,file:f,size:f.size,url:m.url,dur:m.dur,w:m.w,h:m.h,cuts:[],vsegs:[],vol:1}); }
  if(clips.length>n0) cur=n0; draw();
  if(bad.length){ status("⚠️ "+bad[0]); if(O.alert) O.alert("열 수 없는 영상이 있어요",bad.join("\n")); }
  else status("영상을 불러왔어요. 실수한 부분에서 ‘✂ 여기부터’ → ‘✂ 여기까지 지우기’, 소리가 작은 부분은 ‘🔊 여기까지 소리 크게’를 눌러요.");
});
async function onClick(e){
  const b=e.target.closest("button"); if(!b||busy&&!b.dataset.vstop&&!b.dataset.vresume) return;
  const v=player(), c=clips[cur], d=b.dataset;
  if(d.vadd){ rawMode=false; picker.value=""; picker.click(); return; }
  if(d.vrawpick){ rawMode=true; picker.value=""; picker.click(); return; }
  if(d.vgo!=null){ if(v) c.t=v.currentTime; cur=+d.vgo; markA=null; draw(); return; }
  if(d.vstep&&v){ v.pause(); v.currentTime=Math.max(0,Math.min(c.dur,v.currentTime+(+d.vstep))); return; }
  if(d.va&&v){ markA=v.currentTime; c.t=markA; draw(); status("지울 부분의 시작을 표시했어요. 지울 부분의 끝으로 가서 ‘✂ 여기까지 지우기’를 눌러요."); return; }
  if(d.vax){ markA=null; draw(); return; }
  if(d.vb&&v){ const t=v.currentTime; let a=Math.min(markA,t), z=Math.max(markA,t); if(z-a<0.2){ status("지울 부분이 너무 짧아요. 영상을 조금 더 재생한 뒤 눌러 주세요."); return; }
    c.cuts.push({a,b:z}); c.t=z; markA=null; draw(); status(fmtT(a)+" ~ "+fmtT(z)+" 부분을 지우도록 표시했어요. (✕를 누르면 되살아나요)"); return; }
  if(d.vdel!=null){ c.cuts.splice(+d.vdel,1); draw(); return; }
  if(d.vg&&v){ const t=v.currentTime; let a=Math.min(markA,t), z=Math.max(markA,t); if(z-a<0.2){ status("구간이 너무 짧아요. 영상을 조금 더 재생한 뒤 눌러 주세요."); return; }
    c.vsegs=c.vsegs.filter(x=>x.b<=a||x.a>=z); c.vsegs.push({a,b:z,g:+d.vg}); c.t=a; markA=null; draw(); status(fmtT(a)+" ~ "+fmtT(z)+" 부분 소리를 "+(+d.vg>1?"크게":"작게")+" 바꿨어요. 재생해서 들어 보세요."); return; }
  if(d.vgdel!=null){ c.vsegs.splice(+d.vgdel,1); draw(); return; }
  if(d.vvol){ if(v) c.t=v.currentTime; c.vol=+d.vvol; draw(); status("영상 전체 소리를 ‘"+VOLS.find(x=>x[0]===c.vol)[1]+"’로 바꿨어요. 재생해서 들어 보세요."); return; }
  if(d.vbri){ if(v) c.t=v.currentTime; c.bri=+d.vbri; draw(); status("화면 밝기를 ‘"+BRIS.find(x=>x[0]===c.bri)[1]+"’로 바꿨어요."); return; }
  if(d.vbriall){ clips.forEach(x=>x.bri=c.bri); draw(); status("모든 영상의 밝기를 똑같이 맞췄어요."); return; }
  if(d.vvolall){ clips.forEach(x=>x.vol=c.vol); draw(); status("모든 영상의 소리를 똑같이 맞췄어요."); return; }
  if(d.vresume&&resumeFn){ resumeFn(); return; }
  if(d.vup){ if(cur>0){ const x=clips.splice(cur,1)[0]; clips.splice(cur-1,0,x); cur--; draw(); } return; }
  if(d.vrm){ if(!d.sure){ d.sure="1"; b.textContent="정말 뺄까요? 한 번 더"; return; } URL.revokeObjectURL(c.url); clips.splice(cur,1); cur=Math.max(0,cur-1); markA=null; draw(); return; }
  if(d.vq){ qual=d.vq; draw(); return; }
  if(d.vraw){ setResult(clips[0].file,clips[0].name,clips[0].dur); return; }
  if(d.vmake){ make(); return; }
  if(d.vstop){ cancel=true; return; }
  if(d.vsave&&result){ dl(result.blob,result.name); return; }
  if(d.vshare&&result){ share(result.blob,result.name); return; }
  if(d.vclear){ if(!d.sure){ d.sure="1"; b.textContent="정말 지울까요? 한 번 더"; return; } setResult(null); return; }
}
function onChange(e){ if(e.target.matches("[data-vskip]")){ skipPrev=e.target.checked; }
  if(e.target.matches("[data-vlevel]")){ const v=player(); if(v) clips[cur].t=v.currentTime; level=e.target.checked; draw(); status(level?"목소리 고르게 맞추기를 켰어요. 재생해서 들어 보세요.":"목소리 고르게 맞추기를 껐어요."); } }
function onTl(e){ const tl=e.target.closest("[data-vtl]"); if(!tl||busy) return; const v=player(); if(!v) return; const r=tl.getBoundingClientRect(); v.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*clips[cur].dur; }

function dl(blob,name){ const u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000); status("다운로드 폴더(사진첩)에 저장했어요."); }
async function share(blob,name){ let f=null; try{ f=new File([blob],name,{type:blob.type||"video/mp4"}); }catch(e){}
  if(f&&navigator.canShare&&navigator.canShare({files:[f]})){ try{ await navigator.share({files:[f],title:name}); status("보냈어요! 공유 화면에서 카카오톡을 고르면 돼요."); return; }catch(e){ if(e&&e.name==="AbortError"){ status("공유를 닫았어요."); return; } } }
  dl(blob,name); status("이 기기에서는 바로 공유가 안 돼서 파일로 저장했어요. 카카오톡 채팅방에서 저장한 영상을 첨부해 주세요."); }

async function setResult(blob,name,dur,key){
  key=key||O.key; const rec=blob?{blob,name,size:blob.size,type:blob.type||"video/mp4",dur:dur||0}:null;
  try{ if(O.put) await O.put(key,rec); }catch(e){ status("영상은 만들었지만 이 기기에 저장은 안 돼요. 창을 닫지 말고 바로 제출해 주세요."); }
  if(key!==O.key) return; // 만드는 동안 다른 양식으로 옮겨 갔으면 저장만 해 둬요
  if(result&&result.url) URL.revokeObjectURL(result.url);
  result=rec?Object.assign({},rec,{url:URL.createObjectURL(blob),key}):null;
  if(O.onChange) O.onChange(result); draw();
  if(result) status("올릴 영상이 준비됐어요 ("+fmtMB(result.size)+"). 아래 ‘영상 제출’을 누르면 선생님께 올라가요.");
}

/* ---------- 다듬은 영상 만들기: 남길 부분만 다시 재생하면서 녹화 ---------- */
async function make(){
  if(!clips.length) return; if(keptDur()<0.5){ status("남는 영상이 없어요. 지울 부분을 줄여 주세요."); return; }
  const mime=pickMime(); if(!mime){ status("이 브라우저는 영상 만들기를 지원하지 않아요. 크롬이나 사파리 최신 버전으로 해 주세요."); return; }
  const AC=window.AudioContext||window.webkitAudioContext, ac=new AC(); try{ ac.resume(); }catch(e){}
  busy=true; cancel=false; const myKey=O.key, myRoot=root; const pv=player(); if(pv) pv.pause();
  const q=QUAL[qual], f0=clips[0], sc=Math.min(1,q.h/Math.min(f0.w,f0.h)), OW=Math.round(f0.w*sc/2)*2, OH=Math.round(f0.h*sc/2)*2;
  const cv=document.createElement("canvas"); cv.width=OW; cv.height=OH; const g=cv.getContext("2d"); g.fillStyle="#000"; g.fillRect(0,0,OW,OH);
  const v=document.createElement("video"); v.playsInline=true; v.preload="auto"; v.setAttribute("playsinline",""); v.style.cssText="position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none"; document.body.appendChild(v);
  const src=ac.createMediaElementSource(v), dest=ac.createMediaStreamDestination(), ach=chain(ac,src,dest);
  v.src=clips[0].url; try{ const p0=v.play(); if(p0&&p0.then) p0.then(()=>v.pause()).catch(()=>{}); }catch(e){} // 아이폰: 누른 순간에 한 번 재생해 둬야 나중에 이어서 재생돼요
  let wl=null; try{ if(navigator.wakeLock) navigator.wakeLock.request("screen").then(x=>{ wl=x; }).catch(()=>{}); }catch(e){}
  let away=false; const onVis=()=>{ if(!busy) return;
    if(document.hidden){ if(!v.paused){ away=true; v.pause(); try{ rec.state==="recording"&&rec.pause(); }catch(e){} } }
    else if(away){ resumeFn(); } };
  resumeFn=()=>{ if(!away) return; v.play().then(()=>{ away=false; try{ rec.state==="paused"&&rec.resume(); }catch(e){} loop(); const rb=root.querySelector("[data-vresume]"); if(rb) rb.hidden=true; status("이어서 만드는 중이에요."); })
    .catch(()=>{ const rb=root.querySelector("[data-vresume]"); if(rb) rb.hidden=false; status("‘▶ 이어서 만들기’를 눌러 주세요."); }); };
  document.addEventListener("visibilitychange",onVis);
  const stream=new MediaStream([...cv.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:q.vb,audioBitsPerSecond:AB}); const chunks=[];
  rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  const prog=root.querySelector(".vprog"), bar=prog&&prog.querySelector("i"), lab=prog&&prog.querySelector("span"); if(prog) prog.hidden=false;
  root.querySelectorAll("[data-vmake],[data-vraw]").forEach(x=>x.disabled=true);
  const total=keptDur(); let done=0, live=true;
  let curC=null; const paint=()=>{ if(v.videoWidth){ const s=Math.min(OW/v.videoWidth,OH/v.videoHeight), w=v.videoWidth*s, h=v.videoHeight*s; g.fillStyle="#000"; g.fillRect(0,0,OW,OH); drawBright(g,v,(OW-w)/2,(OH-h)/2,w,h,curC&&curC.bri||1); } };
  const loop=()=>{ if(!live) return; paint(); if(v.requestVideoFrameCallback&&!v.paused) v.requestVideoFrameCallback(loop); else requestAnimationFrame(loop); };
  const once=(el,ev)=>new Promise(r=>el.addEventListener(ev,r,{once:true}));
  try{
    let started=false;
    for(let ci=0;ci<clips.length&&!cancel;ci++){
      const c=clips[ci]; curC=c; if(ci||v.readyState<1){ v.src=c.url; await once(v,"loadedmetadata"); } else v.pause();
      for(const k of keepOf(c)){ if(cancel) break;
        v.currentTime=k.a; await once(v,"seeked"); paint(); ach.set(c,k.a);
        if(!started){ rec.start(1000); started=true; } else rec.resume(); await v.play(); loop();
        await new Promise(res=>{ const chk=()=>{ const t=v.currentTime; const p=(done+Math.max(0,t-k.a))/total;
            if(bar) bar.style.width=Math.min(100,p*100)+"%"; if(lab) lab.textContent=away?"잠깐 멈췄어요 – 이 화면으로 돌아오면 이어서 만들어요":"만드는 중… "+Math.floor(p*100)+"% (다른 앱으로 가면 잠깐 멈춰요)";
            if(!away) ach.set(c,t); if(cancel||v.ended||t>=k.b-0.04) return res(); setTimeout(chk,40); }; chk(); });
        v.pause(); rec.pause(); done+=k.b-k.a; }
    }
    live=false; if(started){ const stopped=once(rec,"stop"); rec.stop(); await stopped; } else cancel=true;
  }catch(e){ console.error(e); live=false; v.remove(); document.removeEventListener("visibilitychange",onVis); resumeFn=null; try{ wl&&wl.release(); }catch(_){} try{ rec.state!=="inactive"&&rec.stop(); }catch(_){} busy=false; draw(); status("영상을 만들지 못했어요. 영상을 다시 골라 보거나, 다른 브라우저(크롬·사파리)로 해 주세요."); try{ ac.close(); }catch(_){} return; }
  document.removeEventListener("visibilitychange",onVis); resumeFn=null; try{ wl&&wl.release(); }catch(e){}
  try{ ac.close(); }catch(e){} stream.getTracks().forEach(t=>t.stop()); v.removeAttribute("src"); v.remove(); busy=false;
  if(cancel){ draw(); status("영상 만들기를 멈췄어요."); return; }
  const type=mime.split(";")[0], ext=type==="video/mp4"?".mp4":".webm", blob=new Blob(chunks,{type});
  const base=(O.name&&O.name())||"발표영상"; await setResult(blob,base+ext,total,myKey);
}

/* ---------- 바깥에서 쓰는 함수 ---------- */
async function mount(el,opts){
  O=opts||{}; root=el; if(!mount.wired){ document.body.appendChild(picker); mount.wired=true; }
  if(!el.dataset.wired){ el.addEventListener("click",onClick); el.addEventListener("change",onChange); el.addEventListener("pointerdown",onTl); el.dataset.wired="1"; }
  if(!CL[O.key]) CL[O.key]=[]; if(clips!==CL[O.key]){ clips=CL[O.key]; cur=0; markA=null; }
  if(!result||result.key!==O.key){ result=null; try{ const r=O.get?await O.get(O.key):null; if(r&&r.blob){ result={...r,url:URL.createObjectURL(r.blob),key:O.key}; } }catch(e){} }
  if(result) result.key=O.key;
  draw();
}
function reset(key){ if(busy) cancel=true; (CL[key]||[]).forEach(c=>{ try{ URL.revokeObjectURL(c.url); }catch(e){} }); CL[key]=[]; if(key===O.key){ clips=CL[key]; cur=0; markA=null; if(result&&result.url) URL.revokeObjectURL(result.url); result=null; } }
window.FVideo={mount,reset,result:()=>result,busy:()=>busy};
})();
