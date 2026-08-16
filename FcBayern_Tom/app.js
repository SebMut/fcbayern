import { BASE_M, D, MON } from "./schedule.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm";

const SUPABASE_URL="https://kmhadzujovvxvpgblgkk.supabase.co";
const SUPABASE_KEY="sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y";
const LOGIN_EMAIL="Sebastian.Mutter@outlook.com";
const STATE_SEASON="2026-27-tom";
const FIXTURE_SEASON="2026-27";
const VARIANT="tom";
const PAYPAL_ME="https://www.paypal.me/tommaerz";
const ACTORS={admin:"Admin",tom:"Tom"};
const ACTOR_ORDER=["Admin","Tom"];
const ACTOR_KEY="fcb-tom-current-actor";
const MAX_TICKETS=4;
const SLOTS={t1:"Tom1",t2:"Tom2",s1:"Staudter 1",s2:"Staudter 2"};
const SLOT_ORDER=["t1","t2","s1","s2"];

const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const app=$("app"),q=$("q"),sv=$("sv"),so=$("so"),loginScreen=$("loginScreen"),loginForm=$("loginForm"),loginUser=$("loginUser"),loginPassword=$("loginPassword"),loginError=$("loginError"),userbar=$("userbar"),logoutBtn=$("logoutBtn"),syncStatus=$("syncStatus"),lastFixtureSync=$("lastFixtureSync"),greeting=$("greeting"),onlineUsers=$("onlineUsers"),presenceDropdown=$("presenceDropdown"),paypalDialog=$("paypalDialog"),paypalPerson=$("paypalPerson"),paypalMatch=$("paypalMatch"),paypalAmount=$("paypalAmount"),paypalPreview=$("paypalPreview"),paypalShare=$("paypalShare"),paypalCopy=$("paypalCopy"),paypalStatus=$("paypalStatus");

let M=BASE_M.map(x=>({...x})),F="all",S={assignments:{},names:{},paid:{},notes:{},prices:{}},currentUser=null,currentActor=null,saveTimer=null,realtimeChannel=null,presenceChannel=null,loadingRemote=false,pendingAutoScroll=true,paymentRequest=null;

