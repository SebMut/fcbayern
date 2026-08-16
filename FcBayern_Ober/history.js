import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm";

const sb=createClient(
  "https://kmhadzujovvxvpgblgkk.supabase.co",
  "sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y",
  {auth:{persistSession:true,autoRefreshToken:true}}
);

const STATE_SEASON="2026-27";
const FIXTURE_SEASON="2026-27";
const VARIANT="ober";
const PERSON={p1:"Patrick",p2:"Reini",g1:"Gast 1",g2:"Gast 2"};
const OBER_ACTORS=["Admin","Patrick","Ober"];

const content=document.getElementById("content");
const userFilter=document.getElementById("userFilter");
const typeFilter=document.getElementById("typeFilter");
const search=document.getElementById("search");
let LOGS=[];
let MATCHES=new Map();

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function same(a,b){return JSON.stringify(a??null)===JSON.stringify(b??null)}
function fmtDate(ts){return new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Berlin"}).format(new Date(ts))}
function euro(v){const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n):"–"}
function competition(id){if(id?.startsWith("bl"))return"Bundesliga";if(id?.startsWith("dfb"))return"DFB-Pokal";if(id?.startsWith("cl"))return"Champions League";return"Spiel"}
function roundLabel(id){
  if(/^bl\d{2}$/.test(id||""))return`${Number(id.slice(2))}. Spieltag`;
  const map={dfb01:"1. Runde",dfb02:"2. Runde",dfb03:"Achtelfinale",dfb04a:"Viertelfinale",dfb04b:"Viertelfinale – alternatives Fenster",dfb05:"Halbfinale",dfb06:"Finale",cl01:"Ligaphase 1",cl02:"Ligaphase 2",cl03:"Ligaphase 3",cl04:"Ligaphase 4",cl05:"Ligaphase 5",cl06:"Ligaphase 6",cl07:"Ligaphase 7",cl08:"Ligaphase 8",clpo1:"Play-off Hinspiel",clpo2:"Play-off Rückspiel",clr161:"Achtelfinale Hinspiel",clr162:"Achtelfinale Rückspiel",clqf1:"Viertelfinale Hinspiel",clqf2:"Viertelfinale Rückspiel",clsf1:"Halbfinale Hinspiel",clsf2:"Halbfinale Rückspiel",clfinal:"Finale"};
  return map[id]||"";
}
function gameName(id){
  if(!id)return"Saisonübersicht";
  const m=MATCHES.get(id),parts=[competition(id),roundLabel(id),m?.opponent||""];
  return parts.filter(Boolean).join(" · ")||id;
}
function personName(state,id,slot){
  if(slot==="p1")return"Patrick";
  if(slot==="p2")return"Reini";
  return String(state?.guests?.[id]?.[slot]||PERSON[slot]||slot).trim()||PERSON[slot]||slot;
}
function namesFor(state,id,arr){return(arr||[]).map(slot=>personName(state,id,slot)).join(", ")||"Offen"}
function paymentName(state,id,slot){const name=personName(state,id,slot);return(slot==="g1"||slot==="g2")&&name!==PERSON[slot]?`${name} · ${PERSON[slot]}`:PERSON[slot]||name}

function relevant(log){
  if(log.entity_type==="season_state")return log.entity_id===STATE_SEASON;
  if(log.entity_type==="paypal")return log.after_data?.variant===VARIANT||(!log.after_data?.variant&&log.after_data?.paypal_me==="ChristianReinheimer");
  if(log.entity_type==="login")return log.after_data?.variant!=="tom"&&log.entity_id!=="tom-session"&&OBER_ACTORS.includes(log.actor_name);
  return log.entity_type==="fixture"||log.entity_type==="sync_run";
}

