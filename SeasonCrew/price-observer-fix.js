(()=>{
  const NativeMutationObserver=window.MutationObserver;
  if(!NativeMutationObserver||window.__seasonCrewPriceObserverFix)return;
  window.__seasonCrewPriceObserverFix=true;

  window.MutationObserver=class SeasonCrewMutationObserver extends NativeMutationObserver{
    observe(target,options={}){
      if(target?.id==='settingsDialog'&&Array.isArray(options.attributeFilter)&&options.attributeFilter.includes('open')){
        options={...options,attributes:true,childList:false,subtree:false};
      }
      return super.observe(target,options);
    }
  };
})();
