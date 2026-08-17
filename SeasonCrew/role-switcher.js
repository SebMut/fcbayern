(()=>{
  const KEY='seasoncrew-superadmin-role-view';
  const VALUES=new Set(['superadmin','owner','admin','guest']);
  let timer=null;

  function actualSuperadmin(){
    const badge=document.getElementById('superadminBadge');
    return !!badge&&!badge.classList.contains('hidden');
  }

  function current(){
    const value=localStorage.getItem(KEY)||'superadmin';
    return VALUES.has(value)?value:'superadmin';
  }

  function ensure(){
    const existing=document.getElementById('roleViewSwitcher');
    if(!actualSuperadmin()){
      existing?.remove();
      return false;
    }
    if(existing)return true;
    const actions=document.querySelector('.topActions');
    if(!actions)return false;
    const wrap=document.createElement('label');
    wrap.id='roleViewSwitcher';
    wrap.className='roleViewSwitcher';
    wrap.innerHTML=`<span>Ansicht als</span><select id="roleViewSelect" aria-label="Rolle für Testansicht"><option value="superadmin">Superadmin</option><option value="owner">Owner</option><option value="admin">Admin</option><option value="guest">Gast</option></select>`;
    const badge=document.getElementById('superadminBadge');
    badge?.insertAdjacentElement('afterend',wrap);
    if(!wrap.parentNode)actions.insertAdjacentElement('afterbegin',wrap);
    const select=wrap.querySelector('select');
    select.value=current();
    select.addEventListener('change',()=>{
      const value=VALUES.has(select.value)?select.value:'superadmin';
      if(value==='superadmin')localStorage.removeItem(KEY);else localStorage.setItem(KEY,value);
      document.body.classList.add('roleViewReloading');
      location.reload();
    });
    return true;
  }

  window.SeasonCrewRoleView={
    key:KEY,
    get(isSuperadmin){
      if(!isSuperadmin)return null;
      return current();
    },
    reset(){localStorage.removeItem(KEY)}
  };

  window.addEventListener('DOMContentLoaded',()=>{
    ensure();
    timer=setInterval(()=>{if(ensure()){clearInterval(timer);timer=null}},250);
    setTimeout(()=>{if(timer){clearInterval(timer);timer=null}},12000);
  });
})();