function stateChanges(log){
  const a=log.before_data||{},b=log.after_data||{},out=[];
  const ids=new Set([
    ...Object.keys(a.assignments||{}),...Object.keys(b.assignments||{}),
    ...Object.keys(a.guests||{}),...Object.keys(b.guests||{}),
    ...Object.keys(a.paid||{}),...Object.keys(b.paid||{}),
    ...Object.keys(a.notes||{}),...Object.keys(b.notes||{}),
    ...Object.keys(a.prices||{}),...Object.keys(b.prices||{})
  ]);

  for(const id of ids){
    const aa=(a.assignments||{})[id]||[],ba=(b.assignments||{})[id]||[];
    if(!same(aa,ba))out.push({id,text:`Belegung: ${namesFor(a,id,aa)} → ${namesFor(b,id,ba)}`});

    const ag=(a.guests||{})[id]||{},bg=(b.guests||{})[id]||{};
    for(const slot of["g1","g2"]){
      const oldName=String(ag[slot]||"").trim(),newName=String(bg[slot]||"").trim();
      if(oldName!==newName)out.push({id,text:`${PERSON[slot]} · Name: ${oldName||"–"} → ${newName||"–"}`});
    }

    const ap=(a.paid||{})[id]||{},bp=(b.paid||{})[id]||{};
    for(const slot of Object.keys(PERSON))if(!!ap[slot]!==!!bp[slot])out.push({id,text:`${paymentName(b,id,slot)}: ${bp[slot]?"bezahlt":"nicht bezahlt"}`});

    if(((a.notes||{})[id]||"")!==((b.notes||{})[id]||""))out.push({id,text:"Notiz geändert"});
    const oldPrice=(a.prices||{})[id],newPrice=(b.prices||{})[id];
    if(!same(oldPrice,newPrice))out.push({id,text:`Ticketpreis: ${oldPrice==null?"–":euro(oldPrice)} → ${newPrice==null?"–":euro(newPrice)}`});
  }
  return out.length?out:[{id:null,text:"Saisonübersicht geändert"}];
}

function fixtureChanges(log){
  const a=log.before_data||{},b=log.after_data||{},out=[];
  const fields=[["opponent","Gegner"],["start_date","Datum"],["end_date","Datumsende"],["kickoff_time","Anstoß"],["home","Heim/Auswärts"],["active","Aktiv"]];
  for(const[k,label]of fields)if(!same(a[k],b[k]))out.push({id:log.entity_id,text:`${label}: ${a[k]??"–"} → ${b[k]??"–"}`});
  return out.length?out:[{id:log.entity_id,text:"Offizielle Termindaten aktualisiert"}];
}

function syncFixtureLogs(syncLog){
  const syncTime=Date.parse(syncLog.created_at);if(!Number.isFinite(syncTime))return[];
  const syncs=LOGS.filter(x=>x.entity_type==="sync_run");
  return LOGS.filter(f=>{
    if(f.entity_type!=="fixture")return false;
    const fixtureTime=Date.parse(f.created_at);
    if(!Number.isFinite(fixtureTime)||fixtureTime>syncTime||syncTime-fixtureTime>60000)return false;
    const owner=syncs.filter(s=>{const t=Date.parse(s.created_at);return Number.isFinite(t)&&t>=fixtureTime&&t-fixtureTime<=60000}).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at))[0];
    return owner?.id===syncLog.id;
  }).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
}

function syncChanges(log){
  const b=log.after_data||{};
  const status=b.status==="success"?"erfolgreich":b.status==="failed"?"fehlgeschlagen":(b.status||"ausgeführt");
  const out=[{id:null,text:`Spieltagssync ${status}`}],fixtures=syncFixtureLogs(log);
  if(Number.isFinite(Number(b.found_count)))out.push({id:null,text:`Gefundene Spiele: ${b.found_count}`});
  if(fixtures.length){
    out.push({id:null,text:`Tatsächlich geänderte Einträge: ${fixtures.length}`});
    fixtures.forEach(f=>out.push({id:f.entity_id,text:`Aktualisiert: ${gameName(f.entity_id)}`}));
  }else if(b.status==="success")out.push({id:null,text:"Keine Termindaten geändert"});
  if(b.message)out.push({id:null,text:String(b.message)});
  return out;
}

