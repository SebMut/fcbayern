(()=>{
  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $=id=>document.getElementById(id);
  let noteClient=null;

  if(!document.querySelector('link[data-seasoncrew-brand-v2]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='./brand-v2.css?v=20260817-1';link.dataset.seasoncrewBrandV2='1';document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-seasoncrew-crew-delete]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='./crew-delete.css?v=1';link.dataset.seasoncrewCrewDelete='1';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-seasoncrew-crew-delete]')){
    const script=document.createElement('script');script.src='./crew-delete.js?v=5';script.defer=true;script.dataset.seasoncrewCrewDelete='1';document.head.appendChild(script);
  }

  const guestRole=()=>String($('memberRole')?.textContent||'').trim()==='Gast';
  const username=()=>String($('helloUser')?.textContent||'').replace(/^Hallo\s+/i,'').trim()||'Profil';
  const role=()=>String($('memberRole')?.textContent||'Profil').trim()||'Profil';
  const berlinDate=()=>new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());

  function getNoteClient(){
    if(noteClient)return noteClient;
    if(!window.supabase?.createClient)return null;
    noteClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return noteClient;
  }

  function toast(text){
    const el=$('toast');if(!el)return;
    el.textContent=text;el.classList.add('show');
    clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600);
  }

  function syncProfileButton(){
    const btn=$('settingsBtn');if(!btn)return;
    const name=username(),r=role(),initial=(name[0]||'P').toUpperCase();
    const signature=`${name}|${r}`;
    if(btn.dataset.profileSignature===signature)return;
    btn.dataset.profileSignature=signature;
    btn.className='profileButton';
    btn.title='Profil & Einstellungen';
    btn.setAttribute('aria-label',`Profil und Einstellungen von ${name}`);
    btn.innerHTML=`<span class="profileAvatar" aria-hidden="true">${initial}</span><span class="profileButtonCopy"><strong>${name}</strong><small>${r}</small></span><span class="profileChevron" aria-hidden="true">⌄</span>`;
  }

  function setComposerPrefix(composer,visible){
    const prefix=composer.querySelector('.guestNotePrefix');
    if(!prefix)return;
    prefix.textContent=`${berlinDate()}, ${username()}:`;
    prefix.classList.toggle('hidden',!visible);
  }

  async function appendGuestNote(composer){
    const input=composer.querySelector('.guestNoteDraft');
    const button=composer.querySelector('.guestNoteSave');
    const text=String(input?.value||'').trim();
    if(!text){
      if(input)input.value='';
      setComposerPrefix(composer,false);
      return;
    }
    const source=composer.previousElementSibling;
    const fixtureId=composer.dataset.fixtureId;
    const groupId=$('groupSelect')?.value;
    const sb=getNoteClient();
    if(!sb||!groupId||!fixtureId){toast('Notiz konnte nicht gespeichert werden');return}
    button.disabled=true;button.textContent='Speichert …';
    const {data,error}=await sb.rpc('sc_append_member_note',{p_group_id:groupId,p_fixture_id:fixtureId,p_text:text});
    button.disabled=false;button.textContent='Notiz hinzufügen';
    if(error){toast('Notiz konnte nicht gespeichert werden');console.error(error);return}
    if(source?.matches('[data-note-fixture]')){
      source.value=String(data||'');
      source.classList.toggle('guestNoteEmpty',!source.value.trim());
    }
    input.value='';
    setComposerPrefix(composer,false);
    toast('Notiz hinzugefügt');
  }

  function ensureGuestComposer(source){
    const fixtureId=source.dataset.noteFixture;
    source.readOnly=true;
    source.setAttribute('aria-readonly','true');
    source.classList.add('guestExistingNote');
    source.classList.toggle('guestNoteEmpty',!source.value.trim());
    source.placeholder='Noch keine Notiz zu diesem Spiel';

    let composer=source.nextElementSibling;
    if(!composer?.matches('.guestNoteComposer')||composer.dataset.fixtureId!==fixtureId){
      composer=document.createElement('div');
      composer.className='guestNoteComposer';
      composer.dataset.fixtureId=fixtureId;
      composer.innerHTML=`<div class="guestNotePrefix hidden"></div><div class="guestNoteWrite"><textarea class="guestNoteDraft" rows="2" placeholder="Eigene Notiz ergänzen …"></textarea><button class="guestNoteSave" type="button" disabled>Notiz hinzufügen</button></div><small>Datum und Nutzername werden automatisch gesetzt. Bestehende Notizen bleiben erhalten.</small>`;
      source.insertAdjacentElement('afterend',composer);
      const input=composer.querySelector('.guestNoteDraft');
      const button=composer.querySelector('.guestNoteSave');
      input.addEventListener('focus',()=>setComposerPrefix(composer,true));
      input.addEventListener('input',()=>{
        const hasText=!!input.value.trim();
        setComposerPrefix(composer,hasText||document.activeElement===input);
        button.disabled=!hasText;
      });
      input.addEventListener('blur',()=>{
        if(!input.value.trim())setComposerPrefix(composer,false);
      });
      button.addEventListener('click',()=>appendGuestNote(composer));
    }else{
      setComposerPrefix(composer,!!composer.querySelector('.guestNoteDraft')?.value.trim());
    }
  }

  function syncGuestNotes(guest){
    document.querySelectorAll('[data-note-fixture]').forEach(source=>{
      if(guest){
        ensureGuestComposer(source);
      }else{
        source.readOnly=false;
        source.setAttribute('aria-readonly','false');
        source.classList.remove('guestExistingNote','guestNoteEmpty');
        const composer=source.nextElementSibling;
        if(composer?.matches('.guestNoteComposer'))composer.remove();
      }
    });
  }

  function syncGuestUi(){
    const guest=guestRole();
    document.body.classList.toggle('guest-readonly',guest);
    document.querySelectorAll('[data-attendee-fixture]').forEach(el=>{el.readOnly=guest;el.setAttribute('aria-readonly',guest?'true':'false')});
    syncGuestNotes(guest);
    document.querySelectorAll('[data-paid-fixture]').forEach(el=>{el.disabled=guest});
    document.querySelectorAll('[data-assign-fixture]').forEach(el=>{
      el.setAttribute('aria-disabled',guest?'true':'false');
      if(guest){const text=[...el.querySelectorAll('div')].find(x=>x.textContent.trim()==='Karte vergeben');if(text)text.textContent='Nicht vergeben'}
    });
    const roleEl=$('memberRole');
    if(roleEl){
      let hint=document.getElementById('guestReadonlyHint');
      if(guest&&!hint){hint=document.createElement('span');hint.id='guestReadonlyHint';hint.className='guestReadonlyHint';hint.textContent='Lesen · Notizen';roleEl.insertAdjacentElement('afterend',hint)}
      if(guest&&hint)hint.textContent='Lesen · Notizen';
      if(!guest&&hint)hint.remove();
    }
  }

  function syncDialogControls(root=document){
    root.querySelectorAll?.('dialog .closeButton').forEach(button=>{
      button.type='button';
      button.setAttribute('formnovalidate','');
    });
  }

  function closeDialog(dialog){
    if(dialog?.open)dialog.close('cancel');
  }

  function sync(){syncProfileButton();syncGuestUi();syncDialogControls()}

  document.addEventListener('click',e=>{
    const closeButton=e.target.closest?.('dialog .closeButton');
    if(closeButton){
      e.preventDefault();
      e.stopImmediatePropagation();
      closeDialog(closeButton.closest('dialog'));
      return;
    }

    const dialog=e.target instanceof Element?e.target.closest('dialog'):null;
    if(dialog?.open){
      const card=dialog.querySelector(':scope > .dialogCard, :scope > form.dialogCard');
      if(card){
        const rect=card.getBoundingClientRect();
        const outside=e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom;
        if(e.target===dialog||outside){
          e.preventDefault();
          closeDialog(dialog);
          return;
        }
      }
    }

    if(!guestRole())return;
    const blocked=e.target.closest('[data-assign-fixture],[data-release-fixture],[data-paypal-fixture]');
    if(blocked){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('change',e=>{
    if(!guestRole())return;
    if(e.target.matches('[data-attendee-fixture],[data-paid-fixture],[data-note-fixture]')){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('keydown',e=>{
    if(!guestRole())return;
    if(e.target.matches('[data-attendee-fixture],[data-note-fixture]')){e.preventDefault();e.stopImmediatePropagation()}
  },true);

  const dialogObserver=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof Element)syncDialogControls(node)}));
  });

  window.addEventListener('seasoncrew:games-rendered',()=>requestAnimationFrame(syncGuestUi));
  window.addEventListener('seasoncrew:rendered',()=>requestAnimationFrame(sync));
  window.addEventListener('DOMContentLoaded',()=>{sync();dialogObserver.observe(document.body,{childList:true,subtree:true})});
  setTimeout(sync,350);
})();