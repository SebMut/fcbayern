import { BASE_M, D, MON } from "./schedule.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm";

const SUPABASE_URL="https://kmhadzujovvxvpgblgkk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y";
const LOGIN_EMAIL="Sebastian.Mutter@outlook.com";
const SEASON="2026-27";
const ACTORS={admin:"Admin",patrick:"Patrick",ober:"Ober"};

const sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});

const $=id=>document.getElementById(id);
const app=$("app"),q=$("q"),sv=$("sv"),s1=$("s1"),s2=$("s2"),so=$("so"),sp=$("sp"),spPatrick=$("spPatrick"),spReini=$("spReini"),spGuests=$("spGuests"),
l1=$("l1"),l2=$("l2"),loginScreen=$("loginScreen"),loginForm=$("loginForm"),
loginUser=$("loginUser"),loginPassword=$("loginPassword"),loginError=$("loginError"),
userbar=$("userbar"),userEmail=$("userEmail"),logoutBtn=$("logoutBtn"),syncStatus=$("syncStatus"),lastFixtureSync=$("lastFixtureSync");

let M=BASE_M.map(x=>({...x}));
let F="rel";
let S={p1:"Patrick",p2:"Reini",assignments:{},guests:{},paid:{},notes:{}};
let currentUser=null,currentActor=null,saveTimer=null,realtimeChannel=null,loadingRemote=false,pendingAutoScroll=true;

