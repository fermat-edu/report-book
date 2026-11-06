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
let O={}, root=null, clips=[], cur=0, markA=null, qual="normal", busy=false, cancel=false, result=null, skipPrev=true;

function supported(){ return !!(window.MediaRecorder&&HTMLCanvasElement.prototype.captureStream&&(window.AudioContext||window.webkitAudioContext)); }
function pickMime(){ const L=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4;codecs=avc1,mp4a","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
  for(const m of L){ try{ if(MediaRecorder.isTypeSupported(m)) return m; }catch(e){} } return ""; }
const keepOf=c=>{ const cuts=c.cuts.slice().sort((a,b)=>a.a-b.a), out=[]; let t=0; cuts.forEach(x=>{ if(x.a>t+0.05) out.push({a:t,b:x.a}); t=Math.max(t,x.b); }); if(c.dur>t+0.05) out.push({a:t,b:c.dur}); return out; };
const keptDur=()=>clips.reduce((s,c)=>s+keepOf(c).reduce((a,k)=>a+k.b-k.a,0),0);
const estSize=()=>keptDur()*(QUAL[qual].vb+AB)/8*1.08;
function status(m){ if(O.status) O.status(m); }

function meta(file){ return new Promise(res=>{ const v=document.createElement("video"); v.preload="metadata"; v.muted=true; v.playsInline=true; const url=URL.createObjectURL(file);
  v.onloadedmetadata=()=>{ const d=v.duration; if(!isFinite(d)){ v.currentTime=1e7; v.ontimeupdate=()=>{ v.ontimeupdate=null; res({url,dur:v.duration,w:v.videoWidth,h:v.videoHeight}); }; return; } res({url,dur:d,w:v.videoWidth,h:v.videoHeight}); };
  v.onerror=()=>res(null); v.src=url; }); }

/* ---------- 화면 ---------- */
function html(){
  if(!supported()) return '<p class="guide" style="color:var(--brand)">이 브라우저에서는 영상 다듬기를 할 수 없어요. 크롬이나 사파리 최신 버전으로 열어 주세요. 다듬지 않은 영상은 아래 ‘원본 그대로 쓰기’로 올릴 수 있어요.</p>'+pickRow();
  if(!clips.length) return pickRow()+resultBox();
  const c=clips[cur];
  return '<div class="vclips">'+clips.map((x,i)=>'<button type="button" class="vclip'+(i===cur?' on':'')+'" data-vgo="'+i+'"><b>'+(i+1)+'</b> '+esc(x.name)+' <small>'+fmtT(x.dur)+(x.cuts.length?' · 지울 곳 '+x.cuts.length:'')+'</small></button>').join("")+
    '<button type="button" class="mini" data-vadd="1">＋ 영상 더 붙이기</button></div>'+
    '<video class="vplayer" playsinline controls preload="metadata" src="'+c.url+'"></video>'+
    '<div class="vtl" data-vtl="1">'+c.cuts.map((x,i)=>'<span class="vcut" style="left:'+(x.a/c.dur*100)+'%;width:'+((x.b-x.a)/c.dur*100)+'%"></span>').join("")+(markA!=null?'<span class="vmark" style="left:'+(markA/c.dur*100)+'%"></span>':'')+'<span class="vpos"></span></div>'+
    '<div class="vrow"><span class="vtime">0:00.0 / '+fmtT(c.dur)+'</span>'+
      '<button type="button" class="mini" data-vstep="-1">◀ 1초</button><button type="button" class="mini" data-vstep="-0.2">◀ 0.2</button><button type="button" class="mini" data-vstep="0.2">0.2 ▶</button><button type="button" class="mini" data-vstep="1">1초 ▶</button></div>'+
    '<div class="vrow">'+(markA==null?'<button type="button" class="vbtn vred" data-vA="1">✂ 여기부터 지우기 시작</button>':'<button type="button" class="vbtn vred" data-vB="1">✂ 여기까지 지우기 ('+fmtT(markA)+'부터)</button><button type="button" class="mini" data-vAx="1">취소</button>')+
      '<label class="vchk"><input type="checkbox" data-vskip'+(skipPrev?' checked':'')+'> 재생할 때 지울 부분 건너뛰기</label></div>'+
    (c.cuts.length?'<div class="vcuts">'+c.cuts.slice().sort((a,b)=>a.a-b.a).map(x=>'<span class="vchip">'+fmtT(x.a)+' ~ '+fmtT(x.b)+' 지우기 <button type="button" data-vdel="'+c.cuts.indexOf(x)+'" aria-label="되살리기">✕</button></span>').join("")+'</div>':'')+
    '<div class="vrow vord">'+(clips.length>1?'<button type="button" class="mini" data-vup="1"'+(cur?'':' disabled')+'>이 영상 앞으로</button>':'')+'<button type="button" class="mini danger" data-vrm="1">이 영상 빼기</button></div>'+
    '<div class="vout"><b>크기 줄이기</b><div class="vrow">'+Object.entries(QUAL).map(([k,q])=>'<button type="button" class="vq'+(k===qual?' on':'')+'" data-vq="'+k+'">'+q.label+'<small>1분에 약 '+Math.round((q.vb+AB)/8*60*1.08/1048576)+'MB</small></button>').join("")+'</div>'+
    '<p class="vest">남는 길이 <b>'+fmtT(keptDur())+'</b> · 예상 크기 <b>약 '+fmtMB(estSize())+'</b>'+(estSize()>KAKAO*0.9?' <span style="color:var(--brand)">→ 카카오톡(300MB)에 너무 커요. 더 작게 골라 주세요.</span>':' → 카카오톡으로 보낼 수 있어요')+'</p>'+
    '<div class="vrow"><button type="button" class="vbtn vgo" data-vmake="1">🎬 다듬은 영상 만들기</button>'+(clips.length===1&&!clips[0].cuts.length?'<button type="button" class="mini" data-vraw="1">다듬지 않고 원본 그대로 쓰기 ('+fmtMB(clips[0].size)+')</button>':'')+'</div>'+
    '<div class="vprog" hidden><div class="vbar"><i></i></div><span></span><button type="button" class="mini danger" data-vstop="1">멈추기</button></div></div>'+
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
  const v=root.querySelector(".vplayer:not(.vsmall)"); if(!v) return; const c=clips[cur];
  const pos=root.querySelector(".vpos"), tm=root.querySelector(".vtime");
  const tick=()=>{ if(pos) pos.style.left=(v.currentTime/c.dur*100)+"%"; if(tm) tm.textContent=fmtT(v.currentTime)+" / "+fmtT(c.dur);
    if(skipPrev&&!v.paused){ const x=c.cuts.find(k=>v.currentTime>=k.a&&v.currentTime<k.b-0.05); if(x) v.currentTime=x.b; } };
  v.addEventListener("timeupdate",tick); v.addEventListener("seeked",tick);
  if(c.t) v.currentTime=c.t; v.addEventListener("pause",()=>{ c.t=v.currentTime; });
}
const player=()=>root.querySelector(".vplayer:not(.vsmall)");