function E(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function normalizeState(x){x=x||{};return{assignments:x.assignments||{},names:x.names||{},paid:x.paid||{},notes:x.notes||{},prices:x.prices||{}}}
function setSync(text,error=false){syncStatus.textContent=text;syncStatus.classList.toggle("err",error)}
function slotName(slot){return SLOTS[slot]||slot}
function attendeeName(id,slot){const value=String(S.names?.[id]?.[slot]||"").trim();return value||slotName(slot)}

async function logLogin(){
  if(!currentActor)return;
  const {error}=await sb.from("history_log").insert({actor_name:currentActor,entity_type:"login",entity_id:"tom-session",before_data:{},after_data:{event:"login",variant:VARIANT}});
  if(error)console.error("Login-History:",error);
}
async function logPaypal(action,data){
  const {error}=await sb.from("history_log").insert({actor_name:currentActor||"Admin",entity_type:"paypal",entity_id:data.m.id,before_data:{},after_data:{action,person:data.person,ticket:slotName(data.slot),opponent:data.m.o,amount:data.amount,currency:"EUR",paypal_me:"tommaerz",variant:VARIANT}});
  if(error)console.error("PayPal-History:",error);
}
async function loadLastFixtureSync(){
  const {data,error}=await sb.from("fixture_sync_runs").select("finished_at").eq("status","success").not("finished_at","is",null).order("finished_at",{ascending:false}).limit(1).maybeSingle();
  if(error||!data?.finished_at){lastFixtureSync.textContent=error?"Letzter Spieltagssync: –":"Letzter Spieltagssync: noch nie";return}
  lastFixtureSync.textContent=`Letzter Spieltagssync: ${new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(data.finished_at))}`;
}
async function loadRemoteState(){
  const {data,error}=await sb.from("season_state").select("data").eq("season",STATE_SEASON).single();
  if(error)throw new Error("Tom-Daten konnten nicht geladen werden: "+(error.message||error.code));
  S=normalizeState(data.data);render();
}
async function loadRemoteMatches(){
  const {data,error}=await sb.from("match_overrides").select("id,start_date,end_date,kickoff_time,opponent,home,possible,active").eq("season",FIXTURE_SEASON);
  if(error){M=BASE_M.map(x=>({...x}));return}
  const byId=new Map((data||[]).map(x=>[x.id,x]));
  M=BASE_M.map(base=>{const x=byId.get(base.id);if(x?.active===false)return null;if(!x)return{...base};return{...base,s:x.start_date||base.s,e:x.end_date||x.start_date||base.e,t:x.kickoff_time?String(x.kickoff_time).slice(0,5):(x.start_date?"":base.t),o:x.opponent||base.o,h:x.home??base.h,pos:x.possible??base.pos}}).filter(Boolean);
}
function queueSave(){if(!currentUser||loadingRemote)return;setSync("speichert …");clearTimeout(saveTimer);saveTimer=setTimeout(saveRemoteState,350)}
async function saveRemoteState(){
  if(!currentUser)return;
  const {error}=await sb.from("season_state").update({data:JSON.parse(JSON.stringify(S)),updated_by:currentActor||"Admin",updated_at:new Date().toISOString()}).eq("season",STATE_SEASON);
  setSync(error?"Fehler beim Speichern":"gespeichert",!!error);
}

function subscribeRealtime(){
  if(realtimeChannel)sb.removeChannel(realtimeChannel);
  realtimeChannel=sb.channel("fcb-tom-season-2026-27")
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"season_state",filter:`season=eq.${STATE_SEASON}`},payload=>{if(!payload.new?.data)return;loadingRemote=true;S=normalizeState(payload.new.data);render();loadingRemote=false;setSync("synchron")})
    .on("postgres_changes",{event:"*",schema:"public",table:"match_overrides",filter:`season=eq.${FIXTURE_SEASON}`},async()=>{await loadRemoteMatches();await loadLastFixtureSync();render();setSync("Termine aktualisiert")}).subscribe();
}
function renderPresence(){
  if(!onlineUsers||!presenceChannel)return;
  const state=presenceChannel.presenceState();
  const actors=[...new Set(Object.values(state).flat().map(p=>p?.actor).filter(a=>ACTOR_ORDER.includes(a)))].sort((a,b)=>ACTOR_ORDER.indexOf(a)-ACTOR_ORDER.indexOf(b));
  onlineUsers.innerHTML=actors.length?`<i></i><span>Online: ${actors.map(E).join(", ")}</span>`:`<span>Online: –</span>`;
  if(presenceDropdown)presenceDropdown.innerHTML=ACTOR_ORDER.map(name=>{const on=actors.includes(name);return`<div class="presenceRow"><span class="presenceDot ${on?"isOnline":""}"></span><b>${E(name)}</b><span>${on?"Online":"Offline"}</span></div>`}).join("");
}
function subscribePresence(){
  if(presenceChannel)sb.removeChannel(presenceChannel);
  const random=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
  presenceChannel=sb.channel("fcb-online-tom-2026-27",{config:{presence:{key:`${currentActor}-${random}`}}}).on("presence",{event:"sync"},renderPresence).on("presence",{event:"join"},renderPresence).on("presence",{event:"leave"},renderPresence).subscribe(async status=>{if(status==="SUBSCRIBED"){await presenceChannel.track({actor:currentActor,variant:VARIANT,online_at:new Date().toISOString()});renderPresence()}});
}

function showApp(user){currentUser=user;pendingAutoScroll=true;document.body.classList.remove("locked");loginScreen.classList.add("hidden");userbar.hidden=false;if(greeting)greeting.textContent=`Hallo ${currentActor}`}
function showLogin(message=""){currentUser=null;currentActor=null;document.body.classList.add("locked");loginScreen.classList.remove("hidden");userbar.hidden=true;loginError.textContent=message;if(greeting)greeting.textContent=""}