function normalizeState(x){
  x=x||{};
  const A=x.assignments||{},P=x.paid||{};
  Object.keys(P).forEach(id=>{
    if(typeof P[id]==="boolean"){
      const z={};(A[id]||[]).forEach(v=>z[v]=P[id]);P[id]=z;
    }
  });
  return {p1:"Patrick",p2:"Reini",assignments:A,guests:x.guests||{},paid:P,notes:x.notes||{}};
}
function setSync(text,error=false){syncStatus.textContent=text;syncStatus.classList.toggle("err",error)}
async function loadLastFixtureSync(){
  const {data,error}=await sb.from("fixture_sync_runs")
    .select("finished_at")
    .eq("status","success")
    .not("finished_at","is",null)
    .order("finished_at",{ascending:false})
    .limit(1)
    .maybeSingle();

  if(error){
    console.error("Letzter Spieltagssync konnte nicht geladen werden:",error);
    lastFixtureSync.textContent="Letzter Spieltagssync: –";
    return;
  }

  if(!data?.finished_at){
    lastFixtureSync.textContent="Letzter Spieltagssync: noch nie";
    return;
  }

  const formatted=new Intl.DateTimeFormat("de-DE",{
    timeZone:"Europe/Berlin",
    day:"2-digit",month:"2-digit",year:"numeric",
    hour:"2-digit",minute:"2-digit"
  }).format(new Date(data.finished_at));

  lastFixtureSync.textContent=`Letzter Spieltagssync: ${formatted}`;
}
async function loadRemoteState(){
  const {data,error}=await sb.from("season_state").select("data").eq("season",SEASON).single();
  if(error){
    const detail=error?.message||error?.code||"Unbekannter Supabase-Fehler";
    throw new Error("season_state: "+detail);
  }
  S=normalizeState(data.data);render();
}
async function loadRemoteMatches(){
  const {data,error}=await sb.from("match_overrides")
    .select("id,start_date,end_date,kickoff_time,opponent,home,possible,active")
    .eq("season",SEASON);
  if(error){
    console.warn("Match-Overrides nicht verfügbar, verwende Grundspielplan:",error);
    M=BASE_M.map(x=>({...x}));
    return;
  }
  const byId=new Map((data||[]).map(x=>[x.id,x]));
  M=BASE_M.map(base=>{
    const x=byId.get(base.id);
    if(x?.active===false)return null;
    if(!x)return {...base};
    return {...base,
      s:x.start_date||base.s,
      e:x.end_date||x.start_date||base.e,
      t:x.kickoff_time?String(x.kickoff_time).slice(0,5):(x.start_date?"":base.t),
      o:x.opponent||base.o,
      h:x.home??base.h,
      pos:x.possible??base.pos
    };
  }).filter(Boolean);
}
function queueSave(){
  if(!currentUser||loadingRemote)return;
  setSync("speichert …");
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveRemoteState,350);
}
async function saveRemoteState(){
  if(!currentUser)return;
  const {error}=await sb.from("season_state").update({
    data:JSON.parse(JSON.stringify(S)),
    updated_by:currentActor||"Admin",
    updated_at:new Date().toISOString()
  }).eq("season",SEASON);
  if(error){console.error(error);setSync("Fehler beim Speichern",true);return}
  setSync("gespeichert");
}
function subscribeRealtime(){
  if(realtimeChannel)sb.removeChannel(realtimeChannel);
  realtimeChannel=sb.channel("fcb-season-2026-27")
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"season_state",filter:`season=eq.${SEASON}`},payload=>{
      if(!payload.new?.data)return;
      loadingRemote=true;S=normalizeState(payload.new.data);render();loadingRemote=false;setSync("synchron");
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"match_overrides",filter:`season=eq.${SEASON}`},async()=>{
      try{await loadRemoteMatches();await loadLastFixtureSync();render();setSync("Termine aktualisiert")}catch(e){console.error(e)}
    }).subscribe();
}
function showApp(user){
  currentUser=user;
  pendingAutoScroll=true;
  document.body.classList.remove("locked");
  loginScreen.classList.add("hidden");
  userbar.hidden=false;
  userEmail.textContent=currentActor||"angemeldet";
}
function showLogin(message=""){
  currentUser=null;currentActor=null;
  document.body.classList.add("locked");
  loginScreen.classList.remove("hidden");
  userbar.hidden=true;
  loginError.textContent=message;
}
function E(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function L(n){const d=D[n];return d?`<img class="logo" src="https://www.google.com/s2/favicons?domain=${d}&sz=128">`:`<i class="ph">?</i>`}
function T(m){if(m.c==="bl"||(m.c==="dfb"&&m.id==="dfb01"))return m.h?["FC Bayern",m.o]:[m.o,"FC Bayern"];return["FC Bayern","?"]}
function dt(m){
  const a=new Date(m.s+"T12:00:00"),b=new Date(m.e+"T12:00:00");
  return m.s===m.e
    ?[`${String(a.getDate()).padStart(2,"0")}.${String(a.getMonth()+1).padStart(2,"0")}.${String(a.getFullYear()).slice(2)}`,m.t?m.t+" Uhr":""]
    :[`${a.getDate()}.–${b.getDate()}. ${MON[a.getMonth()]}`,String(a.getFullYear())];
}
function rel(m){return m.c==="bl"&&m.h||(m.c!=="bl"&&m.pos&&!m.n)}
function visible(){
  const z=q.value.toLowerCase();
  return M.filter(m=>{
    const a=S.assignments[m.id]||[];
    let ok=false;
    if(F==="rel") ok=rel(m);
    else if(F==="all") ok=true;
    else if(F==="open") ok=rel(m)&&!a.length;
    else if(F==="bl") ok=m.c==="bl"&&m.h;
    else ok=m.c===F;
    return ok&&(!z||[m.l,m.o,m.p].join(" ").toLowerCase().includes(z));
  });
}
function berlinToday(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=t=>parts.find(p=>p.type===t)?.value||"";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function nextVisibleMatch(matches){
  const today=berlinToday();
  return matches.find(m=>(m.e||m.s)>=today)||matches.at(-1)||null;
}
function scrollToCurrentOrNext(matches){
  const next=nextVisibleMatch(matches);
  document.querySelectorAll(".game.nextgame").forEach(el=>el.classList.remove("nextgame"));
  if(!next)return;
  const el=document.getElementById(`game-${next.id}`);
  if(!el)return;
  el.classList.add("nextgame");
  setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),80);
}
function club(n,r=""){return`<div class="club ${r}">${r?`<span>${E(n)}</span>${L(n)}`:`${L(n)}<span>${E(n)}</span>`}</div>`}
function card(m){
  const [d,sub]=dt(m),[a,b]=T(m),x=S.assignments[m.id]||[],g=S.guests[m.id]||{},pay=S.paid[m.id]||{},full=x.length===2;
  const B=(v,n)=>{
    const sel=x.includes(v),blocked=full&&!sel,done=!!pay[v],guest=v==="g1"||v==="g2",guestName=g[v]||"";
    return`<div class="pickcell ${sel?"sel":blocked?"blocked":""}">
      <button class="choose" data-id="${m.id}" data-v="${v}" ${blocked?"disabled":""}>${E(guest&&sel&&guestName?guestName:n)}</button>
      ${sel&&guest?`<input class="guestname" data-id="${m.id}" data-g="${v}" value="${E(guestName)}" placeholder="${v==="g1"?"Name Gast 1":"Name Gast 2"}">`:""}
      ${sel?`<label class="paymini ${done?"done":""}"><input type="checkbox" data-pay="${m.id}" data-person="${v}" ${done?"checked":""}> ${done?"bezahlt ✓":"bezahlt"}</label>`:""}
    </div>`;
  };
  return`<div class="game" id="game-${m.id}" data-date="${m.s}">
    <div class="toprow"><div class="date">${d}<small>${sub}</small></div><div class="duel">${club(a)}<b>–</b>${club(b,"r")}</div></div>
    <div class="meta"><span class="tag">${m.c==="bl"?"Bundesliga":m.c==="dfb"?"DFB-Pokal":"Champions League"}</span> · ${E(m.l)} · ${E(m.p)}</div>
    <div class="pick"><button class="openpick ${x.length?"":"sel"}" data-id="${m.id}" data-v="open">Offen</button>${B("p1","Patrick")}${B("p2","Reini")}${B("g1","Gast 1")}${B("g2","Gast 2")}</div>
    <div class="extra"><span>${x.length}/2 Karten vergeben</span></div>
    <textarea class="note" data-note="${m.id}" placeholder="Notiz">${E(S.notes[m.id]||"")}</textarea>
  </div>`;
}
function render(){
  l1.textContent="Patrick";l2.textContent="Reini";
  const v=visible(),G={};
  v.forEach(m=>{
    const d=new Date(m.s+"T12:00:00"),k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    (G[k]||=[]).push(m);
  });
  app.innerHTML=Object.keys(G).sort().map(k=>`<h2>${MON[+k.slice(5)-1]} ${k.slice(0,4)}</h2>${G[k].map(card).join("")}`).join("");
  bind();
  const ids=new Set(v.map(m=>m.id));let a=0,b=0,o=0,p=0,pp=0,pr=0,pg=0;
  M.forEach(m=>{
    if(!ids.has(m.id))return;
    const x=S.assignments[m.id]||[],pay=S.paid[m.id]||{};
    a+=x.includes("p1");b+=x.includes("p2");o+=!x.length;
    p+=x.filter(person=>pay[person]).length;
    if(x.includes("p1")&&pay.p1)pp++;
    if(x.includes("p2")&&pay.p2)pr++;
    if(x.includes("g1")&&pay.g1)pg++;
    if(x.includes("g2")&&pay.g2)pg++;
  });
  sv.textContent=v.length;s1.textContent=a;s2.textContent=b;so.textContent=o;sp.textContent=p;
  if(spPatrick)spPatrick.textContent=pp;
  if(spReini)spReini.textContent=pr;
  if(spGuests)spGuests.textContent=pg;
  const next=nextVisibleMatch(v);
  if(next){
    const el=document.getElementById(`game-${next.id}`);
    if(el)el.classList.add("nextgame");
  }
  if(pendingAutoScroll&&currentUser){pendingAutoScroll=false;scrollToCurrentOrNext(v)}
}
function bind(){
  document.querySelectorAll(".choose,.openpick").forEach(b=>b.onclick=()=>{
    const id=b.dataset.id,v=b.dataset.v;let x=[...(S.assignments[id]||[])];
    if(v==="open"){x=[];S.paid[id]={}}
    else if(x.includes(v)){x=x.filter(y=>y!==v);if(S.paid[id])delete S.paid[id][v]}
    else if(x.length<2)x.push(v);
    S.assignments[id]=x;queueSave();render();
  });
  document.querySelectorAll("[data-g]").forEach(e=>{
    e.onclick=ev=>ev.stopPropagation();
    e.oninput=()=>{
      S.guests[e.dataset.id]||={};S.guests[e.dataset.id][e.dataset.g]=e.value;queueSave();
      const btn=e.closest(".pickcell")?.querySelector(".choose");
      if(btn)btn.textContent=e.value.trim()||(e.dataset.g==="g1"?"Gast 1":"Gast 2");
    };
  });
  document.querySelectorAll("[data-pay]").forEach(e=>e.onchange=()=>{
    const id=e.dataset.pay,v=e.dataset.person;S.paid[id]||={};S.paid[id][v]=e.checked;queueSave();render();
  });
  document.querySelectorAll("[data-note]").forEach(e=>e.oninput=()=>{S.notes[e.dataset.note]=e.value;queueSave()});
}
document.querySelectorAll(".tools button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tools button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on");F=b.dataset.f;pendingAutoScroll=true;render();
});
q.oninput=render;

