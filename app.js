import { BASE_M, D, MON, K } from "./schedule.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm";

const SUPABASE_URL = "https://kmhadzujovvxvpgblgkk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y";
const SEASON = "2026-27";
const LOGIN_ACCOUNTS = {
  admin:   { label:"Admin",   email:"admin@fcbayern-ober.example" },
  patrick: { label:"Patrick", email:"patrick@fcbayern-ober.example" },
  ober:    { label:"Ober",    email:"ober@fcbayern-ober.example" }
};
const CONFIGURED = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_PUBLISHABLE_KEY.startsWith("YOUR_");

const sb = CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
}) : null;

const app=document.getElementById("app"),q=document.getElementById("q"),
sv=document.getElementById("sv"),s1=document.getElementById("s1"),s2=document.getElementById("s2"),
so=document.getElementById("so"),sp=document.getElementById("sp"),l1=document.getElementById("l1"),l2=document.getElementById("l2"),
loginScreen=document.getElementById("loginScreen"),loginForm=document.getElementById("loginForm"),
loginUser=document.getElementById("loginUser"),loginPassword=document.getElementById("loginPassword"),
loginError=document.getElementById("loginError"),configWarn=document.getElementById("configWarn"),
userbar=document.getElementById("userbar"),userEmail=document.getElementById("userEmail"),
logoutBtn=document.getElementById("logoutBtn"),syncStatus=document.getElementById("syncStatus");

let M=BASE_M.map(x=>({...x}));
let F="rel";
let S={p1:"Patrick",p2:"Reini",assignments:{},guests:{},paid:{},notes:{}};
let currentUser=null,saveTimer=null,realtimeChannel=null,loadingRemote=false;