function L(n){const d=D[n];return d?`<img class="logo" src="https://www.google.com/s2/favicons?domain=${d}&sz=128" alt="">`:`<i class="ph">?</i>`}
function concreteOpponent(m){return m.o&&!/(gegner offen|möglich|tabellenplatz|termin)/i.test(m.o)}
function T(m){if(concreteOpponent(m))return m.h?["FC Bayern",m.o]:[m.o,"FC Bayern"];return["FC Bayern","?"]}
function dt(m){const a=new Date(m.s+"T12:00:00"),b=new Date(m.e+"T12:00:00");return m.s===m.e?[`${String(a.getDate()).padStart(2,"0")}.${String(a.getMonth()+1).padStart(2,"0")}.${String(a.getFullYear()).slice(2)}`,m.t?m.t+" Uhr":""]:[`${a.getDate()}.–${b.getDate()}. ${MON[a.getMonth()]}`,String(a.getFullYear())]}
function rel(m){return(m.c==="bl"&&m.h)||(m.c!=="bl"&&m.pos&&!m.n)}
function noAway(m){if(m.c==="bl")return m.h===true;if(m.n)return true;return m.h===true||m.pos===true}
function visible(){
  const z=q.value.trim().toLowerCase();
  return M.filter(m=>{const assigned=S.assignments[m.id]||[];let ok=false;if(F==="all")ok=noAway(m);else if(F==="open")ok=rel(m)&&assigned.length<MAX_TICKETS;else if(F==="bl")ok=m.c==="bl"&&m.h===true;else if(F==="dfb"||F==="cl")ok=m.c===F&&noAway(m);else ok=rel(m);return ok&&(!z||[m.l,m.o,m.p].join(" ").toLowerCase().includes(z))});
}
function berlinToday(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),get=t=>parts.find(p=>p.type===t)?.value||"";return`${get("year")}-${get("month")}-${get("day")}`}
function nextVisibleMatch(matches){const today=berlinToday();return matches.find(m=>(m.e||m.s)>=today)||matches.at(-1)||null}
function scrollToCurrentOrNext(matches){const next=nextVisibleMatch(matches);if(!next)return;const el=document.getElementById(`game-${next.id}`);if(!el)return;document.querySelectorAll(".game.nextgame").forEach(x=>x.classList.remove("nextgame"));el.classList.add("nextgame");setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),100)}
function club(n,r=""){const isBayern=n==="FC Bayern",name=isBayern?"":`<span>${E(n)}</span>`;return`<div class="club ${r} ${isBayern?"bayernClub":""}">${r?`${name}${L(n)}`:`${L(n)}${name}`}</div>`}