function paypalChanges(log){
  const b=log.after_data||{};
  const action=b.action==="link_copied"?"PayPal-Link kopiert":b.action==="share_opened"?"Zahlungsaufforderung geteilt":b.action==="message_copied"?"Zahlungsaufforderung kopiert":"PayPal-Zahlungsaufforderung";
  const out=[{id:log.entity_id,text:action}];
  if(b.match_label)out.push({id:log.entity_id,text:`Spiel: ${b.match_label}`});
  if(b.ticket)out.push({id:log.entity_id,text:`Karte: ${b.ticket}`});
  if(b.person)out.push({id:log.entity_id,text:`Empfänger: ${b.person}`});
  if(b.opponent)out.push({id:log.entity_id,text:`Gegner: ${b.opponent}`});
  if(b.amount!=null)out.push({id:log.entity_id,text:`Betrag: ${euro(b.amount)}`});
  return out;
}

function changesFor(log){
  if(log.entity_type==="login")return[{id:null,text:"Eingeloggt"}];
  if(log.entity_type==="paypal")return paypalChanges(log);
  if(log.entity_type==="fixture")return fixtureChanges(log);
  if(log.entity_type==="sync_run")return syncChanges(log);
  return stateChanges(log);
}
function typeLabel(log){if(log.entity_type==="login")return"Login";if(log.entity_type==="paypal")return"PayPal";if(log.entity_type==="fixture")return"Termin-Sync";if(log.entity_type==="sync_run")return"Spieltagssync";return"Änderung"}

function render(){
  const uf=userFilter.value,tf=typeFilter.value,q=search.value.trim().toLowerCase();
  const rows=LOGS.filter(log=>{
    if(uf&&log.actor_name!==uf)return false;
    if(tf&&log.entity_type!==tf)return false;
    const changes=changesFor(log),hay=[log.actor_name,gameName(log.entity_id),...changes.map(x=>x.text)].join(" ").toLowerCase();
    return!q||hay.includes(q);
  });
  if(!rows.length){content.className="empty";content.textContent="Noch keine History-Einträge vorhanden.";return}
  content.className="log";
  content.innerHTML=rows.map(log=>{
    const changes=changesFor(log),ids=[...new Set(changes.map(x=>x.id).filter(Boolean))],syncFixtures=log.entity_type==="sync_run"?syncFixtureLogs(log):[];
    const games=log.entity_type==="login"?"Anmeldung":log.entity_type==="sync_run"?(syncFixtures.length?syncFixtures.map(f=>gameName(f.entity_id)).join(" · "):"Spieltagssynchronisierung"):(ids.length?ids.map(gameName).join(" · "):gameName(log.entity_id));
    const system=log.actor_name==="System";
    const who=log.entity_type==="login"?`${esc(log.actor_name||"Benutzer")} hat sich eingeloggt`:`Ausgeführt von ${esc(log.actor_name||"Benutzer")}`;
    return`<article class="entry"><div class="row"><div><div class="who">${who}</div><div class="time">${fmtDate(log.created_at)}</div></div><span class="badge ${system?"system":""}">${typeLabel(log)}</span></div><div class="game">${esc(games)}</div><ul class="changes">${changes.map(c=>`<li>${esc(c.text)}</li>`).join("")}</ul></article>`;
  }).join("");
}

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){location.replace("index.html");return}
  const [{data:logs,error},{data:matches}]=await Promise.all([
    sb.from("history_log").select("id,created_at,actor_name,entity_type,entity_id,before_data,after_data").order("created_at",{ascending:false}).limit(1000),
    sb.from("match_overrides").select("id,opponent").eq("season",FIXTURE_SEASON)
  ]);
  if(error){content.className="empty";content.textContent="History konnte nicht geladen werden.";return}
  MATCHES=new Map((matches||[]).map(x=>[x.id,x]));
  LOGS=(logs||[]).filter(relevant);
  [...new Set(LOGS.map(x=>x.actor_name).filter(Boolean))].sort().forEach(n=>userFilter.insertAdjacentHTML("beforeend",`<option value="${esc(n)}">${esc(n)}</option>`));
  userFilter.onchange=typeFilter.onchange=search.oninput=render;
  render();
}
boot();