function normalizeState(x){x=x||{};const A=x.assignments||{},P=x.paid||{};Object.keys(P).forEach(id=>{if(typeof P[id]==="boolean"){const z={};(A[id]||[]).forEach(v=>z[v]=P[id]);P[id]=z;}});return {p1:"Patrick",p2:"Reini",assignments:A,guests:x.guests||{},paid:P,notes:x.notes||{}};}
function setSync(text,isError=false){syncStatus.textContent=text;syncStatus.classList.toggle("err",isError);}
async function loadRemoteState(){const {data,error}=await sb.from("season_state").select("data").eq("season",SEASON).single();if(error) throw error;S=normalizeState(data.data);render();}
async function loadRemoteMatches(){const {data,error}=await sb.from("match_overrides").select("id,start_date,end_date,kickoff_time,opponent,home,possible,active").eq("season",SEASON);if(error) throw error;const byId=new Map((data||[]).map(x=>[x.id,x]));M=BASE_M.map(base=>{const x=byId.get(base.id);if(x?.active===false)return null;if(!x)return {...base};return {...base,s:x.start_date||base.s,e:x.end_date||x.start_date||base.e,t:x.kickoff_time ? String(x.kickoff_time).slice(0,5) : (x.start_date ? "" : base.t),o:x.opponent||base.o,h:x.home ?? base.h,pos:x.possible ?? base.pos};}).filter(Boolean);}
function queueSave(){if(!currentUser || loadingRemote) return;setSync("speichert …");clearTimeout(saveTimer);saveTimer=setTimeout(saveRemoteState,350);}
async function saveRemoteState(){if(!currentUser) return;const payload=JSON.parse(JSON.stringify(S));const {error}=await sb.from("season_state").update({data:payload,updated_at:new Date().toISOString()}).eq("season",SEASON);if(error){setSync("Fehler beim Speichern",true);console.error(error);return}setSync("gespeichert");}
function subscribeRealtime(){if(realtimeChannel) sb.removeChannel(realtimeChannel);realtimeChannel=sb.channel("fcb-season-2026-27").on("postgres_changes",{event:"UPDATE",schema:"public",table:"season_state",filter:`season=eq.${SEASON}`},payload=>{if(!payload.new?.data)return;loadingRemote=true;S=normalizeState(payload.new.data);render();loadingRemote=false;setSync("synchron");}).on("postgres_changes",{event:"*",schema:"public",table:"match_overrides",filter:`season=eq.${SEASON}`},async()=>{try{await loadRemoteMatches();render();setSync("Termine aktualisiert");}catch(err){console.error(err)}}).subscribe();}
function showApp(user){currentUser=user;document.body.classList.remove("locked");loginScreen.classList.add("hidden");userbar.hidden=false;const account=Object.values(LOGIN_ACCOUNTS).find(x=>x.email.toLowerCase()===(user.email||"").toLowerCase());userEmail.textContent=account?.label||"angemeldet";}
function showLogin(message=""){currentUser=null;document.body.classList.add("locked");loginScreen.classList.remove("hidden");userbar.hidden=true;loginError.textContent=message;}
function E(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function L(n){let d=D[n];return d?`<img class="logo" src="https://www.google.com/s2/favicons?domain=${d}&sz=128">`:`<i class="ph">?</i>`}
function T(m){if(m.c==="bl"||(m.c==="dfb"&&m.id==="dfb01"))return m.h?["FC Bayern",m.o]:[m.o,"FC Bayern"];return["FC Bayern","?"]}
function dt(m){let a=new Date(m.s+"T12:00:00"),b=new Date(m.e+"T12:00:00");return m.s===m.e?[`${String(a.getDate()).padStart(2,"0")}.${String(a.getMonth()+1).padStart(2,"0")}.${String(a.getFullYear()).slice(2)}`,m.t?m.t+" Uhr":""]:[`${a.getDate()}.–${b.getDate()}. ${MON[a.getMonth()]}`,String(a.getFullYear())]}
function rel(m){return m.c==="bl"&&m.h||(m.c!=="bl"&&m.pos&&!m.n)}
function visible(){let z=q.value.toLowerCase();return M.filter(m=>{let a=S.assignments[m.id]||[],ok=F==="rel"?rel(m):F==="all"?1:F==="open"?!a.length:m.c===F;return ok&&(!z||[m.l,m.o,m.p].join(" ").toLowerCase().includes(z))})}
function club(n,r=""){return`<div class="club ${r}">${r?`<span>${E(n)}</span>${L(n)}`:`${L(n)}<span>${E(n)}</span>`}</div>`}
function card(m){let[d,sub]=dt(m),[a,b]=T(m),x=S.assignments[m.id]||[],g=S.guests[m.id]||{},pay=S.paid[m.id]||{},full=x.length===2,B=(v,n)=>{let sel=x.includes(v),blocked=full&&!sel,done=!!pay[v],isGuest=v==="g1"||v==="g2",guestName=g[v]||"";return`<div class="pickcell ${sel?"sel":blocked?"blocked":""}"><button class="choose" data-id="${m.id}" data-v="${v}" ${blocked?"disabled":""}>${E(isGuest&&sel&&guestName?guestName:n)}</button>${sel&&isGuest?`<input class="guestname" data-id="${m.id}" data-g="${v}" value="${E(guestName)}" placeholder="${v==="g1"?"Name Gast 1":"Name Gast 2"}">`:""}${sel?`<label class="paymini ${done?"done":""}" title="Zahlungsstatus"><input type="checkbox" data-pay="${m.id}" data-person="${v}" ${done?"checked":""}> ${done?"bezahlt ✓":"bezahlt"}</label>`:""}</div>`};return`<div class="game"><div class="toprow"><div class="date">${d}<small>${sub}</small></div><div class="duel">${club(a)}<b>–</b>${club(b,"r")}</div></div><div class="meta"><span class="tag">${m.c==="bl"?"Bundesliga":m.c==="dfb"?"DFB-Pokal":"Champions League"}</span> · ${E(m.l)} · ${E(m.p)}</div><div class="pick"><button class="openpick ${x.length?"":"sel"}" data-id="${m.id}" data-v="open">Offen</button>${B("p1","Patrick")}${B("p2","Reini")}${B("g1","Gast 1")}${B("g2","Gast 2")}</div><div class="extra"><span>${x.length}/2 Karten vergeben</span></div><textarea class="note" data-note="${m.id}" placeholder="Notiz">${E(S.notes[m.id]||"")}</textarea></div>`}
function render(){l1.textContent="Patrick";l2.textContent="Reini";let v=visible(),G={};v.forEach(m=>{let d=new Date(m.s+"T12:00:00"),k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");(G[k]||=[]).push(m)});app.innerHTML=Object.keys(G).sort().map(k=>`<h2>${MON[+k.slice(5)-1]} ${k.slice(0,4)}</h2>${G[k].map(card).join("")}`).join("");bind();let ids=new Set(v.map(m=>m.id)),a=0,b=0,o=0,p=0;M.forEach(m=>{if(!ids.has(m.id))return;let x=S.assignments[m.id]||[],pay=S.paid[m.id]||{};a+=x.includes("p1");b+=x.includes("p2");o+=!x.length;p+=x.filter(v=>pay[v]).length});sv.textContent=v.length;s1.textContent=a;s2.textContent=b;so.textContent=o;sp.textContent=p}
function bind(){document.querySelectorAll(".choose,.openpick").forEach(b=>b.onclick=()=>{let id=b.dataset.id,v=b.dataset.v,x=[...(S.assignments[id]||[])];if(v==="open"){x=[];S.paid[id]={}}else if(x.includes(v)){x=x.filter(y=>y!==v);if(S.paid[id])delete S.paid[id][v]}else if(x.length<2)x.push(v);S.assignments[id]=x;queueSave();render()});document.querySelectorAll("[data-g]").forEach(e=>{e.onclick=ev=>ev.stopPropagation();e.oninput=()=>{S.guests[e.dataset.id]||={};S.guests[e.dataset.id][e.dataset.g]=e.value;queueSave();let cell=e.closest(".pickcell"),btn=cell&&cell.querySelector(".choose");if(btn)btn.textContent=e.value.trim()||(e.dataset.g==="g1"?"Gast 1":"Gast 2")}});document.querySelectorAll("[data-pay]").forEach(e=>e.onchange=()=>{let id=e.dataset.pay,v=e.dataset.person;S.paid[id]||={};S.paid[id][v]=e.checked;queueSave();render()});document.querySelectorAll("[data-note]").forEach(e=>e.oninput=()=>{S.notes[e.dataset.note]=e.value;queueSave()})}
document.querySelectorAll(".tools button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tools button").forEach(x=>x.classList.remove("on"));b.classList.add("on");F=b.dataset.f;render()});q.oninput=render;
loginForm.addEventListener("submit",async e=>{e.preventDefault();loginError.textContent="";if(!CONFIGURED){configWarn.hidden=false;loginError.textContent="Supabase-Konfiguration fehlt noch.";return;}const account=LOGIN_ACCOUNTS[loginUser.value];if(!account){loginError.textContent="Bitte einen Benutzer auswählen.";return;}const {data,error}=await sb.auth.signInWithPassword({email:account.email,password:loginPassword.value});if(error){loginError.textContent="Benutzer oder Passwort ist nicht korrekt.";return;}try{showApp(data.user);await loadRemoteMatches();await loadRemoteState();subscribeRealtime();loginPassword.value="";}catch(err){console.error(err);await sb.auth.signOut();showLogin("Dieser Benutzer ist für die Jahreskarten-Seite nicht freigeschaltet.");}});
logoutBtn.addEventListener("click",async()=>{if(realtimeChannel)await sb.removeChannel(realtimeChannel);await sb.auth.signOut();showLogin();});
async function boot(){if(!CONFIGURED){configWarn.hidden=false;showLogin();return;}const {data:{session}}=await sb.auth.getSession();if(!session?.user){showLogin();return}try{showApp(session.user);await loadRemoteMatches();await loadRemoteState();subscribeRealtime();}catch(err){console.error(err);await sb.auth.signOut();showLogin("Dieser Benutzer ist für die Jahreskarten-Seite nicht freigeschaltet.");}}boot();