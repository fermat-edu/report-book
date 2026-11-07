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
  dark:  {name:"다크",  bg:"#1f2a2c",main:"#5fb8c2",sub:"#3a4a4e",accent:"#f2a29f",ink:"#f1f5f5"},
  retro: {name:"레트로",bg:"#fdf3e7",main:"#e4572e",sub:"#f9d56e",accent:"#3a86ff",ink:"#1f1f1f"},
  pastel:{name:"파스텔",bg:"#fff8fb",main:"#e889b5",sub:"#fde3ef",accent:"#7cc6c0",ink:"#3a2a33"},
  forest:{name:"숲",    bg:"#f4f7ef",main:"#4f7a3a",sub:"#dde9cf",accent:"#d98b3a",ink:"#1f2a1a"},
  navy:  {name:"네이비",bg:"#f2f4f8",main:"#1f3a68",sub:"#d6deeb",accent:"#f4b400",ink:"#1b2230"},
  kraft: {name:"크라프트",bg:"#efe3cf",main:"#8a5a3b",sub:"#e2cfb0",accent:"#3e7c74",ink:"#3b2a1d"},
  neon:  {name:"네온",  bg:"#14142b",main:"#ff4fa0",sub:"#2b2b52",accent:"#4fe0ff",ink:"#f5f5ff"}
};
const PAL=["#3e9ca7","#f2827f","#f2c14e","#6a8fd8","#8bc28c","#b48ad6","#ef9a5b","#7a8b8d","#e46fa1","#4fb3a0"];
const FONTS=[["Noto Sans KR","본문체"],["Gowun Dodum","고운돋움"],["Sunflower","해바라기"],["Do Hyeon","도현체"],["Black Han Sans","검은고딕"],["Jua","주아체"],["Yeon Sung","연성체"],["Gugi","구기체"],["Gaegu","개구 (손글씨)"],["Nanum Pen Script","나눔펜 (손글씨)"],["Gamja Flower","감자꽃 (손글씨)"],["Hi Melody","하이멜로디 (손글씨)"],["Dokdo","독도체 (붓글씨)"],["Noto Serif KR","명조체"],["Song Myung","송명체"]];
const SHAPES=[["rect","네모"],["round","둥근 네모"],["ellipse","동그라미"],["triangle","세모"],["diamond","마름모"],["hexagon","육각형"],["star","별"],["heart","하트"],["burst","뾰족 배지"],["bubble","말풍선"],["ribbon","리본"],["note","메모지"],["tape","테이프"],["arrow","화살표"],["line","선"],["dash","점선"],["dot","동글 점선"],["wave","물결선"]];
const LINES=["line","dash","dot","wave"];
const STKCAT=[["통계·공부","📊📈📉🧮🔢📋📝🗳️🔍💡📌📎✏️📏🗂️📚🔬🧪"],["학교·생활","🏫🎒🧑‍🏫👩‍🎓👨‍🎓🎨🎵⚽🏀🍱⏰📱💻🎧🚌🏠🛒💰"],["사람·표정","😀😄😍🥰🤔😮😢😡😴🤗😎🥳👍👏🙌🙋💪👥🫶❤️"],["자연·음식","🌍🌱🌸🌻🌞🌈⛅❄️🔥💧🍎🍜🍕🍫☕🍔🌶️🐶🐱🐰"],["기호·꾸미기","✅❌❗❓⭐🌟✨💯🎯🏆🥇⚠️➡️⬅️⬆️⬇️🔴🟠🟡🟢🔵🟣💬💭🎀🎉"]];
const STK_OLD=["📊","📈","📉","🔍","💡","✅","❗","❓","⭐","🎯","📌","📱","📚","🏫","🍜","🌶️","😀","😮","🤔","👍","👥","🗳️","🧮","🌍","❤️","⚠️","➡️","🏆"];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const r4=v=>Math.round(v/4)*4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

let stripEl=null, zoom=1, sizer=null, S=null, KEY="", O={}, root=null, wrap=null, board=null, bar=null, side=null, scale=1, sel=null, hist=[], tSave=null, typed=false, ro=null;
const th=()=>D&&D.pal||THEMES[D&&D.theme]||THEMES.mint;
const dk=()=>isDark(th().bg);
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
  if(type==="text") Object.assign(base,{text:"여기에 글을 써요.",font:"Noto Sans KR",size:SL()?26:18,bold:false,color:t.ink,fill:dk()?t.sub:"#ffffff",stroke:t.sub,sw:2,radius:12,align:"left",valign:"top",pad:14});
  if(type==="title") Object.assign(base,{type:"text",role:"title",text:"제목",font:"Black Han Sans",size:40,bold:false,color:"#ffffff",fill:t.main,stroke:"",sw:0,radius:12,align:"center",valign:"middle",pad:12,h:80});
  if(type==="chart") Object.assign(base,{w:460,h:320,fill:dk()?t.sub:"#ffffff",stroke:t.sub,sw:2,radius:12,
    chart:{kind:"bar",title:"그래프 제목",labels:["항목 1","항목 2","항목 3"],values:[12,8,5],unit:"명",showVal:true,mono:false,color:t.main}});
  if(type==="image") Object.assign(base,{w:360,h:260,src:"",fit:"cover",radius:8,stroke:"",sw:0});
  if(type==="shape") Object.assign(base,{shape:"round",w:300,h:180,fill:t.sub,stroke:"",sw:0,radius:24});
  if(type==="sticker") Object.assign(base,{emoji:"⭐",w:90,h:90});
  return Object.assign(base,o||{});
}
let addN=0;
function addItem(it){ snap(); // 화면에 보이는 부분의 가운데에 (조금씩 비켜서) 놓기
  const r=wrap.getBoundingClientRect(), top=clamp(-r.top/scale,0,H), bot=clamp((window.innerHeight-r.top)/scale,0,H), off=(addN++%5)*24-48;
  const cy=bot>top?(top+bot)/2:H/2;
  it.x=clamp(r4((W-it.w)/2+off),0,Math.max(0,W-it.w)); it.y=clamp(r4(cy-it.h/2+off),0,Math.max(0,H-it.h));
  S.items.push(it); sel=it.id; render(); save(); }

/* ---------- 추천 배치 (전국학생통계활용대회 수상작 구성 참고) ---------- */
const TPLS=[["a","수상작 2단형","위에 탐구 동기와 순서도, 가운데에 그래프 3개와 추가 조사, 아래에 결론"],
  ["b","3단 신문형","왼쪽 단에 동기·질문·과정, 가운데·오른쪽 단에 그래프 4개와 추가 조사"],
  ["d","큰 그래프 강조형","위에 동기·질문·방법 3칸, 핵심 그래프 하나를 크게, 작은 그래프 3개"],
  ["e","지그재그 이야기형","그래프와 해석이 왼쪽·오른쪽을 번갈아 나오는 이야기 흐름"],
  ["c","간단형","큰 글 칸과 그래프 2개, 처음 해 보는 팀에게 좋아요"],
  ["f","수상작 4단 촘촘형","위에 동기·질문·가설·방법 4칸, 탐구 과정, 그래프 6개, 결론·제언·느낀 점 3칸"],
  ["g","질문별 카드형","왼쪽에 탐구 흐름, 오른쪽에 질문 카드 4장(그래프+해석+한 줄)과 종합 분석"],
  ["h","인포그래픽 숫자형","맨 위에 핵심 숫자 3개, 그래프 6개, 교차 분석과 추가 조사 사진"],
  ["i","교차분석 심화형","결과 그래프 2개를 크게, 집단별 비교 그래프 2개, 결론·제언·참고 자료"],
  ["j","신문 기사형","신문 머리글과 3단 기사, 그래프 5개·인터뷰·공공데이터까지 꽉 차게"]];
