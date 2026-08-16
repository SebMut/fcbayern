(()=>{
  const TICKETS={
    t1:{seat:"236/2/16",aliases:["Tom 1","Tom1"]},
    t2:{seat:"236/2/17",aliases:["Tom 2","Tom2"]},
    s1:{seat:"238/4/5",aliases:["Staudter 1"]},
    s2:{seat:"238/4/6",aliases:["Staudter 2"]}
  };

  const replaceTicketText=value=>{
    let text=String(value??"");
    for(const info of Object.values(TICKETS)){
      for(const alias of info.aliases)text=text.split(alias).join(info.seat);
    }
    return text;
  };

  function replaceVisibleLabels(){
    document.querySelectorAll('.seatNo').forEach(el=>el.remove());
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest('script,style'))continue;
      const next=replaceTicketText(node.nodeValue);
      if(next!==node.nodeValue)node.nodeValue=next;
    }
  }

  function enhance(){
    document.querySelectorAll('.choose[data-v]').forEach(button=>{
      const info=TICKETS[button.dataset.v];
      if(!info)return;
      if(button.textContent.trim()!==info.seat)button.innerHTML=`<span class="ticketOwner">${info.seat}</span>`;
      button.setAttribute('aria-label',`Platz ${info.seat}`);
    });

    document.querySelectorAll('[data-ticket-name][data-slot]').forEach(input=>{
      const info=TICKETS[input.dataset.slot];
      if(info)input.placeholder=`Name für ${info.seat}`;
    });

    replaceVisibleLabels();
  }

  if(typeof navigator.share==='function'){
    const originalShare=navigator.share.bind(navigator);
    try{navigator.share=data=>originalShare({...data,title:replaceTicketText(data?.title),text:replaceTicketText(data?.text)});}catch{}
  }

  if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
    const originalWrite=navigator.clipboard.writeText.bind(navigator.clipboard);
    try{navigator.clipboard.writeText=text=>originalWrite(replaceTicketText(text));}catch{}
  }

  let scheduled=false;
  const scheduleEnhance=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;enhance();});
  };

  const start=()=>{
    enhance();
    new MutationObserver(scheduleEnhance).observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
