(()=>{
  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $=id=>document.getElementById(id);
  let sb=null,wishes=new Set(),refreshTimer=null,busy=new Set(),lastGroup='';

  const isGuest=()=>String($('memberRole')?.textContent||'').trim()==='Gast';
  const groupId=()=>String($('groupSelect')?.value||'').trim();

  function client(){
    if(sb)return sb;
    if(!window.supabase?.createClient)return null;
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  function toast(text){
    const el=$('toast');if(!el)return;
    el.textContent=text;el.classList.add('show');
    clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600);
  }

  function cardCopy(card){
    return [...card.querySelectorAll('div')].find(el=>['Karte vergeben','Nicht vergeben','🎟 Interesse anmelden','✓ Interesse gemerkt'].includes(el.textContent.trim()));
  }

  function decorate(){
    const guest=isGuest();
    const hint=$('guestReadonlyHint');
    if(guest&&hint)hint.textContent='Lesen · Notizen · Ticketwünsche';
    document.querySelectorAll('[data-assign-fixture]').forEach(card=>{
      if(!guest){
        card.removeAttribute('data-guest-ticket-interest');
        card.removeAttribute('role');
        card.removeAttribute('tabindex');
        return;
      }
      const fixtureId=card.dataset.assignFixture;
      if(!fixtureId)return;
      const active=wishes.has(fixtureId);
      card.dataset.guestTicketInterest='1';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label',active?'Ticketinteresse zurücknehmen':'Interesse an einem Ticket für dieses Spiel anmelden');
      const copy=cardCopy(card);if(copy)copy.textContent=active?'✓ Interesse gemerkt':'🎟 Interesse anmelden';
      const icon=card.querySelector('.ticketHead>span');if(icon)icon.textContent=active?'✓':'♡';
    });
  }

  async function refresh(){
    clearTimeout(refreshTimer);
    if(!isGuest()){wishes.clear();decorate();return}
    const c=client(),gid=groupId();if(!c||!gid)return;
    const {data:{session}}=await c.auth.getSession();if(!session)return;
    const {data,error}=await c.from('sc_ticket_wishes').select('fixture_id').eq('group_id',gid).eq('user_id',session.user.id);
    if(error){console.warn('Ticketwünsche konnten nicht geladen werden',error);return}
    wishes=new Set((data||[]).map(x=>x.fixture_id));lastGroup=gid;decorate();
  }

  function scheduleRefresh(delay=160){
    clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,delay);
  }

  async function toggle(fixtureId){
    if(!isGuest()||!fixtureId||busy.has(fixtureId))return;
    const c=client(),gid=groupId();if(!c||!gid)return;
    const {data:{session}}=await c.auth.getSession();if(!session)return;
    busy.add(fixtureId);
    const exists=wishes.has(fixtureId);
    let error=null;
    if(exists){
      ({error}=await c.from('sc_ticket_wishes').delete().eq('group_id',gid).eq('fixture_id',fixtureId).eq('user_id',session.user.id));
    }else{
      ({error}=await c.from('sc_ticket_wishes').insert({group_id:gid,fixture_id:fixtureId,user_id:session.user.id}));
    }
    busy.delete(fixtureId);
    if(error){toast(exists?'Interesse konnte nicht entfernt werden':'Interesse konnte nicht gespeichert werden');console.error(error);return}
    if(exists)wishes.delete(fixtureId);else wishes.add(fixtureId);
    decorate();
    toast(exists?'Ticketinteresse zurückgenommen':'Ticketinteresse angemeldet ✓');
    window.dispatchEvent(new CustomEvent('seasoncrew:ticket-wish-changed',{detail:{fixtureId,active:!exists}}));
    scheduleRefresh(250);
  }

  document.addEventListener('pointerup',e=>{
    if(!isGuest())return;
    const card=e.target.closest('[data-assign-fixture]');if(!card)return;
    e.preventDefault();
    toggle(card.dataset.assignFixture);
  },true);

  document.addEventListener('keydown',e=>{
    if(!isGuest()||!['Enter',' '].includes(e.key))return;
    const card=e.target.closest('[data-assign-fixture]');if(!card)return;
    e.preventDefault();
    toggle(card.dataset.assignFixture);
  },true);

  $('groupSelect')?.addEventListener('change',()=>{wishes.clear();scheduleRefresh(80)});
  const observer=new MutationObserver(()=>{
    if(groupId()!==lastGroup){wishes.clear();scheduleRefresh(80);return}
    requestAnimationFrame(decorate);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('DOMContentLoaded',()=>scheduleRefresh(450));
  setTimeout(()=>scheduleRefresh(0),900);
})();