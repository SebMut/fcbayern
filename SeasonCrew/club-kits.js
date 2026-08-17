const CLUB_KITS={
  'FC Bayern München':{primary:'#DC052D',secondary:'#FFFFFF'},
  'Borussia Dortmund':{primary:'#FDE100',secondary:'#111111'},
  'VfB Stuttgart':{primary:'#FFFFFF',secondary:'#E32219'},
  'FC Schalke 04':{primary:'#005CA9',secondary:'#FFFFFF'},
  'SV 07 Elversberg':{primary:'#111111',secondary:'#FFFFFF'},
  '1. FC Union Berlin':{primary:'#D71920',secondary:'#F4C300'},
  'FC Augsburg':{primary:'#BA3733',secondary:'#2E7D32'},
  'RB Leipzig':{primary:'#FFFFFF',secondary:'#D71920'},
  'SC Freiburg':{primary:'#D71920',secondary:'#111111'},
  '1. FSV Mainz 05':{primary:'#C8102E',secondary:'#FFFFFF'},
  '1. FC Köln':{primary:'#FFFFFF',secondary:'#D71920'},
  'Hamburger SV':{primary:'#FFFFFF',secondary:'#0057B8'},
  'SC Paderborn 07':{primary:'#005CA9',secondary:'#111111'},
  'TSG Hoffenheim':{primary:'#005CA9',secondary:'#FFFFFF'},
  'SV Werder Bremen':{primary:'#008A45',secondary:'#FFFFFF'},
  'Borussia Mönchengladbach':{primary:'#111111',secondary:'#FFFFFF'},
  'Bayer 04 Leverkusen':{primary:'#111111',secondary:'#D71920'},
  'Eintracht Frankfurt':{primary:'#111111',secondary:'#D71920'},
  'VfL Osnabrück':{primary:'#6A1B9A',secondary:'#FFFFFF'}
};

const ALIASES={
  'FC Bayern':'FC Bayern München','Bayern':'FC Bayern München','Bayern München':'FC Bayern München','FC Bayern Munich':'FC Bayern München',
  'BVB':'Borussia Dortmund','Dortmund':'Borussia Dortmund','Schalke':'FC Schalke 04','Union Berlin':'1. FC Union Berlin',
  'Mainz 05':'1. FSV Mainz 05','Köln':'1. FC Köln','Werder Bremen':'SV Werder Bremen','Gladbach':'Borussia Mönchengladbach',
  'Leverkusen':'Bayer 04 Leverkusen','Frankfurt':'Eintracht Frankfurt','Hoffenheim':'TSG Hoffenheim','Freiburg':'SC Freiburg',
  'Paderborn':'SC Paderborn 07','Augsburg':'FC Augsburg','Stuttgart':'VfB Stuttgart','Leipzig':'RB Leipzig','Hamburg':'Hamburger SV',
  'Osnabrück':'VfL Osnabrück','Elversberg':'SV 07 Elversberg'
};

const DOMAIN_TO_CLUB={
  'fcbayern.com':'FC Bayern München','bvb.de':'Borussia Dortmund','vfb.de':'VfB Stuttgart','schalke04.de':'FC Schalke 04',
  'sv07elversberg.de':'SV 07 Elversberg','fc-union-berlin.de':'1. FC Union Berlin','fcaugsburg.de':'FC Augsburg','rbleipzig.com':'RB Leipzig',
  'scfreiburg.com':'SC Freiburg','mainz05.de':'1. FSV Mainz 05','fc.de':'1. FC Köln','hsv.de':'Hamburger SV','scp07.de':'SC Paderborn 07',
  'tsg-hoffenheim.de':'TSG Hoffenheim','werder.de':'SV Werder Bremen','borussia.de':'Borussia Mönchengladbach','bayer04.de':'Bayer 04 Leverkusen',
  'eintracht.de':'Eintracht Frankfurt','vfl.de':'VfL Osnabrück'
};

const DEFAULT_KIT={primary:'#252730',secondary:'#E14975'};

