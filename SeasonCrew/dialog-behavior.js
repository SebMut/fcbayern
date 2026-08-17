(()=>{
  function closeDialog(dialog){
    if(dialog?.open)dialog.close('cancel');
  }

  function normalizeCloseButtons(root=document){
    root.querySelectorAll?.('dialog .closeButton').forEach(button=>{
      button.type='button';
      button.setAttribute('formnovalidate','');
    });
  }

  document.addEventListener('click',event=>{
    const closeButton=event.target.closest?.('dialog .closeButton');
    if(closeButton){
      event.preventDefault();
      event.stopPropagation();
      closeDialog(closeButton.closest('dialog'));
      return;
    }

    const dialog=event.target instanceof Element ? event.target.closest('dialog') : null;
    if(!dialog?.open)return;
    const card=dialog.querySelector(':scope > .dialogCard, :scope > form.dialogCard');
    if(!card)return;

    const rect=card.getBoundingClientRect();
    const outside=event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
    if(event.target===dialog||outside){
      event.preventDefault();
      closeDialog(dialog);
    }
  },true);

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof Element)normalizeCloseButtons(node);
      }
    }
  });

  function init(){
    normalizeCloseButtons();
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