/* ---------- 버튼 ---------- */
const picker=document.createElement("input"); picker.type="file"; picker.accept="video/*"; picker.multiple=true; picker.hidden=true; let rawMode=false;
picker.addEventListener("change",async()=>{
  const files=[...picker.files]; if(!files.length) return;
  if(rawMode){ rawMode=false; const f=files[0]; setResult(f,f.name,null); return; }
  status("영상을 불러오는 중…"); let bad=0;
  for(const f of files){ const m=await meta(f); if(!m||!m.dur||!m.w){ bad++; continue; } clips.push({name:f.name,file:f,size:f.size,url:m.url,dur:m.dur,w:m.w,h:m.h,cuts:[]}); }
  cur=Math.max(0,clips.length-1-(files.length-1-bad)); draw();
  status(bad?"열 수 없는 영상이 있었어요. 휴대폰 기본 카메라로 찍은 mp4·mov 영상인지 확인해 주세요.":"영상을 불러왔어요. 실수한 부분에서 ‘✂ 여기부터 지우기 시작’ → ‘✂ 여기까지 지우기’를 눌러요.");
});
async function onClick(e){
  const b=e.target.closest("button"); if(!b||busy&&!b.dataset.vstop) return;
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
function onChange(e){ if(e.target.matches("[data-vskip]")){ skipPrev=e.target.checked; } }
function onTl(e){ const tl=e.target.closest("[data-vtl]"); if(!tl||busy) return; const v=player(); if(!v) return; const r=tl.getBoundingClientRect(); v.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*clips[cur].dur; }

function dl(blob,name){ const u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000); status("다운로드 폴더(사진첩)에 저장했어요."); }
async function share(blob,name){ let f=null; try{ f=new File([blob],name,{type:blob.type||"video/mp4"}); }catch(e){}
  if(f&&navigator.canShare&&navigator.canShare({files:[f]})){ try{ await navigator.share({files:[f],title:name}); status("보냈어요! 공유 화면에서 카카오톡을 고르면 돼요."); return; }catch(e){ if(e&&e.name==="AbortError"){ status("공유를 닫았어요."); return; } } }
  dl(blob,name); status("이 기기에서는 바로 공유가 안 돼서 파일로 저장했어요. 카카오톡 채팅방에서 저장한 영상을 첨부해 주세요."); }

async function setResult(blob,name,dur){
  if(result&&result.url) URL.revokeObjectURL(result.url);
  result=blob?{blob,name,size:blob.size,type:blob.type||"video/mp4",dur:dur||0,url:URL.createObjectURL(blob),key:O.key}:null;
  try{ if(O.put) await O.put(O.key,result?{blob,name,size:blob.size,type:result.type,dur:result.dur}:null); }catch(e){ status("영상은 만들었지만 이 기기에 저장은 안 돼요. 창을 닫지 말고 바로 제출해 주세요."); }
  if(O.onChange) O.onChange(result); draw();
  if(result) status("올릴 영상이 준비됐어요 ("+fmtMB(result.size)+"). 아래 ‘영상 제출’을 누르면 선생님께 올라가요.");
}