function card(m){
  const [d,sub]=dt(m),[a,b]=T(m),x=S.assignments[m.id]||[],pay=S.paid[m.id]||{},names=S.names[m.id]||{},full=x.length===MAX_TICKETS,fullyPaid=full&&x.every(v=>!!pay[v]);
  const B=slot=>{
    const sel=x.includes(slot),blocked=full&&!sel,done=!!pay[slot],person=String(names[slot]||"");
    return`<div class="pickcell ${sel?"sel":blocked?"blocked":""}"><button class="choose" data-id="${m.id}" data-v="${slot}" ${blocked?"disabled":""}>${E(slotName(slot))}</button>${sel?`<input class="guestname ticketname" data-ticket-name="${m.id}" data-slot="${slot}" value="${E(person)}" placeholder="Name für ${E(slotName(slot))}">`:""}${sel&&!done?`<button class="paypalRequest" type="button" data-paypal-id="${m.id}" data-paypal-person="${slot}">PayPal anfordern</button>`:""}${sel?`<label class="paymini ${done?"done":""}"><input type="checkbox" data-pay="${m.id}" data-person="${slot}" ${done?"checked":""}> ${done?"bezahlt ✓":"bezahlt"}</label>`:""}</div>`;
  };
  return`<div class="game ${fullyPaid?"fullypaid":""}" id="game-${m.id}" data-date="${m.s}"><div class="toprow"><div class="date">${d}<small>${sub}</small></div><div class="duel">${club(a)}<b>–</b>${club(b,"r")}</div></div><div class="meta"><span class="tag">${m.c==="bl"?"Bundesliga":m.c==="dfb"?"DFB-Pokal":"Champions League"}</span> · ${E(m.l)} · ${E(m.p)}</div><div class="pick"><button class="openpick ${x.length?"":"sel"}" data-id="${m.id}" data-v="open">Offen</button>${SLOT_ORDER.map(B).join("")}</div><div class="extra"><span>${x.length}/${MAX_TICKETS} Karten vergeben</span></div><textarea class="note" data-note="${m.id}" placeholder="Notiz">${E(S.notes[m.id]||"")}</textarea></div>`;
}
function paymentMissingHtml(items){if(!items.length)return`<span class="paymentComplete">Alles bezahlt</span>`;return`<span class="paymentMissingLabel">Offen:</span>${[...new Set(items)].map(name=>`<span class="missingGame">${E(name)}</span>`).join("")}`}
function missingLabel(m,slot){return`${attendeeName(m.id,slot)} – ${m.o}`}
function render(){
  const v=visible(),G={};v.forEach(m=>{const d=new Date(m.s+"T12:00:00"),k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");(G[k]||=[]).push(m)});
  app.innerHTML=Object.keys(G).sort().map(k=>`<h2>${MON[+k.slice(5)-1]} ${k.slice(0,4)}</h2>${G[k].map(card).join("")}`).join("");bind();
  const counts=Object.fromEntries(SLOT_ORDER.map(s=>[s,0])),paidCounts=Object.fromEntries(SLOT_ORDER.map(s=>[s,0])),missing=Object.fromEntries(SLOT_ORDER.map(s=>[s,[]]));let open=0;
  v.forEach(m=>{const x=S.assignments[m.id]||[],pay=S.paid[m.id]||{};if(x.length<MAX_TICKETS)open++;for(const s of SLOT_ORDER){if(x.includes(s)){counts[s]++;if(pay[s])paidCounts[s]++;else missing[s].push(missingLabel(m,s))}}});
  sv.textContent=v.length;so.textContent=open;
  $("sTom1").textContent=counts.t1;$("sTom2").textContent=counts.t2;$("sSt1").textContent=counts.s1;$("sSt2").textContent=counts.s2;
  $("spTom1").textContent=paidCounts.t1;$("spTom2").textContent=paidCounts.t2;$("spSt1").textContent=paidCounts.s1;$("spSt2").textContent=paidCounts.s2;
  $("missingTom1").innerHTML=paymentMissingHtml(missing.t1);$("missingTom2").innerHTML=paymentMissingHtml(missing.t2);$("missingSt1").innerHTML=paymentMissingHtml(missing.s1);$("missingSt2").innerHTML=paymentMissingHtml(missing.s2);
  const next=nextVisibleMatch(v);if(next)document.getElementById(`game-${next.id}`)?.classList.add("nextgame");if(pendingAutoScroll&&currentUser){pendingAutoScroll=false;scrollToCurrentOrNext(v)}
}

function parseAmount(value){const n=Number(String(value||"").trim().replace(/\s/g,"").replace(",","."));return Number.isFinite(n)&&n>0?Math.round(n*100)/100:null}
function paypalData(){
  if(!paymentRequest)return null;
  const amount=parseAmount(paypalAmount?.value);if(!amount)return null;
  const m=M.find(x=>x.id===paymentRequest.id);if(!m)return null;
  const slot=paymentRequest.person,person=attendeeName(m.id,slot),amountText=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(amount),link=`${PAYPAL_ME}/${amount.toFixed(2)}`,date=dt(m)[0],message=`Hi ${person}, für dein Ticket ${slotName(slot)} bei FC Bayern – ${m.o} am ${date} sind noch ${amountText} offen. Du kannst hier per PayPal bezahlen: ${link}`;
  return{m,slot,person,amount,amountText,link,message};
}
function updatePaypalPreview(){const data=paypalData();if(!data){paypalPreview.textContent="Bitte einen gültigen Betrag eingeben.";return}paypalPreview.innerHTML=`<b>${E(data.amountText)}</b><span>${E(data.link)}</span>`;S.prices[data.m.id]=data.amount;queueSave()}
function openPaypalRequest(id,person){const m=M.find(x=>x.id===id);if(!m)return;paymentRequest={id,person};paypalPerson.textContent=`${attendeeName(id,person)} · ${slotName(person)}`;paypalMatch.textContent=`FC Bayern – ${m.o} · ${dt(m)[0]}`;paypalAmount.value=S.prices[id]??50;paypalStatus.textContent="";updatePaypalPreview();paypalDialog.showModal();setTimeout(()=>paypalAmount.focus(),50)}
async function copyPaypal(){const data=paypalData();if(!data){paypalStatus.textContent="Bitte zuerst einen gültigen Betrag eingeben.";return}try{await navigator.clipboard.writeText(data.link);await logPaypal("link_copied",data);paypalStatus.textContent="PayPal-Link kopiert ✓"}catch{paypalStatus.textContent="Link konnte nicht kopiert werden."}}
async function sharePaypal(){const data=paypalData();if(!data){paypalStatus.textContent="Bitte zuerst einen gültigen Betrag eingeben.";return}try{if(navigator.share)await navigator.share({title:`FC Bayern – ${data.m.o}`,text:data.message});else await navigator.clipboard.writeText(data.message);await logPaypal(navigator.share?"share_opened":"message_copied",data);paypalStatus.textContent=navigator.share?"Zahlungsaufforderung geteilt ✓":"Zahlungsaufforderung kopiert ✓"}catch(e){if(e?.name!=="AbortError")paypalStatus.textContent="Teilen war nicht möglich."}}

function bind(){
  document.querySelectorAll(".choose,.openpick").forEach(b=>b.onclick=()=>{
    const id=b.dataset.id,v=b.dataset.v;let x=[...(S.assignments[id]||[])];
    if(v==="open"){
      x=[];S.paid[id]={};delete S.names[id];
    }else if(x.includes(v)){
      x=x.filter(y=>y!==v);if(S.paid[id])delete S.paid[id][v];if(S.names[id]){delete S.names[id][v];if(!Object.keys(S.names[id]).length)delete S.names[id]}
    }else if(x.length<MAX_TICKETS)x.push(v);
    S.assignments[id]=x;queueSave();render();
  });
  document.querySelectorAll("[data-ticket-name]").forEach(e=>{
    e.onclick=ev=>ev.stopPropagation();
    e.oninput=()=>{const id=e.dataset.ticketName,slot=e.dataset.slot;S.names[id]||={};S.names[id][slot]=e.value;const m=M.find(x=>x.id===id);if(m){const target={t1:"missingTom1",t2:"missingTom2",s1:"missingSt1",s2:"missingSt2"}[slot];if(target&&!(S.paid[id]?.[slot])){const items=[];for(const game of visible()){const assigned=S.assignments[game.id]||[];if(assigned.includes(slot)&&!S.paid[game.id]?.[slot])items.push(missingLabel(game,slot))}$(target).innerHTML=paymentMissingHtml(items)}}};
    e.onchange=()=>queueSave();
    e.onkeydown=ev=>{if(ev.key==="Enter"){ev.preventDefault();e.blur()}};
  });
  document.querySelectorAll("[data-pay]").forEach(e=>e.onchange=()=>{const id=e.dataset.pay,v=e.dataset.person;S.paid[id]||={};S.paid[id][v]=e.checked;queueSave();render()});
  document.querySelectorAll("[data-note]").forEach(e=>e.oninput=()=>{S.notes[e.dataset.note]=e.value;queueSave()});
  document.querySelectorAll("[data-paypal-id]").forEach(b=>b.onclick=e=>{e.stopPropagation();openPaypalRequest(b.dataset.paypalId,b.dataset.paypalPerson)});
}

document.querySelectorAll(".tools button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tools button").forEach(x=>x.classList.remove("on"));b.classList.add("on");F=b.dataset.f;pendingAutoScroll=true;render()});
q.oninput=render;
$("currentMatchBtn")?.addEventListener("click",()=>scrollToCurrentOrNext(visible()));
paypalAmount?.addEventListener("input",updatePaypalPreview);paypalCopy?.addEventListener("click",copyPaypal);paypalShare?.addEventListener("click",sharePaypal);paypalDialog?.addEventListener("close",()=>{paymentRequest=null;paypalStatus.textContent=""});
onlineUsers?.addEventListener("click",e=>{e.stopPropagation();presenceDropdown.hidden=!presenceDropdown.hidden});document.addEventListener("click",e=>{if(!e.target.closest(".presenceWrap"))presenceDropdown.hidden=true});

