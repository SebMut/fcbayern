(()=>{
  const TICKETS={
    t1:{name:"Tom 1",legacy:"Tom1",seat:"236/2/16"},
    t2:{name:"Tom 2",legacy:"Tom2",seat:"236/2/17"},
    s1:{name:"Staudter 1",legacy:"Staudter 1",seat:"238/4/5"},
    s2:{name:"Staudter 2",legacy:"Staudter 2",seat:"238/4/6"}
  };

  const replaceTicketText=value=>{
    let text=String(value??"");
    for(const info of Object.values(TICKETS)){
      const replacement=`${info.name} · ${info.seat}`;
      if(!text.includes(replacement))text=text.split(info.legacy).join(replacement);
    }
    return text;
  };

  function enhance(){
    document.querySelectorAll('.choose[data-v]').forEach(button=>{
      const info=TICKETS[button.dataset.v];
      if(!info)return;
      button.innerHTML=`<span class="ticketOwner">${info.name}</span><small class="ticketSeat">${info.seat}</small>`;
      button.setAttribute('aria-label',`${info.name}, Platz ${info.seat}`);
    });

    document.querySelectorAll('[data-ticket-name][data-slot]').forEach(input=>{
      const info=TICKETS[input.dataset.slot];
      if(info)input.placeholder=`Name für ${info.name} (${info.seat})`;
    });

    const paypalPerson=document.getElementById('paypalPerson');
    if(paypalPerson&&paypalPerson.textContent)paypalPerson.textContent=replaceTicketText(paypalPerson.textContent);
  }

  if(typeof navigator.share==='function'){
    const originalShare=navigator.share.bind(navigator);
    try{
      navigator.share=data=>originalShare({...data,title:replaceTicketText(data?.title),text:replaceTicketText(data?.text)});
    }catch{}
  }

  if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
    const originalWrite=navigator.clipboard.writeText.bind(navigator.clipboard);
    try{navigator.clipboard.writeText=text=>originalWrite(replaceTicketText(text));}catch{}
  }

  const start=()=>{
    enhance();
    new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
