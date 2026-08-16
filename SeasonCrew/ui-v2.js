(()=>{
  const $=id=>document.getElementById(id);
  const guestRole=()=>String($('memberRole')?.textContent||'').trim()==='Gast';
  const username=()=>String($('helloUser')?.textContent||'').replace(/^Hallo\s+/i,'').trim()||'Profil';
  const role=()=>String($('memberRole')?.textContent||'Profil').trim()||'Profil';

  function syncProfileButton(){
    const btn=$('settingsBtn');if(!btn)return;
    const name=username(),r=role(),initial=(name[0]||'P').toUpperCase();
    btn.className='profileButton';
    btn.title='Profil & Einstellungen';
    btn.setAttribute('aria-label',`Profil und Einstellungen von ${name}`);
    btn.innerHTML=`<span class="profileAvatar" aria-hidden="true">${initial}</span><span class="profileButtonCopy"><strong>${name}</strong><small>${r}</small></span><span class="profileChevron" aria-hidden="true">⌄</span>`;
  }

  function syncGuestUi(){
    const guest=guestRole();
    document.body.classList.toggle('guest-readonly',guest);
    document.querySelectorAll('[data-attendee-fixture]').forEach(el=>{el.readOnly=guest;el.setAttribute('aria-readonly',guest?'true':'false')});
    document.querySelectorAll('[data-note-fixture]').forEach(el=>{el.readOnly=false;el.setAttribute('aria-readonly','false')});
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

  function sync(){syncProfileButton();syncGuestUi()}

  document.addEventListener('click',e=>{
    if(!guestRole())return;
    const blocked=e.target.closest('[data-assign-fixture],[data-release-fixture],[data-paypal-fixture]');
    if(blocked){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('change',e=>{
    if(!guestRole())return;
    if(e.target.matches('[data-attendee-fixture],[data-paid-fixture]')){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('keydown',e=>{
    if(!guestRole())return;
    if(e.target.matches('[data-attendee-fixture]')){e.preventDefault();e.stopImmediatePropagation()}
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(sync));
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('DOMContentLoaded',sync);
  setTimeout(sync,250);
})();
