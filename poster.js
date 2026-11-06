/* 페르마 통계포스터 만들기 – B4 세로(257×364mm) 자유 배치 편집기
   - 제목·글 상자·그래프·사진·도형·스티커를 마음대로 놓고, 크기와 색을 바꿔요.
   - 구글 설문지 응답을 붙여 넣으면 그래프가 만들어져요.
   - PDF용 그림은 html2canvas 없이 캔버스에 직접 그려요(편집 화면과 같은 규칙). */
(function(){
"use strict";
let W=1028, H=1456;                 // 포스터: 4px = 1mm · 발표자료: 1280×720 (16:9)
let MODE="poster", D=null;           // D = 저장되는 전체 문서 (포스터는 D===S, 발표자료는 D.slides[D.cur]===S)
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

let stripEl=null, zoom=1, sizer=null, S=null, KEY="", O={}, root=null, wrap=null, board=null, bar=null, side=null, scale=1, sel=null, hist=[], tSave=null, typed=false, ro=null;
const th=()=>THEMES[D.theme]||THEMES.mint;
const SL=()=>MODE==="slides";
const pagesOf=()=>SL()?D.slides:[D];
const find=id=>S.items.find(x=>x.id===id);
const blank=()=>SL()?{v:1,mode:"slides",theme:"blue",slides:[{id:uid(),bg:"#ffffff",items:[]}],cur:0}:({v:1,theme:"mint",bg:THEMES.mint.bg,items:[]});
function setCur(i){ if(!SL()){ S=D; return; } D.cur=clamp(i|0,0,D.slides.length-1); S=D.slides[D.cur]; }

/* ---------- 저장 · 되돌리기 ---------- */
function save(now,keepFresh){ if(!keepFresh&&D) D.fresh=false; clearTimeout(tSave); const go=()=>{ tSave=null; if(O.put) O.put(KEY,JSON.parse(JSON.stringify(D))).catch(()=>{}); if(SL()) thumb(D.cur); }; if(now) go(); else tSave=setTimeout(go,500); if(O.onChange) O.onChange(); }
function snap(){ hist.push(JSON.stringify(D)); if(hist.length>40) hist.shift(); }
function undo(){ if(!hist.length) return; D=JSON.parse(hist.pop()); setCur(SL()?D.cur:0); if(sel&&!find(sel)) sel=null; render(); strip(); save(); }

/* ---------- 새 요소 ---------- */
function mk(type,o){
  const t=th(), base={id:uid(),type,x:80,y:80,w:400,h:200};
  if(type==="text") Object.assign(base,{text:"여기에 글을 써요.",font:"Noto Sans KR",size:SL()?26:18,bold:false,color:t.ink,fill:D.theme==="dark"?t.sub:"#ffffff",stroke:t.sub,sw:2,radius:12,align:"left",valign:"top",pad:14});
  if(type==="title") Object.assign(base,{type:"text",role:"title",text:"제목",font:"Black Han Sans",size:40,bold:false,color:"#ffffff",fill:t.main,stroke:"",sw:0,radius:12,align:"center",valign:"middle",pad:12,h:80});
  if(type==="chart") Object.assign(base,{w:460,h:320,fill:D.theme==="dark"?t.sub:"#ffffff",stroke:t.sub,sw:2,radius:12,
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

/* ---------- 추천 배치 (전국학생통계활용대회 수상작 구성 참고) ---------- */
const TPLS=[["a","수상작 2단형","위에 탐구 동기와 순서도, 가운데에 그래프 3개와 추가 조사, 아래에 결론"],
  ["b","3단 신문형","왼쪽 단에 동기·질문·과정, 가운데·오른쪽 단에 그래프 4개와 추가 조사"],
  ["d","큰 그래프 강조형","위에 동기·질문·방법 3칸, 핵심 그래프 하나를 크게, 작은 그래프 3개"],
  ["e","지그재그 이야기형","그래프와 해석이 왼쪽·오른쪽을 번갈아 나오는 이야기 흐름"],
  ["c","간단형","큰 글 칸과 그래프 2개, 처음 해 보는 팀에게 좋아요"]];
function template(kind){
  const t=th(), dark=D.theme==="dark", panel=dark?t.sub:"#ffffff", items=[], push=o=>items.push(o);
  const team=(O.team&&O.team())||"팀명 | 팀원 이름", title=(O.title&&O.title())||"우리의 궁금증을 질문으로 써요?";
  const head=(x,y,w,txt,o)=>push(mk("title",Object.assign({x,y,w,h:40,text:txt,font:"Do Hyeon",size:23,align:"left",radius:8,pad:12,fill:t.main},o||{})));
  const body=(x,y,w,h,txt,o)=>push(mk("text",Object.assign({x,y,w,h,text:txt,size:15,fill:panel,radius:10},o||{})));
  const call=(x,y,w,h,txt)=>push(mk("text",{x,y,w,h,text:txt,size:15,bold:true,color:dark?t.accent:t.main,fill:dark?"":t.sub,stroke:"",sw:0,radius:8,valign:"middle",pad:10}));
  const chart=(x,y,w,h,kind,ttl,labels,values,unit)=>push(mk("chart",{x,y,w,h,radius:10,fill:panel,chart:{kind,title:ttl,labels,values,unit:unit||"명",showVal:true,mono:false,color:t.main}}));
  const flow=(x,y,w,h,steps,vertical)=>{ push(mk("shape",{shape:"round",x,y,w,h,fill:panel,stroke:t.sub,sw:2,radius:10}));
    const n=steps.length;
    if(!vertical){ const slot=(w-24)/n, d=Math.min(54,slot-26);
      steps.forEach((s,k)=>{ const cx=x+12+slot*k+slot/2;
        push(mk("shape",{shape:"ellipse",x:r4(cx-d/2),y:y+16,w:d,h:d,fill:k%2?t.accent:t.main,radius:0}));
        push(mk("text",{x:r4(cx-d/2),y:y+16,w:d,h:d,text:String(k+1),font:"Black Han Sans",size:24,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
        push(mk("text",{x:r4(cx-slot/2+2),y:y+20+d,w:r4(slot-4),h:h-28-d,text:s,size:13,bold:true,align:"center",fill:"",stroke:"",sw:0,pad:2}));
        if(k<n-1) push(mk("shape",{shape:"arrow",x:r4(cx+d/2+3),y:y+16+d/2-8,w:Math.max(12,r4(slot-d-6)),h:16,fill:t.sub,radius:0})); }); }
    else{ const rowH=(h-16)/n, d=Math.min(40,rowH-8);
      steps.forEach((s,k)=>{ const yy=y+8+rowH*k+(rowH-d)/2;
        push(mk("shape",{shape:"ellipse",x:x+12,y:r4(yy),w:d,h:d,fill:k%2?t.accent:t.main,radius:0}));
        push(mk("text",{x:x+12,y:r4(yy),w:d,h:d,text:String(k+1),font:"Black Han Sans",size:19,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
        push(mk("text",{x:x+20+d,y:r4(yy-4),w:w-32-d,h:d+8,text:s,size:14,bold:true,fill:"",stroke:"",sw:0,valign:"middle",pad:2})); }); }
  };
  const header=()=>{
    push(mk("title",{x:36,y:30,w:W-72,h:112,text:title,font:"Black Han Sans",size:58,color:t.main,fill:"",radius:0,align:"center"}));
    push(mk("shape",{shape:"line",x:80,y:166,w:150,h:4,fill:t.main}));
    push(mk("text",{x:240,y:146,w:548,h:44,text:"부제: 무엇을 어떻게 조사했는지 한 줄로",size:21,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:4}));
    push(mk("shape",{shape:"line",x:798,y:166,w:150,h:4,fill:t.main}));
    push(mk("text",{x:724,y:196,w:264,h:38,text:team,size:14,bold:true,color:t.main,fill:panel,stroke:t.main,sw:2,radius:999,align:"center",valign:"middle",pad:6}));
  };
  if(kind==="d"){ // 큰 그래프 강조형: 위 3칸 → 대표 그래프 크게 → 작은 그래프 3개 → 결론
    header(); const X=[40,364,688], CW=300;
    head(X[0],248,CW,"1. 탐구 동기"); body(X[0],296,CW,170,"생활 속에서 궁금해진 장면\n알아내고 싶은 것");
    head(X[1],248,CW,"2. 탐구 질문과 가설"); body(X[1],296,CW,170,"질문 1)\n질문 2)\n가설: ~할수록 ~할 것이다.");
    head(X[2],248,CW,"3. 조사 방법"); body(X[2],296,CW,170,"구글 설문지\n대상: ○○중 ○○명\n기간: ○월 ○일~○일");
    head(40,482,948,"4. 가장 중요한 결과");
    chart(40,530,620,330,"bar","우리 탐구의 핵심 그래프",["항목 A","항목 B","항목 C","항목 D","항목 E"],[38,27,19,11,5]);
    call(680,530,308,330,"→ 핵심 결과를 크게!\n\n숫자: \n의미: \n이유: ");
    head(40,876,948,"5. 더 알아본 결과");
    chart(X[0],924,CW,210,"pie","질문 2",["예","아니요","모르겠다"],[41,22,9]);
    chart(X[1],924,CW,210,"hbar","질문 3",["항목 A","항목 B","항목 C"],[27,19,12]);
    chart(X[2],924,CW,210,"donut","질문 4",["매우 그렇다","그렇다","보통","아니다"],[14,30,18,7]);
    call(X[0],1140,CW,56,"→ 알게 된 점 한 줄"); call(X[1],1140,CW,56,"→ 알게 된 점 한 줄"); call(X[2],1140,CW,56,"→ 알게 된 점 한 줄");
    head(40,1212,600,"6. 결론 및 제언"); body(40,1260,600,160,"결론: 질문마다 답, 가설이 맞았는지\n제언: 누구에게 무엇을 제안할까?");
    head(660,1212,328,"7. 느낀 점과 한계"); body(660,1260,328,160,"배운 점, 아쉬운 점");
    return items;
  }
  if(kind==="e"){ // 지그재그 이야기형: 글과 그래프가 왼쪽·오른쪽을 번갈아
    header();
    head(40,248,460,"1. 탐구 동기 및 목적"); body(40,296,460,176,"생활 속에서 무엇이 궁금했나요?\n이 탐구로 무엇을 알아내고 싶나요?");
    head(528,248,460,"2. 탐구 과정"); flow(528,296,460,176,["질문 정하기","설문 만들기","배포","분석","결론"]);
    head(40,488,948,"3. 결과 ① 질문 1");
    chart(40,536,560,232,"bar","질문 1 그래프",["1학년","2학년","3학년"],[18,24,30]); body(620,536,368,172,"해석\n사실(숫자) → 의미 → 이유"); call(620,716,368,52,"→ 핵심 한 줄");
    head(40,784,948,"4. 결과 ② 질문 2");
    body(40,832,368,172,"해석\n사실(숫자) → 의미 → 이유"); call(40,1012,368,52,"→ 핵심 한 줄"); chart(428,832,560,232,"pie","질문 2 그래프",["예","아니요","모르겠다"],[41,22,9]);
    head(40,1080,600,"5. 결론 및 제언"); body(40,1128,600,180,"결론: 질문마다 답, 가설이 맞았는지\n제언: 누구에게 무엇을 제안할까?",{fill:dark?panel:t.sub,stroke:""});
    head(660,1080,328,"6. 추가 조사",{fill:t.accent}); push(mk("image",{x:660,y:1128,w:328,h:180,radius:10}));
    head(40,1324,948,"7. 느낀 점과 한계"); body(40,1372,948,48,"배운 점, 아쉬운 점, 더 알아보고 싶은 점",{valign:"middle"});
    return items;
  }
  if(kind==="b"){ // 수상작 3단 신문형: 왼쪽 단은 탐구 흐름, 가운데·오른쪽 단은 그래프
    header(); const X=[40,364,688], CW=300;
    head(X[0],244,CW,"1. 탐구 동기"); body(X[0],292,CW,180,"생활 속에서 궁금해진 장면에서 시작해요.\n이 탐구로 알아내고 싶은 것은?");
    head(X[0],488,CW,"2. 탐구 질문과 가설"); body(X[0],536,CW,170,"질문 1)\n질문 2)\n가설: ~할수록 ~할 것이다.");
    head(X[0],722,CW,"3. 탐구 과정"); flow(X[0],770,CW,232,["사전 조사","설문지 만들기","친구들에게 배포","결과 정리·분석","결론과 제언"],true);
    head(X[0],1018,CW,"6. 느낀 점과 한계"); body(X[0],1066,CW,134,"배운 점, 아쉬운 점, 더 알아보고 싶은 점");
    head(X[1],244,624,"4. 설문조사 결과와 분석 (n=○○명)");
    chart(X[1],292,CW,208,"bar","질문 1 그래프",["1학년","2학년","3학년"],[18,24,30]); call(X[1],506,CW,56,"→ 그래프에서 알게 된 점 한 줄");
    chart(X[2],292,CW,208,"pie","질문 2 그래프",["예","아니요","모르겠다"],[41,22,9]); call(X[2],506,CW,56,"→ 그래프에서 알게 된 점 한 줄");
    chart(X[1],576,CW,208,"hbar","질문 3 그래프",["항목 A","항목 B","항목 C","항목 D"],[27,19,12,6]); call(X[1],790,CW,56,"→ 그래프에서 알게 된 점 한 줄");
    chart(X[2],576,CW,208,"donut","질문 4 그래프",["매우 그렇다","그렇다","보통","아니다"],[14,30,18,7]); call(X[2],790,CW,56,"→ 그래프에서 알게 된 점 한 줄");
    head(X[1],862,624,"5. 추가 조사 (인터뷰 · 관찰 · 공공데이터)");
    push(mk("image",{x:X[1],y:910,w:CW,h:290,radius:10}));
    chart(X[2],910,CW,200,"line","공공데이터 그래프",["2022","2023","2024","2025"],[12,15,19,24],"%"); call(X[2],1116,CW,84,"→ 인터뷰·추가 자료로 알게 된 점");
    head(40,1216,948,"7. 결론 및 제언");
    body(40,1264,464,156,"결론\n· 질문 1:\n· 질문 2:\n· 가설은 (맞았다 / 틀렸다 / 일부 맞았다)");
    body(524,1264,464,156,"제언\n· 학생에게:\n· 학교·기관에게:",{fill:dark?panel:t.sub,stroke:""});
    return items;
  }
  if(kind==="a"){ // 수상작 2단형: 위는 동기·과정, 가운데 넓게 결과, 아래 결론·느낀 점
    header();
    head(40,248,460,"1. 탐구 동기 및 목적"); body(40,296,460,182,"생활 속에서 무엇이 궁금했나요?\n이 탐구로 무엇을 알아내고 싶나요?\n\n✔ 알아볼 것 1   ✔ 알아볼 것 2");
    head(528,248,460,"2. 탐구 과정"); flow(528,296,460,182,["사전 조사","설문 설계","설문 배포","결과 분석","결론·제언"]);
    head(40,494,948,"3. 사전 조사");
    body(40,542,600,136,"책·기사·통계청(KOSIS) 자료에서 미리 알아본 내용을 정리해요. 출처도 함께!");
    push(mk("image",{x:660,y:542,w:328,h:136,radius:10}));
    head(40,694,948,"4. 설문조사 결과와 분석 (○○중 학생 ○○명, ○월 ○일~○일)");
    chart(40,742,460,206,"bar","질문 1 그래프",["항목 A","항목 B","항목 C","항목 D"],[34,21,15,8]); call(40,954,460,48,"→ 그래프에서 알게 된 점 한 줄");
    chart(40,1010,460,196,"hbar","질문 2 그래프",["항목 A","항목 B","항목 C"],[29,17,11]); call(40,1212,460,48,"→ 그래프에서 알게 된 점 한 줄");
    chart(528,742,460,206,"pie","질문 3 그래프",["예","아니요","모르겠다"],[41,22,9]); call(528,954,460,48,"→ 그래프에서 알게 된 점 한 줄");
    head(528,1010,460,"5. 추가 조사 (인터뷰 · 관찰)",{fill:t.accent});
    body(528,1058,460,202,"전문가·선생님 인터뷰, 직접 관찰, 공공데이터처럼 설문 말고 더 알아본 내용을 써요.\n사진을 넣어도 좋아요.");
    head(40,1276,600,"6. 결론 및 제언"); body(40,1324,600,96,"결론: 질문마다 답, 가설이 맞았는지\n제언: 누구에게 무엇을 제안할까?");
    head(660,1276,328,"7. 느낀 점과 한계"); body(660,1324,328,96,"배운 점, 아쉬운 점");
    return items;
  }
  // 간단형
  const box=(x,y,w,h,hd,b)=>{ head(x,y,w,hd,{h:44,size:24}); body(x,y+52,w,h-52,b,{size:18}); };
  push(mk("shape",{shape:"rect",x:0,y:0,w:W,h:200,fill:t.main,radius:0}));
  push(mk("title",{x:40,y:28,w:W-80,h:96,text:title,size:56,fill:"",radius:0}));
  push(mk("text",{x:40,y:128,w:W-80,h:44,text:"부제: 무엇을 조사했는지 한 줄로 써요",size:20,bold:true,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:6}));
  push(mk("text",{x:W-300,y:208,w:260,h:40,text:team,size:15,color:t.ink,fill:"",stroke:"",sw:0,align:"right",valign:"middle",pad:4}));
  box(40,256,464,250,"탐구 동기 및 목적","생활 속에서 무엇이 궁금했나요?\n이 탐구로 무엇을 알아내고 싶나요?");
  box(524,256,464,250,"탐구 질문과 가설","질문 1)\n질문 2)\n가설: ~할수록 ~할 것이다.");
  box(40,526,948,150,"조사 방법","구글 설문지 · 대상: ○○중 1~3학년 ○○명 · 기간: ○월 ○일~○일\n사전조사 → 설문 만들기 → 배포 → 결과 정리 → 분석");
  head(40,696,948,"조사 결과와 분석",{h:44,size:24});
  chart(40,748,464,300,"bar","그래프 제목",["항목 1","항목 2","항목 3"],[12,8,5]);
  chart(524,748,464,300,"pie","그래프 제목",["예","아니요","모르겠다"],[20,9,4]);
  body(40,1056,464,96,"해석: 사실(숫자) → 의미 → 이유",{size:16}); body(524,1056,464,96,"해석: 사실(숫자) → 의미 → 이유",{size:16});
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
    else d.innerHTML='<div class="pimg-empty">'+(sel===it.id?'🖼 여기를 한 번 더 누르면<br>사진을 골라요':'🖼 사진 넣는 자리<br><small>눌러서 사진 넣기</small>')+'</div>';
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
  if(S.frame){ const f=document.createElement("div"); f.className="pframe"; f.style.border=S.frame+"px solid "+(S.frameC||th().main); board.appendChild(f); }
  if(!S.items.length) board.insertAdjacentHTML("beforeend",SL()?'<div class="pempty"><b>'+(D.cur+1)+'번 슬라이드</b><br>위에서 ‘✨ 추천 구성’을 누르면 발표 순서대로 슬라이드가 한 번에 생겨요.<br>제목·글 상자·사진을 하나씩 넣어도 돼요.</div>':'<div class="pempty"><b>B4 포스터 판</b><br>위에서 ‘✨ 추천 배치’을 누르거나<br>제목·글 상자·그래프를 하나씩 넣어 보세요.</div>');
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
   '<div class="prow"><span class="plab">'+(SL()?'발표자료':'포스터')+'</span>'+
     '<label class="pinl">테마 <select data-theme>'+Object.entries(THEMES).map(([k,v])=>'<option value="'+k+'">'+v.name+'</option>').join("")+'</select></label>'+
     '<label class="pinl">'+(SL()?'이 슬라이드 배경':'배경')+' <input type="color" data-bg></label>'+
     (SL()?'':'<label class="pinl">바깥 테두리 <select data-frame><option value="0">없음</option><option value="4">얇게</option><option value="8">보통</option><option value="14">두껍게</option></select></label>')+
     '<span class="pinl">보기 <button type="button" data-zoom="-1" aria-label="작게 보기">−</button><span class="pzoom pnum">100%</span><button type="button" data-zoom="1" aria-label="크게 보기">＋</button></span>'+
   '</div><div class="prow"><span class="plab">'+(SL()?'구성':'배치')+'</span><button type="button" data-tpl="next" class="pmain">'+(SL()?'✨ 추천 구성':'✨ 추천 배치')+'</button><span class="ptplnote" aria-live="polite"></span></span><button type="button" data-undo="1">↶ 되돌리기</button><button type="button" data-clear="1" class="pdanger">'+(SL()?'처음부터 다시':'모두 지우기')+'</button>'+
   '</div>'+
   '<div class="prow psel" hidden></div>'+
  '</div>';
}
function tplNote(){ const el=bar&&bar.querySelector(".ptplnote"); if(!el) return; if(SL()) return deckNote(el); const i=D.tplIdx;
  el.innerHTML=i==null?'누를 때마다 수상작을 참고한 배치 <b>5가지</b>가 차례로 바뀌어요.':'<b>지금 '+(i+1)+'/'+TPLS.length+' · '+esc(TPLS[i][1])+'</b> – '+esc(TPLS[i][2])+'<br>다시 누르면 다음 배치 → ‘'+esc(TPLS[(i+1)%TPLS.length][1])+'’'; }
function toolbarState(){ tplNote(); const fr=bar.querySelector("[data-frame]"); if(fr) fr.value=String(S.frame||0); const ts=bar.querySelector("[data-theme]"); if(ts) ts.value=D.theme; const bg=bar.querySelector("[data-bg]"); if(bg) bg.value=/^#[0-9a-f]{6}$/i.test(S.bg)?S.bg:"#ffffff"; }
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
  if(it.type==="image") h+='<button type="button" data-img="1" class="'+(it.src?'':'pmain')+'">'+(it.src?'사진 바꾸기':'🖼 사진 고르기')+'</button><button type="button" data-fit="1">'+(it.fit==="contain"?"꽉 채우기":"사진 전체 보이기")+'</button>';
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
  pagesOf().forEach(P=>{ if(P.frameC&&P.frameC.toLowerCase()===oldT.main.toLowerCase()) P.frameC=newT.main;
    P.items.forEach(it=>{ ["fill","stroke","color"].forEach(k=>{ if(it[k]) it[k]=m(it[k]); }); if(it.chart&&it.chart.color) it.chart.color=m(it.chart.color); });
    if(String(P.bg).toLowerCase()===oldT.bg.toLowerCase()) P.bg=newT.bg; }); }
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
  if(b.dataset.tpl){
    if(SL()){ if(hasContent()&&!D.fresh&&!b.dataset.sure){ b.dataset.sure="1"; b.textContent="한 번 더 누르면 모든 슬라이드가 바뀌어요"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="✨ 추천 구성"; },3500); return; }
      delete b.dataset.sure; b.textContent="✨ 추천 구성"; applyDeck(); return; }
    if(S.items.length&&!D.fresh&&!b.dataset.sure){ b.dataset.sure="1"; b.textContent="한 번 더 누르면 새 배치로 바뀌어요"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="✨ 추천 배치"; },3500); return; }
    delete b.dataset.sure; b.textContent="✨ 추천 배치";
    const n=((D.tplIdx==null?-1:D.tplIdx)+1)%TPLS.length, T=TPLS[n];
    snap(); S.bg=th().bg; S.items=template(T[0]); S.frame=T[0]==="c"?0:8; S.frameC=th().main; D.tplIdx=n; sel=null; render(); save(false,true); D.fresh=true;
    if(O.status) O.status("추천 배치 "+(n+1)+"/"+TPLS.length+" ‘"+T[1]+"’을 깔았어요. 다시 누르면 다음 배치로 바뀌어요."); return; }
  if(b.dataset.zoom){ const Z=[1,1.5,2,3]; zoom=Z[clamp(Z.indexOf(zoom)+(+b.dataset.zoom),0,Z.length-1)]; fit(); return; }
  if(b.dataset.undo){ undo(); return; }
  if(b.dataset.clear){ if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent="정말 모두 지울까요? 한 번 더 누르기"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="모두 지우기"; },3500); return; }
    snap(); if(SL()){ D.slides=[{id:uid(),bg:"#ffffff",items:[]}]; D.deckIdx=null; setCur(0); strip(); } else S.items=[]; sel=null; render(); save(); return; }
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
  if(t.matches("[data-theme]")){ snap(); const o=th(); D.theme=t.value; recolor(o,th()); render(); strip(); save(); return; }
  if(t.matches("[data-frame]")){ snap(); S.frame=+t.value; if(!S.frameC) S.frameC=th().main; render(); save(); return; }
  if(t.matches("[data-bg]")){ snap(); S.bg=t.value; board.style.background=S.bg; save(); return; }
  const it=sel&&find(sel); if(!it||!t.dataset.k) return;
  snap(); let v=t.value; if(t.dataset.k==="sw"||t.dataset.k==="radius") v=+v; it[t.dataset.k]=v;
  if(t.dataset.k==="stroke"&&!it.sw) it.sw=2;
  if(t.type==="color"){ const d=board.querySelector('[data-id="'+it.id+'"]'); if(d){ d.replaceWith(elFor(it)); } } else render();
  save();
}

/* ---------- 바깥에서 쓰는 함수 ---------- */
async function flush(){ if(tSave&&D&&KEY&&O.put){ clearTimeout(tSave); tSave=null; try{ await O.put(KEY,JSON.parse(JSON.stringify(D))); }catch(e){} } }
async function mount(el,opts){
  await flush();
  O=opts||{}; KEY=O.key; root=el; sel=null; hist=[]; MODE=O.mode==="slides"?"slides":"poster";
  if(SL()){ W=1280; H=720; } else { W=1028; H=1456; }
  let data=null; try{ data=O.get?await O.get(KEY):null; }catch(e){}
  D=data&&(SL()?Array.isArray(data.slides)&&data.slides.length:Array.isArray(data.items))?data:blank(); setCur(SL()?D.cur:0);
  el.innerHTML='<div class="poster-ed'+(SL()?' slides-ed':'')+'">'+toolbar()+(SL()?'<div class="pstrip"></div>':'')+'<div class="pwrap"><div class="psizer"><div class="pboard"></div></div></div>'+
    '<p class="pnote">글 상자는 한 번 눌러 고르고, 다시 누르면 글을 고칠 수 있어요. ✥를 끌면 옮겨지고, 오른쪽 아래 점을 끌면 크기가 바뀌어요.'+(SL()?' 사진 자리는 두 번 누르면 사진을 고를 수 있어요.':'')+' 자동으로 저장돼요.</p></div>';
  bar=el.querySelector(".pbar"); stripEl=el.querySelector(".pstrip"); if(stripEl){ stripEl.addEventListener("click",onStrip); } wrap=el.querySelector(".pwrap"); sizer=el.querySelector(".psizer"); board=el.querySelector(".pboard"); zoom=1;
  board.style.width=W+"px"; board.style.height=H+"px";
  board.addEventListener("pointerdown",onDown);
  board.addEventListener("click",e=>{ const em=e.target.closest(".pimg-empty"); if(!em) return; const pi=em.closest(".pi"), it=pi&&find(pi.dataset.id); if(!it||sel!==it.id) return;
    pickImage(src=>{ snap(); it.src=src; render(); save(); }); }); bar.addEventListener("click",onBar); bar.addEventListener("change",onBarChange); bar.addEventListener("input",e=>{ if(e.target.type==="color") onBarChange(e); });
  if(!mount.keyed){ document.addEventListener("keydown",e=>{ if(root&&document.body.contains(root)) onKey(e); }); mount.keyed=true; }
  if(ro) ro.disconnect(); let lastW=0; ro=new ResizeObserver(()=>{ if(wrap.clientWidth!==lastW){ lastW=wrap.clientWidth; fit(); } }); ro.observe(wrap); fit(); render(); strip();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ if(board&&document.body.contains(board)) render(); });
}
function hasContent(){ return !!(D&&pagesOf().some(P=>P.items.length)); }
const IMG=new Map(); // 사진 src → 불러온 Image
function loadImgs(list){ return Promise.all(list.filter(it=>it.type==="image"&&it.src&&!IMG.has(it.src)).map(it=>new Promise(res=>{ const im=new Image(); im.onload=()=>{ IMG.set(it.src,im); res(); }; im.onerror=res; im.src=it.src; }))); }
async function loadFonts(list){ const famSet=new Set(["Noto Sans KR"]); list.forEach(it=>{ if(it.font) famSet.add(it.font); });
  if(document.fonts&&document.fonts.load){ try{ await Promise.all([...famSet].flatMap(f=>[document.fonts.load('400 20px "'+f+'"',"가나다"),document.fonts.load('700 20px "'+f+'"',"가나다")])); }catch(e){} } }
async function toImages(SC){ // 쪽마다 JPEG dataURL (포스터는 1장)
  const all=pagesOf().flatMap(P=>P.items); await loadFonts(all); await loadImgs(all);
  SC=SC||(SL()?2:2.4); const out=[];
  for(const P of pagesOf()){ const cv=document.createElement("canvas"); cv.width=Math.round(W*SC); cv.height=Math.round(H*SC);
    const ctx=cv.getContext("2d"); ctx.scale(SC,SC); drawPage(ctx,P); out.push(cv.toDataURL("image/jpeg",0.92)); cv.width=cv.height=0; }
  return out;
}
async function toImage(){ return (await toImages())[0]; }
function drawPage(ctx,P){
  ctx.fillStyle=P.bg||"#ffffff"; ctx.fillRect(0,0,W,H);
  for(const it of P.items){
    ctx.save();
    if(it.type==="text"){ drawBox(ctx,it,it.x,it.y,it.w,it.h); drawText(ctx,it); }
    else if(it.type==="chart"){ drawBox(ctx,it,it.x,it.y,it.w,it.h); drawChart(ctx,it,it.x,it.y,it.w,it.h); }
    else if(it.type==="shape"){ drawShape(ctx,it,it.x,it.y,it.w,it.h); }
    else if(it.type==="sticker"){ const fs=Math.min(it.w,it.h)*0.8; ctx.font=fs+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textBaseline="middle"; const tw=ctx.measureText(it.emoji).width; ctx.fillText(it.emoji,it.x+(it.w-tw)/2,it.y+it.h/2+fs*0.06); }
    else if(it.type==="image"&&IMG.get(it.src)){ const im=IMG.get(it.src); rr(ctx,it.x,it.y,it.w,it.h,it.radius||0); ctx.clip();
      const s=(it.fit==="contain"?Math.min:Math.max)(it.w/im.width,it.h/im.height), w=im.width*s, h=im.height*s; ctx.drawImage(im,it.x+(it.w-w)/2,it.y+(it.h-h)/2,w,h);
      ctx.restore(); ctx.save(); if(it.stroke&&it.sw) drawBox(ctx,{stroke:it.stroke,sw:it.sw,radius:it.radius},it.x,it.y,it.w,it.h); }
    ctx.restore();
  }
  if(P.frame){ ctx.save(); ctx.lineWidth=P.frame; ctx.strokeStyle=P.frameC||th().main; ctx.strokeRect(10+P.frame/2,10+P.frame/2,W-20-P.frame,H-20-P.frame); ctx.restore(); }
}
/* ---------- 발표자료 (16:9 슬라이드 여러 장) ---------- */
const DESIGNS=[["band","띠 제목형","위쪽 색 띠에 제목, 깔끔하고 읽기 쉬워요"],["side","사이드 바형","왼쪽 색 막대와 큰 제목, 세련된 느낌"],["card","카드형","색 배경 위 하얀 카드, 귀엽고 부드러운 느낌"]];
const LAYOUTS=[["text","제목 + 글"],["two","글 두 칸"],["chart","그래프 + 해석"],["photo","사진 + 글"],["big","사진 크게"],["flow","순서도"],["cover","표지"],["end","끝 인사"],["blank","빈 슬라이드"]];
function slideFrame(style,title){
  const t=th(), dark=D.theme==="dark", items=[], push=o=>items.push(o); let bg=t.bg, A;
  if(style==="side"){ bg=dark?t.bg:"#ffffff";
    push(mk("shape",{shape:"rect",x:0,y:0,w:28,h:H,fill:t.main,radius:0}));
    push(mk("title",{x:72,y:36,w:1140,h:80,text:title,size:46,color:t.main,fill:"",radius:0,align:"left",pad:0}));
    push(mk("shape",{shape:"line",x:72,y:122,w:120,h:6,fill:t.accent}));
    A={x:72,y:156,w:1152,h:516};
  } else if(style==="card"){ bg=t.sub;
    push(mk("shape",{shape:"round",x:36,y:36,w:W-72,h:H-72,fill:dark?t.bg:"#ffffff",radius:28}));
    push(mk("title",{x:72,y:64,w:560,h:64,text:title,font:"Do Hyeon",size:34,color:"#ffffff",fill:t.main,radius:999,align:"center",pad:10}));
    A={x:72,y:156,w:1136,h:496};
  } else { bg=dark?t.bg:"#ffffff";
    push(mk("shape",{shape:"rect",x:0,y:0,w:W,h:112,fill:t.main,radius:0}));
    push(mk("title",{x:56,y:20,w:W-112,h:72,text:title,size:44,fill:"",radius:0,align:"left",pad:0}));
    push(mk("shape",{shape:"rect",x:0,y:H-10,w:W,h:10,fill:t.sub,radius:0}));
    A={x:56,y:144,w:1168,h:528};
  }
  return {bg,items,A};
}
function slide(style,kind,o){
  o=o||{}; const t=th(), dark=D.theme==="dark", panel=dark?t.sub:"#ffffff";
  const team=(O.team&&O.team())||"○조 | 발표자 이름", ttl=(O.title&&O.title())||"우리 탐구의 제목을 써요";
  if(kind==="cover"||kind==="end"){
    const items=[], push=x=>items.push(x), big=kind==="cover"?ttl:"감사합니다!", sub=kind==="cover"?(o.sub||"부제: 무엇을 어떻게 조사했는지 한 줄로"):"궁금한 점이 있으면 질문해 주세요 🙋";
    let bg=dark?t.bg:"#ffffff";
    if(style==="side"){
      push(mk("shape",{shape:"rect",x:0,y:0,w:420,h:H,fill:t.main,radius:0}));
      push(mk("sticker",{emoji:kind==="cover"?"📊":"🙌",x:130,y:280,w:160,h:160}));
      push(mk("title",{x:480,y:150,w:740,h:240,text:big,size:kind==="cover"?62:84,color:t.main,fill:"",radius:0,align:"left",pad:0}));
      push(mk("shape",{shape:"line",x:480,y:410,w:160,h:8,fill:t.accent}));
      push(mk("text",{x:480,y:440,w:740,h:60,text:sub,size:26,bold:true,color:t.ink,fill:"",stroke:"",sw:0,pad:0,valign:"middle"}));
      push(mk("text",{x:480,y:520,w:740,h:56,text:team,size:24,color:t.main,bold:true,fill:"",stroke:"",sw:0,pad:0,valign:"middle"}));
    } else if(style==="card"){ bg=t.sub;
      push(mk("shape",{shape:"round",x:36,y:36,w:W-72,h:H-72,fill:dark?t.bg:"#ffffff",radius:28}));
      push(mk("title",{x:100,y:150,w:W-200,h:220,text:big,size:kind==="cover"?66:88,color:t.main,fill:"",radius:0,align:"center",pad:0}));
      push(mk("text",{x:100,y:384,w:W-200,h:60,text:sub,size:26,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
      push(mk("text",{x:340,y:476,w:600,h:60,text:team,size:24,bold:true,color:"#ffffff",fill:t.main,stroke:"",sw:0,radius:999,align:"center",valign:"middle",pad:8}));
    } else {
      push(mk("shape",{shape:"rect",x:0,y:0,w:W,h:440,fill:t.main,radius:0}));
      push(mk("title",{x:80,y:90,w:W-160,h:230,text:big,size:kind==="cover"?68:90,fill:"",radius:0,align:"left",pad:0}));
      push(mk("text",{x:80,y:330,w:W-160,h:60,text:sub,size:28,bold:true,color:"#ffffff",fill:"",stroke:"",sw:0,valign:"middle",pad:0}));
      push(mk("text",{x:80,y:490,w:W-160,h:60,text:team,size:28,bold:true,color:t.ink,fill:"",stroke:"",sw:0,valign:"middle",pad:0}));
      push(mk("shape",{shape:"line",x:80,y:570,w:200,h:8,fill:t.accent}));
    }
    return {id:uid(),bg,items};
  }
  const F=slideFrame(style,o.title||({text:"제목을 써요",two:"제목을 써요",chart:"조사 결과",photo:"제목을 써요",big:"사진으로 보는 우리 탐구",flow:"조사 방법",blank:""}[kind]||""));
  const A=F.A, items=F.items, push=x=>items.push(x);
  if(kind==="blank"&&!o.title) items.splice(0,items.length,...items.filter(it=>it.role!=="title"));
  const body=(x,y,w,h,txt,ex)=>push(mk("text",Object.assign({x,y,w,h,text:txt,size:26,fill:panel,stroke:t.sub,sw:2,radius:16,pad:22},ex||{})));
  const head=(x,y,w,txt)=>push(mk("text",{x,y,w,h:48,text:txt,font:"Do Hyeon",size:32,color:t.main,fill:"",stroke:"",sw:0,pad:0,valign:"middle"}));
  const call=(x,y,w,h,txt)=>push(mk("text",{x,y,w,h,text:txt,size:24,bold:true,color:dark?t.accent:t.main,fill:dark?"":t.sub,stroke:"",sw:0,radius:12,valign:"middle",pad:16}));
  if(kind==="text") body(A.x,A.y,A.w,A.h,o.body||"• 첫 번째로 말할 내용\n• 두 번째로 말할 내용\n• 세 번째로 말할 내용");
  if(kind==="two"){ const cw=(A.w-32)/2;
    head(A.x,A.y,cw,o.h1||"왼쪽 소제목"); body(A.x,A.y+60,cw,A.h-60,o.b1||"내용을 써요");
    head(A.x+cw+32,A.y,cw,o.h2||"오른쪽 소제목"); body(A.x+cw+32,A.y+60,cw,A.h-60,o.b2||"내용을 써요",o.fill2?{fill:dark?panel:t.sub,stroke:""}:null); }
  if(kind==="chart"){ const cw=r4(A.w*0.6);
    push(mk("chart",{x:A.x,y:A.y,w:cw,h:A.h,radius:16,fill:panel,chart:Object.assign({kind:"bar",title:"질문 그래프",labels:["항목 A","항목 B","항목 C","항목 D"],values:[34,21,15,8],unit:"명",showVal:true,mono:false,color:t.main},o.chart||{})}));
    body(A.x+cw+28,A.y,A.w-cw-28,A.h-108,o.body||"해석\n\n사실(숫자): \n의미: \n이유: ");
    call(A.x+cw+28,A.y+A.h-92,A.w-cw-28,92,o.call||"→ 핵심을 한 줄로!"); }
  if(kind==="photo"){ const cw=r4(A.w*0.5);
    push(mk("image",{x:A.x,y:A.y,w:cw,h:A.h,radius:16}));
    body(A.x+cw+28,A.y,A.w-cw-28,A.h,o.body||"사진에 대한 설명을 써요."); }
  if(kind==="big"){ push(mk("image",{x:A.x,y:A.y,w:A.w,h:A.h-72,radius:16}));
    push(mk("text",{x:A.x,y:A.y+A.h-60,w:A.w,h:60,text:o.body||"사진 설명: 무엇을, 언제, 어디서",size:24,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0})); }
  if(kind==="flow"){ const steps=o.steps||["설문 문항 만들기","구글 설문지 배포","응답 모으기","그래프로 정리","분석 · 결론"], n=steps.length, fh=260, slot=A.w/n, d=96;
    push(mk("shape",{shape:"round",x:A.x,y:A.y,w:A.w,h:fh,fill:panel,stroke:t.sub,sw:2,radius:16}));
    steps.forEach((st,k)=>{ const cx=A.x+slot*k+slot/2;
      push(mk("shape",{shape:"ellipse",x:r4(cx-d/2),y:A.y+30,w:d,h:d,fill:k%2?t.accent:t.main,radius:0}));
      push(mk("text",{x:r4(cx-d/2),y:A.y+30,w:d,h:d,text:String(k+1),font:"Black Han Sans",size:44,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
      push(mk("text",{x:r4(cx-slot/2+6),y:A.y+140,w:r4(slot-12),h:100,text:st,size:24,bold:true,align:"center",fill:"",stroke:"",sw:0,pad:2}));
      if(k<n-1) push(mk("shape",{shape:"arrow",x:r4(cx+d/2+8),y:A.y+66,w:Math.max(16,r4(slot-d-16)),h:24,fill:t.sub,radius:0})); });
    body(A.x,A.y+fh+24,A.w,A.h-fh-24,o.body||"대상: ○○중 ○학년 ○○명\n기간: ○월 ○일 ~ ○월 ○일 · 질문 수: ○개",{valign:"middle"}); }
  return {id:uid(),bg:F.bg,items};
}
function deck(style){
  return [slide(style,"cover"),
    slide(style,"photo",{title:"1. 탐구 동기",body:"생활 속에서 어떤 장면을 보고 궁금해졌나요?\n\n이 탐구로 알아내고 싶은 것은?"}),
    slide(style,"two",{title:"2. 탐구 질문과 가설",h1:"탐구 질문",b1:"질문 1)\n\n질문 2)",h2:"가설",b2:"~할수록 ~할 것이다.",fill2:true}),
    slide(style,"flow",{title:"3. 조사 방법"}),
    slide(style,"chart",{title:"4. 결과 ① 질문 1",chart:{kind:"bar",title:"질문 1 그래프"}}),
    slide(style,"chart",{title:"4. 결과 ② 질문 2",chart:{kind:"pie",title:"질문 2 그래프",labels:["예","아니요","모르겠다"],values:[41,22,9]}}),
    slide(style,"chart",{title:"4. 결과 ③ 질문 3",chart:{kind:"hbar",title:"질문 3 그래프",labels:["항목 A","항목 B","항목 C"],values:[29,17,11]}}),
    slide(style,"big",{title:"5. 더 알아본 것",body:"인터뷰 · 관찰 · 공공데이터에서 알게 된 점"}),
    slide(style,"two",{title:"6. 결론 및 제언",h1:"결론",b1:"• 질문 1의 답:\n• 질문 2의 답:\n• 가설은 (맞았다 / 틀렸다 / 일부 맞았다)",h2:"제언",b2:"• 학생들에게:\n• 학교에게:",fill2:true}),
    slide(style,"two",{title:"7. 느낀 점과 역할",h1:"느낀 점",b1:"배운 점, 아쉬운 점, 더 알아보고 싶은 점",h2:"역할 나누기",b2:"이름 – 맡은 일\n이름 – 맡은 일\n이름 – 맡은 일"}),
    slide(style,"end")];
}
function applyDeck(){
  const n=((D.deckIdx==null?-1:D.deckIdx)+1)%DESIGNS.length, T=DESIGNS[n];
  snap(); D.style=T[0]; D.deckIdx=n; D.slides=deck(T[0]); setCur(0); sel=null; render(); strip(); save(false,true); D.fresh=true;
  if(O.status) O.status("추천 구성 "+(n+1)+"/"+DESIGNS.length+" ‘"+T[1]+"’으로 슬라이드 "+D.slides.length+"장을 만들었어요. 다시 누르면 다음 디자인으로 바뀌어요.");
}
function deckNote(el){ const i=D.deckIdx;
  el.innerHTML=i==null?'누르면 발표 순서대로 슬라이드 <b>11장</b>이 한 번에 생겨요. 누를 때마다 디자인 <b>3가지</b>가 차례로 바뀌어요.'
    :'<b>지금 '+(i+1)+'/'+DESIGNS.length+' · '+esc(DESIGNS[i][1])+'</b> – '+esc(DESIGNS[i][2])+'<br>다시 누르면 다음 디자인 → ‘'+esc(DESIGNS[(i+1)%DESIGNS.length][1])+'’ (쓴 내용은 새로 바뀌어요 · 색만 바꾸려면 ‘테마’)'; }
function strip(){
  if(!SL()||!stripEl) return;
  stripEl.innerHTML='<div class="pstools"><b>슬라이드 '+(D.cur+1)+' / '+D.slides.length+'</b>'+
    '<span class="pdd"><button type="button" data-pop2="lay" class="pmain">＋ 슬라이드 추가 ▾</button><span class="ppop" data-popbox2="lay" hidden>'+LAYOUTS.map(([k,l])=>'<button type="button" data-lay="'+k+'">'+l+'</button>').join("")+'</span></span>'+
    '<button type="button" data-sl="dup">복제</button><button type="button" data-sl="left" aria-label="앞으로 옮기기">◀ 앞으로</button><button type="button" data-sl="right" aria-label="뒤로 옮기기">뒤로 ▶</button>'+
    '<button type="button" data-sl="del" class="pdanger">이 슬라이드 삭제</button><button type="button" data-sl="show" class="pshow">▶ 발표하기</button></div>'+
    '<div class="psthumbs">'+D.slides.map((P,i)=>'<button type="button" class="psth'+(i===D.cur?' on':'')+'" data-go="'+i+'" aria-label="'+(i+1)+'번 슬라이드"><canvas data-th="'+i+'"></canvas><span>'+(i+1)+'</span></button>').join("")+'</div>';
  D.slides.forEach((_,i)=>thumb(i));
  const on=stripEl.querySelector(".psth.on"); if(on&&on.scrollIntoView){ const box=stripEl.querySelector(".psthumbs"); box.scrollLeft=Math.max(0,on.offsetLeft-box.clientWidth/2+on.clientWidth/2); }
}
function thumb(i){
  if(!stripEl) return; const cv=stripEl.querySelector('[data-th="'+i+'"]'), P=D.slides[i]; if(!cv||!P) return;
  const tw=176, s=tw/W; cv.width=tw*2; cv.height=Math.round(H*s)*2; const ctx=cv.getContext("2d"); ctx.setTransform(2*s,0,0,2*s,0,0); drawPage(ctx,P);
  if(P.items.some(it=>it.type==="image"&&it.src&&!IMG.has(it.src))) loadImgs(P.items).then(()=>thumb(i));
}
function onStrip(e){
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.pop2){ const p=stripEl.querySelector("[data-popbox2]"); p.hidden=!p.hidden; return; }
  if(b.dataset.go!=null){ setCur(+b.dataset.go); sel=null; render(); strip(); return; }
  if(b.dataset.lay){ snap(); D.slides.splice(D.cur+1,0,slide(D.style||"band",b.dataset.lay)); setCur(D.cur+1); sel=null; render(); strip(); save(); return; }
  const a=b.dataset.sl; if(!a) return;
  if(a==="show"){ present(); return; }
  if(a==="dup"){ snap(); const c=JSON.parse(JSON.stringify(S)); c.id=uid(); c.items.forEach(it=>it.id=uid()); D.slides.splice(D.cur+1,0,c); setCur(D.cur+1); }
  if(a==="left"||a==="right"){ const j=D.cur+(a==="left"?-1:1); if(j<0||j>=D.slides.length) return; snap(); const x=D.slides.splice(D.cur,1)[0]; D.slides.splice(j,0,x); setCur(j); }
  if(a==="del"){ if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent="정말 삭제할까요? 한 번 더"; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.sure; b.textContent="이 슬라이드 삭제"; } },3500); return; }
    snap(); if(D.slides.length>1){ D.slides.splice(D.cur,1); setCur(Math.min(D.cur,D.slides.length-1)); } else { D.slides=[{id:uid(),bg:"#ffffff",items:[]}]; setCur(0); } }
  sel=null; render(); strip(); save();
}
/* 발표하기: 화면 가득 슬라이드 보기 */
async function present(){
  await flush(); if(O.status) O.status("발표 화면을 준비하는 중…");
  const pics=await toImages(1.5); let i=SL()?D.cur:0;
  const ov=document.createElement("div"); ov.className="pshowov"; ov.tabIndex=0;
  ov.innerHTML='<img alt=""><div class="pshowbar"><button type="button" data-p="-1" aria-label="이전">◀</button><span></span><button type="button" data-p="1" aria-label="다음">▶</button><button type="button" data-p="x">✕ 끝내기</button></div>';
  document.body.appendChild(ov); const img=ov.querySelector("img"), lab=ov.querySelector("span");
  const show=()=>{ img.src=pics[i]; lab.textContent=(i+1)+" / "+pics.length; };
  const go=d=>{ i=clamp(i+d,0,pics.length-1); show(); };
  const close=()=>{ document.removeEventListener("keydown",key,true); if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{}); ov.remove(); if(O.status) O.status("발표를 마쳤어요."); };
  const key=e=>{ if(["ArrowRight","PageDown"," ","Enter"].includes(e.key)){ e.preventDefault(); go(1); } else if(["ArrowLeft","PageUp","Backspace"].includes(e.key)){ e.preventDefault(); go(-1); } else if(e.key==="Escape"){ e.preventDefault(); close(); } };
  document.addEventListener("keydown",key,true);
  ov.addEventListener("click",e=>{ const b=e.target.closest("[data-p]"); if(b){ if(b.dataset.p==="x") close(); else go(+b.dataset.p); return; } const r=ov.getBoundingClientRect(); go(e.clientX<r.left+r.width/3?-1:1); });
  document.addEventListener("fullscreenchange",function fc(){ if(!document.fullscreenElement&&ov.isConnected&&ov.dataset.fs){ document.removeEventListener("fullscreenchange",fc); close(); } });
  show(); ov.focus(); if(ov.requestFullscreen) ov.requestFullscreen().then(()=>{ ov.dataset.fs="1"; }).catch(()=>{});
  if(O.status) O.status("발표 중 · 화면을 누르거나 → 키로 넘겨요. Esc나 ‘✕ 끝내기’로 나가요.");
}

window.FPoster={mount,flush,hasContent,toImage,toImages,parseData,SIZE:{w:257,h:364},size:()=>SL()?{w:338.67,h:190.5}:{w:257,h:364},count:()=>pagesOf().length,present};
})();
