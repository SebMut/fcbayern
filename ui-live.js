const greeting=document.getElementById("greeting");
const currentMatchBtn=document.getElementById("currentMatchBtn");

function currentActor(){return sessionStorage.getItem("fcb-current-actor")||"";}
function updateGreeting(){if(!greeting)return;const actor=currentActor();greeting.textContent=actor?`Hallo ${actor}`:"";}
function berlinToday(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t)?.value||"";return `${get("year")}-${get("month")}-${get("day")}`;}
function jumpToCurrentMatch(){
  const games=[...document.querySelectorAll("#app .game")];if(!games.length)return;
  const today=berlinToday();const target=games.find(game=>(game.dataset.date||"")>=today)||games.at(-1);if(!target)return;
  const stickyHeader=document.querySelector(".topbar")?.getBoundingClientRect().height||64;
  const stickyTools=document.querySelector(".tools")?.getBoundingClientRect().height||0;
  const offset=stickyHeader+stickyTools+18;
  const top=target.getBoundingClientRect().top+window.scrollY-offset;
  window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
}
/* app.js used to call scrollIntoView automatically after login/filter changes. Suppress only that automatic method; the red button uses window.scrollTo. */
Element.prototype.scrollIntoView=function(){};
updateGreeting();
new MutationObserver(updateGreeting).observe(document.body,{attributes:true,attributeFilter:["class"]});
window.addEventListener("pageshow",updateGreeting);window.addEventListener("storage",updateGreeting);
if(currentMatchBtn)currentMatchBtn.addEventListener("click",jumpToCurrentMatch);
document.addEventListener("focusin",event=>{const input=event.target.closest?.(".guestname");if(!input)return;input.dataset.previousGuestName=input.value;});
document.addEventListener("input",event=>{
  const input=event.target.closest?.(".guestname");if(!input)return;
  const fallback=input.dataset.g==="g1"?"Gast 1":"Gast 2";const previous=(input.dataset.previousGuestName||fallback).trim()||fallback;const current=input.value.trim()||fallback;const opponent=opponentFromGame(input.closest(".game"));const container=document.getElementById("missingGuests");
  if(container&&opponent){const oldLabel=`${previous} – ${opponent}`;const newLabel=`${current} – ${opponent}`;const chip=[...container.querySelectorAll(".missingGame")].find(el=>el.textContent.trim()===oldLabel);if(chip)chip.textContent=newLabel;}
  input.dataset.previousGuestName=input.value;
});
function opponentFromGame(game){if(!game)return"";const teams=[...game.querySelectorAll(".duel .club span")].map(el=>el.textContent.trim()).filter(Boolean);return teams.find(name=>!/^FC Bayern$/i.test(name))||"";}
