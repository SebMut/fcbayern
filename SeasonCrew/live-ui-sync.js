(()=>{
  if(window.__seasonCrewLiveUiSync)return;
  window.__seasonCrewLiveUiSync=true;
  let timer=null;

  function refreshMain(delay=80){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const select=document.getElementById('groupSelect');
      if(!select?.value)return;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    },delay);
  }

  function watchToast(){
    const toast=document.getElementById('toast');
    if(!toast)return false;
    const check=()=>{
      const text=String(toast.textContent||'');
      if(/wurde.+zugeteilt/i.test(text))refreshMain(40);
    };
    new MutationObserver(check).observe(toast,{childList:true,subtree:true,characterData:true});
    return true;
  }

  // Fallback: selbst wenn der Toast auf einem Browser nicht beobachtet wird,
  // nach einer Schnellzuteilung die Hauptdaten erneut einlesen.
  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-wish-assign-user]'))refreshMain(900);
  },true);

  window.addEventListener('seasoncrew:prices-updated',()=>{
    window.dispatchEvent(new CustomEvent('seasoncrew:reload-group-meta'));
  });

  if(!watchToast()){
    if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',watchToast,{once:true});
    else setTimeout(watchToast,0);
  }
})();