loginForm.addEventListener("submit",async e=>{
  e.preventDefault();loginError.textContent="";
  const actor=ACTORS[loginUser.value];
  if(!actor){loginError.textContent="Bitte einen Benutzer auswählen.";return}
  const {data,error}=await sb.auth.signInWithPassword({email:LOGIN_EMAIL,password:loginPassword.value});
  if(error){loginError.textContent="Passwort ist nicht korrekt.";return}
  try{
    currentActor=actor;
    sessionStorage.setItem("fcb-current-actor",actor);
    showApp(data.user);
    await loadRemoteMatches();
    await loadLastFixtureSync();
    await loadRemoteState();
    subscribeRealtime();
    loginPassword.value="";
  }catch(err){
    console.error(err);
    await sb.auth.signOut();
    showLogin("Saisondaten konnten nicht geladen werden: "+(err?.message||"unbekannter Fehler"));
  }
});

logoutBtn.addEventListener("click",async()=>{
  if(realtimeChannel)await sb.removeChannel(realtimeChannel);
  await sb.auth.signOut();
  sessionStorage.removeItem("fcb-current-actor");
  showLogin();
});

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user){showLogin();return}
  currentActor=sessionStorage.getItem("fcb-current-actor");
  if(!["Admin","Patrick","Ober"].includes(currentActor)){
    await sb.auth.signOut();showLogin();return;
  }
  try{
    showApp(session.user);await loadRemoteMatches();await loadLastFixtureSync();await loadRemoteState();subscribeRealtime();
  }catch(err){
    console.error(err);
    await sb.auth.signOut();
    sessionStorage.removeItem("fcb-current-actor");
    showLogin("Saisondaten konnten nicht geladen werden: "+(err?.message||"unbekannter Fehler"));
  }
}
boot();