/* ---------- 다듬은 영상 만들기: 남길 부분만 다시 재생하면서 녹화 ---------- */
async function make(){
  if(!clips.length) return; if(keptDur()<0.5){ status("남는 영상이 없어요. 지울 부분을 줄여 주세요."); return; }
  const mime=pickMime(); if(!mime){ status("이 브라우저는 영상 만들기를 지원하지 않아요. 크롬이나 사파리 최신 버전으로 해 주세요."); return; }
  const AC=window.AudioContext||window.webkitAudioContext, ac=new AC(); try{ ac.resume(); }catch(e){}
  busy=true; cancel=false; const pv=player(); if(pv) pv.pause();
  const q=QUAL[qual], f0=clips[0], sc=Math.min(1,q.h/Math.min(f0.w,f0.h)), OW=Math.round(f0.w*sc/2)*2, OH=Math.round(f0.h*sc/2)*2;
  const cv=document.createElement("canvas"); cv.width=OW; cv.height=OH; const g=cv.getContext("2d"); g.fillStyle="#000"; g.fillRect(0,0,OW,OH);
  const v=document.createElement("video"); v.playsInline=true; v.preload="auto"; v.setAttribute("playsinline",""); v.style.cssText="position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none"; document.body.appendChild(v);
  const src=ac.createMediaElementSource(v), dest=ac.createMediaStreamDestination(); src.connect(dest);
  const stream=new MediaStream([...cv.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:q.vb,audioBitsPerSecond:AB}); const chunks=[];
  rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  const prog=root.querySelector(".vprog"), bar=prog&&prog.querySelector("i"), lab=prog&&prog.querySelector("span"); if(prog) prog.hidden=false;
  root.querySelectorAll("[data-vmake],[data-vraw]").forEach(x=>x.disabled=true);
  const total=keptDur(); let done=0, live=true;
  const paint=()=>{ if(v.videoWidth){ const s=Math.min(OW/v.videoWidth,OH/v.videoHeight), w=v.videoWidth*s, h=v.videoHeight*s; g.fillStyle="#000"; g.fillRect(0,0,OW,OH); g.drawImage(v,(OW-w)/2,(OH-h)/2,w,h); } };
  const loop=()=>{ if(!live) return; paint(); if(v.requestVideoFrameCallback&&!v.paused) v.requestVideoFrameCallback(loop); else requestAnimationFrame(loop); };
  const once=(el,ev)=>new Promise(r=>el.addEventListener(ev,r,{once:true}));
  try{
    let started=false;
    for(let ci=0;ci<clips.length&&!cancel;ci++){
      const c=clips[ci]; v.src=c.url; await once(v,"loadedmetadata");
      for(const k of keepOf(c)){ if(cancel) break;
        v.currentTime=k.a; await once(v,"seeked"); paint();
        if(!started){ rec.start(1000); started=true; } else rec.resume(); await v.play(); loop();
        await new Promise(res=>{ const chk=()=>{ const t=v.currentTime; const p=(done+Math.max(0,t-k.a))/total;
            if(bar) bar.style.width=Math.min(100,p*100)+"%"; if(lab) lab.textContent="만드는 중… "+Math.floor(p*100)+"% (화면을 끄거나 다른 앱으로 가면 멈춰요)";
            if(cancel||v.ended||t>=k.b-0.04) return res(); setTimeout(chk,40); }; chk(); });
        v.pause(); rec.pause(); done+=k.b-k.a; }
    }
    live=false; if(started){ const stopped=once(rec,"stop"); rec.stop(); await stopped; } else cancel=true;
  }catch(e){ console.error(e); live=false; v.remove(); try{ rec.state!=="inactive"&&rec.stop(); }catch(_){} busy=false; draw(); status("영상을 만들지 못했어요. 영상을 다시 골라 보거나, 다른 브라우저(크롬·사파리)로 해 주세요."); try{ ac.close(); }catch(_){} return; }
  try{ ac.close(); }catch(e){} stream.getTracks().forEach(t=>t.stop()); v.removeAttribute("src"); v.remove(); busy=false;
  if(cancel){ draw(); status("영상 만들기를 멈췄어요."); return; }
  const type=mime.split(";")[0], ext=type==="video/mp4"?".mp4":".webm", blob=new Blob(chunks,{type});
  const base=(O.name&&O.name())||"발표영상"; await setResult(blob,base+ext,total);
}

/* ---------- 바깥에서 쓰는 함수 ---------- */
async function mount(el,opts){
  O=opts||{}; root=el; if(!mount.wired){ document.body.appendChild(picker); mount.wired=true; }
  if(!el.dataset.wired){ el.addEventListener("click",onClick); el.addEventListener("change",onChange); el.addEventListener("pointerdown",onTl); el.dataset.wired="1"; }
  if(!result||result.key!==O.key){ result=null; try{ const r=O.get?await O.get(O.key):null; if(r&&r.blob){ result={...r,url:URL.createObjectURL(r.blob),key:O.key}; } }catch(e){} }
  if(result) result.key=O.key;
  draw();
}
window.FVideo={mount,result:()=>result,busy:()=>busy};
})();
