(()=>{
  if(window.__seasonCrewWishActionsV2)return;
  window.__seasonCrewWishActionsV2=true;

  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  let sb=null,decorateTimer=null;
  const $=id=>document.getElementById(id);

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

  function ensureStyles(){
    if(document.getElementById('wishActionsV2Styles'))return;
    const style=document.createElement('style');
    style.id='wishActionsV2Styles';
    style.textContent=`
      .wishActionPair{display:inline-flex;align-items:stretch;gap:4px}
      .wishActionPair>.wishPersonChip{border-radius:999px 9px 9px 999px}
      .wishRejectBtn{display:inline-grid;place-items:center;min-width:28px;border:1px solid #efcfd2;background:#fff5f6;color:#b42336;border-radius:9px 999px 999px 9px;padding:4px 8px;font:900 12px/1 Manrope,sans-serif;cursor:pointer;transition:.16s}
      .wishRejectBtn:hover{background:#ffe8eb;border-color:#e7aeb5;transform:translateY(-1px)}
      .wishRejectBtn:disabled{opacity:.55;cursor:default;transform:none}
      @media(max-width:760px){.wishActionPair{max-width:100%}.wishActionPair>.wishPersonChip{min-height:30px}.wishRejectBtn{min-width:32px}}
    `;
    document.head.appendChild(style);
  }

  function decorate(){
    ensureStyles();
    document.querySelectorAll('.ticketWishBar').forEach(bar=>{
      const fixtureId=bar.dataset.fixtureId;if(!fixtureId)return;
      bar.querySelectorAll('[data-wish-assign-user]').forEach(assign=>{
        if(assign.closest('.wishActionPair'))return;
        const userId=assign.dataset.wishAssignUser;if(!userId)return;
        const name=assign.querySelector('span')?.textContent?.replace(/^@/,'').trim()||'Interessent';
        const wrap=document.createElement('span');wrap.className='wishActionPair';
        assign.parentNode.insertBefore(wrap,assign);wrap.appendChild(assign);
        const reject=document.createElement('button');
        reject.type='button';reject.className='wishRejectBtn';reject.dataset.wishRejectUser=userId;reject.dataset.fixtureId=fixtureId;
        reject.title=`Interesse von @${name} ablehnen`;reject.setAttribute('aria-label',`Interesse von ${name} ablehnen`);reject.textContent='×';
        reject.addEventListener('click',()=>rejectWish(fixtureId,userId,name,reject));
        wrap.appendChild(reject);
      });
    });
  }

  function scheduleDecorate(delay=0){
    clearTimeout(decorateTimer);
    decorateTimer=setTimeout(()=>requestAnimationFrame(decorate),delay);
  }

  async function rejectWish(fixtureId,userId,name,button){
    const gid=$('groupSelect')?.value,c=client();if(!gid||!c)return;
    if(!confirm(`Interesse von @${name} für dieses Spiel ablehnen?`))return;
    button.disabled=true;
    const {error}=await c.from('sc_ticket_wishes').delete().eq('group_id',gid).eq('fixture_id',fixtureId).eq('user_id',userId);
    if(error){button.disabled=false;toast('Interesse konnte nicht abgelehnt werden');console.error(error);return}
    toast(`Interesse von @${name} abgelehnt`);
  }

  window.addEventListener('seasoncrew:games-rendered',()=>scheduleDecorate(0));
  window.addEventListener('seasoncrew:rendered',()=>scheduleDecorate(0));

  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>scheduleDecorate(100),{once:true});
  else scheduleDecorate(0);
})();