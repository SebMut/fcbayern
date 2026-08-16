document.addEventListener("click",event=>{
  const button=event.target.closest?.("#currentMatchBtn");
  if(!button)return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const games=[...document.querySelectorAll(".game[data-date]")];
  if(!games.length)return;

  const parts=new Intl.DateTimeFormat("en-CA",{
    timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date());
  const get=type=>parts.find(p=>p.type===type)?.value||"";
  const today=`${get("year")}-${get("month")}-${get("day")}`;
  const target=games.find(game=>(game.dataset.date||"")>=today)||games.at(-1);
  if(!target)return;

  document.querySelectorAll(".game.nextgame").forEach(game=>game.classList.remove("nextgame"));
  target.classList.add("nextgame");

  const headerHeight=document.querySelector(".topbar")?.getBoundingClientRect().height||0;
  const y=window.scrollY+target.getBoundingClientRect().top-headerHeight-24;
  window.scrollTo({top:Math.max(0,y),behavior:"smooth"});
},true);