loginForm.addEventListener("submit",async e=>{
  e.preventDefault();loginError.textContent="";const actor=ACTORS[loginUser.value];if(!actor){loginError.textContent="Bitte einen Benutzer auswählen.";return}
  const {data,error}=await sb.auth.signInWithPassword({email:LOGIN_EMAIL,password:loginPassword.value});if(error){loginError.textContent="Passwort ist nicht korrekt.";return}
  try{currentActor=actor;sessionStorage.setItem(ACTOR_KEY,actor);showApp(data.user);await logLogin();subscribePresence();await loadRemoteMatches();await loadLastFixtureSync();await loadRemoteState();subscribeRealtime();loginPassword.value=""}catch(err){console.error(err);await sb.auth.signOut();showLogin(err?.message||"Saisondaten konnten nicht geladen werden.")}
});
logoutBtn.addEventListener("click",async()=>{if(presenceChannel){try{await presenceChannel.untrack()}catch{}await sb.removeChannel(presenceChannel);presenceChannel=null}if(realtimeChannel)await sb.removeChannel(realtimeChannel);await sb.auth.signOut();sessionStorage.removeItem(ACTOR_KEY);showLogin()});

async function boot(){
  const {data:{session}}=await sb.auth.getSession();if(!session?.user){showLogin();return}
  currentActor=sessionStorage.getItem(ACTOR_KEY);if(!ACTOR_ORDER.includes(currentActor)){await sb.auth.signOut();showLogin();return}
  try{showApp(session.user);subscribePresence();await loadRemoteMatches();await loadLastFixtureSync();await loadRemoteState();subscribeRealtime()}catch(err){console.error(err);await sb.auth.signOut();sessionStorage.removeItem(ACTOR_KEY);showLogin(err?.message||"Saisondaten konnten nicht geladen werden.")}
}
boot();