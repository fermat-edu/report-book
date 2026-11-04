const FOLDER_NAME = '보고서·독서록 제출함';
const TEACHER_KEY = '여기에비밀번호';

function folder_(){const it=DriveApp.getFoldersByName(FOLDER_NAME);return it.hasNext()?it.next():DriveApp.createFolder(FOLDER_NAME);}
function saveFolder_(){const p=folder_(),it=p.getFoldersByName('중간저장');return it.hasNext()?it.next():p.createFolder('중간저장');}
/* 반 이름 목록: 학생들이 제출할 때 처음 보는 반이면 등록 (줄임말보다 긴 이름을 남김) */
function classes_(){ try{ return JSON.parse(PropertiesService.getScriptProperties().getProperty('classes')||'[]'); }catch(e){ return []; } }
function addClass_(label){
  const m=String(label||'').match(/__\d+학년(.+?)반_/); if(!m) return;
  let c=m[1].replace(/\s+/g,'').replace(/^\d+/,''); if(!c||/^\d+$/.test(c)) return; if(/^[a-z0-9]+$/i.test(c)) c=c.toUpperCase();
  const lock=LockService.getScriptLock(); lock.waitLock(5000);
  try{ let L=classes_(); if(L.indexOf(c)>=0) return; if(L.some(x=>x.indexOf(c)===0)) return; // 이미 있는 반의 줄임말
    L=L.filter(x=>c.indexOf(x)!==0); L.push(c); PropertiesService.getScriptProperties().setProperty('classes',JSON.stringify(L)); }
  finally{ lock.releaseLock(); }
}
/* 같은 학생·같은 주제·같은 양식으로 다시 내면 예전 파일은 휴지통으로 (마지막 것만 남김) */
function trashOld_(prefix){ // 이름_MMdd_HHmm.확장자 (확장자는 무엇이든)
  const re=new RegExp('^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'_\\d{4}_\\d{4}\\.[A-Za-z0-9]+$');
  const it=folder_().getFiles(); while(it.hasNext()){ const f=it.next(); if(re.test(f.getName())) f.setTrashed(true); }
}
function out_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function inFolder_(f){const id=folder_().getId(),ps=f.getParents();while(ps.hasNext())if(ps.next().getId()===id)return true;return false;}
function clean_(s){return String(s||'이름없음').replace(/[\\/:*?"<>|]/g,'').slice(0,80);}
function stamp_(){return Utilities.formatDate(new Date(),'Asia/Seoul','MMdd_HHmm');}

/* 처음 한 번 실행해서 권한을 허용해 주세요 (영상 올리기에 필요) */
function setup(){ folder_(); UrlFetchApp.getRequest('https://www.googleapis.com/drive/v3/about'); Logger.log('준비 완료'); }

function doPost(e){
  try{
    const d=JSON.parse(e.postData.contents);
    /* 영상: 1) 업로드 시작 */
    if(d.action==='vstart'){
      const ext=String(d.ext||'.mp4').replace(/[^.a-zA-Z0-9]/g,'').slice(0,6)||'.mp4';
      const tag=['영상','발표자료'].indexOf(d.tag)>=0?d.tag:'영상';
      trashOld_(clean_(d.label)+'_'+tag);
      const name=clean_(d.label)+'_'+tag+'_'+stamp_()+ext;
      const r=UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',{
        method:'post',contentType:'application/json; charset=UTF-8',
        payload:JSON.stringify({name:name,mimeType:d.mime||'video/mp4',parents:[folder_().getId()]}),
        headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'X-Upload-Content-Type':d.mime||'video/mp4','X-Upload-Content-Length':String(d.size)},
        muteHttpExceptions:true});
      const h=r.getHeaders(), loc=h.Location||h.location;
      if(!loc) return out_({ok:false,error:'vstart '+r.getResponseCode()});
      return out_({ok:true,session:loc,file:name});
    }
    /* 영상: 2) 조각 올리기 */
    if(d.action==='vchunk'){
      if(String(d.session).indexOf('https://www.googleapis.com/upload/drive/v3/files')!==0) return out_({ok:false,error:'bad session'});
      const bytes=Utilities.base64Decode(d.data), start=Number(d.start), end=start+bytes.length-1;
      const r=UrlFetchApp.fetch(d.session,{method:'put',payload:bytes,contentType:d.mime||'video/mp4',
        headers:{'Content-Range':'bytes '+start+'-'+end+'/'+d.size},muteHttpExceptions:true});
      const c=r.getResponseCode();
      if(c===308) return out_({ok:true,done:false});
      if(c===200||c===201) return out_({ok:true,done:true});
      return out_({ok:false,error:'chunk '+c});
    }
    /* 중간 저장 · 불러오기 (이름 + 핸드폰 뒷자리) */
    if(d.action==='save'||d.action==='load'){
      const pin=String(d.pin||'').replace(/\D/g,''), nm=String(d.name||'').replace(/\s+/g,'');
      if(!nm||pin.length!==4) return out_({ok:false,error:'id'});
      const key=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,nm+'|'+pin,Utilities.Charset.UTF_8).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('')+'.json';
      const sf=saveFolder_(), it=sf.getFilesByName(key);
      if(d.action==='load'){ if(!it.hasNext()) return out_({ok:true,data:null}); const f=it.next(); return out_({ok:true,data:f.getBlob().getDataAsString('UTF-8'),time:f.getLastUpdated().getTime()}); }
      while(it.hasNext()) it.next().setTrashed(true);
      const f=sf.createFile(Utilities.newBlob(String(d.data||''),'application/json',key)); f.setDescription(clean_(d.label));
      return out_({ok:true});
    }
    /* 보고서 PDF */
    if(d.action==='classes') return out_({ok:true,classes:classes_()});
    if(!d.pdf) return out_({ok:false,error:'no file'});
    trashOld_(clean_(d.label)); try{ addClass_(d.label); }catch(e){}
    const name=clean_(d.label)+'_'+stamp_()+'.pdf';
    folder_().createFile(Utilities.newBlob(Utilities.base64Decode(d.pdf),'application/pdf',name));
    return out_({ok:true,file:name});
  }catch(err){ return out_({ok:false,error:String(err)}); }
}

function doGet(e){
  const p=e.parameter||{};
  if(p.key!==TEACHER_KEY) return out_({ok:false,error:'password'});
  if(p.action==='list'){
    const list=[],files=folder_().getFiles();
    while(files.hasNext()){const f=files.next();list.push({id:f.getId(),name:f.getName(),time:f.getDateCreated().getTime(),size:f.getSize(),mime:f.getMimeType()});}
    list.sort((a,b)=>b.time-a.time); return out_({ok:true,files:list,classes:classes_()});
  }
  if(p.action==='file'||p.action==='delete'){
    const f=DriveApp.getFileById(p.id); if(!inFolder_(f)) return out_({ok:false,error:'not found'});
    if(p.action==='delete'){f.setTrashed(true);return out_({ok:true});}
    return out_({ok:true,name:f.getName(),pdf:Utilities.base64Encode(f.getBlob().getBytes())});
  }
  return out_({ok:true});
}
