const greeting=document.getElementById("greeting");

function currentActor(){
  return sessionStorage.getItem("fcb-current-actor")||"";
}

function updateGreeting(){
  if(!greeting)return;
  const actor=currentActor();
  greeting.textContent=actor?`Hallo ${actor}`:"";
  greeting.hidden=!actor;
}

function opponentFromGame(game){
  if(!game)return"";
  const teams=[...game.querySelectorAll(".duel .club span")]
    .map(el=>el.textContent.trim())
    .filter(Boolean);
  return teams.find(name=>!/^FC Bayern$/i.test(name))||"";
}

updateGreeting();
new MutationObserver(updateGreeting).observe(document.body,{attributes:true,attributeFilter:["class"]});
window.addEventListener("pageshow",updateGreeting);

document.addEventListener("focusin",event=>{
  const input=event.target.closest?.(".guestname");
  if(!input)return;
  input.dataset.previousGuestName=input.value;
});

document.addEventListener("input",event=>{
  const input=event.target.closest?.(".guestname");
  if(!input)return;

  const fallback=input.dataset.g==="g1"?"Gast 1":"Gast 2";
  const previous=(input.dataset.previousGuestName||fallback).trim()||fallback;
  const current=input.value.trim()||fallback;
  const opponent=opponentFromGame(input.closest(".game"));
  const container=document.getElementById("missingGuests");

  if(container&&opponent){
    const oldLabel=`${previous} – ${opponent}`;
    const newLabel=`${current} – ${opponent}`;
    const chip=[...container.querySelectorAll(".missingGame")]
      .find(el=>el.textContent.trim()===oldLabel);
    if(chip)chip.textContent=newLabel;
  }

  input.dataset.previousGuestName=input.value;
});