function template(kind){
  const t=th(), dark=dk(), panel=dark?t.sub:"#ffffff", items=[], push=o=>items.push(o);
  const team=(O.team&&O.team())||"팀명 | 팀원 이름", title=(O.title&&O.title())||"우리의 궁금증을 질문으로 써요?";
  const head=(x,y,w,txt,o)=>push(mk("title",Object.assign({tag:"H",x,y,w,h:40,text:txt,font:"Do Hyeon",size:23,align:"left",radius:8,pad:12,fill:t.main},o||{})));
  const body=(x,y,w,h,txt,o)=>push(mk("text",Object.assign({tag:"B",x,y,w,h,text:txt,size:15,fill:panel,radius:10},o||{})));
  const call=(x,y,w,h,txt)=>push(mk("text",{tag:"C",x,y,w,h,text:txt,size:15,bold:true,color:dark?t.accent:t.main,fill:dark?"":t.sub,stroke:"",sw:0,radius:8,valign:"middle",pad:10}));
  const chart=(x,y,w,h,kind,ttl,labels,values,unit)=>push(mk("chart",{tag:"G",x,y,w,h,radius:10,fill:panel,chart:{kind,title:ttl,labels,values,unit:unit||"명",showVal:true,mono:false,color:t.main}}));
  const img=(x,y,w,h)=>push(mk("image",{tag:"I",x,y,w,h,radius:10}));
  const stat=(x,y,w,h,num,lab)=>{ body(x,y,w,h,""); push(mk("text",{tag:"N",x,y:y+10,w,h:h-50,text:num,font:"Black Han Sans",size:50,color:t.accent,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
    push(mk("text",{tag:"NL",x,y:y+h-44,w,h:36,text:lab,size:15,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:2})); };
  const flow=(x,y,w,h,steps,vertical)=>{ push(mk("shape",{tag:"FB",shape:"round",x,y,w,h,fill:panel,stroke:t.sub,sw:2,radius:10}));
    const n=steps.length;
    if(!vertical){ const slot=(w-24)/n, d=Math.min(54,slot-26);
      steps.forEach((s,k)=>{ const cx=x+12+slot*k+slot/2;
        push(mk("shape",{tag:"FC",alt:k%2,shape:"ellipse",x:r4(cx-d/2),y:y+16,w:d,h:d,fill:k%2?t.accent:t.main,radius:0}));
        push(mk("text",{tag:"FN",x:r4(cx-d/2),y:y+16,w:d,h:d,text:String(k+1),font:"Black Han Sans",size:24,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
        push(mk("text",{tag:"FT",x:r4(cx-slot/2+2),y:y+20+d,w:r4(slot-4),h:h-28-d,text:s,size:13,bold:true,align:"center",fill:"",stroke:"",sw:0,pad:2}));
        if(k<n-1) push(mk("shape",{tag:"FA",shape:"arrow",x:r4(cx+d/2+3),y:y+16+d/2-8,w:Math.max(12,r4(slot-d-6)),h:16,fill:t.sub,radius:0})); }); }
    else{ const rowH=(h-16)/n, d=Math.min(40,rowH-8);
      steps.forEach((s,k)=>{ const yy=y+8+rowH*k+(rowH-d)/2;
        push(mk("shape",{tag:"FC",alt:k%2,shape:"ellipse",x:x+12,y:r4(yy),w:d,h:d,fill:k%2?t.accent:t.main,radius:0}));
        push(mk("text",{tag:"FN",x:x+12,y:r4(yy),w:d,h:d,text:String(k+1),font:"Black Han Sans",size:19,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
        push(mk("text",{tag:"FT",x:x+20+d,y:r4(yy-4),w:w-32-d,h:d+8,text:s,size:14,bold:true,fill:"",stroke:"",sw:0,valign:"middle",pad:2})); }); }
  };
  const header=()=>{
    push(mk("title",{tag:"T",x:36,y:30,w:W-72,h:112,text:title,font:"Black Han Sans",size:58,color:t.main,fill:"",radius:0,align:"center"}));
    push(mk("shape",{tag:"L",shape:"line",x:80,y:166,w:150,h:4,fill:t.main}));
    push(mk("text",{tag:"ST",x:240,y:146,w:548,h:44,text:"부제: 무엇을 어떻게 조사했는지 한 줄로",size:21,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:4}));
    push(mk("shape",{tag:"L",shape:"line",x:798,y:166,w:150,h:4,fill:t.main}));
    push(mk("text",{tag:"TM",x:724,y:196,w:264,h:38,text:team,size:14,bold:true,color:t.main,fill:panel,stroke:t.main,sw:2,radius:999,align:"center",valign:"middle",pad:6}));
  };
  const C3=[40,361,682], W3=305, C4=[40,281,522,763], W4=225;
  if(kind==="f"){ // 수상작 4단 촘촘형: 위 4칸 → 과정 → 그래프 6개 → 아래 3칸
    header();
    [["1. 탐구 동기","생활 속에서 궁금해진 장면"],["2. 탐구 질문","질문 1)\n질문 2)\n질문 3)"],["3. 가설","~할수록 ~할 것이다."],["4. 조사 방법","구글 설문지\n대상: ○○중 ○○명\n기간: ○월 ○일~○일"]].forEach(([h,b],i)=>{ head(C4[i],248,W4,h,{size:21}); body(C4[i],296,W4,150,b,{size:14}); });
    head(40,462,948,"5. 탐구 과정"); flow(40,510,948,120,["주제 정하기","사전 조사","설문 만들기","배포·응답 모으기","정리·분석","결론·제언"]);
    head(40,646,948,"6. 설문 결과와 분석 (응답 ○○명)");
    const K=[["bar","질문 1",["항목 A","항목 B","항목 C","항목 D"],[34,21,15,8]],["pie","질문 2",["예","아니요","모르겠다"],[41,22,9]],["hbar","질문 3",["항목 A","항목 B","항목 C"],[29,17,11]],
      ["donut","질문 4",["매우 그렇다","그렇다","보통","아니다"],[14,30,18,7]],["line","질문 5 (학년별)",["1학년","2학년","3학년"],[12,18,25]],["bar","질문 6",["항목 A","항목 B","항목 C"],[22,16,9]]];
    K.forEach((k,i)=>{ const x=C3[i%3], y=i<3?694:956; chart(x,y,W3,200,k[0],k[1],k[2],k[3]); call(x,y+206,W3,48,"→ 알게 된 점 한 줄"); });
    [["7. 결론","질문마다 답, 가설이 맞았는지"],["8. 제언","누구에게 무엇을 제안할까?"],["9. 느낀 점과 한계","배운 점, 아쉬운 점"]].forEach(([h,b],i)=>{ head(C3[i],1218,W3,h); body(C3[i],1266,W3,154,b); });
    return items;
  }
  if(kind==="g"){ // 질문별 결과 카드형: 왼쪽 탐구 흐름, 오른쪽 질문 카드 4장 + 종합 분석
    header(); const L=40, LW=300, R=360, RW=628, CW=306;
    head(L,248,LW,"1. 탐구 동기"); body(L,296,LW,150,"생활 속에서 궁금해진 장면\n알아내고 싶은 것");
    head(L,462,LW,"2. 질문과 가설"); body(L,510,LW,150,"질문 1)\n질문 2)\n가설: ~할수록 ~할 것이다.");
    head(L,676,LW,"3. 조사 과정"); flow(L,724,LW,250,["사전 조사","설문 만들기","친구들에게 배포","결과 정리","분석·결론"],true);
    head(L,990,LW,"4. 조사 대상"); body(L,1038,LW,110,"○○중 1~3학년 ○○명\n기간: ○월 ○일~○일\n방법: 구글 설문지");
    head(L,1164,LW,"8. 느낀 점과 한계"); body(L,1212,LW,208,"배운 점, 아쉬운 점, 더 알아보고 싶은 점");
    head(R,248,RW,"5. 질문별 결과");
    [["bar","질문 1",["항목 A","항목 B","항목 C"],[30,18,9]],["pie","질문 2",["예","아니요","모르겠다"],[41,22,9]],["hbar","질문 3",["항목 A","항목 B","항목 C","항목 D"],[27,19,12,6]],["donut","질문 4",["매우 그렇다","그렇다","보통","아니다"],[14,30,18,7]]].forEach((k,i)=>{
      const x=R+(i%2)*(CW+16), y=i<2?296:658; chart(x,y,CW,210,k[0],k[1],k[2],k[3]); body(x,y+216,CW,80,"해석: 사실(숫자) → 의미 → 이유",{size:14}); call(x,y+302,CW,44,"→ 핵심 한 줄"); });
    head(R,1020,RW,"6. 종합 분석 (교차 분석)"); chart(R,1068,400,200,"bar","학년별로 비교하기",["1학년","2학년","3학년"],[45,58,71],"%"); call(R+416,1068,212,200,"→ 질문끼리, 집단끼리 비교해서 알게 된 점");
    head(R,1284,RW,"7. 결론 및 제언"); body(R,1332,RW,88,"결론: 질문마다 답 · 가설 확인\n제언: 누구에게 무엇을 제안할까?");
    return items;
  }
  if(kind==="h"){ // 인포그래픽 숫자형: 핵심 숫자 3개 → 그래프 6개 → 교차 분석·추가 조사 → 결론
    header();
    stat(C3[0],248,W3,130,"○○명","설문에 답한 친구"); stat(C3[1],248,W3,130,"○○%","가장 많이 고른 답"); stat(C3[2],248,W3,130,"1위","우리 탐구의 핵심 결과");
    head(40,394,460,"1. 탐구 동기"); body(40,442,460,120,"생활 속에서 궁금해진 장면, 알아내고 싶은 것");
    head(528,394,460,"2. 질문과 가설"); body(528,442,460,120,"질문 1) 질문 2)\n가설: ~할수록 ~할 것이다.");
    head(40,578,948,"3. 조사 결과 한눈에 보기 (구글 설문 · ○○명)");
    const K=[["bar","질문 1"],["pie","질문 2"],["hbar","질문 3"],["donut","질문 4"],["bar","질문 5"],["pie","질문 6"]];
    K.forEach((k,i)=>{ const x=C3[i%3], y=i<3?626:856; const pie=k[0]==="pie"||k[0]==="donut"; chart(x,y,W3,170,k[0],k[1],pie?["예","아니요","모르겠다"]:["항목 A","항목 B","항목 C"],pie?[41,22,9]:[29,17,11]); call(x,y+174,W3,40,"→ 알게 된 점"); });
    head(40,1086,600,"4. 더 깊이 보기 (교차 분석)"); chart(40,1134,600,180,"hbar","집단별 비교 (예: 남·여, 학년)",["1학년","2학년","3학년"],[45,58,71],"%");
    head(660,1086,328,"5. 추가 조사",{fill:t.accent}); img(660,1134,328,180);
    body(C3[0],1330,W3,90,"6. 결론\n질문마다 답, 가설 확인",{size:14}); body(C3[1],1330,W3,90,"7. 제언\n누구에게 무엇을 제안?",{size:14}); body(C3[2],1330,W3,90,"8. 느낀 점과 한계",{size:14});
    return items;
  }
  if(kind==="i"){ // 교차분석 심화형: 결과 2개 크게 → 집단별 비교 2개 → 결론·제언·참고 자료
    header();
    head(40,248,600,"1. 탐구 동기 및 목적"); body(40,296,600,150,"생활 속에서 무엇이 궁금했나요?\n이 탐구로 무엇을 알아내고 싶나요?");
    head(660,248,328,"2. 탐구 질문"); body(660,296,328,150,"질문 1)\n질문 2)\n질문 3)");
    head(40,462,948,"3. 가설과 조사 방법"); body(40,510,464,110,"가설 1: ~할수록 ~할 것이다.\n가설 2:"); flow(524,510,464,110,["설문 만들기","배포","정리","분석"]);
    head(40,636,464,"4. 결과 ① 질문 1"); chart(40,684,464,230,"bar","질문 1 그래프",["항목 A","항목 B","항목 C","항목 D"],[34,21,15,8]); call(40,920,464,48,"→ 그래프에서 알게 된 점");
    head(524,636,464,"4. 결과 ② 질문 2"); chart(524,684,464,230,"pie","질문 2 그래프",["예","아니요","모르겠다"],[41,22,9]); call(524,920,464,48,"→ 그래프에서 알게 된 점");
    head(40,984,948,"5. 교차 분석: 집단별로 비교하기");
    chart(40,1032,464,200,"bar","1학년 vs 3학년",["1학년","3학년"],[38,62],"%"); chart(524,1032,464,200,"hbar","남학생 vs 여학생",["남학생","여학생"],[44,56],"%");
    call(40,1238,948,44,"→ 집단에 따라 이렇게 달랐어요: ");
    [["6. 결론","가설이 맞았는지"],["7. 제언","학생·학교에게"],["8. 참고 자료","책·기사·통계청 출처"]].forEach(([h,b],i)=>{ head(C3[i],1294,W3,h,{h:36,size:20}); body(C3[i],1336,W3,84,b,{size:14}); });
    return items;
  }
  if(kind==="j"){ // 신문 기사형: 신문 머리 + 3단 기사 + 아래 결론
    push(mk("text",{tag:"ST",x:40,y:22,w:948,h:30,text:"○○중 통계 신문  ·  2026년 ○월 ○일  ·  제○호",size:15,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
    push(mk("shape",{tag:"L",shape:"line",x:40,y:56,w:948,h:3,fill:t.ink}));
    push(mk("title",{tag:"T",x:36,y:62,w:W-72,h:112,text:title,font:"Black Han Sans",size:60,color:t.main,fill:"",radius:0,align:"center"}));
    push(mk("shape",{tag:"L",shape:"line",x:40,y:180,w:948,h:6,fill:t.ink}));
    push(mk("text",{tag:"ST",x:40,y:192,w:660,h:40,text:"부제: 무엇을 어떻게 조사했는지 한 줄로",size:20,bold:true,color:t.ink,fill:"",stroke:"",sw:0,valign:"middle",pad:2}));
    push(mk("text",{tag:"TM",x:724,y:194,w:264,h:36,text:team,size:14,bold:true,color:t.main,fill:panel,stroke:t.main,sw:2,radius:999,align:"center",valign:"middle",pad:6}));
    push(mk("shape",{tag:"L",shape:"line",x:40,y:242,w:948,h:2,fill:t.ink}));
    const X=[40,364,688], CW=300;
    head(X[0],256,CW,"1. 탐구 동기"); body(X[0],304,CW,170,"생활 속에서 궁금해진 장면\n알아내고 싶은 것");
    head(X[0],490,CW,"2. 질문과 가설"); body(X[0],538,CW,160,"질문 1)\n질문 2)\n가설: ~할수록 ~할 것이다.");
    head(X[0],714,CW,"3. 조사 방법"); flow(X[0],762,CW,230,["사전 조사","설문 만들기","배포","정리·분석","결론"],true);
    head(X[0],1008,CW,"4. 조사 대상"); body(X[0],1056,CW,90,"○○중 ○○명 · ○월 ○일~○일");
    [["5. 결과 ① 질문 1","bar"],["5. 결과 ② 질문 2","pie"],["5. 결과 ③ 질문 3","hbar"]].forEach((k,i)=>{ const y=[256,570,884][i], h=i<2?200:170; head(X[1],y,CW,k[0]); const pie=k[1]==="pie";
      chart(X[1],y+48,CW,h,k[1],k[0].slice(8)+" 그래프",pie?["예","아니요","모르겠다"]:["항목 A","항목 B","항목 C"],pie?[41,22,9]:[29,17,11]); call(X[1],y+54+h,CW,i<2?44:38,"→ 알게 된 점"); });
    head(X[2],256,CW,"6. 결과 ④ 질문 4"); chart(X[2],304,CW,200,"donut","질문 4 그래프",["매우 그렇다","그렇다","보통","아니다"],[14,30,18,7]); call(X[2],510,CW,44,"→ 알게 된 점");
    head(X[2],570,CW,"7. 인터뷰 · 추가 조사",{fill:t.accent}); img(X[2],618,CW,150); body(X[2],774,CW,94,"인터뷰에서 들은 말, 직접 관찰한 내용",{size:14});
    head(X[2],884,CW,"8. 공공데이터 비교"); chart(X[2],932,CW,170,"line","통계청 자료",["2022","2023","2024","2025"],[12,15,19,24],"%"); call(X[2],1108,CW,38,"→ 우리 결과와 비교");
    head(40,1162,948,"9. 결론 및 제언"); body(40,1210,464,98,"결론\n· 질문마다 답 · 가설 확인"); body(524,1210,464,98,"제언\n· 학생에게 · 학교에게",{fill:dark?panel:t.sub,stroke:""});
    body(40,1324,600,96,"느낀 점과 한계: 배운 점, 아쉬운 점"); body(660,1324,328,96,"참고 자료: 책·기사·통계청 출처",{size:14});
    return items;
  }
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
    head(660,1080,328,"6. 추가 조사",{fill:t.accent}); push(mk("image",{tag:"I",x:660,y:1128,w:328,h:180,radius:10}));
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
    push(mk("image",{tag:"I",x:X[1],y:910,w:CW,h:290,radius:10}));
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
    push(mk("image",{tag:"I",x:660,y:542,w:328,h:136,radius:10}));
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
  push(mk("shape",{tag:"BAND",shape:"rect",x:0,y:0,w:W,h:200,fill:t.main,radius:0}));
  push(mk("title",{tag:"TB",x:40,y:28,w:W-80,h:96,text:title,size:56,fill:"",radius:0}));
  push(mk("text",{tag:"STB",x:40,y:128,w:W-80,h:44,text:"부제: 무엇을 조사했는지 한 줄로 써요",size:20,bold:true,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:6}));
  push(mk("text",{tag:"TM",x:W-300,y:208,w:260,h:40,text:team,size:15,color:t.ink,fill:"",stroke:"",sw:0,align:"right",valign:"middle",pad:4}));
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

/* ---------- 추천 디자인 (전국학생통계활용대회 수상작 디자인 참고) ----------
   배치는 그대로 두고 배경·제목·소제목·글 상자·그래프 상자의 색과 글꼴만 바꿔요. */
const DZ=[
 {k:"news",deco:[["band", "top", 10, "$ink"], ["flank", "📰", null, 54]],n:"신문 기사형",d:"누런 신문지, 검은 줄, 명조체",pal:{bg:"#f4f1ea",main:"#1a1a1a",sub:"#e2dccd",accent:"#b3261e",ink:"#1a1a1a"},frame:4,
  f:{T:"Song Myung",H:"Noto Serif KR",B:"Noto Serif KR"},s:{T:{color:"$ink"},H:{fill:"$main",color:"#ffffff",radius:0,bold:true},B:{fill:"#fffdf7",stroke:"$main",sw:1,radius:0},C:{fill:"",color:"$accent",bold:true},G:{fill:"#fffdf7",stroke:"$main",sw:1,radius:0},TM:{fill:"",stroke:"$main",sw:1,radius:0,color:"$ink"},FB:{fill:"#fffdf7",stroke:"$main",sw:1,radius:0},L:{fill:"$ink"}}},
 {k:"pop",deco:[["blob", 0.02, 0.0, 0.2, "#ffffff", 0.35], ["blob", 1.0, 1.0, 0.24, "$main", 0.14], ["flank", "⭐", "⭐", 58]],n:"패스트푸드 팝",d:"노란 배경, 빨간 알약 소제목, 테두리 제목",pal:{bg:"#ffd23f",main:"#e63946",sub:"#fff1c1",accent:"#2a9d8f",ink:"#2b2118"},bgx:{type:"pat",pat:"stripes",color:"#ffffff",a:0.22,size:40},frame:10,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$main",tline:6,tlc:"#ffffff",tshadow:true},H:{radius:999},B:{stroke:"$ink",sw:2,radius:14},C:{fill:"$sub",color:"$main"},G:{stroke:"$ink",sw:2,radius:14},FB:{stroke:"$ink",sw:2,radius:14}}},
 {k:"lav",deco:[["blob", 0.04, 0.02, 0.18, "$sub", 1], ["blob", 0.97, 0.98, 0.24, "$sub", 1], ["dots", "tr", "$main", 0.35], ["flank", "💜", "💜", 48]],n:"라벤더 카드",d:"연보라 땡땡이, 보라 테두리 카드",pal:{bg:"#f3efff",main:"#7b5cc9",sub:"#e4dbfa",accent:"#f2a33a",ink:"#2c2440"},bgx:{type:"pat",pat:"dots",color:"#7b5cc9",a:0.13,size:36},frame:0,
  f:{T:"Jua",H:"Do Hyeon",B:"Gowun Dodum"},s:{H:{radius:12},B:{stroke:"$main",sw:2,radius:18},G:{stroke:"$main",sw:2,radius:18},FB:{stroke:"$main",sw:2,radius:18}}},
 {k:"mint",deco:[["ring", 1.0, 0.0, 0.2, "$main", 7, 0.5], ["ring", 0.0, 1.0, 0.18, "$accent", 7, 0.5], ["mark", "$sub", 1]],n:"민트 라인",d:"하얀 바탕, 민트색 둥근 테두리",pal:{bg:"#ffffff",main:"#1aa3a3",sub:"#dff4f4",accent:"#ff7a59",ink:"#17323a"},frame:6,
  f:{T:"Do Hyeon",H:"Do Hyeon",B:"Noto Sans KR"},s:{H:{radius:999},B:{stroke:"$main",sw:3,radius:22},G:{stroke:"$main",sw:3,radius:22},FB:{stroke:"$main",sw:3,radius:22}}},
 {k:"navy",deco:[["band", "top", 14, "$accent"], ["pix", "tr", "$accent", 0.9], ["pix", "bl", "$sub", 1]],n:"네이비 클래식",d:"남색 굵은 테두리, 그림자 카드",pal:{bg:"#f5f7fb",main:"#1f3a68",sub:"#dfe6f2",accent:"#f4b400",ink:"#1b2230"},frame:14,
  f:{T:"Black Han Sans",H:"Noto Sans KR",B:"Noto Sans KR"},s:{H:{radius:0,bold:true},B:{stroke:"#c5d0e3",sw:1,radius:4,shadow:true},C:{fill:"#fff4d0",color:"$main"},G:{stroke:"#c5d0e3",sw:1,radius:4,shadow:true},FB:{stroke:"#c5d0e3",sw:1,radius:4,shadow:true}}},
 {k:"sale",deco:[["half", "tl", "#ffffff", 0.24, 0.12], ["half", "br", "#7f0000", 0.3, 0.25], ["flank", "🔥", "🔥", 58]],n:"레드 세일",d:"빨간 바탕, 노란 테두리 제목, 하얀 카드",pal:{bg:"#c62828",main:"#c62828",sub:"#ffe0b2",accent:"#ffca28",ink:"#2b1a12"},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$accent",tline:6,tlc:"#7f0000",tshadow:true},ST:{color:"#ffffff"},L:{fill:"#ffffff"},TM:{fill:"$accent",stroke:"",sw:0,color:"$ink"},H:{fill:"$accent",color:"$ink",radius:6},B:{stroke:"",sw:0,radius:10,shadow:true},C:{fill:"#fff7ec",color:"$main"},G:{stroke:"",sw:0,radius:10,shadow:true},FB:{stroke:"",sw:0,radius:10},NL:{color:"$ink"}}},
 {k:"sunset",deco:[["blob", 0.92, 0.05, 0.17, "#ffffff", 0.35], ["blob", 0.08, 0.96, 0.22, "#ffffff", 0.3], ["flank", "☀️", "✨", 56]],n:"선셋 그라데이션",d:"주황→노랑 그라데이션, 둥근 그림자 카드",pal:{bg:"#ffb25b",main:"#e8590c",sub:"#fff1dc",accent:"#c2255c",ink:"#3a1f10"},bgx:{type:"grad",c1:"#ff8a3d",c2:"#ffe08a",dir:"b"},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"#ffffff",tline:5,tlc:"#c2410c"},ST:{color:"#ffffff"},L:{fill:"#ffffff"},H:{radius:999,shadow:true},B:{stroke:"",sw:0,radius:18,shadow:true},C:{fill:"$sub",color:"$accent"},G:{stroke:"",sw:0,radius:18,shadow:true},FB:{stroke:"",sw:0,radius:18}}},
 {k:"retro",deco:[["mark", "$sub", 1], ["pix", "tl", "$ink", 1], ["pix", "br", "$main", 1]],n:"레트로 굵은 선",d:"크림 바탕, 까만 굵은 테두리, 노란 소제목",pal:{bg:"#fdf3e7",main:"#e4572e",sub:"#f9d56e",accent:"#3a86ff",ink:"#1f1f1f"},frame:8,frameC:"#1f1f1f",
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$ink"},H:{fill:"$sub",color:"$ink",stroke:"$ink",sw:3,radius:8},B:{stroke:"$ink",sw:3,radius:10},C:{fill:"#8fd6b0",color:"$ink",stroke:"$ink",sw:2},G:{stroke:"$ink",sw:3,radius:10},FB:{stroke:"$ink",sw:3,radius:10},TM:{stroke:"$ink",color:"$ink"},L:{fill:"$ink"}}},
 {k:"yb",deco:[["ring", 1.0, 0.0, 0.17, "#ffffff", 10, 0.8], ["ring", 0.0, 1.0, 0.15, "$main", 8, 0.35], ["flank", "⭐", "⭐", 56]],n:"옐로 블루 팝",d:"노란 땡땡이 배경, 파란 소제목, 테두리 제목",pal:{bg:"#ffe45c",main:"#2f5bd3",sub:"#fff7c2",accent:"#ff5d8f",ink:"#1d2a5c"},bgx:{type:"pat",pat:"dots",color:"#ffffff",a:0.45,size:34},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$main",tline:5,tlc:"#ffffff"},H:{radius:10},B:{stroke:"$main",sw:3,radius:16},C:{fill:"$main",color:"#ffe45c"},G:{stroke:"$main",sw:3,radius:16},FB:{stroke:"$main",sw:3,radius:16}}},
 {k:"note",deco:[["tape", "#fff3b0", 0.9, -1.2], ["flank", null, "✏️", 56]],n:"모눈 노트",d:"모눈종이, 손글씨 제목, 파란 펜 느낌",pal:{bg:"#fffef8",main:"#2b6cb0",sub:"#e8f1fb",accent:"#e53e3e",ink:"#1f2933"},bgx:{type:"pat",pat:"grid",color:"#7fb2e5",a:0.35,size:28},frame:0,
  f:{T:"Nanum Pen Script",H:"Gaegu",B:"Gowun Dodum"},s:{T:{color:"$main"},H:{fill:"",color:"$main",bold:true,stroke:"",radius:0},B:{fill:"#ffffffcc",stroke:"$main",sw:1,radius:6},C:{fill:"#fff3b0",color:"$accent",bold:true},G:{stroke:"$main",sw:1,radius:6},FB:{stroke:"$main",sw:1,radius:6}}},
 /* 11~20: 미리캔버스 설문·통계·과학 포스터 스타일 참고 */
 {k:"qblue",deco:[["blob", 1.0, 0.0, 0.24, "#ffffff", 0.12], ["blob", 0.0, 1.0, 0.26, "#ffffff", 0.1], ["flank", "📊", "✨", 62]],n:"설문 블루 인포",d:"파란 바탕, 하얀 둥근 카드, 분홍 알약 소제목",pal:{bg:"#2563d9",main:"#2563d9",sub:"#ffe1e8",accent:"#f0587d",ink:"#1d2a4a"},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"#ffffff",tline:6,tlc:"#0f2f7a",tshadow:true},ST:{color:"#ffffff"},L:{fill:"#ffffff"},TM:{fill:"#ffffff",stroke:"",sw:0,color:"$main"},H:{fill:"$accent",radius:999},B:{stroke:"",sw:0,radius:24,shadow:true},C:{fill:"$sub",color:"$accent"},G:{stroke:"",sw:0,radius:24,shadow:true},FB:{stroke:"",sw:0,radius:24},NL:{color:"#ffffff"}}},
 {k:"calendar",deco:[["pix", "tl", "$accent", 1], ["pix", "br", "$main", 0.9], ["flank", "📅", "✨", 58]],n:"오렌지 네이비 달력",d:"노란 바탕, 남색 굵은 글씨, 주황 소제목",pal:{bg:"#ffc531",main:"#1f2f63",sub:"#fff3d6",accent:"#f26b1d",ink:"#1f2f63"},bgx:{type:"pat",pat:"waves",color:"#f26b1d",a:0.16,size:56},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$main"},H:{fill:"$accent",radius:999},B:{stroke:"$main",sw:3,radius:16},C:{fill:"$main",color:"#ffc531"},G:{stroke:"$main",sw:3,radius:16},FB:{stroke:"$main",sw:3,radius:16},TM:{fill:"$main",stroke:"",color:"#ffffff"}}},
 {k:"infomap",deco:[["mark", "$sub", 0.95], ["dots", "tr", "$main", 0.45], ["dots", "bl", "$main", 0.3], ["flank", "📍", null, 56]],n:"인포그래픽 지도형",d:"하얀 바탕, 검은 테두리 카드, 파랑·노랑 라벨",pal:{bg:"#ffffff",main:"#2f6fd6",sub:"#f7d046",accent:"#f7d046",ink:"#222222"},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$main"},H:{fill:"$sub",color:"$ink",stroke:"$ink",sw:2,radius:6},B:{stroke:"$ink",sw:2,radius:18},C:{fill:"$main",color:"#ffffff"},G:{stroke:"$ink",sw:2,radius:18},FB:{stroke:"$ink",sw:2,radius:18},TM:{stroke:"$ink",color:"$ink"},L:{fill:"$ink"}}},
 {k:"bluegrid",deco:[["ring", 0.0, 0.0, 0.16, "#ffffff", 9, 0.7], ["blob", 1.0, 1.0, 0.2, "$sub", 0.25], ["flank", "👍", "⭐", 62]],n:"블루 모눈 팝",d:"파란 모눈 바탕, 까만 테두리 하얀 카드",pal:{bg:"#2f6ef0",main:"#2f6ef0",sub:"#ffe14d",accent:"#ffe14d",ink:"#141414"},bgx:{type:"pat",pat:"grid",color:"#ffffff",a:0.18,size:32},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"#ffffff",tline:6,tlc:"#141414",tshadow:true},ST:{color:"#ffffff"},L:{fill:"#ffffff"},TM:{fill:"$sub",stroke:"$ink",color:"$ink"},H:{fill:"#ffffff",color:"$main",stroke:"$ink",sw:3,radius:999},B:{stroke:"$ink",sw:3,radius:14},C:{fill:"$sub",color:"$ink",stroke:"$ink",sw:2},G:{stroke:"$ink",sw:3,radius:14},FB:{stroke:"$ink",sw:3,radius:14},NL:{color:"#ffffff"}}},
 {k:"report",deco:[["band", "top", 10, "$accent"], ["flank", "🔬", "🧪", 54]],n:"탐구 보고서 표형",d:"하얀 바탕, 검은 칸막이 표, 노란 칸",pal:{bg:"#ffffff",main:"#1f1f1f",sub:"#ffe9a8",accent:"#f5a524",ink:"#1f1f1f"},frame:6,frameC:"#1f1f1f",
  f:{T:"Black Han Sans",H:"Noto Sans KR",B:"Noto Sans KR"},s:{T:{color:"$ink"},H:{fill:"$main",color:"#ffffff",radius:0,bold:true},B:{stroke:"$ink",sw:2,radius:0},C:{fill:"$sub",color:"$ink"},G:{stroke:"$ink",sw:2,radius:0},FB:{stroke:"$ink",sw:2,radius:0},TM:{fill:"$sub",stroke:"$ink",radius:0,color:"$ink"},L:{fill:"$accent"}}},
 {k:"yellowline",deco:[["dots", "tl", "$ink", 0.22], ["dots", "br", "$ink", 0.22], ["stars", "$ink"]],n:"흑백 라인 옐로",d:"크림 바탕, 노란 제목, 까만 선 카드",pal:{bg:"#fbfaf3",main:"#1f1f1f",sub:"#ffd65a",accent:"#ffd65a",ink:"#1f1f1f"},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$sub",tline:5,tlc:"#1f1f1f",tshadow:true},H:{fill:"$sub",color:"$ink",radius:999},B:{stroke:"$ink",sw:2,radius:18},C:{fill:"$ink",color:"$sub"},G:{stroke:"$ink",sw:2,radius:18},FB:{stroke:"$ink",sw:2,radius:18},TM:{fill:"$ink",stroke:"",color:"#ffffff"},L:{fill:"$ink"}}},
 {k:"glass",deco:[["blob", 0.86, 0.05, 0.2, "#ffffff", 0.65], ["blob", 0.08, 0.92, 0.22, "$main", 0.12], ["flank", "📢", null, 62]],n:"민트 유리 카드",d:"민트→하늘 그라데이션, 반투명 하얀 카드",pal:{bg:"#d4f5e4",main:"#2b7fff",sub:"#eaf3ff",accent:"#22b45e",ink:"#16233b"},bgx:{type:"grad",c1:"#c4f3d9",c2:"#d9e8ff",dir:"b"},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$ink"},H:{fill:"$accent",radius:999},B:{fill:"#ffffffcc",stroke:"#ffffff",sw:2,radius:22,shadow:true},C:{fill:"$main",color:"#ffffff"},G:{fill:"#ffffffdd",stroke:"#ffffff",sw:2,radius:22,shadow:true},FB:{fill:"#ffffffcc",stroke:"#ffffff",sw:2,radius:22},TM:{fill:"$accent",stroke:"",color:"#ffffff"}}},
 {k:"sky",deco:[["blob", 0.07, 0.04, 0.12, "#ffffff", 0.75], ["blob", 0.94, 0.09, 0.09, "#ffffff", 0.75], ["flank", "💬", "😊", 58]],n:"하늘 말풍선",d:"하늘색 그라데이션, 노란 테두리 제목",pal:{bg:"#9ad4ff",main:"#1f6fd1",sub:"#dff0ff",accent:"#ffd84d",ink:"#1d2a5c"},bgx:{type:"grad",c1:"#86cbff",c2:"#eef8ff",dir:"b"},frame:0,
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Gowun Dodum"},s:{T:{color:"$accent",tline:7,tlc:"#1d2a5c",tshadow:true},H:{radius:6},B:{stroke:"$ink",sw:3,radius:20},C:{fill:"$accent",color:"$ink"},G:{stroke:"$ink",sw:3,radius:20},FB:{stroke:"$ink",sw:3,radius:20},TM:{fill:"#ffffff",stroke:"$ink",color:"$ink"}}},
 {k:"earth",deco:[["stars", "$main"], ["flank", null, "🌏", 58]],n:"지구 아치 민트",d:"연민트 모눈, 갈색 굵은 틀, 둥근 카드",pal:{bg:"#dff3f1",main:"#4a3b33",sub:"#ffffff",accent:"#4fb86b",ink:"#3b2f2a"},bgx:{type:"pat",pat:"grid",color:"#8fc7bf",a:0.3,size:40},frame:10,frameC:"#4a3b33",
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Gowun Dodum"},s:{T:{color:"$main"},H:{fill:"$main",color:"#dff3f1",radius:0},B:{stroke:"$main",sw:3,radius:24},C:{fill:"$accent",color:"#ffffff"},G:{stroke:"$main",sw:3,radius:24},FB:{stroke:"$main",sw:3,radius:24},TM:{fill:"$main",stroke:"",color:"#ffffff"}}},
 {k:"green",deco:[["blob", 1.0, 0.32, 0.11, "$sub", 0.6], ["blob", 0.0, 0.7, 0.09, "$sub", 0.5], ["flank", "❗", "⭐", 58]],n:"그린 굵은 팝",d:"초록 테두리, 까만 그림자 제목, 분홍 포인트",pal:{bg:"#eaf6ee",main:"#22b04f",sub:"#ffc2cd",accent:"#ff7a93",ink:"#141414"},frame:16,frameC:"#22b04f",
  f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{T:{color:"$main",tline:6,tlc:"#141414",tshadow:true},H:{fill:"$main",stroke:"$ink",sw:2,radius:999},B:{stroke:"$ink",sw:3,radius:18},C:{fill:"$sub",color:"$ink"},G:{stroke:"$ink",sw:3,radius:18},FB:{stroke:"$ink",sw:3,radius:18},TM:{fill:"$main",stroke:"$ink",color:"#ffffff"},L:{fill:"$ink"}}}
];
/* ---------- 디자인 장식 (미리캔버스·캔바처럼 배경 도형·형광펜·스티커) ----------
   ZD 표시가 붙은 요소는 디자인을 바꿀 때 지우고 새로 깔아요. 학생이 지워도 돼요. */
let _mc=null; const measureCtx=()=>_mc||(_mc=document.createElement("canvas").getContext("2d"));
function titleBox(items){ const T=items.find(it=>it.tag==="T"||it.tag==="TB"||it.tag==="CT")||items.find(it=>it.tag==="STT"); if(!T||!T.text) return null;
  const c=measureCtx(); c.font=fontStr(T.bold,T.size,T.font); const p=T.pad||0, ls=wrapLines(c,T.text,T.w-2*p), tw=Math.min(T.w-2*p,Math.max(...ls.map(l=>c.measureText(l).width),10)), th0=ls.length*T.size*1.25;
  const x0=T.align==="center"?T.x+(T.w-tw)/2:T.align==="right"?T.x+T.w-p-tw:T.x+p, y0=T.valign==="top"?T.y+p:T.y+(T.h-th0)/2;
  return {T,x0,y0,tw,th:th0,cy:y0+th0/2}; }
function decoItems(rec,items,P){
  const back=[], front=[], rv=v=>typeof v==="string"&&v[0]==="$"?P[v.slice(1)]:v, tb=titleBox(items), U=Math.min(W,H)/1000, M=Math.round(24*U+8);
  const sh=(o,b)=>(b===false?front:back).push(mk("shape",Object.assign({tag:"ZD",radius:0,stroke:"",sw:0},o)));
  const corner=(c,w,h)=>({x:c[1]==="l"?M:W-M-w,y:c[0]==="t"?M:H-M-h});
  (rec||[]).forEach(r=>{ const k=r[0];
    if(k==="blob"){ const R=r[3]*W; sh({shape:"ellipse",x:r4(r[1]*W-R),y:r4(r[2]*H-R),w:r4(2*R),h:r4(2*R),fill:rv(r[4]),op:r[5]==null?1:r[5]}); }
    if(k==="ring"){ const R=r[3]*W; sh({shape:"ellipse",x:r4(r[1]*W-R),y:r4(r[2]*H-R),w:r4(2*R),h:r4(2*R),fill:"",stroke:rv(r[4]),sw:Math.round((r[5]||6)*U*1.4),op:r[6]==null?1:r[6]}); }
    if(k==="half"){ const R=r[3]*W, cx=r[1][1]==="l"?0:W, cy=r[1][0]==="t"?0:H; sh({shape:"ellipse",x:r4(cx-R),y:r4(cy-R),w:r4(2*R),h:r4(2*R),fill:rv(r[2]),op:r[4]==null?1:r[4]}); }
    if(k==="band"){ const h=Math.round(r[2]*U*1.2); sh({shape:"rect",x:0,y:r[1]==="top"?0:H-h,w:W,h,fill:rv(r[3]),op:r[4]==null?1:r[4]}); }
    if(k==="dots"){ const g=Math.round(18*U+6), n=5, w=g*(n-1), o=corner(r[1],w,w); for(let i=0;i<n;i++) for(let j=0;j<n;j++){ const d=Math.round(5*U+2); sh({shape:"ellipse",x:o.x+i*g-d/2,y:o.y+j*g-d/2,w:d,h:d,fill:rv(r[2]),op:r[3]==null?0.5:r[3]}); } }
    if(k==="pix"){ const g=Math.round(26*U+6), o=corner(r[1],g*3,g*3), pat=r[1]==="tl"||r[1]==="br"?[[0,0],[1,1],[2,0],[0,2],[2,2]]:[[2,0],[1,1],[0,0],[2,2],[0,2]];
      pat.forEach(([a,b],i)=>i<4&&sh({shape:"rect",x:o.x+a*g,y:o.y+b*g,w:g,h:g,fill:rv(r[2]),op:r[3]==null?1:r[3]})); }
    if(k==="wave"){ sh({shape:"wave",x:M,y:r4(r[1]*H),w:W-2*M,h:Math.round(18*U+6),fill:rv(r[2]),lw:Math.round(4*U+1),op:r[3]==null?0.6:r[3]}); }
    if(!tb) return; const T=tb.T, room=(T.w-tb.tw)/2;
    if(k==="mark"){ const hh=Math.round(T.size*0.42); sh({shape:"round",x:r4(tb.x0-T.size*0.18),y:r4(tb.y0+tb.th-hh-T.size*0.12),w:r4(tb.tw+T.size*0.36),h:hh,fill:rv(r[1]),radius:6,op:r[2]==null?0.9:r[2]}); }
    if(k==="tape"){ sh({shape:"tape",x:r4(tb.x0-T.size*0.6),y:r4(tb.y0-T.size*0.18),w:r4(tb.tw+T.size*1.2),h:r4(tb.th+T.size*0.36),fill:rv(r[1]),op:r[2]==null?0.9:r[2],rot:r[3]||-1.5}); }
    if(k==="flank"&&T.fill&&T.tag==="STT") return; // 알약 제목 안에는 스티커를 넣지 않아요
    if(k==="flank"){ const z=Math.round((r[3]||56)*(SL()?0.85:1)); if(T.align!=="center"){ if(r[2]&&T.x+T.w-(tb.x0+tb.tw)>z+16) front.push(mk("sticker",{tag:"ZD",emoji:r[2],x:r4(tb.x0+tb.tw+12),y:r4(tb.cy-z/2-z*0.25),w:z,h:z,rot:12})); return; }
      if(room<z+18) return; if(r[1]) front.push(mk("sticker",{tag:"ZD",emoji:r[1],x:r4(tb.x0-z-12),y:r4(tb.cy-z/2-z*0.2),w:z,h:z,rot:-12}));
      if(r[2]) front.push(mk("sticker",{tag:"ZD",emoji:r[2],x:r4(tb.x0+tb.tw+12),y:r4(tb.cy-z/2-z*0.2),w:z,h:z,rot:12})); }
    if(k==="stars"){ if(room<70) return; const c=rv(r[1]), z=Math.round(22*U+10); [[-1,-0.7,1],[-1.6,0.5,0.7],[1,-0.6,0.8],[1.5,0.6,1]].forEach(([sx,sy,f])=>sh({shape:"star",x:r4((sx<0?tb.x0-z*1.2:tb.x0+tb.tw+z*0.2)+(Math.abs(sx)-1)*z*(sx<0?-1:1)),y:r4(tb.cy+sy*z-z*f/2),w:r4(z*f),h:r4(z*f),fill:c},false)); }
  });
  return {back,front}; }
function putDeco(page,rec,P){ page.items=page.items.filter(it=>it.tag!=="ZD"); if(!rec||!rec.length) return;
  const d=decoItems(rec,page.items,P); let at=0; if(SL()) while(at<page.items.length&&page.items[at].tag==="DEC"&&page.items[at].type==="shape") at++;
  page.items.splice(at,0,...d.back); page.items.push(...d.front); }
const DZ_BASE={T:{fill:"",tline:0,tshadow:false,color:"$main"},ST:{color:"$ink"},L:{fill:"$main"},TM:{color:"$main",fill:"#ffffff",stroke:"$main",sw:2,radius:999},
  H:{color:"#ffffff",fill:"$main",stroke:"",sw:0,radius:8,shadow:false,bold:false},B:{fill:"#ffffff",stroke:"$sub",sw:2,radius:10,color:"$ink",shadow:false},
  C:{fill:"$sub",color:"$main",stroke:"",sw:0,bold:true},G:{fill:"#ffffff",stroke:"$sub",sw:2,radius:10,shadow:false},FB:{fill:"#ffffff",stroke:"$sub",sw:2,radius:10,shadow:false},
  FC:{},FN:{color:"#ffffff"},FT:{color:"$ink"},FA:{fill:"$sub"},N:{color:"$accent"},NL:{color:"$ink"},BAND:{fill:"$main"},TB:{color:"#ffffff"},STB:{color:"#ffffff"},I:{}};
function tagOf(it){ if(it.tag) return it.tag;
  if(it.type==="chart") return "G"; if(it.type==="image") return "I";
  if(it.type==="shape") return it.shape==="arrow"?"FA":LINES.includes(it.shape)?"L":it.shape==="ellipse"&&it.w<=80?"FC":"";
  if(it.type==="text"){ if(it.role==="title") return it.size>=40?"T":"H"; if(it.fill&&it.bold&&it.valign==="middle"&&!it.sw) return "C"; if(it.fill) return "B"; }
  return ""; }
function applyDesign(i,quiet){
  const z=DZ[i]; if(!z) return; if(!quiet) snap();
  D.pal=Object.assign({name:z.n},z.pal); D.dz=i; const P=z.pal, rv=v=>typeof v==="string"&&v[0]==="$"?P[v.slice(1)]:v;
  S.bg=z.pal.bg; if(z.bgx) S.bgx=JSON.parse(JSON.stringify(z.bgx)); else delete S.bgx; if(!SL()){ S.frame=z.frame||0; S.frameC=z.frameC||P.main; }
  S.items.forEach(it=>{ const tg=tagOf(it); if(!tg) return; const st=Object.assign({},DZ_BASE[tg]||{},z.s[tg]||{});
    if(tg==="FC") st.fill=it.alt?P.accent:P.main;
    for(const [k,v] of Object.entries(st)){ if(k==="size"){ continue; } it[k]=rv(v); }
    if(it.type==="text"){ const f=tg==="T"||tg==="TB"||tg==="N"?z.f.T:tg==="H"?z.f.H:["B","C","ST","STB","TM","FT","NL"].includes(tg)?z.f.B:null; if(f) it.font=f; }
    if(it.type==="chart"&&it.chart){ it.chart.color=P.main; } });
  putDeco(S,z.deco,P);
  if(!quiet){ render(); save(); if(O.status) O.status("추천 디자인 ‘"+z.n+"’을 입혔어요. 배치와 쓴 내용은 그대로예요. (↶ 되돌리기로 돌아갈 수 있어요)"); }
}
function dzPop(){
  return '<span class="pdd"><button type="button" data-pop="dz" class="pfancy">🎨 추천 디자인 ▾</button><span class="ppop pdz ptplp" data-popbox="dz" hidden><b>배치·쓴 내용은 그대로, 색·배경·글꼴·꾸미기 장식이 바뀌어요</b><span class="pdzg">'+
    DZ.map((z,i)=>'<button type="button" data-dz="'+i+'"'+(D.dz===i?' class="on"':'')+'><canvas data-dzpv="'+i+'"></canvas><b>'+(i+1)+'. '+esc(z.n)+'</b><small>'+esc(z.d)+'</small></button>').join("")+'</span></span></span>'; }
function drawDzPreviews(){ const keepS=S, keepPal=D.pal, keepDz=D.dz;
  bar.querySelectorAll("[data-dzpv]").forEach(cv=>{ S=JSON.parse(JSON.stringify(keepS)); delete S.slides; applyDesign(+cv.dataset.dzpv,true); pvCanvas(cv,S,120); });
  S=keepS; if(keepPal) D.pal=keepPal; else delete D.pal; if(keepDz!=null) D.dz=keepDz; else delete D.dz; }

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
const textH=it=>it.bshape==="bubble"?it.h*0.8:it.h;
function drawText(ctx,it){
  const p=it.pad||0, mw=it.w-2*p, hh=textH(it); ctx.font=fontStr(it.bold,it.size,it.font); ctx.textBaseline="top";
  const lines=wrapLines(ctx,it.text,mw), lh=it.size*LH, total=lines.length*lh, k=ctxScale(ctx);
  let y=it.y+p+(it.valign==="middle"?(hh-2*p-total)/2:0);
  ctx.save(); ctx.beginPath(); ctx.rect(it.x-20,it.y-20,it.w+40,it.h+40); ctx.clip(); ctx.lineJoin="round";
  lines.forEach(l=>{ const lw=ctx.measureText(l).width; const x=it.align==="center"?it.x+(it.w-lw)/2:it.align==="right"?it.x+it.w-p-lw:it.x+p, yy=y+(lh-it.size)/2;
    if(it.tline>0){ if(it.tshadow){ ctx.shadowColor="rgba(0,0,0,.35)"; ctx.shadowBlur=6*k; ctx.shadowOffsetX=ctx.shadowOffsetY=3*k; } ctx.lineWidth=it.tline*2; ctx.strokeStyle=it.tlc||"#222222"; ctx.strokeText(l,x,yy); shadowOff(ctx); }
    else if(it.tshadow){ ctx.shadowColor="rgba(0,0,0,.35)"; ctx.shadowBlur=6*k; ctx.shadowOffsetX=ctx.shadowOffsetY=3*k; }
    ctx.fillStyle=it.color||"#222"; ctx.fillText(l,x,yy); shadowOff(ctx); y+=lh; });
  ctx.restore();
}
function ctxScale(ctx){ try{ const m=ctx.getTransform(); return Math.hypot(m.a,m.b)||1; }catch(e){ return 1; } }
let NOSHADOW=false; // 편집 화면에서는 CSS 그림자를 씀
function shadowOn(ctx,it){ if(!it.shadow||NOSHADOW) return; const k=ctxScale(ctx); ctx.shadowColor="rgba(0,0,0,.24)"; ctx.shadowBlur=18*k; ctx.shadowOffsetX=0; ctx.shadowOffsetY=6*k; }
function shadowOff(ctx){ ctx.shadowColor="rgba(0,0,0,0)"; ctx.shadowBlur=0; ctx.shadowOffsetX=ctx.shadowOffsetY=0; }
function drawBox(ctx,it,x,y,w,h){
  if(it.bshape){ drawShape(ctx,{shape:it.bshape,fill:it.fill,stroke:it.stroke,sw:it.sw,radius:it.radius,shadow:it.shadow},x,y,w,h); return; }
  const r=it.radius||0;
  if(it.fill){ rr(ctx,x,y,w,h,r); ctx.fillStyle=it.fill; shadowOn(ctx,it); ctx.fill(); shadowOff(ctx); }
  if(it.stroke&&it.sw){ ctx.lineWidth=it.sw; ctx.strokeStyle=it.stroke; rr(ctx,x+it.sw/2,y+it.sw/2,w-it.sw,h-it.sw,Math.max(0,r-it.sw/2)); ctx.stroke(); }
}
function shapePath(ctx,k,x,y,w,h,r){
  const cx=x+w/2, cy=y+h/2, poly=pts=>{ ctx.beginPath(); pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.closePath(); };
  if(k==="ellipse"){ ctx.beginPath(); ctx.ellipse(cx,cy,Math.max(1,w/2),Math.max(1,h/2),0,0,Math.PI*2); return; }
  if(k==="triangle") return poly([[cx,y],[x+w,y+h],[x,y+h]]);
  if(k==="diamond") return poly([[cx,y],[x+w,cy],[cx,y+h],[x,cy]]);
  if(k==="hexagon") return poly([[x+w*.25,y],[x+w*.75,y],[x+w,cy],[x+w*.75,y+h],[x+w*.25,y+h],[x,cy]]);
  if(k==="star"||k==="burst"){ const n=k==="star"?5:12, ir=k==="star"?0.45:0.78, pts=[]; for(let i=0;i<n*2;i++){ const a=-Math.PI/2+i*Math.PI/n, f=i%2?ir:1; pts.push([cx+Math.cos(a)*w/2*f,cy+Math.sin(a)*h/2*f]); } return poly(pts); }
  if(k==="heart"){ ctx.beginPath(); ctx.moveTo(cx,y+h*.28); ctx.bezierCurveTo(cx,y+h*.02,x,y-h*.02,x,y+h*.32); ctx.bezierCurveTo(x,y+h*.62,cx-w*.05,y+h*.78,cx,y+h); ctx.bezierCurveTo(cx+w*.05,y+h*.78,x+w,y+h*.62,x+w,y+h*.32); ctx.bezierCurveTo(x+w,y-h*.02,cx,y+h*.02,cx,y+h*.28); ctx.closePath(); return; }
  if(k==="ribbon"){ const n=Math.min(h*.35,w*.15); return poly([[x,y],[x+w,y],[x+w-n,cy],[x+w,y+h],[x,y+h],[x+n,cy]]); }
  if(k==="note"){ const f=Math.min(w,h)*.18; return poly([[x,y],[x+w,y],[x+w,y+h-f],[x+w-f,y+h],[x,y+h]]); }
  if(k==="tape"){ const z=Math.min(8,w*.05), n=Math.max(3,Math.round(h/12)), pts=[]; for(let i=0;i<=n;i++) pts.push([x+w-(i%2?z:0),y+h*i/n]); for(let i=n;i>=0;i--) pts.push([x+(i%2?z:0),y+h*i/n]); return poly(pts); }
  if(k==="bubble"){ const bh=h*.8, R=Math.max(0,Math.min(r==null?24:r,w/2,bh/2)), by=y+bh; ctx.beginPath(); ctx.moveTo(x+R,y); ctx.arcTo(x+w,y,x+w,by,R); ctx.arcTo(x+w,by,x,by,R); ctx.lineTo(x+w*.34,by); ctx.lineTo(x+w*.14,y+h); ctx.lineTo(x+w*.2,by); ctx.arcTo(x,by,x,y,R); ctx.arcTo(x,y,x+w,y,R); ctx.closePath(); return; }
  rr(ctx,x,y,w,h,k==="rect"?0:(r==null?24:r));
}
function drawShape(ctx,it,x,y,w,h){
  const k=it.shape||"round", sw=it.sw||0;
  if(LINES.includes(k)){ const lw=k==="wave"?Math.max(2,it.lw||6):Math.max(2,h); ctx.strokeStyle=it.fill||it.stroke||"#333"; ctx.lineWidth=lw; ctx.lineCap=k==="dot"||k==="wave"?"round":"butt"; ctx.lineJoin="round";
    ctx.setLineDash(k==="dash"?[lw*3,lw*2]:k==="dot"?[0.1,lw*2]:[]); ctx.beginPath(); const my=y+h/2;
    if(k==="wave"){ const amp=Math.max(2,h/2-lw/2), per=Math.max(24,h*2.4); let px=x+lw/2; ctx.moveTo(px,my); for(let i=0;px<x+w-lw/2-0.5;i++){ const nx=Math.min(x+w-lw/2,px+per/2); ctx.quadraticCurveTo((px+nx)/2,my+(i%2?1:-1)*amp*2,nx,my); px=nx; } }
    else{ ctx.moveTo(x+(k==="dot"?lw/2:0),my); ctx.lineTo(x+w-(k==="dot"?lw/2:0),my); }
    ctx.stroke(); ctx.setLineDash([]); ctx.lineCap="butt"; return; }
  ctx.fillStyle=it.fill||"transparent"; ctx.strokeStyle=it.stroke||"transparent"; ctx.lineWidth=sw;
  if(k!=="arrow"){
    shapePath(ctx,k,x+sw/2,y+sw/2,Math.max(1,w-sw),Math.max(1,h-sw),k==="rect"?0:it.radius);
    if(it.fill){ shadowOn(ctx,it); ctx.fill(); shadowOff(ctx);
      if(k==="note"){ const f=Math.min(w-sw,h-sw)*.18, X=x+w-sw/2, Y=y+h-sw/2; ctx.beginPath(); ctx.moveTo(X,Y-f); ctx.lineTo(X-f,Y-f); ctx.lineTo(X-f,Y); ctx.closePath(); ctx.fillStyle="rgba(0,0,0,.13)"; ctx.fill(); } }
    if(it.stroke&&sw){ shapePath(ctx,k,x+sw/2,y+sw/2,Math.max(1,w-sw),Math.max(1,h-sw),k==="rect"?0:it.radius); ctx.lineWidth=sw; ctx.strokeStyle=it.stroke; ctx.stroke(); }
    return; }
  if(it.shape==="arrow"){ const sh=h*0.42, hx=x+w-Math.min(w*0.4,h); ctx.beginPath(); ctx.moveTo(x,y+(h-sh)/2); ctx.lineTo(hx,y+(h-sh)/2); ctx.lineTo(hx,y); ctx.lineTo(x+w,y+h/2); ctx.lineTo(hx,y+h); ctx.lineTo(hx,y+(h+sh)/2); ctx.lineTo(x,y+(h+sh)/2); ctx.closePath(); if(it.fill){ shadowOn(ctx,it); ctx.fill(); shadowOff(ctx); } if(it.stroke&&it.sw) ctx.stroke(); return; }
}
/* 배경: 단색 · 그라데이션 · 무늬 · 사진 */
function drawBg(ctx,P,w,h){
  w=w||W; h=h||H; ctx.fillStyle=P.bg||"#ffffff"; ctx.fillRect(0,0,w,h); const b=P.bgx; if(!b) return;
  if(b.type==="grad"){ const g=b.dir==="r"?ctx.createLinearGradient(0,0,w,0):b.dir==="d"?ctx.createLinearGradient(0,0,w,h):b.dir==="c"?ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.hypot(w,h)/2):ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,b.c1); g.addColorStop(1,b.c2); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); return; }
  if(b.type==="pat"){ ctx.save(); ctx.globalAlpha=b.a||0.2; ctx.fillStyle=ctx.strokeStyle=b.color||"#333"; const g=b.size||36;
    if(b.pat==="dots") for(let y=g/2;y<h;y+=g) for(let x=((y/g|0)%2?g:g/2);x<w;x+=g){ ctx.beginPath(); ctx.arc(x,y,g*.1,0,Math.PI*2); ctx.fill(); }
    if(b.pat==="grid"){ ctx.lineWidth=1.5; ctx.beginPath(); for(let x=g;x<w;x+=g){ ctx.moveTo(x,0); ctx.lineTo(x,h); } for(let y=g;y<h;y+=g){ ctx.moveTo(0,y); ctx.lineTo(w,y); } ctx.stroke(); }
    if(b.pat==="stripes"){ ctx.lineWidth=g*.28; ctx.beginPath(); for(let x=-h;x<w;x+=g){ ctx.moveTo(x,h); ctx.lineTo(x+h,0); } ctx.stroke(); }
    if(b.pat==="check") for(let y=0;y<h;y+=g) for(let x=((y/g|0)%2?g:0);x<w;x+=g*2) ctx.fillRect(x,y,g,g);
    if(b.pat==="waves"){ ctx.lineWidth=2.5; for(let y=g/2;y<h;y+=g){ ctx.beginPath(); ctx.moveTo(0,y); for(let x=0;x<w;x+=g) ctx.quadraticCurveTo(x+g/4,y-g*.22,x+g/2,y), ctx.quadraticCurveTo(x+g*.75,y+g*.22,x+g,y); ctx.stroke(); } }
    if(b.pat==="confetti"){ let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647; ctx.globalAlpha=Math.min(1,(b.a||0.2)*2);
      const n=Math.round(w*h/(g*g*1.6)); for(let i=0;i<n;i++){ const x=rnd()*w, y=rnd()*h, c=PAL[i%PAL.length], t=rnd(); ctx.fillStyle=c; ctx.save(); ctx.translate(x,y); ctx.rotate(rnd()*Math.PI);
        if(t<.4) ctx.fillRect(-g*.2,-g*.07,g*.4,g*.14); else if(t<.75){ ctx.beginPath(); ctx.arc(0,0,g*.1,0,Math.PI*2); ctx.fill(); } else { ctx.beginPath(); ctx.moveTo(0,-g*.1); ctx.lineTo(g*.09,g*.07); ctx.lineTo(-g*.09,g*.07); ctx.closePath(); ctx.fill(); } ctx.restore(); } }
    ctx.restore(); return; }
  if(b.type==="img"){ const im=IMG.get(b.src); if(im){ const iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height, k=Math.max(w/iw,h/ih); ctx.drawImage(im,(w-iw*k)/2,(h-ih*k)/2,iw*k,ih*k); }
    if(b.dim) { ctx.fillStyle=b.dim>0?"rgba(0,0,0,"+b.dim+")":"rgba(255,255,255,"+(-b.dim)+")"; ctx.fillRect(0,0,w,h); } }
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
function paintCanvas(cv,it,kind){ // 편집 화면용 작은 캔버스 (그림자는 CSS로)
  const dpr=Math.min(2,(window.devicePixelRatio||1)*Math.max(scale,0.5)); cv.width=Math.max(1,Math.round(it.w*dpr)); cv.height=Math.max(1,Math.round(it.h*dpr));
  const ctx=cv.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,it.w,it.h); NOSHADOW=true;
  try{ if(kind==="chart"){ drawBox(ctx,it,0,0,it.w,it.h); drawChart(ctx,it,0,0,it.w,it.h); }
    else if(kind==="tbox") drawShape(ctx,{shape:it.bshape,fill:it.fill,stroke:it.stroke,sw:it.sw,radius:it.radius},0,0,it.w,it.h);
    else drawShape(ctx,it,0,0,it.w,it.h); } finally{ NOSHADOW=false; }
}

/* ---------- 화면 그리기 ---------- */
const SHADOW_CSS="0 6px 18px rgba(0,0,0,.24)", DROP_CSS="drop-shadow(0 6px 9px rgba(0,0,0,.24))";
function tShadowCss(it){ const a=[]; if(it.tline>0){ const w=it.tline, c=it.tlc||"#222222"; for(let i=0;i<16;i++){ const g=i*Math.PI/8; a.push((Math.cos(g)*w).toFixed(1)+"px "+(Math.sin(g)*w).toFixed(1)+"px 0 "+c); } }
  if(it.tshadow) a.push("3px 3px 6px rgba(0,0,0,.35)"); return a.join(","); }
function place(d,it){ d.style.left=it.x+"px"; d.style.top=it.y+"px"; d.style.width=it.w+"px"; d.style.height=it.h+"px"; d.style.transform=it.rot?"rotate("+it.rot+"deg)":""; d.style.opacity=it.op!=null&&it.op<1?String(it.op):""; }
function elFor(it){
  const d=document.createElement("div"); d.className="pi pi-"+it.type+(sel===it.id?" on":""); d.dataset.id=it.id; place(d,it);
  if(it.type==="text"){
    if(it.bshape){ const cv=document.createElement("canvas"); cv.className="ptbg"; if(it.shadow) cv.style.filter=DROP_CSS; d.appendChild(cv); paintCanvas(cv,it,"tbox"); }
    else{ d.style.background=it.fill||"transparent"; d.style.borderRadius=(it.radius||0)+"px"; d.style.border=it.stroke&&it.sw?it.sw+"px solid "+it.stroke:"0"; if(it.shadow&&it.fill) d.style.boxShadow=SHADOW_CSS; }
    const t=document.createElement("div"); t.className="pt"; t.textContent=it.text;
    Object.assign(t.style,{fontFamily:'"'+it.font+'", "Noto Sans KR", sans-serif',fontSize:it.size+"px",fontWeight:it.bold?"700":"400",color:it.color,textAlign:it.align,lineHeight:String(LH),padding:Math.max(0,(it.pad||0)-(!it.bshape&&it.stroke&&it.sw?it.sw:0))+"px",justifyContent:it.valign==="middle"?"center":"flex-start",textShadow:tShadowCss(it),height:it.bshape==="bubble"?"80%":"100%"});
    if(sel===it.id){ try{ t.contentEditable="plaintext-only"; }catch(e){ t.contentEditable="true"; } t.spellcheck=false; }
    t.addEventListener("input",()=>{ if(!typed){ snap(); typed=true; } it.text=t.innerText.replace(/\n$/,""); save(); });
    t.addEventListener("paste",e=>{ e.preventDefault(); const s=(e.clipboardData||window.clipboardData).getData("text"); document.execCommand("insertText",false,s); });
    d.appendChild(t);
  } else if(it.type==="image"){
    d.style.borderRadius=(it.radius||0)+"px"; d.style.border=it.stroke&&it.sw?it.sw+"px solid "+it.stroke:"0"; d.style.overflow="hidden"; if(it.shadow) d.style.boxShadow=SHADOW_CSS;
    if(it.src){ const im=document.createElement("img"); im.src=it.src; im.alt=""; im.draggable=false; im.style.objectFit=it.fit||"cover"; d.appendChild(im); }
    else d.innerHTML='<div class="pimg-empty">'+(sel===it.id?'🖼 여기를 한 번 더 누르면<br>사진을 골라요':'🖼 사진 넣는 자리<br><small>눌러서 사진 넣기</small>')+'</div>';
  } else if(it.type==="sticker"){
    const s=document.createElement("div"); s.className="pst"; s.textContent=it.emoji; s.style.fontSize=Math.min(it.w,it.h)*0.8+"px"; if(it.shadow) s.style.filter=DROP_CSS; d.appendChild(s);
  } else { const cv=document.createElement("canvas"); if(it.shadow) cv.style.filter=DROP_CSS; d.appendChild(cv); paintCanvas(cv,it,it.type); }
  if(sel===it.id){ d.insertAdjacentHTML("beforeend",'<button type="button" class="hm" title="옮기기" aria-label="옮기기">✥</button><span class="hr" title="크기 바꾸기"></span>'); }
  return d;
}
function upd(it){ const d=board.querySelector('[data-id="'+it.id+'"]'); if(!d) return; place(d,it);
  if(it.type==="chart"||it.type==="shape"){ const cv=d.querySelector("canvas"); if(cv) paintCanvas(cv,it,it.type); }
  if(it.type==="text"&&it.bshape){ const cv=d.querySelector(".ptbg"); if(cv) paintCanvas(cv,it,"tbox"); }
  if(it.type==="sticker"){ const s=d.querySelector(".pst"); if(s) s.style.fontSize=Math.min(it.w,it.h)*0.8+"px"; } }
function paintBg(){
  let cv=board.querySelector(".pbgc"); if(!S.bgx){ if(cv) cv.remove(); return; }
  if(!cv){ cv=document.createElement("canvas"); cv.className="pbgc"; board.insertBefore(cv,board.firstChild); }
  const k=Math.min(1,Math.max(0.35,(window.devicePixelRatio||1)*scale)); cv.width=Math.round(W*k); cv.height=Math.round(H*k);
  const ctx=cv.getContext("2d"); ctx.setTransform(k,0,0,k,0,0); drawBg(ctx,S);
  if(S.bgx.type==="img"&&S.bgx.src&&!IMG.has(S.bgx.src)) loadImgs([{type:"image",src:S.bgx.src}]).then(()=>{ if(board&&board.isConnected) paintBg(); });
}
function render(){
  board.style.background=S.bg; board.innerHTML="";
  S.items.forEach(it=>board.appendChild(elFor(it))); paintBg();
  if(S.frame){ const f=document.createElement("div"); f.className="pframe"; f.style.border=S.frame+"px solid "+(S.frameC||th().main); board.appendChild(f); }
  board.insertAdjacentHTML("beforeend",'<div class="pguide pgv" hidden></div><div class="pguide pgh" hidden></div>');
  if(!S.items.length) board.insertAdjacentHTML("beforeend",SL()?'<div class="pempty"><b>'+(D.cur+1)+'번 슬라이드</b><br>위에서 ‘✨ 추천 구성 만들기’를 누르면 발표 순서대로 슬라이드가 한 번에 생겨요.<br>제목·글 상자·사진을 하나씩 넣어도 돼요.</div>':'<div class="pempty"><b>B4 포스터 판</b><br>위에서 ‘✨ 추천 배치’를 고르거나<br>제목·글 상자·그래프를 하나씩 넣어 보세요.</div>');
  panel(); toolbarState();
}
function fit(){ const w=wrap.clientWidth||W; scale=w/W*zoom; sizer.style.width=Math.round(W*scale)+"px"; sizer.style.height=Math.round(H*scale)+"px"; board.style.transform="scale("+scale+")"; board.style.setProperty("--inv",(1/scale).toFixed(3)); wrap.style.height=zoom>1?Math.min(Math.round(H*scale),Math.round(window.innerHeight*0.75))+"px":Math.round(H*scale)+"px"; wrap.classList.toggle("zoomed",zoom>1); const z=bar&&bar.querySelector(".pzoom"); if(z) z.textContent=Math.round(zoom*100)+"%"; }

/* ---------- 꾸미기 재료 ---------- */
function textPresets(){ const t=th(), base={fill:"",stroke:"",sw:0,pad:8,bold:false,align:"center",valign:"middle",radius:12,color:t.ink};
  return [["big","큰 제목",{text:"큰 제목",font:"Black Han Sans",size:64,color:t.main,w:560,h:100}],
   ["outline","테두리 제목",{text:"테두리 제목",font:"Black Han Sans",size:60,color:"#ffffff",tline:5,tlc:t.ink,w:560,h:100}],
   ["shadow","그림자 제목",{text:"그림자 제목",font:"Do Hyeon",size:60,color:t.main,tshadow:true,w:560,h:100}],
   ["pill","알약 라벨",{text:"POINT",font:"Do Hyeon",size:26,color:"#ffffff",fill:t.main,radius:999,w:200,h:52}],
   ["bubble","말풍선",{text:"이런 점이 궁금했어요!",font:"Jua",size:24,fill:"#ffffff",stroke:t.ink,sw:3,bshape:"bubble",radius:28,w:340,h:150,pad:18}],
   ["ribbon","리본 배너",{text:"결론",font:"Do Hyeon",size:32,color:"#ffffff",fill:t.accent,bshape:"ribbon",w:340,h:72,pad:14}],
   ["burst","강조 배지",{text:"NEW!",font:"Black Han Sans",size:32,color:"#ffffff",fill:t.accent,bshape:"burst",w:170,h:170,pad:26}],
   ["note","손글씨 메모",{text:"메모\n꼭 기억할 점을 써요",font:"Gaegu",size:28,bold:true,color:"#3b2a1d",fill:"#fff3b0",bshape:"note",shadow:true,rot:-3,w:300,h:200,pad:24,align:"left",valign:"top"}],
   ["tape","테이프 제목",{text:"오늘의 발견",font:"Nanum Pen Script",size:42,fill:t.sub,bshape:"tape",w:300,h:66}],
   ["num","숫자 강조",{text:"87%",font:"Black Han Sans",size:96,color:t.accent,w:280,h:130,pad:0}],
   ["quote","인용 카드",{text:"“설문 결과, 3명 중 2명이 ~라고 답했어요.”",font:"Gowun Dodum",size:24,fill:"#ffffff",radius:16,shadow:true,w:440,h:140,pad:22,align:"left"}],
   ["hand","손글씨",{text:"손글씨처럼 써요",font:"Nanum Pen Script",size:46,w:400,h:80}]].map(([k,l,o])=>[k,l,Object.assign({},base,o)]); }
function presetCss(o){ return 'font-family:\''+o.font+'\',sans-serif;color:'+o.color+';'+(o.fill&&!o.bshape?'background:'+o.fill+';':'')+(o.bshape?'background:'+o.fill+';':'')+(o.radius>=999?'border-radius:999px;':'border-radius:6px;')+(o.stroke&&o.sw?'border:2px solid '+o.stroke+';':'')+'text-shadow:'+(tShadowCss(Object.assign({},o,{tline:o.tline?1.5:0}))||'none')+';'+(o.bold?'font-weight:700;':'')+(o.rot?'transform:rotate('+o.rot+'deg);':''); }
const SW=()=>{ const t=th(); return [t.main,t.sub,t.accent,t.ink,t.bg,"#ffffff","#000000","#555f61","#9aa5a7","#e5e9ea","#e4572e","#f28c28","#f9d56e","#fff3b0","#8fd6b0","#2f9e7e","#3a86ff","#a9c8ff","#1f3a68","#8f5bd6","#f78fb3","#fde3ef","#8a5a3b","#fdf3e7"]; };
function swatchPop(k,label,cur,noneLabel){ const id="c_"+k;
  return '<span class="pdd"><button type="button" data-pop="'+id+'" class="pcolor"><i style="background:'+(cur||"transparent")+'"></i>'+label+' ▾</button><span class="ppop pswatch" data-popbox="'+id+'" hidden><span class="pswg">'+
    [...new Set(SW())].map(c=>'<button type="button" data-sw="'+k+'" data-c="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>').join("")+'</span>'+
    (noneLabel?'<button type="button" data-sw="'+k+'" data-c="" class="pswnone">'+noneLabel+'</button>':'')+
    '<label class="pinl">직접 고르기 <input type="color" data-k="'+k+'" value="'+(/^#[0-9a-f]{6}$/i.test(cur)?cur:"#ffffff")+'"></label></span></span>'; }
function bgPresets(){ const t=th(); return {
  solid:[t.bg,"#ffffff",t.sub,"#fdf3e7","#fff8e1","#eef7f1","#eaf3ff","#f6efff","#fff0f5","#f1f1f1",t.main,t.ink,"#1f2a2c","#14142b"],
  grad:[[t.bg,t.sub,"b"],["#ffffff",t.sub,"c"],["#fdfbfb","#ebedee","b"],["#e0f7fa","#fce4ec","d"],["#fff1eb","#ace0f9","b"],["#f6d365","#fda085","d"],["#a1c4fd","#c2e9fb","b"],["#d4fc79","#96e6a1","d"],["#fbc2eb","#a6c1ee","r"],["#fddb92","#d1fdff","b"],["#1e3c72","#2a5298","d"],["#0f2027","#2c5364","b"]],
  pat:[["dots","땡땡이"],["grid","모눈"],["stripes","사선"],["check","체크"],["waves","물결"],["confetti","색종이"]] }; }
function gradCss(g){ return g[2]==="c"?"radial-gradient(circle,"+g[0]+","+g[1]+")":"linear-gradient("+(g[2]==="r"?"90deg":g[2]==="d"?"135deg":"180deg")+","+g[0]+","+g[1]+")"; }
function bgPop(){ const B=bgPresets();
  return '<span class="pdd"><button type="button" data-pop="bg">🎨 배경 ▾</button><span class="ppop pbgpop" data-popbox="bg" hidden>'+
    '<b>단색</b><span class="pswg">'+B.solid.map(c=>'<button type="button" data-bgs="'+c+'" style="background:'+c+'" aria-label="'+c+'"></button>').join("")+'</span>'+
    '<b>그라데이션</b><span class="pswg">'+B.grad.map((g,i)=>'<button type="button" data-bgg="'+i+'" style="background:'+gradCss(g)+'" aria-label="그라데이션 '+(i+1)+'"></button>').join("")+'</span>'+
    '<b>무늬</b><span class="pswg ppat">'+B.pat.map(([k,l])=>'<button type="button" data-bgp="'+k+'" title="'+l+'"><canvas data-patpv="'+k+'" width="96" height="64"></canvas><small>'+l+'</small></button>').join("")+'</span>'+
    '<b>사진 배경</b><span class="pbgrow"><button type="button" data-bgimg="1">🖼 사진 고르기</button><button type="button" data-bgdim="0.35">어둡게</button><button type="button" data-bgdim="-0.55">밝게</button><button type="button" data-bgdim="0">그대로</button></span>'+
    '<span class="pbgrow"><label class="pinl">직접 색 <input type="color" data-bg></label><button type="button" data-bgclear="1">배경 효과 없애기</button>'+(SL()?'<button type="button" data-bgall="1">모든 슬라이드에 같은 배경</button>':'')+'</span></span></span>'; }
function drawPreviews(){
  bar.querySelectorAll("[data-shpv]").forEach(cv=>{ const k=cv.dataset.shpv, t=th(), c=cv.getContext("2d"); cv.width=72; cv.height=48; c.clearRect(0,0,72,48);
    const L=LINES.includes(k), it={shape:k,fill:k==="note"?"#fff3b0":k==="tape"?t.sub:t.main,stroke:k==="note"||k==="tape"?"":"",sw:0,radius:10,lw:4};
    drawShape(c,it,L?6:14,L?(k==="wave"?14:20):6,L?60:44,L?(k==="wave"?20:6):36); });
  bar.querySelectorAll("[data-patpv]").forEach(cv=>{ const c=cv.getContext("2d"), k=cv.dataset.patpv; c.setTransform(96/320,0,0,96/320,0,0); drawBg(c,{bg:th().bg,bgx:{type:"pat",pat:k,color:th().main,a:0.3,size:36}},320,214); });
}

/* ---------- 도구 막대 ---------- */
function toolbar(){
  return '<div class="pbar">'+
   '<div class="prow"><span class="plab">넣기</span>'+
     '<button type="button" data-add="title">🔠 제목</button><button type="button" data-add="text">📝 글 상자</button>'+
     '<span class="pdd"><button type="button" data-pop="tsty" class="pfancy">✨ 글자 스타일 ▾</button><span class="ppop ptsty" data-popbox="tsty" hidden>'+textPresets().map(([k,l,o])=>'<button type="button" data-tsty="'+k+'"><span style="'+presetCss(o)+'">'+esc(l)+'</span></button>').join("")+'</span></span>'+
     '<button type="button" data-add="chart">📊 그래프</button><button type="button" data-add="image">🖼 사진</button>'+
     '<span class="pdd"><button type="button" data-pop="shape">⬛ 도형 ▾</button><span class="ppop pshp" data-popbox="shape" hidden>'+
       SHAPES.map(([k,l])=>'<button type="button" data-shape="'+k+'"><canvas data-shpv="'+k+'"></canvas><small>'+l+'</small></button>').join("")+'</span></span>'+
     '<span class="pdd"><button type="button" data-pop="stk">😀 아이콘 ▾</button><span class="ppop pstk" data-popbox="stk" hidden>'+STKCAT.map(([n,e])=>'<b>'+n+'</b><span class="pstkg">'+Array.from(new Intl.Segmenter?new Intl.Segmenter("ko",{granularity:"grapheme"}).segment(e):e,x=>x.segment||x).map(x=>'<button type="button" data-stk="'+x+'">'+x+'</button>').join("")+'</span>').join("")+'</span></span>'+
     bgPop()+
   '</div>'+
   '<div class="prow"><span class="plab">'+(SL()?'발표자료':'포스터')+'</span>'+
     '<label class="pinl">색 조합 <select data-theme>'+Object.entries(THEMES).map(([k,v])=>'<option value="'+k+'">'+v.name+'</option>').join("")+'</select></label>'+
     (SL()?'':'<label class="pinl">바깥 테두리 <select data-frame><option value="0">없음</option><option value="4">얇게</option><option value="8">보통</option><option value="14">두껍게</option></select></label>')+
     '<span class="pinl">보기 <button type="button" data-zoom="-1" aria-label="작게 보기">−</button><span class="pzoom pnum">100%</span><button type="button" data-zoom="1" aria-label="크게 보기">＋</button></span>'+
   '</div><div class="prow"><span class="plab">'+(SL()?'구성':'배치')+'</span>'+(SL()?'<button type="button" data-tpl="deck" class="pmain">✨ 추천 구성 만들기</button>'+sdzPop():tplPop()+dzPop())+'<span class="ptplnote" aria-live="polite"></span><button type="button" data-undo="1">↶ 되돌리기</button><button type="button" data-clear="1" class="pdanger">'+(SL()?'처음부터 다시':'모두 지우기')+'</button>'+
   '</div>'+
   '<div class="prow psel" hidden></div><div class="prow psel2" hidden></div>'+
  '</div>';
}
function tplPop(){ return '<span class="pdd"><button type="button" data-pop="tpl" class="pmain">✨ 추천 배치 ▾</button><span class="ppop pdz ptplp" data-popbox="tpl" hidden><b>고르면 바로 깔려요 · 6~10번은 수상작처럼 내용이 많아요</b><span class="pdzg">'+
  TPLS.map((T,i)=>'<button type="button" data-tplk="'+i+'"'+(D.tplIdx===i?' class="on"':'')+'><canvas data-tplpv="'+i+'"></canvas><b>'+(i+1)+'. '+esc(T[1])+'</b><small>'+esc(T[2])+'</small></button>').join("")+'</span></span></span>'; }
function drawTplPreviews(){ const keepS=S;
  bar.querySelectorAll("[data-tplpv]").forEach(cv=>{ const k=TPLS[+cv.dataset.tplpv][0]; S={bg:th().bg,bgx:keepS.bgx,items:template(k),frame:k==="c"?0:8,frameC:th().main}; if(D.dz!=null) applyDesign(D.dz,true); pvCanvas(cv,S,120); });
  S=keepS; }
function applyTpl(n){ const T=TPLS[n]; snap(); S.bg=th().bg; S.items=template(T[0]); S.frame=T[0]==="c"?0:8; S.frameC=th().main; D.tplIdx=n; if(D.dz!=null) applyDesign(D.dz,true); sel=null; render(); save(false,true); D.fresh=true;
  if(O.status) O.status("추천 배치 ‘"+(n+1)+". "+T[1]+"’을 깔았어요. 다른 배치는 ‘✨ 추천 배치’에서 다시 골라요."); }
function tplNote(){ const el=bar&&bar.querySelector(".ptplnote"); if(!el) return; if(SL()) return deckNote(el); const i=D.tplIdx;
  el.innerHTML=i==null?'‘✨ 추천 배치’에서 10가지 중 골라요. ‘🎨 추천 디자인’(20가지)은 배치는 그대로 두고 색·배경·글꼴만 바꿔요.':'지금 배치: <b>'+(i+1)+'. '+esc(TPLS[i][1])+'</b>'+(D.dz!=null?' · 디자인: <b>'+esc(DZ[D.dz].n)+'</b>':''); return;
  el.innerHTML=i==null?'누를 때마다 수상작을 참고한 배치 <b>'+TPLS.length+'가지</b>가 차례로 바뀌어요. 6번부터는 내용을 많이 넣는 수상작형이에요.':'<b>지금 '+(i+1)+'/'+TPLS.length+' · '+esc(TPLS[i][1])+'</b> – '+esc(TPLS[i][2])+'<br>다시 누르면 다음 배치 → ‘'+esc(TPLS[(i+1)%TPLS.length][1])+'’'; }
function toolbarState(){ tplNote(); const fr=bar.querySelector("[data-frame]"); if(fr) fr.value=String(S.frame||0); const ts=bar.querySelector("[data-theme]"); if(ts) ts.value=D.theme; const bg=bar.querySelector("[data-bg]"); if(bg) bg.value=/^#[0-9a-f]{6}$/i.test(S.bg)?S.bg:"#ffffff"; }
function panel(){
  const box=bar.querySelector(".psel"), box2=bar.querySelector(".psel2"), it=sel&&find(sel); if(!it){ box.hidden=box2.hidden=true; box.innerHTML=box2.innerHTML=""; return; }
  const isLine=it.type==="shape"&&LINES.includes(it.shape);
  let h='<span class="plab">고른 것</span>', h2='<span class="plab">꾸미기</span>';
  if(it.type==="text"){
    h+='<select data-k="font" aria-label="글꼴">'+FONTS.map(([f,l])=>'<option value="'+esc(f)+'"'+(f===it.font?" selected":"")+' style="font-family:\''+esc(f)+'\'">'+l+'</option>').join("")+'</select>'+
      '<button type="button" data-size="-2" aria-label="글자 작게">가−</button><span class="pnum">'+it.size+'</span><button type="button" data-size="2" aria-label="글자 크게">가+</button>'+
      '<button type="button" data-tog="bold" aria-pressed="'+!!it.bold+'"><b>굵게</b></button>'+
      '<select data-k="align" aria-label="정렬"><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select>'+
      '<select data-k="valign" aria-label="세로 정렬"><option value="top">위</option><option value="middle">세로 가운데</option></select>'+
      swatchPop("color","글자색",it.color)+
      '<select data-fx aria-label="글자 효과">'+[["","글자 효과 없음"],["s","글자 그림자"],["o","글자 테두리"],["os","테두리 + 그림자"]].map(([v,l])=>'<option value="'+v+'"'+(((it.tline>0?"o":"")+(it.tshadow?"s":""))===v?" selected":"")+'>'+l+'</option>').join("")+'</select>'+
      (it.tline>0?swatchPop("tlc","글자 테두리색",it.tlc||"#222222"):'')+
      '<select data-k="bshape" aria-label="상자 모양">'+[["","네모 상자"],["bubble","말풍선"],["ribbon","리본"],["burst","뾰족 배지"],["note","메모지"],["tape","테이프"],["ellipse","동그라미"],["star","별"],["heart","하트"]].map(([v,l])=>'<option value="'+v+'"'+((it.bshape||"")===v?" selected":"")+'>'+l+'</option>').join("")+'</select>';
  }
  if(it.type==="chart") h+='<button type="button" data-chart="1" class="pmain">📊 그래프 데이터·모양 바꾸기</button>';
  if(it.type==="image") h+='<button type="button" data-img="1" class="'+(it.src?'':'pmain')+'">'+(it.src?'사진 바꾸기':'🖼 사진 고르기')+'</button><button type="button" data-fit="1">'+(it.fit==="contain"?"꽉 채우기":"사진 전체 보이기")+'</button>';
  if(it.type==="sticker") h+='<span class="pnote">오른쪽 아래 점을 끌어 크기를 바꿔요</span>';
  if(it.type==="shape") h+='<select data-k="shape" aria-label="도형 모양">'+SHAPES.filter(([k])=>LINES.includes(k)===isLine).map(([k,l])=>'<option value="'+k+'"'+(k===it.shape?" selected":"")+'>'+l+'</option>').join("")+'</select>';
  if(it.type!=="image"&&it.type!=="sticker") h+=swatchPop("fill",isLine?"선 색":"채우기",it.fill,isLine?"":"채우기 없음");
  if(isLine&&it.shape==="wave") h+='<select data-k="lw" aria-label="선 굵기">'+[3,6,10,16].map(v=>'<option value="'+v+'"'+(+(it.lw||6)===v?" selected":"")+'>굵기 '+v+'</option>').join("")+'</select>';
  if(it.type!=="sticker"&&!isLine){
    h+=swatchPop("stroke","테두리",it.stroke||"#333333")+'<select data-k="sw" aria-label="테두리 두께">'+[0,1,2,3,4,6,8].map(v=>'<option value="'+v+'"'+(+it.sw===v?" selected":"")+'>'+(v?"테두리 "+v:"테두리 없음")+'</option>').join("")+'</select>';
    if(it.type==="image"||it.type==="chart"||(it.type==="text"&&(!it.bshape||it.bshape==="bubble"))||(it.type==="shape"&&(it.shape==="round"||it.shape==="bubble")))
      h+='<select data-k="radius" aria-label="모서리">'+[[0,"각진 모서리"],[12,"둥근 모서리"],[28,"더 둥글게"],[999,it.type==="image"?"동그랗게":"알약 모양"]].map(([v,l])=>'<option value="'+v+'"'+(+it.radius===v?" selected":"")+'>'+l+'</option>').join("")+'</select>';
  }
  if(!isLine) h2+='<button type="button" data-tog="shadow" aria-pressed="'+!!it.shadow+'">🌫 그림자</button>';
  h2+='<label class="pinl">투명도 <input type="range" min="15" max="100" step="5" data-rng="op" value="'+Math.round((it.op==null?1:it.op)*100)+'"></label>'+
    '<label class="pinl">회전 <input type="range" min="-180" max="180" step="1" data-rng="rot" value="'+(it.rot||0)+'"><span class="pnum" data-rotv>'+(it.rot||0)+'°</span></label><button type="button" data-rot0="1">회전 0°</button>'+
    '<button type="button" data-al="x" title="가로 가운데로">↔ 가운데</button><button type="button" data-al="y" title="세로 가운데로">↕ 가운데</button>'+
    '<button type="button" data-z="1">앞으로</button><button type="button" data-z="-1">뒤로</button><button type="button" data-dup="1">복제</button><button type="button" data-del="1" class="pdanger">삭제</button>';
  box.innerHTML=h; box.hidden=false; box2.innerHTML=h2; box2.hidden=false;
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
    else{ it.x=clamp(r4(o.x+dx),-it.w+40,W-40); it.y=clamp(r4(o.y+dy),-it.h+40,H-40);
      const gv=board.querySelector(".pgv"), gh=board.querySelector(".pgh"), th2=10;
      const sx2=Math.abs(it.x+it.w/2-W/2)<th2, sy2=Math.abs(it.y+it.h/2-H/2)<th2;
      if(sx2) it.x=Math.round((W-it.w)/2); if(sy2) it.y=Math.round((H-it.h)/2);
      if(gv) gv.hidden=!sx2; if(gh) gh.hidden=!sy2; }
    upd(it); };
  const up=()=>{ board.querySelectorAll(".pguide").forEach(g=>g.hidden=true); window.removeEventListener("pointermove",mv); window.removeEventListener("pointerup",up); window.removeEventListener("pointercancel",up); if(moved) save(); };
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
    if(P.bgx) ["c1","c2","color"].forEach(k=>{ if(P.bgx[k]) P.bgx[k]=m(P.bgx[k]); });
    P.items.forEach(it=>{ ["fill","stroke","color","tlc"].forEach(k=>{ if(it[k]) it[k]=m(it[k]); }); if(it.chart&&it.chart.color) it.chart.color=m(it.chart.color); });
    if(String(P.bg).toLowerCase()===oldT.bg.toLowerCase()) P.bg=newT.bg; }); }
function keepIn(p){ if(!p||p.hidden) return; p.style.left=""; p.style.right=""; p.style.marginLeft="0"; const r=p.getBoundingClientRect(), vw=document.documentElement.clientWidth;
  if(r.right>vw-8) p.style.marginLeft=Math.round(-(r.right-vw+8))+"px"; const r2=p.getBoundingClientRect(); if(r2.left<8) p.style.marginLeft=Math.round((parseFloat(p.style.marginLeft)||0)+8-r2.left)+"px"; }
function onBar(e){
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.tplk!=null){ const n=+b.dataset.tplk;
    if(S.items.length&&!D.fresh&&!b.classList.contains("sure")){ bar.querySelectorAll("[data-tplk].sure").forEach(x=>{ x.classList.remove("sure"); x.querySelector("small").textContent=TPLS[+x.dataset.tplk][2]; });
      b.classList.add("sure"); b.querySelector("small").textContent="한 번 더 누르면 바뀌어요 (지금 포스터 내용은 지워져요 · ↶ 되돌리기 가능)"; return; }
    bar.querySelectorAll("[data-popbox]").forEach(p=>p.hidden=true); applyTpl(n); return; }
  const pop=b.dataset.pop; if(pop){ bar.querySelectorAll("[data-popbox]").forEach(p=>p.hidden=p.dataset.popbox!==pop||!p.hidden); if(pop==="shape"||pop==="bg") drawPreviews(); if(pop==="tpl") drawTplPreviews(); if(pop==="dz") drawDzPreviews(); if(pop==="sdz") drawSdzPreviews(); keepIn(bar.querySelector('[data-popbox="'+pop+'"]')); return; }
  bar.querySelectorAll("[data-popbox]").forEach(p=>p.hidden=true);
  const it=sel&&find(sel);
  if(b.dataset.dz!=null){ applyDesign(+b.dataset.dz); return; }
  if(b.dataset.sdz!=null){ applySlideDesign(+b.dataset.sdz); return; }
  if(b.dataset.tsty){ const pr=textPresets().find(x=>x[0]===b.dataset.tsty); if(pr) addItem(mk("text",JSON.parse(JSON.stringify(pr[2])))); return; }
  if(b.dataset.bgs!=null){ snap(); S.bg=b.dataset.bgs; delete S.bgx; render(); save(); return; }
  if(b.dataset.bgg!=null){ const g=bgPresets().grad[+b.dataset.bgg]; snap(); S.bg=g[0]; S.bgx={type:"grad",c1:g[0],c2:g[1],dir:g[2]}; render(); save(); return; }
  if(b.dataset.bgp){ snap(); const t=th(); S.bgx={type:"pat",pat:b.dataset.bgp,color:dk()?"#ffffff":t.main,a:b.dataset.bgp==="confetti"?0.25:0.16,size:SL()?40:36}; render(); save(); return; }
  if(b.dataset.bgimg){ pickImage(src=>{ snap(); S.bgx={type:"img",src,dim:0}; render(); save(); }); return; }
  if(b.dataset.bgdim!=null){ if(!S.bgx||S.bgx.type!=="img"){ alertMsg("먼저 ‘사진 고르기’로 배경 사진을 넣어 주세요."); return; } snap(); S.bgx.dim=+b.dataset.bgdim; render(); save(); return; }
  if(b.dataset.bgclear){ snap(); delete S.bgx; render(); save(); return; }
  if(b.dataset.bgall){ snap(); D.slides.forEach(P=>{ P.bg=S.bg; if(S.bgx) P.bgx=JSON.parse(JSON.stringify(S.bgx)); else delete P.bgx; }); render(); strip(); save(); alertMsg("모든 슬라이드에 같은 배경을 넣었어요."); return; }
  if(b.dataset.add){ const t=b.dataset.add;
    if(t==="image"){ pickImage((src,ar)=>{ const w=360; addItem(mk("image",{src,w,h:r4(clamp(w/ar,80,700))})); }); return; }
    addItem(mk(t)); if(t==="chart") setTimeout(()=>chartModal(find(sel)),50); return; }
  if(b.dataset.shape){ const k=b.dataset.shape, t=th(), L=LINES.includes(k);
    const sz={line:[400,8],dash:[400,8],dot:[400,10],wave:[400,28],arrow:[220,100],rect:[300,180],round:[300,180],tape:[260,60],note:[260,220],ribbon:[360,80],bubble:[320,180]}[k]||[220,220];
    addItem(mk("shape",{shape:k,w:sz[0],h:sz[1],lw:6,fill:L?t.ink:k==="note"?"#fff3b0":k==="tape"?t.sub:["star","heart","burst"].includes(k)?t.accent:k==="ribbon"?t.main:t.sub,shadow:k==="note",radius:24,op:k==="tape"?0.85:1})); return; }
  if(b.dataset.stk){ addItem(mk("sticker",{emoji:b.dataset.stk})); return; }
  if(b.dataset.tpl){
    if(hasContent()&&!D.fresh&&!b.dataset.sure){ b.dataset.sure="1"; b.textContent="한 번 더 누르면 모든 슬라이드가 새로 바뀌어요"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="✨ 추천 구성 만들기"; },3500); return; }
    delete b.dataset.sure; b.textContent="✨ 추천 구성 만들기"; applyDeck(); return; }
  if(b.dataset.zoom){ const Z=[1,1.5,2,3]; zoom=Z[clamp(Z.indexOf(zoom)+(+b.dataset.zoom),0,Z.length-1)]; fit(); return; }
  if(b.dataset.undo){ undo(); return; }
  if(b.dataset.clear){ if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent="정말 모두 지울까요? 한 번 더 누르기"; setTimeout(()=>{ delete b.dataset.sure; b.textContent="모두 지우기"; },3500); return; }
    snap(); if(SL()){ D.slides=[{id:uid(),bg:"#ffffff",items:[]}]; setCur(0); strip(); } else S.items=[]; sel=null; render(); save(); return; }
  if(!it) return;
  if(b.dataset.sw){ snap(); const k=b.dataset.sw, c=b.dataset.c; it[k]=c; if(k==="stroke"&&c&&!it.sw) it.sw=2; render(); save(); return; }
  if(b.dataset.rot0){ snap(); it.rot=0; render(); save(); return; }
  if(b.dataset.al){ snap(); if(b.dataset.al==="x") it.x=Math.round((W-it.w)/2); else it.y=Math.round((H-it.h)/2); upd(it); save(); return; }
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
let rngSnap=false;
function onBarChange(e){
  const t=e.target;
  if(t.matches("[data-theme]")){ snap(); const o=th(); delete D.pal; delete D.dz; delete D.sdz; D.theme=t.value; recolor(o,th()); const tmp=document.createElement("div"); tmp.innerHTML=toolbar(); bar.innerHTML=tmp.firstChild.innerHTML; render(); strip(); save(); return; }
  if(t.matches("[data-frame]")){ snap(); S.frame=+t.value; if(!S.frameC) S.frameC=th().main; render(); save(); return; }
  if(t.matches("[data-bg]")){ if(!rngSnap){ snap(); rngSnap=true; } S.bg=t.value; if(S.bgx&&S.bgx.type!=="pat") delete S.bgx; board.style.background=S.bg; paintBg(); save(); if(e.type==="change") rngSnap=false; return; }
  const it=sel&&find(sel); if(!it) return;
  if(t.matches("[data-rng]")){ if(!rngSnap){ snap(); rngSnap=true; } const k=t.dataset.rng; if(k==="op") it.op=(+t.value)/100; else { it.rot=+t.value; const rv=bar.querySelector("[data-rotv]"); if(rv) rv.textContent=it.rot+"°"; } place(board.querySelector('[data-id="'+it.id+'"]')||document.createElement("div"),it); save(); if(e.type==="change") rngSnap=false; return; }
  if(t.matches("[data-fx]")){ snap(); const v=t.value; it.tline=v.includes("o")?Math.max(2,Math.round(it.size/14)):0; if(it.tline&&!it.tlc) it.tlc=isDark(it.color||"#000")?"#ffffff":th().ink; it.tshadow=v.includes("s"); render(); save(); return; }
  if(!t.dataset.k) return;
  if(t.type==="color"){ if(!rngSnap){ snap(); rngSnap=true; } if(e.type==="change") rngSnap=false; } else snap();
  let v=t.value; if(["sw","radius","lw"].includes(t.dataset.k)) v=+v; it[t.dataset.k]=v;
  if(t.dataset.k==="stroke"&&!it.sw) it.sw=2;
  if(t.type==="color"){ const d=board.querySelector('[data-id="'+it.id+'"]'); if(d){ d.replaceWith(elFor(it)); } const sw=t.closest(".pdd"); const i=sw&&sw.querySelector(".pcolor i"); if(i) i.style.background=t.value; } else render();
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
    pickImage(src=>{ snap(); it.src=src; render(); save(); }); }); bar.addEventListener("click",onBar); bar.addEventListener("change",onBarChange); bar.addEventListener("input",e=>{ if(e.target.type==="color"||e.target.type==="range") onBarChange(e); });
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
  const all=pagesOf().flatMap(P=>P.items); await loadFonts(all); await loadImgs(imgsOf(all));
  SC=SC||(SL()?2:2.4); const out=[];
  for(const P of pagesOf()){ const cv=document.createElement("canvas"); cv.width=Math.round(W*SC); cv.height=Math.round(H*SC);
    const ctx=cv.getContext("2d"); ctx.scale(SC,SC); drawPage(ctx,P); out.push(cv.toDataURL("image/jpeg",0.92)); cv.width=cv.height=0; }
  return out;
}
async function toImage(){ return (await toImages())[0]; }
function drawPage(ctx,P){
  drawBg(ctx,P);
  for(const it of P.items){
    ctx.save();
    if(it.op!=null&&it.op<1) ctx.globalAlpha=it.op;
    if(it.rot){ const cx=it.x+it.w/2, cy=it.y+it.h/2; ctx.translate(cx,cy); ctx.rotate(it.rot*Math.PI/180); ctx.translate(-cx,-cy); }
    drawItem(ctx,it);
    ctx.restore();
  }
  if(P.frame){ ctx.save(); ctx.lineWidth=P.frame; ctx.strokeStyle=P.frameC||th().main; ctx.strokeRect(10+P.frame/2,10+P.frame/2,W-20-P.frame,H-20-P.frame); ctx.restore(); }
}
function drawItem(ctx,it){
    ctx.save();
    if(it.type==="text"){ drawBox(ctx,it,it.x,it.y,it.w,it.h); drawText(ctx,it); }
    else if(it.type==="chart"){ drawBox(ctx,it,it.x,it.y,it.w,it.h); drawChart(ctx,it,it.x,it.y,it.w,it.h); }
    else if(it.type==="shape"){ drawShape(ctx,it,it.x,it.y,it.w,it.h); }
    else if(it.type==="sticker"){ const fs=Math.min(it.w,it.h)*0.8; ctx.font=fs+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textBaseline="middle"; const tw=ctx.measureText(it.emoji).width; shadowOn(ctx,it); ctx.fillText(it.emoji,it.x+(it.w-tw)/2,it.y+it.h/2+fs*0.06); shadowOff(ctx); }
    else if(it.type==="image"&&IMG.get(it.src)){ const im=IMG.get(it.src); if(it.shadow){ rr(ctx,it.x,it.y,it.w,it.h,it.radius||0); ctx.fillStyle="#ffffff"; shadowOn(ctx,it); ctx.fill(); shadowOff(ctx); } rr(ctx,it.x,it.y,it.w,it.h,it.radius||0); ctx.clip();
      const s=(it.fit==="contain"?Math.min:Math.max)(it.w/im.width,it.h/im.height), w=im.width*s, h=im.height*s; ctx.drawImage(im,it.x+(it.w-w)/2,it.y+(it.h-h)/2,w,h);
      ctx.restore(); ctx.save(); if(it.stroke&&it.sw) drawBox(ctx,{stroke:it.stroke,sw:it.sw,radius:it.radius},it.x,it.y,it.w,it.h); }
    ctx.restore();
}
/* ---------- 발표자료 (16:9 슬라이드 여러 장) ---------- */
const FRAMES={band:"띠 제목",side:"사이드 바",card:"카드",line:"밑줄 제목",win:"창문 틀",tag:"가운데 제목"};
const AOF={band:{x:56,y:144,w:1168,h:528},side:{x:72,y:156,w:1152,h:516},card:{x:72,y:156,w:1136,h:496},line:{x:64,y:150,w:1152,h:522},win:{x:76,y:152,w:1128,h:500},tag:{x:72,y:160,w:1136,h:506}};
const LAYOUTS=[["text","제목 + 글"],["two","글 두 칸"],["chart","그래프 + 해석"],["photo","사진 + 글"],["big","사진 크게"],["flow","순서도"],["cover","표지"],["end","끝 인사"],["blank","빈 슬라이드"]];
function slideFrame(style,title){
  const t=th(), dark=dk(), items=[], push=o=>items.push(Object.assign(o,{tag:o.tag||"DEC"})); let bg=t.bg;
  if(style==="side"){ bg=dark?t.bg:"#ffffff";
    push(mk("shape",{shape:"rect",x:0,y:0,w:28,h:H,fill:t.main,radius:0}));
    push(mk("title",{tag:"STT",x:72,y:36,w:1140,h:80,text:title,size:46,color:t.main,fill:"",radius:0,align:"left",pad:0}));
    push(mk("shape",{shape:"line",x:72,y:122,w:120,h:6,fill:t.accent}));
  } else if(style==="card"){ bg=t.sub;
    push(mk("shape",{shape:"round",x:36,y:36,w:W-72,h:H-72,fill:dark?t.bg:"#ffffff",radius:28}));
    push(mk("title",{tag:"STT",x:72,y:64,w:560,h:64,text:title,font:"Do Hyeon",size:34,color:"#ffffff",fill:t.main,radius:999,align:"center",pad:10}));
  } else if(style==="line"){ bg=t.bg;
    push(mk("title",{tag:"STT",x:64,y:38,w:1152,h:78,text:title,size:46,color:t.main,fill:"",radius:0,align:"left",pad:0}));
    push(mk("shape",{shape:"line",x:64,y:122,w:1152,h:4,fill:t.ink}));
  } else if(style==="win"){ bg=t.bg;
    push(mk("shape",{shape:"round",x:36,y:28,w:W-72,h:H-56,fill:dark?t.sub:"#ffffff",stroke:t.ink,sw:4,radius:24}));
    push(mk("shape",{shape:"line",x:36,y:122,w:W-72,h:4,fill:t.ink}));
    [0,1,2].forEach(k=>push(mk("shape",{shape:"ellipse",x:66+k*30,y:66,w:18,h:18,fill:[t.main,t.accent,t.sub][k],stroke:t.ink,sw:2,radius:0})));
    push(mk("title",{tag:"STT",x:170,y:40,w:W-340,h:72,text:title,size:40,color:t.ink,fill:"",radius:0,align:"center",pad:0}));
  } else if(style==="tag"){ bg=t.bg;
    push(mk("shape",{shape:"rect",x:0,y:0,w:W,h:12,fill:t.main,radius:0}));
    push(mk("title",{tag:"STT",x:110,y:40,w:W-220,h:74,text:title,size:46,color:t.ink,fill:"",radius:0,align:"center",pad:0}));
    push(mk("shape",{shape:"round",x:W/2-50,y:120,w:100,h:10,fill:t.main,radius:999}));
    push(mk("shape",{shape:"ellipse",x:W-150,y:H-150,w:220,h:220,fill:t.sub,radius:0}));
  } else { bg=dark?t.bg:"#ffffff";
    push(mk("shape",{shape:"rect",x:0,y:0,w:W,h:112,fill:t.main,radius:0}));
    push(mk("title",{tag:"STT",x:56,y:20,w:W-112,h:72,text:title,size:44,fill:"",radius:0,align:"left",pad:0}));
    push(mk("shape",{shape:"rect",x:0,y:H-10,w:W,h:10,fill:t.sub,radius:0}));
  }
  return {bg,items,A:AOF[style]||AOF.band};
}
function slide(style,kind,o){
  o=o||{}; const t=th(), dark=dk(), panel=dark?t.sub:"#ffffff";
  const team=o.team!=null?o.team:(O.team&&O.team())||(O.deck==="dream"?"○학년 ○반 이름":"○조 | 발표자 이름"), ttl=(O.title&&O.title())||(O.deck==="dream"?"나의 꿈: ○○○":"우리 탐구의 제목을 써요");
  if(kind==="cover"||kind==="end"){
    const items=[], push=x=>items.push(Object.assign(x,{tag:x.tag||"DEC"}));
    const big=o.big!=null?o.big:kind==="cover"?ttl:"감사합니다!", sub=o.sub!=null?o.sub:kind==="cover"?"부제: 무엇을 어떻게 조사했는지 한 줄로":"궁금한 점이 있으면 질문해 주세요 🙋";
    let bg=dark?t.bg:"#ffffff"; const big1=kind==="cover";
    if(style==="side"){
      push(mk("shape",{shape:"rect",x:0,y:0,w:420,h:H,fill:t.main,radius:0}));
      push(mk("sticker",{emoji:big1?(O.deck==="dream"?"🌟":"📊"):"🙌",x:130,y:280,w:160,h:160}));
      push(mk("title",{tag:"CT",x:480,y:150,w:740,h:240,text:big,size:big1?62:84,color:t.main,fill:"",radius:0,align:"left",pad:0}));
      push(mk("shape",{shape:"line",x:480,y:410,w:160,h:8,fill:t.accent}));
      push(mk("text",{tag:"CS",x:480,y:440,w:740,h:60,text:sub,size:26,bold:true,color:t.ink,fill:"",stroke:"",sw:0,pad:0,valign:"middle"}));
      push(mk("text",{tag:"CM",x:480,y:520,w:740,h:56,text:team,size:24,color:t.main,bold:true,fill:"",stroke:"",sw:0,pad:0,valign:"middle"}));
    } else if(style==="card"){ bg=t.sub;
      push(mk("shape",{shape:"round",x:36,y:36,w:W-72,h:H-72,fill:dark?t.bg:"#ffffff",radius:28}));
      push(mk("title",{tag:"CT",x:100,y:150,w:W-200,h:220,text:big,size:big1?66:88,color:t.main,fill:"",radius:0,align:"center",pad:0}));
      push(mk("text",{tag:"CS",x:100,y:384,w:W-200,h:60,text:sub,size:26,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
      push(mk("text",{tag:"CM",x:340,y:476,w:600,h:60,text:team,size:24,bold:true,color:"#ffffff",fill:t.main,stroke:"",sw:0,radius:999,align:"center",valign:"middle",pad:8}));
    } else if(style==="win"){ bg=t.bg;
      push(mk("shape",{shape:"round",x:36,y:28,w:W-72,h:H-56,fill:dark?t.sub:"#ffffff",stroke:t.ink,sw:4,radius:24}));
      push(mk("shape",{shape:"line",x:36,y:110,w:W-72,h:4,fill:t.ink}));
      [0,1,2].forEach(k=>push(mk("shape",{shape:"ellipse",x:66+k*30,y:60,w:18,h:18,fill:[t.main,t.accent,t.sub][k],stroke:t.ink,sw:2,radius:0})));
      push(mk("title",{tag:"CT",x:110,y:170,w:W-220,h:220,text:big,size:big1?66:88,color:t.main,fill:"",radius:0,align:"center",pad:0}));
      push(mk("text",{tag:"CS",x:110,y:400,w:W-220,h:60,text:sub,size:26,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
      push(mk("text",{tag:"CM",x:340,y:490,w:600,h:60,text:team,size:24,bold:true,color:"#ffffff",fill:t.main,stroke:t.ink,sw:3,radius:999,align:"center",valign:"middle",pad:8}));
    } else if(style==="tag"){ bg=t.bg;
      push(mk("shape",{shape:"ellipse",x:-120,y:-120,w:360,h:360,fill:t.sub,radius:0}));
      push(mk("shape",{shape:"ellipse",x:W-200,y:H-220,w:320,h:320,fill:t.sub,radius:0}));
      push(mk("text",{tag:"CM",x:390,y:120,w:500,h:56,text:team,size:22,bold:true,color:"#ffffff",fill:t.main,stroke:"",sw:0,radius:999,align:"center",valign:"middle",pad:8}));
      push(mk("title",{tag:"CT",x:110,y:200,w:W-220,h:230,text:big,size:big1?70:90,color:t.ink,fill:"",radius:0,align:"center",pad:0}));
      push(mk("shape",{shape:"round",x:W/2-60,y:446,w:120,h:10,fill:t.accent,radius:999}));
      push(mk("text",{tag:"CS",x:110,y:476,w:W-220,h:60,text:sub,size:26,bold:true,color:t.main,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
    } else if(style==="line"){ bg=t.bg;
      push(mk("shape",{shape:"line",x:80,y:150,w:1120,h:6,fill:t.ink}));
      push(mk("title",{tag:"CT",x:80,y:176,w:1120,h:230,text:big,size:big1?70:90,color:t.main,fill:"",radius:0,align:"left",pad:0}));
      push(mk("shape",{shape:"line",x:80,y:424,w:1120,h:3,fill:t.ink}));
      push(mk("text",{tag:"CS",x:80,y:444,w:1120,h:60,text:sub,size:28,bold:true,color:t.ink,fill:"",stroke:"",sw:0,valign:"middle",pad:0}));
      push(mk("text",{tag:"CM",x:80,y:516,w:1120,h:56,text:team,size:26,bold:true,color:t.main,fill:"",stroke:"",sw:0,valign:"middle",pad:0}));
    } else {
      push(mk("shape",{shape:"rect",x:0,y:0,w:W,h:440,fill:t.main,radius:0}));
      push(mk("title",{tag:"CT",x:80,y:90,w:W-160,h:230,text:big,size:big1?68:90,fill:"",radius:0,align:"left",pad:0}));
      push(mk("text",{tag:"CS",x:80,y:330,w:W-160,h:60,text:sub,size:28,bold:true,color:"#ffffff",fill:"",stroke:"",sw:0,valign:"middle",pad:0}));
      push(mk("text",{tag:"CM",x:80,y:490,w:W-160,h:60,text:team,size:28,bold:true,color:t.ink,fill:"",stroke:"",sw:0,valign:"middle",pad:0}));
      push(mk("shape",{shape:"line",x:80,y:570,w:200,h:8,fill:t.accent}));
    }
    return {id:uid(),bg,items,kind,st:style};
  }
  const F=slideFrame(style,o.title||({text:"제목을 써요",two:"제목을 써요",chart:"조사 결과",photo:"제목을 써요",big:"사진으로 보는 우리 탐구",flow:"조사 방법",blank:""}[kind]||""));
  const A=F.A, items=F.items, push=x=>items.push(x);
  if(kind==="blank"&&!o.title) items.splice(0,items.length,...items.filter(it=>it.tag!=="STT"));
  const body=(x,y,w,h,txt,ex,tg)=>push(mk("text",Object.assign({tag:tg||"B",x,y,w,h,text:txt,size:26,fill:panel,stroke:t.sub,sw:2,radius:16,pad:22},ex||{})));
  const head=(x,y,w,txt)=>push(mk("text",{tag:"H",x,y,w,h:48,text:txt,font:"Do Hyeon",size:32,color:t.main,fill:"",stroke:"",sw:0,pad:0,valign:"middle"}));
  const call=(x,y,w,h,txt)=>push(mk("text",{tag:"C",x,y,w,h,text:txt,size:24,bold:true,color:dark?t.accent:t.main,fill:dark?"":t.sub,stroke:"",sw:0,radius:12,valign:"middle",pad:16}));
  if(kind==="text") body(A.x,A.y,A.w,A.h,o.body||"• 첫 번째로 말할 내용\n• 두 번째로 말할 내용\n• 세 번째로 말할 내용");
  if(kind==="two"){ const cw=(A.w-32)/2;
    head(A.x,A.y,cw,o.h1||"왼쪽 소제목"); body(A.x,A.y+60,cw,A.h-60,o.b1||"내용을 써요");
    head(A.x+cw+32,A.y,cw,o.h2||"오른쪽 소제목"); body(A.x+cw+32,A.y+60,cw,A.h-60,o.b2||"내용을 써요",o.fill2?{fill:dark?panel:t.sub,stroke:""}:null,o.fill2?"B2":"B"); }
  if(kind==="chart"){ const cw=r4(A.w*0.6);
    push(mk("chart",{tag:"G",x:A.x,y:A.y,w:cw,h:A.h,radius:16,fill:panel,chart:Object.assign({kind:"bar",title:"질문 그래프",labels:["항목 A","항목 B","항목 C","항목 D"],values:[34,21,15,8],unit:"명",showVal:true,mono:false,color:t.main},o.chart||{})}));
    body(A.x+cw+28,A.y,A.w-cw-28,A.h-108,o.body||"해석\n\n사실(숫자): \n의미: \n이유: ");
    call(A.x+cw+28,A.y+A.h-92,A.w-cw-28,92,o.call||"→ 핵심을 한 줄로!"); }
  if(kind==="photo"){ const cw=r4(A.w*0.5);
    push(mk("image",{tag:"I",x:A.x,y:A.y,w:cw,h:A.h,radius:16}));
    body(A.x+cw+28,A.y,A.w-cw-28,A.h,o.body||"사진에 대한 설명을 써요."); }
  if(kind==="big"){ push(mk("image",{tag:"I",x:A.x,y:A.y,w:A.w,h:A.h-72,radius:16}));
    push(mk("text",{tag:"CAP",x:A.x,y:A.y+A.h-60,w:A.w,h:60,text:o.body||"사진 설명: 무엇을, 언제, 어디서",size:24,bold:true,color:t.ink,fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0})); }
  if(kind==="flow"){ const steps=o.steps||["설문 문항 만들기","구글 설문지 배포","응답 모으기","그래프로 정리","분석 · 결론"], n=steps.length, fh=260, slot=A.w/n, d=96;
    push(mk("shape",{tag:"FB",shape:"round",x:A.x,y:A.y,w:A.w,h:fh,fill:panel,stroke:t.sub,sw:2,radius:16}));
    steps.forEach((st,k)=>{ const cx=A.x+slot*k+slot/2;
      push(mk("shape",{tag:"FC",alt:k%2,shape:"ellipse",x:r4(cx-d/2),y:A.y+30,w:d,h:d,fill:k%2?t.accent:t.main,radius:0}));
      push(mk("text",{tag:"FN",x:r4(cx-d/2),y:A.y+30,w:d,h:d,text:String(k+1),font:"Black Han Sans",size:44,color:"#ffffff",fill:"",stroke:"",sw:0,align:"center",valign:"middle",pad:0}));
      push(mk("text",{tag:"FT",x:r4(cx-slot/2+6),y:A.y+140,w:r4(slot-12),h:100,text:st,size:24,bold:true,align:"center",fill:"",stroke:"",sw:0,pad:2}));
      if(k<n-1) push(mk("shape",{tag:"FA",shape:"arrow",x:r4(cx+d/2+8),y:A.y+66,w:Math.max(16,r4(slot-d-16)),h:24,fill:t.sub,radius:0})); });
    body(A.x,A.y+fh+24,A.w,A.h-fh-24,o.body||"대상: ○○중 ○학년 ○○명\n기간: ○월 ○일 ~ ○월 ○일 · 질문 수: ○개",{valign:"middle"}); }
  return {id:uid(),bg:F.bg,items,kind,st:style};
}
/* 발표자료 추천 디자인 20가지: 틀(띠·사이드·카드·밑줄·창문·가운데) + 색 + 배경 + 글꼴 + 상자 모양 */
const SDZ=[
 {n:"깔끔 블루",deco:[["blob", 1.0, 1.0, 0.13, "$sub", 1], ["dots", "tr", "#ffffff", 0.45]],d:"파란 띠 제목, 하얀 바탕",fr:"band",pal:{bg:"#ffffff",main:"#2f6fd6",sub:"#dbe7fb",accent:"#f28c28",ink:"#1d2a3a"},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{}},
 {n:"민트 사이드",deco:[["ring", 1.0, 0.0, 0.12, "$main", 6, 0.5], ["ring", 1.0, 1.0, 0.1, "$accent", 6, 0.5]],d:"왼쪽 민트 막대, 둥근 테두리 상자",fr:"side",pal:{bg:"#ffffff",main:"#1aa3a3",sub:"#dff4f4",accent:"#ff7a59",ink:"#17323a"},f:{T:"Do Hyeon",H:"Do Hyeon",B:"Noto Sans KR"},s:{B:{stroke:"$main",sw:3,radius:22},G:{stroke:"$main",sw:3,radius:22},FB:{stroke:"$main",sw:3,radius:22}}},
 {n:"파스텔 카드",deco:[["flank", "🌸", "🌸", 46]],d:"분홍 땡땡이 배경 위 하얀 카드",fr:"card",pal:{bg:"#fff8fb",main:"#e889b5",sub:"#fde3ef",accent:"#7cc6c0",ink:"#3a2a33"},bgx:{type:"pat",pat:"dots",color:"#ffffff",a:0.7,size:40},f:{T:"Jua",H:"Jua",B:"Gowun Dodum"},s:{B:{stroke:"$sub",sw:3,radius:20}}},
 {n:"레트로 굵은 선",deco:[["mark", "$sub", 1], ["pix", "tr", "$ink", 1]],d:"크림 바탕, 까만 굵은 테두리",fr:"line",pal:{bg:"#fdf3e7",main:"#e4572e",sub:"#f9d56e",accent:"#3a86ff",ink:"#1f1f1f"},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{STT:{color:"$ink"},CT:{color:"$ink"},H:{fill:"$sub",color:"$ink",stroke:"$ink",sw:3,radius:10,pad:10},B:{stroke:"$ink",sw:3,radius:12},B2:{fill:"#8fd6b0",stroke:"$ink",sw:3},C:{fill:"$sub",color:"$ink",stroke:"$ink",sw:2},G:{stroke:"$ink",sw:3,radius:12},FB:{stroke:"$ink",sw:3,radius:12}}},
 {n:"네이비 비즈니스",deco:[["pix", "tr", "$accent", 0.9]],d:"남색 띠, 금색 포인트, 그림자 카드",fr:"band",pal:{bg:"#f5f7fb",main:"#1f3a68",sub:"#dfe6f2",accent:"#f4b400",ink:"#1b2230"},bg:"#f5f7fb",f:{T:"Black Han Sans",H:"Noto Sans KR",B:"Noto Sans KR"},
  s:{H:{bold:true},B:{stroke:"",sw:0,radius:6,shadow:true},B2:{fill:"#fff4d0"},C:{fill:"#fff4d0",color:"$main"},G:{stroke:"",sw:0,radius:6,shadow:true},FB:{stroke:"",sw:0,radius:6,shadow:true}}},
 {n:"선셋 그라데이션",deco:[["blob", 0.96, 0.06, 0.12, "#ffffff", 0.4], ["blob", 0.04, 0.94, 0.14, "#ffffff", 0.35], ["flank", "☀️", null, 46]],d:"주황→노랑 그라데이션 위 하얀 카드",fr:"card",pal:{bg:"#ffb25b",main:"#e8590c",sub:"#fff1dc",accent:"#c2255c",ink:"#3a1f10"},bgx:{type:"grad",c1:"#ff8a3d",c2:"#ffe08a",dir:"d"},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},s:{B:{stroke:"",sw:0,shadow:true,radius:18},G:{shadow:true}}},
 {n:"라벤더 땡땡이",deco:[["blob", 1.0, 1.0, 0.16, "$sub", 1], ["flank", null, "💜", 44]],d:"연보라 땡땡이, 보라 사이드 막대",fr:"side",pal:{bg:"#f3efff",main:"#7b5cc9",sub:"#e4dbfa",accent:"#f2a33a",ink:"#2c2440"},bg:"#f3efff",bgx:{type:"pat",pat:"dots",color:"#7b5cc9",a:0.12,size:40},f:{T:"Jua",H:"Do Hyeon",B:"Gowun Dodum"},s:{B:{stroke:"$main",sw:2,radius:18},G:{stroke:"$main",sw:2,radius:18}}},
 {n:"신문 기사형",deco:[["band", "top", 8, "$ink"], ["flank", null, "📰", 44]],d:"누런 신문지, 검은 줄, 명조체",fr:"line",pal:{bg:"#f4f1ea",main:"#1a1a1a",sub:"#e2dccd",accent:"#b3261e",ink:"#1a1a1a"},f:{T:"Song Myung",H:"Noto Serif KR",B:"Noto Serif KR"},
  s:{H:{fill:"$main",color:"#ffffff",radius:0,pad:10,bold:true},B:{fill:"#fffdf7",stroke:"$main",sw:1,radius:0},B2:{fill:"$sub"},C:{fill:"",color:"$accent"},G:{fill:"#fffdf7",stroke:"$main",sw:1,radius:0},FB:{fill:"#fffdf7",stroke:"$main",sw:1,radius:0}}},
 {n:"옐로 블루 팝",deco:[["ring", 0.0, 1.0, 0.1, "#ffffff", 8, 0.8], ["flank", "⭐", "⭐", 46]],d:"노란 땡땡이 배경, 파란 카드 제목",fr:"card",pal:{bg:"#ffe45c",main:"#2f5bd3",sub:"#ffe45c",accent:"#ff5d8f",ink:"#1d2a5c"},bgx:{type:"pat",pat:"dots",color:"#ffffff",a:0.5,size:36},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{B:{stroke:"$main",sw:3,radius:16},B2:{fill:"#fff7c2",stroke:"$main",sw:3},C:{fill:"$main",color:"#ffe45c"},G:{stroke:"$main",sw:3,radius:16},FB:{stroke:"$main",sw:3,radius:16}}},
 {n:"모눈 노트",deco:[["mark", "#fff3b0", 1], ["flank", null, "✏️", 46]],d:"모눈종이 배경, 손글씨 제목, 파란 펜",fr:"line",pal:{bg:"#fffef8",main:"#2b6cb0",sub:"#e8f1fb",accent:"#e53e3e",ink:"#1f2933"},bgx:{type:"pat",pat:"grid",color:"#7fb2e5",a:0.35,size:32},f:{T:"Nanum Pen Script",H:"Gaegu",B:"Gowun Dodum"},
  s:{H:{bold:true},B:{fill:"#ffffff",stroke:"$main",sw:1,radius:6},B2:{fill:"#fff3b0"},C:{fill:"#fff3b0",color:"$accent"},G:{stroke:"$main",sw:1,radius:6},FB:{stroke:"$main",sw:1,radius:6}}},
 /* 11~20: 미리캔버스 진로·설문·과학 발표 템플릿 스타일 참고 */
 {n:"마이 드림 블루",deco:[["flank", "⭐", "⭐", 44]],d:"창문 틀, 파랑·노랑 알약 소제목",fr:"win",pal:{bg:"#e6ecf9",main:"#1f4fbf",sub:"#ffd23f",accent:"#ffd23f",ink:"#1a2a5e"},bgx:{type:"pat",pat:"dots",color:"#1f4fbf",a:0.14,size:34},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{H:{fill:"$sub",color:"$ink",stroke:"$ink",sw:2,radius:999,pad:8,align:"center"},B:{stroke:"$main",sw:3,radius:14},B2:{fill:"#fff6cf",stroke:"$main",sw:3},C:{fill:"$main",color:"#ffd23f"},G:{stroke:"$main",sw:3,radius:14},FB:{stroke:"$main",sw:3,radius:14}}},
 {n:"설문 결과 블루",deco:[["dots", "tl", "$main", 0.3], ["flank", null, "📊", 46]],d:"가운데 제목, 그림자 하얀 카드",fr:"tag",pal:{bg:"#f2f5fa",main:"#2f7de1",sub:"#dde9fb",accent:"#ffc93c",ink:"#1e2a3b"},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{H:{fill:"$main",color:"#ffffff",radius:999,pad:8,align:"center"},B:{stroke:"",sw:0,radius:18,shadow:true},B2:{fill:"#ffffff",stroke:"$main",sw:3},C:{fill:"$accent",color:"$ink"},G:{stroke:"",sw:0,radius:18,shadow:true},FB:{stroke:"",sw:0,radius:18,shadow:true}}},
 {n:"과학 교실 창문",deco:[["flank", "🔬", "🧪", 44]],d:"하늘색 바탕 창문 틀, 노란 소제목",fr:"win",pal:{bg:"#9cc0f5",main:"#ff7a3d",sub:"#fff1c9",accent:"#ffd23f",ink:"#2b2b2b"},f:{T:"Jua",H:"Do Hyeon",B:"Gowun Dodum"},
  s:{STT:{color:"$ink"},CT:{color:"$ink"},H:{fill:"$accent",color:"$ink",radius:8,pad:8},B:{fill:"#fffdf5",stroke:"$ink",sw:2,radius:12},B2:{fill:"$sub",stroke:"$ink",sw:2},C:{fill:"$main",color:"#ffffff"},G:{stroke:"$ink",sw:2,radius:12},FB:{stroke:"$ink",sw:2,radius:12}}},
 {n:"퍼플 크림",deco:[["flank", "✨", "✨", 44], ["blob", 0.0, 1.0, 0.1, "$sub", 1]],d:"크림 바탕, 보라 테두리 알약 제목",fr:"tag",pal:{bg:"#f7f2e8",main:"#8e5bb8",sub:"#e9dcf5",accent:"#f2b33d",ink:"#2e2438"},f:{T:"Sunflower",H:"Do Hyeon",B:"Gowun Dodum"},
  s:{H:{fill:"#ffffff",color:"$main",stroke:"$main",sw:3,radius:999,pad:8,align:"center"},B:{stroke:"$main",sw:2,radius:20},B2:{fill:"$sub",stroke:"",sw:0},C:{fill:"$sub",color:"$main"},G:{stroke:"$main",sw:2,radius:20},FB:{stroke:"$main",sw:2,radius:20}}},
 {n:"설문 보고 핑크",deco:[["mark", "$sub", 1], ["pix", "tr", "$main", 1]],d:"하얀 바탕, 분홍 밑줄 제목, 얇은 테두리",fr:"line",pal:{bg:"#ffffff",main:"#e8577a",sub:"#fde4ea",accent:"#222222",ink:"#222222"},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{STT:{color:"$ink"},CT:{color:"$ink"},H:{fill:"$sub",color:"$main",stroke:"$main",sw:2,radius:999,pad:8},B:{stroke:"$main",sw:2,radius:8},B2:{fill:"$sub",stroke:"$main",sw:2},C:{fill:"$main",color:"#ffffff"},G:{stroke:"$main",sw:2,radius:8},FB:{stroke:"$main",sw:2,radius:8}}},
 {n:"실험 보고서 옐로",deco:[["pix", "tr", "$sub", 0.9], ["flank", null, "🧪", 44]],d:"노란 바탕, 남색 띠, 네모난 표 칸",fr:"band",pal:{bg:"#fff8d6",main:"#1f4fa8",sub:"#ffe066",accent:"#4fb3ff",ink:"#12305f"},bg:"#fff8d6",f:{T:"Black Han Sans",H:"Noto Sans KR",B:"Noto Sans KR"},
  s:{H:{fill:"$main",color:"#ffffff",radius:0,pad:8,bold:true},B:{stroke:"$main",sw:2,radius:0},B2:{fill:"$sub",stroke:"$main",sw:2},C:{fill:"$sub",color:"$main"},G:{stroke:"$main",sw:2,radius:0},FB:{stroke:"$main",sw:2,radius:0}}},
 {n:"우주 네이비",deco:[["stars", "$accent"], ["flank", "🚀", "🪐", 46]],d:"짙은 남색 별 바탕, 주황 카드 제목",fr:"card",pal:{bg:"#1b2350",main:"#ff7a45",sub:"#2c3670",accent:"#ffd23f",ink:"#f5f7ff"},bgx:{type:"pat",pat:"dots",color:"#ffffff",a:0.22,size:46},f:{T:"Jua",H:"Do Hyeon",B:"Gowun Dodum"},
  s:{H:{color:"$accent"},B:{fill:"$sub",stroke:"$accent",sw:2,radius:18,color:"$ink"},B2:{fill:"#3a4590",color:"$ink"},C:{fill:"$accent",color:"#1b2350"},G:{fill:"#ffffff",stroke:"",sw:0,radius:18},FB:{fill:"$sub",stroke:"$accent",sw:2,radius:18},FA:{fill:"$accent"}}},
 {n:"블루 옐로 깔끔",deco:[["dots", "tr", "$main", 0.3], ["mark", "$accent", 0.55]],d:"가운데 제목, 연파랑 상자, 노란 강조",fr:"tag",pal:{bg:"#ffffff",main:"#2f80ed",sub:"#eaf2ff",accent:"#ffc52b",ink:"#1f2a3d"},f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{H:{fill:"$main",color:"#ffffff",radius:6,pad:8,align:"center"},B:{fill:"$sub",stroke:"",sw:0,radius:14},B2:{fill:"#fff5d1",stroke:"",sw:0},C:{fill:"$accent",color:"$ink"},G:{fill:"$sub",stroke:"",sw:0,radius:14},FB:{fill:"$sub",stroke:"",sw:0,radius:14}}},
 {n:"옐로 프로필",deco:[["flank", null, "💡", 44], ["dots", "tr", "$ink", 0.2]],d:"노란 사이드 막대, 까만 알약 소제목",fr:"side",pal:{bg:"#fbf6ea",main:"#f2b632",sub:"#fdebb9",accent:"#2b2b2b",ink:"#2b2b2b"},bg:"#fbf6ea",f:{T:"Black Han Sans",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{STT:{color:"$ink"},CT:{color:"$ink"},H:{fill:"$ink",color:"#ffffff",radius:999,pad:8,align:"center"},B:{stroke:"$ink",sw:2,radius:12},B2:{fill:"$sub",stroke:"$ink",sw:2},C:{fill:"$main",color:"$ink"},G:{stroke:"$ink",sw:2,radius:12},FB:{stroke:"$ink",sw:2,radius:12}}},
 {n:"차분한 그레이 블루",deco:[["band", "top", 8, "$main"], ["dots", "tr", "$main", 0.18]],d:"연회색 바탕, 남색 밑줄 제목, 그림자 카드",fr:"line",pal:{bg:"#f5f6f8",main:"#2c4f8f",sub:"#e2e8f2",accent:"#f5c242",ink:"#1f2633"},f:{T:"Do Hyeon",H:"Do Hyeon",B:"Noto Sans KR"},
  s:{B:{stroke:"#d4dae5",sw:1,radius:10,shadow:true},B2:{fill:"$sub",stroke:"",sw:0},C:{fill:"#fff4d0",color:"$main"},G:{stroke:"#d4dae5",sw:1,radius:10,shadow:true},FB:{stroke:"#d4dae5",sw:1,radius:10,shadow:true}}}
];
const SDZ_BASE={H:{color:"$main",fill:"",stroke:"",sw:0},B:{fill:"#ffffff",stroke:"$sub",sw:2,radius:16,color:"$ink",shadow:false},B2:{fill:"$sub",stroke:"",sw:0,color:"$ink"},
  C:{fill:"$sub",color:"$main",stroke:"",sw:0},G:{fill:"#ffffff",stroke:"",sw:0,radius:16,shadow:false},FB:{fill:"#ffffff",stroke:"$sub",sw:2,radius:16,shadow:false},
  FC:{},FN:{color:"#ffffff"},FT:{color:"$ink"},FA:{fill:"$sub"},CAP:{color:"$ink"},CS:{},CM:{},CT:{},STT:{},I:{}};
const CONTENT_TAGS=["B","B2","H","C","G","I","FB","FC","FN","FT","FA","CAP"];
function styleSlide(P,z){ // 색·글꼴·상자 모양만 (위치는 그대로)
  const pal=z.pal, rv=v=>typeof v==="string"&&v[0]==="$"?pal[v.slice(1)]:v;
  if(z.bg) P.bg=z.bg; if(z.bgx) P.bgx=JSON.parse(JSON.stringify(z.bgx)); else delete P.bgx;
  P.items.forEach(it=>{ const tg=it.tag; if(!tg||tg==="DEC") return; const st=Object.assign({},SDZ_BASE[tg]||{},z.s[tg]||{}); if(tg==="FC") st.fill=it.alt?pal.accent:pal.main;
    for(const [k,v] of Object.entries(st)) it[k]=rv(v);
    if(it.type==="text"){ const f=tg==="STT"||tg==="CT"?z.f.T:tg==="H"?z.f.H:["B","B2","C","CS","CM","FT","CAP"].includes(tg)?z.f.B:null; if(f) it.font=f; }
    if(it.type==="chart"&&it.chart) it.chart.color=pal.main; });
  putDeco(P,z.deco,pal);
}
function restyleSlide(P,z){ // 틀을 새로 깔고 내용은 새 틀 안으로 옮겨요
  if(!P.kind||!P.st){ styleSlide(P,z); return P; }
  const txt=tg=>{ const it=P.items.find(x=>x.tag===tg); return it?it.text:null; };
  const extra=P.items.filter(it=>!it.tag);
  if(P.kind==="cover"||P.kind==="end"){ const N=slide(z.fr,P.kind,{big:txt("CT"),sub:txt("CS"),team:txt("CM")}); N.id=P.id; N.items.push(...extra); styleSlide(N,z); return N; }
  const oA=AOF[P.st]||AOF.band, F=slideFrame(z.fr,txt("STT")||""), nA=F.A, sx=nA.w/oA.w, sy=nA.h/oA.h;
  if(P.kind==="blank"&&txt("STT")==null) F.items.splice(0,F.items.length,...F.items.filter(it=>it.tag!=="STT"));
  const content=P.items.filter(it=>CONTENT_TAGS.includes(it.tag)).map(it=>Object.assign(it,{x:r4(nA.x+(it.x-oA.x)*sx),y:r4(nA.y+(it.y-oA.y)*sy),w:Math.max(8,r4(it.w*sx)),h:Math.max(8,r4(it.h*sy))}));
  const N={id:P.id,bg:F.bg,items:F.items.concat(content,extra),kind:P.kind,st:z.fr}; styleSlide(N,z); return N;
}
function applySlideDesign(i){
  const z=SDZ[i]; if(!z) return; snap(); D.pal=Object.assign({name:z.n},z.pal); D.sdz=i; D.style=z.fr;
  D.slides=D.slides.map(P=>restyleSlide(P,z)); setCur(D.cur); sel=null; render(); strip(); save();
  if(O.status) O.status("추천 디자인 ‘"+z.n+"’을 모든 슬라이드에 입혔어요. 쓴 내용은 그대로예요. (↶ 되돌리기로 돌아갈 수 있어요)");
}
function deck(style){
  if(O.deck==="dream") return [slide(style,"cover",{sub:"나의 꿈과 진로를 소개합니다"}),
    slide(style,"photo",{title:"1. 나는 어떤 사람일까?",body:"좋아하는 일:\n잘하는 일:\n계속 하고 싶은 일:"}),
    slide(style,"two",{title:"2. 커리어넷 흥미 검사 결과",h1:"나의 흥미 유형",b1:"1순위:\n2순위:",h2:"추천 직업",b2:"1순위:\n2순위:",fill2:true}),
    slide(style,"photo",{title:"3. 내가 고른 직업",body:"직업 이름:\n\n고른 이유:"}),
    slide(style,"two",{title:"4. 이 직업은 어떤 일을 할까?",h1:"하는 일",b1:"• \n• \n• ",h2:"필요한 능력·성격",b2:"• \n• ",fill2:true}),
    slide(style,"two",{title:"5. 관련 학과와 자격증",h1:"관련 학과",b1:"• ○○학과\n• ○○학과",h2:"관련 자격증",b2:"• \n• "}),
    slide(style,"flow",{title:"6. 나의 진로 로드맵",steps:["중학교","고등학교","대학교 (학과)","자격·경험","나의 꿈 직업"],body:"지금부터 할 일: "}),
    slide(style,"two",{title:"7. 학습 계획",h1:"과목별 계획",b1:"수학:\n과학:\n영어:\n사회:",h2:"진로 탐색 활동",b2:"동아리·체험 활동:",fill2:true}),
    slide(style,"two",{title:"8. 느낀 점과 다짐",h1:"느낀 점",b1:"꿈조사를 하며 새로 알게 된 점",h2:"나의 다짐",b2:"꿈을 이루기 위해 꼭 할 일"}),
    slide(style,"end")];
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
function newSlide(kind){ const z=D.sdz!=null?SDZ[D.sdz]:null, P=slide(z?z.fr:(D.style||"band"),kind); if(z) styleSlide(P,z); return P; }
function applyDeck(){
  snap(); const z=D.sdz!=null?SDZ[D.sdz]:null; D.slides=deck(z?z.fr:(D.style||"band")); if(z) D.slides.forEach(P=>styleSlide(P,z));
  setCur(0); sel=null; render(); strip(); save(false,true); D.fresh=true;
  if(O.status) O.status("발표 순서대로 슬라이드 "+D.slides.length+"장을 만들었어요."+(z?" (디자인: "+z.n+")":" ‘🎨 추천 디자인’에서 디자인을 골라 보세요."));
}
function deckNote(el){ const z=D.sdz!=null?SDZ[D.sdz]:null;
  el.innerHTML='누르면 발표 순서대로 슬라이드 <b>'+(O.deck==="dream"?10:11)+'장</b>이 한 번에 생겨요.<br>'+(z?'지금 디자인: <b>'+esc(z.n)+'</b>':'디자인은 옆의 ‘🎨 추천 디자인’에서 20가지 중에 골라요 (쓴 내용은 그대로).'); }
/* 미리보기: 디자인·배치를 작은 그림으로 */
function pvCanvas(cv,page,w){ const s=w/W; cv.width=Math.round(w*2); cv.height=Math.round(H*s*2); const c=cv.getContext("2d"); c.setTransform(2*s,0,0,2*s,0,0); drawPage(c,page); }
function sdzPop(){ return '<span class="pdd"><button type="button" data-pop="sdz" class="pfancy">🎨 추천 디자인 ▾</button><span class="ppop pdz psdz" data-popbox="sdz" hidden><b>쓴 내용은 그대로, 틀·색·배경·글꼴이 바뀌어요</b><span class="pdzg">'+
  SDZ.map((z,i)=>'<button type="button" data-sdz="'+i+'"'+(D.sdz===i?' class="on"':'')+'><canvas data-sdzpv="'+i+'"></canvas><b>'+(i+1)+'. '+esc(z.n)+'</b><small>'+esc(z.d)+'</small></button>').join("")+'</span></span></span>'; }
function drawSdzPreviews(){
  const keep=D.pal; bar.querySelectorAll("[data-sdzpv]").forEach(cv=>{ const z=SDZ[+cv.dataset.sdzpv]; D.pal=z.pal;
    const P=slide(z.fr,"two",{title:O.deck==="dream"?"4. 이 직업은 어떤 일을 할까?":"2. 탐구 질문과 가설",h1:O.deck==="dream"?"하는 일":"탐구 질문",b1:"• 내용을 써요\n• 내용을 써요",h2:O.deck==="dream"?"필요한 능력":"가설",b2:"~할수록 ~할 것이다.",fill2:true}); styleSlide(P,z); pvCanvas(cv,P,176); });
  if(keep) D.pal=keep; else delete D.pal;
}
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
  const L=P.items.concat(P.bgx&&P.bgx.type==="img"?[{type:"image",src:P.bgx.src}]:[]); if(L.some(it=>it.type==="image"&&it.src&&!IMG.has(it.src))) loadImgs(L).then(()=>thumb(i));
}
function onStrip(e){
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.pop2){ const p=stripEl.querySelector("[data-popbox2]"); p.hidden=!p.hidden; keepIn(p); return; }
  if(b.dataset.go!=null){ setCur(+b.dataset.go); sel=null; render(); strip(); return; }
  if(b.dataset.lay){ snap(); D.slides.splice(D.cur+1,0,newSlide(b.dataset.lay)); setCur(D.cur+1); sel=null; render(); strip(); save(); return; }
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

/* ---------- PowerPoint(.pptx) 파일로 만들기: 글·도형·그래프를 고칠 수 있게 그대로 옮겨요 ---------- */
function loadPptxLib(){
  if(window.PptxGenJS) return Promise.resolve();
  return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=(O.pptxSrc||"vendor/pptxgen.bundle.js"); s.onload=()=>window.PptxGenJS?res():rej(new Error("pptx")); s.onerror=()=>rej(new Error("pptx")); document.head.appendChild(s); });
}
const imgsOf=list=>list.concat(pagesOf().filter(P=>P.bgx&&P.bgx.type==="img"&&P.bgx.src).map(P=>({type:"image",src:P.bgx.src})));
async function toPptx(){
  await loadPptxLib(); const all=pagesOf().flatMap(P=>P.items); await loadFonts(all); await loadImgs(imgsOf(all));
  const pp=new window.PptxGenJS(); pp.layout="LAYOUT_WIDE"; pp.title=(O.title&&O.title())||"발표자료";
  const I=v=>Math.round(v/96*1000)/1000, PT=v=>Math.round(v*0.75*10)/10;
  const hx=c=>{ const m=String(c||"").match(/^#?([0-9a-f]{6})$/i); return m?m[1].toUpperCase():null; };
  const FF=f=>/Serif|Song Myung/.test(f||"")?"바탕":"맑은 고딕";
  const strong=it=>!!it.bold||["Black Han Sans","Do Hyeon","Jua","Gugi","Yeon Sung"].includes(it.font);
  const SH={type:"outer",angle:90,blur:9,offset:4,color:"000000",opacity:0.28}, TSH={type:"outer",angle:45,blur:3,offset:2,color:"000000",opacity:0.4};
  const NATIVE={rect:"rect",round:"roundRect",ellipse:"ellipse",triangle:"triangle",diamond:"diamond",hexagon:"hexagon",star:"star5",heart:"heart",arrow:"rightArrow"};
  const tr=it=>it.op!=null&&it.op<1?Math.round((1-it.op)*100):0;
  const common=it=>Object.assign({},it.rot?{rotate:it.rot}:{});
  const geo=it=>({x:I(it.x),y:I(it.y),w:I(Math.max(1,it.w)),h:I(Math.max(1,it.h))});
  function png(it){ const m=28, k=2, cv=document.createElement("canvas"); cv.width=Math.round((it.w+2*m)*k); cv.height=Math.round((it.h+2*m)*k);
    const c=cv.getContext("2d"); c.setTransform(k,0,0,k,0,0); c.translate(m-it.x,m-it.y); if(it.op!=null&&it.op<1) c.globalAlpha=it.op;
    drawItem(c,it.type==="text"?Object.assign({},it,{text:""}):it); const data=cv.toDataURL("image/png"); cv.width=cv.height=0;
    return Object.assign({data,x:I(it.x-m),y:I(it.y-m),w:I(it.w+2*m),h:I(it.h+2*m)},common(it)); }
  for(const P of pagesOf()){
    const s=pp.addSlide();
    if(P.bgx){ const cv=document.createElement("canvas"); cv.width=W; cv.height=H; drawBg(cv.getContext("2d"),P); s.background={data:cv.toDataURL("image/jpeg",0.9)}; cv.width=cv.height=0; }
    else s.background={color:hx(P.bg)||"FFFFFF"};
    for(const it of P.items){
      const g=geo(it), t=th(), T=tr(it);
      if(it.type==="text"){
        const plain=!it.bshape, f=plain&&hx(it.fill), st=plain&&it.stroke&&it.sw?hx(it.stroke):null, R=Math.min(it.radius||0,it.w/2,it.h/2);
        if(!plain) s.addImage(png(it));
        const hh=it.bshape==="bubble"?it.h*0.8:it.h;
        s.addText(it.text||"",Object.assign({x:g.x,y:g.y,w:g.w,h:I(hh),shape:R>0&&plain?pp.ShapeType.roundRect:pp.ShapeType.rect,fontFace:FF(it.font),fontSize:PT(it.size),bold:strong(it),color:hx(it.color)||"222222",
          align:it.align||"left",valign:it.valign==="middle"?"middle":"top",margin:PT(it.pad||0),lineSpacingMultiple:1.15,wrap:true},common(it),
          T?{transparency:T}:{}, f?{fill:{color:f,transparency:T}}:{}, st?{line:{color:st,width:PT(it.sw)}}:{}, R>0&&plain?{rectRadius:I(R)}:{},
          it.tline>0?{outline:{size:PT(it.tline),color:hx(it.tlc)||"222222"}}:{},
          (f&&it.shadow)?{shadow:SH}:(!f&&it.tshadow)?{shadow:TSH}:{})); continue; }
      if(it.type==="shape"){
        const k=it.shape||"round", L=LINES.includes(k), f=hx(it.fill), st=it.stroke&&it.sw?hx(it.stroke):null;
        if(L&&k!=="wave"){ s.addShape(pp.ShapeType.line,Object.assign({x:g.x,y:I(it.y+it.h/2),w:g.w,h:0,line:{color:f||"333333",width:PT(Math.max(2,it.h)),dashType:k==="dash"?"dash":k==="dot"?"sysDot":"solid",transparency:T}},common(it))); continue; }
        if(NATIVE[k]){ const o=Object.assign({},g,common(it),{fill:f?{color:f,transparency:T}:{type:"none"},line:st?{color:st,width:PT(it.sw)}:{type:"none"}},it.shadow&&f?{shadow:SH}:{});
          if(k==="round") o.rectRadius=I(Math.min(it.radius==null?24:it.radius,it.w/2,it.h/2));
          s.addShape(pp.ShapeType[NATIVE[k]],o); continue; }
        s.addImage(png(it)); continue; }
      if(it.type==="sticker"){ s.addText(it.emoji,Object.assign({},g,common(it),{fontFace:"Segoe UI Emoji",fontSize:PT(Math.min(it.w,it.h)*0.7),align:"center",valign:"middle",margin:0})); continue; }
      if(it.type==="image"){ const im=it.src&&IMG.get(it.src); if(!im) continue;
        if((it.radius||0)>0||it.shadow||(it.stroke&&it.sw)){ s.addImage(png(it)); continue; } // 둥근 모서리·그림자는 그림 그대로
        const iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height, ex=Object.assign(common(it),T?{transparency:T}:{});
        if(it.fit==="contain"){ const k=Math.min(it.w/iw,it.h/ih), w=iw*k, h=ih*k; s.addImage(Object.assign({data:it.src,x:I(it.x+(it.w-w)/2),y:I(it.y+(it.h-h)/2),w:I(w),h:I(h)},ex)); }
        else{ const k=Math.max(it.w/iw,it.h/ih); s.addImage(Object.assign({data:it.src,x:g.x,y:g.y,w:I(iw*k),h:I(ih*k),sizing:{type:"cover",w:g.w,h:g.h}},ex)); }
        continue; }
      if(it.type==="chart"){
        if(it.rot){ s.addImage(png(it)); continue; }
        if(it.fill||(it.stroke&&it.sw)){ const R=Math.min(it.radius||0,it.w/2,it.h/2), f=hx(it.fill), st=it.stroke&&it.sw?hx(it.stroke):null;
          s.addShape(R>0?pp.ShapeType.roundRect:pp.ShapeType.rect,Object.assign({},g,{fill:f?{color:f,transparency:T}:{type:"none"},line:st?{color:st,width:PT(it.sw)}:{type:"none"}},R>0?{rectRadius:I(R)}:{},it.shadow&&f?{shadow:SH}:{})); }
        const c=it.chart||{}, n=Math.min((c.labels||[]).length,(c.values||[]).length); if(!n) continue;
        const ink=(it.fill&&isDark(it.fill))?"F1F5F5":(hx(t.ink)||"222222"), pie=c.kind==="pie"||c.kind==="donut";
        const type=pie?(c.kind==="donut"?pp.ChartType.doughnut:pp.ChartType.pie):c.kind==="line"?pp.ChartType.line:pp.ChartType.bar;
        const cols=c.mono||c.kind==="line"?[hx(c.color)||hx(t.main)]:PAL.map(hx);
        const fnt={catAxisLabelFontFace:"맑은 고딕",valAxisLabelFontFace:"맑은 고딕",dataLabelFontFace:"맑은 고딕",legendFontFace:"맑은 고딕",titleFontFace:"맑은 고딕"};
        s.addChart(type,[{name:c.title||"응답",labels:c.labels.slice(0,n),values:c.values.slice(0,n).map(v=>+v||0)}],Object.assign({x:I(it.x+8),y:I(it.y+8),w:I(it.w-16),h:I(it.h-16),
          showTitle:!!c.title,title:c.title||"",titleFontSize:14,titleColor:ink,chartColors:cols,showValue:!!c.showVal,dataLabelFontSize:10,dataLabelColor:pie?"FFFFFF":ink,
          catAxisLabelFontSize:10,catAxisLabelColor:ink,valAxisLabelFontSize:9,valAxisLabelColor:ink,valGridLine:{color:"D9DFE0",size:0.5},
          barDir:c.kind==="hbar"?"bar":"col",barGapWidthPct:60,showLegend:pie,legendPos:"r",legendFontSize:10,legendColor:ink,showPercent:pie&&!!c.showVal,holeSize:50,
          lineSize:2,lineDataSymbol:"circle",lineDataSymbolSize:7},fnt,c.kind==="hbar"?{catAxisOrientation:"maxMin"}:{})); }
    }
  }
  return await pp.write({outputType:"blob"});
}
window.FPoster={mount,flush,hasContent,toImage,toImages,toPptx,parseData,SIZE:{w:257,h:364},size:()=>SL()?{w:338.67,h:190.5}:{w:257,h:364},count:()=>pagesOf().length,present};
})();