function canonicalName(name=''){
  const clean=String(name).replace(/\s+/g,' ').trim();
  if(CLUB_KITS[clean])return clean;
  if(ALIASES[clean])return ALIASES[clean];
  const lower=clean.toLowerCase();
  const exact=Object.keys(CLUB_KITS).find(k=>k.toLowerCase()===lower);if(exact)return exact;
  const alias=Object.keys(ALIASES).find(k=>k.toLowerCase()===lower);return alias?ALIASES[alias]:clean;
}
function getKit(name){return CLUB_KITS[canonicalName(name)]||DEFAULT_KIT}
function isLight(hex=''){const c=hex.replace('#','');if(c.length!==6)return false;const r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);return ((r*299+g*587+b*114)/1000)>210}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function html(name,extraClass=''){
  const canonical=canonicalName(name),kit=getKit(canonical),light=isLight(kit.primary)?' kit-light':'';
  return `<span class="clubJersey${light}${extraClass?' '+escapeHtml(extraClass):''}" data-kit-ready="1" data-club="${escapeHtml(canonical)}" title="${escapeHtml(canonical)}" aria-label="${escapeHtml(canonical)}" role="img" style="--kit-primary:${kit.primary};--kit-secondary:${kit.secondary}"></span>`;
}
function element(name,extraClass=''){
  const wrap=document.createElement('span');wrap.innerHTML=html(name,extraClass);return wrap.firstElementChild;
}
function clubFromLogoUrl(src=''){
  try{const u=new URL(src,location.href);if(u.hostname.includes('google.com')&&u.pathname.includes('/s2/favicons')){const domain=u.searchParams.get('domain')||'';return DOMAIN_TO_CLUB[domain.replace(/^www\./,'')]||''}}catch{}
  return '';
}
function inferClub(el){
  const explicit=el.getAttribute?.('data-club')||el.getAttribute?.('data-club-jersey');if(explicit)return canonicalName(explicit);
  if(el.tagName==='IMG'){const byUrl=clubFromLogoUrl(el.getAttribute('src')||'');if(byUrl)return byUrl}
  const next=el.nextElementSibling?.textContent?.trim();if(next&&next!=='–')return canonicalName(next);
  const prev=el.previousElementSibling?.textContent?.trim();if(prev&&prev!=='–')return canonicalName(prev);
  const club=el.closest?.('.club');const nearby=club?.querySelector?.('span')?.textContent?.trim();if(nearby)return canonicalName(nearby);
  return '';
}
function replaceNode(el,name){
  if(!name||el.dataset?.kitReady==='1')return;
  const jersey=element(name);
  if(el.classList?.contains('clubLogo'))jersey.classList.add('clubLogo');
  if(el.classList?.contains('logo'))jersey.classList.add('logo');
  el.replaceWith(jersey);
}
function hydrate(root=document){
  root.querySelectorAll?.('[data-club-jersey]:not([data-kit-ready])').forEach(el=>replaceNode(el,inferClub(el)));
  root.querySelectorAll?.('span.clubLogo:not([data-kit-ready])').forEach(el=>replaceNode(el,inferClub(el)));
  root.querySelectorAll?.('img.clubLogo,img.logo').forEach(el=>{const name=inferClub(el);if(name)replaceNode(el,name)});
}
function ensureStyles(){
  if(document.querySelector('link[data-seasoncrew-club-kits]'))return;
  const current=document.currentScript?.src||import.meta.url;const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./club-kits.css?v=20260817-1',current).href;link.dataset.seasoncrewClubKits='1';document.head.append(link);
}

ensureStyles();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>hydrate());else hydrate();
const observer=new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){const el=n;const name=inferClub(el);if((el.matches?.('span.clubLogo,img.clubLogo,img.logo,[data-club-jersey]'))&&name)replaceNode(el,name);hydrate(el)}})));
observer.observe(document.documentElement,{childList:true,subtree:true});

const api={CLUB_KITS,ALIASES,DEFAULT_KIT,canonicalName,getKit,html,element,hydrate};
window.SeasonCrewClubKits=api;
export {CLUB_KITS,ALIASES,DEFAULT_KIT,canonicalName,getKit,html,element,hydrate};
