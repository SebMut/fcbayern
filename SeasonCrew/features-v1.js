(()=>{
  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $=id=>document.getElementById(id);
  let sb=null,session=null,state=null,channel=null,loadTimer=null,loading=false,lastGroupId='';

  function client(){
    if(sb)return sb;
    if(!window.supabase?.createClient)return null;
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function toast(text){const el=$('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
  function roleLabel(role){return role==='owner'?'Owner':role==='admin'?'Admin':'Gast'}
  function groupId(){return $('groupSelect')?.value||''}
  function currentRole(){return state?.members.find(m=>m.user_id===session?.user?.id)?.role||null}
  function isManager(){return !!state?.profile?.is_superadmin||currentRole()==='owner'}
  function canAllocate(){return !!state?.profile?.is_superadmin||['owner','admin'].includes(currentRole())}

  async function load(){
    const c=client(),gid=groupId();
    if(!c||!gid||loading)return;
    loading=true;
    try{
      const {data:{session:s}}=await c.auth.getSession();session=s;if(!session)return;
      const uid=session.user.id;
      const [{data:profile},{data:members,error:me},{data:wishes,error:we},{data:tickets,error:te},{data:allocations,error:ae},{data:group,error:ge}]=await Promise.all([
        c.from('sc_profiles').select('id,username,is_superadmin').eq('id',uid).maybeSingle(),
        c.from('sc_group_members').select('group_id,user_id,role,joined_at').eq('group_id',gid).order('joined_at'),
        c.from('sc_ticket_wishes').select('group_id,fixture_id,user_id,created_at').eq('group_id',gid),
        c.from('sc_tickets').select('id,label,block,row_label,seat,sort_order').eq('group_id',gid).eq('active',true).order('sort_order').order('created_at'),
        c.from('sc_allocations').select('group_id,fixture_id,ticket_id,attendee_name,attendee_user_id,paid,amount').eq('group_id',gid),
        c.from('sc_groups').select('id,name,default_price').eq('id',gid).maybeSingle()
      ]);
      if(me||we||te||ae||ge){console.warn('SeasonCrew features load',me||we||te||ae||ge);return}
      const ids=[...new Set((members||[]).map(m=>m.user_id))];
      let profiles=[];
      if(ids.length){const {data,error}=await c.from('sc_profiles').select('id,username').in('id',ids);if(!error)profiles=data||[]}
      const pmap=new Map(profiles.map(p=>[p.id,p]));
      state={gid,profile:profile||{id:uid,username:session.user.email?.split('@')[0]||'Mitglied',is_superadmin:false},group:group||{id:gid,name:'Crew',default_price:50},members:(members||[]).map(m=>({...m,username:pmap.get(m.user_id)?.username||'Mitglied'})),wishes:wishes||[],tickets:tickets||[],allocations:allocations||[]};
      render();
      if(lastGroupId!==gid){lastGroupId=gid;setupRealtime(gid)}
    }finally{loading=false}
  }

  function wishesFor(fixtureId){return (state?.wishes||[]).filter(w=>w.fixture_id===fixtureId)}
  function memberName(uid){return state?.members.find(m=>m.user_id===uid)?.username||'Mitglied'}
  function freeTickets(fixtureId){const used=new Set((state?.allocations||[]).filter(a=>a.fixture_id===fixtureId).map(a=>a.ticket_id));return (state?.tickets||[]).filter(t=>!used.has(t.id))}
  function ownAllocation(fixtureId){return (state?.allocations||[]).find(a=>a.fixture_id===fixtureId&&a.attendee_user_id===session?.user?.id)}

  function renderWishBars(){
    if(!state||!session)return;
    document.querySelectorAll('.gameCard[id^="game-"]').forEach(card=>{
      const fixtureId=card.id.slice(5);if(!fixtureId)return;
      const grid=card.querySelector('.ticketGrid');if(!grid)return;
      let bar=card.querySelector(`.ticketWishBar[data-fixture-id="${CSS.escape(fixtureId)}"]`);
      if(!bar){bar=document.createElement('div');bar.className='ticketWishBar';bar.dataset.fixtureId=fixtureId;grid.insertAdjacentElement('afterend',bar)}
      const list=wishesFor(fixtureId),mine=list.some(w=>w.user_id===session.user.id),assigned=ownAllocation(fixtureId),free=freeTickets(fixtureId),allocator=canAllocate();
      const names=list.map(w=>({id:w.user_id,name:memberName(w.user_id)}));
      const chips=names.length?names.map(x=>allocator&&free.length?`<button class="wishPersonChip actionable" type="button" data-wish-assign-user="${esc(x.id)}" title="${esc(x.name)} auf die nächste freie Karte setzen"><span>@${esc(x.name)}</span><b>＋</b></button>`:`<span class="wishPersonChip"><span>@${esc(x.name)}</span></span>`).join(''):'<span class="wishEmpty">Noch niemand hat Interesse angemeldet.</span>';
      const button=assigned
        ? `<button class="wishToggle assigned" type="button" disabled>✓ Dir ist eine Karte zugeteilt</button>`
        : `<button class="wishToggle ${mine?'active':''}" type="button" data-toggle-wish="${esc(fixtureId)}">${mine?'✓ Interesse gemerkt':'🎟 Interesse'}</button>`;
      bar.innerHTML=`<div class="wishTop"><div><small>Ticketwünsche</small><strong>${names.length} ${names.length===1?'Interessent':'Interessenten'}</strong></div>${button}</div><div class="wishPeople">${chips}</div>${allocator&&names.length&&free.length?`<small class="wishHint">＋ setzt die Person auf die nächste freie Dauerkarte (${free.length} frei).</small>`:''}`;
      bar.querySelector('[data-toggle-wish]')?.addEventListener('click',()=>toggleWish(fixtureId,mine));
      bar.querySelectorAll('[data-wish-assign-user]').forEach(btn=>btn.addEventListener('click',()=>quickAssign(fixtureId,btn.dataset.wishAssignUser)));
    });
  }

  async function toggleWish(fixtureId,exists){
    const c=client();if(!c||!state||!session)return;
    if(exists){
      const {error}=await c.from('sc_ticket_wishes').delete().eq('group_id',state.gid).eq('fixture_id',fixtureId).eq('user_id',session.user.id);
      if(error){toast('Interesse konnte nicht entfernt werden');return}toast('Interesse entfernt');
    }else{
      const {error}=await c.from('sc_ticket_wishes').insert({group_id:state.gid,fixture_id:fixtureId,user_id:session.user.id});
      if(error){toast(error.code==='23505'?'Interesse ist bereits gemerkt':'Interesse konnte nicht gespeichert werden');return}toast('Interesse gemerkt');
    }
    scheduleLoad(80);
  }

  async function quickAssign(fixtureId,userId){
    if(!canAllocate()||!state)return;
    const ticket=freeTickets(fixtureId)[0];if(!ticket){toast('Keine freie Dauerkarte mehr');return}
    const name=memberName(userId);
    if(!confirm(`@${name} auf ${ticket.label||'die nächste freie Karte'} setzen?`))return;
    const c=client();
    const {error}=await c.from('sc_allocations').insert({group_id:state.gid,fixture_id:fixtureId,ticket_id:ticket.id,attendee_name:name,attendee_user_id:userId,paid:false,amount:Number(state.group.default_price)||50,updated_by:session.user.id});
    if(error){toast('Karte konnte nicht zugeteilt werden');console.error(error);return}
    await c.from('sc_ticket_wishes').delete().eq('group_id',state.gid).eq('fixture_id',fixtureId).eq('user_id',userId);
    toast(`@${name} wurde ${ticket.label||'eine Karte'} zugeteilt`);scheduleLoad(80);
  }

  function renderMemberControls(){
    if(!state||!session)return;
    const list=$('memberList');if(!list)return;
    const rows=[...list.querySelectorAll('.memberRow')];
    rows.forEach(row=>row.querySelector('.memberManageActions')?.remove());
    const manager=isManager(),uid=session.user.id;
    for(const m of state.members){
      const row=rows.find(r=>r.querySelector('.memberIdentity b')?.textContent.trim()===`@${m.username}`);if(!row)continue;
      row.dataset.memberUserId=m.user_id;
      if(manager&&m.role!=='owner'){
        const actions=document.createElement('div');actions.className='memberManageActions';
        const normalized=m.role==='admin'?'admin':'guest';
        actions.innerHTML=`<select class="memberRoleSelect" aria-label="Rolle von ${esc(m.username)}"><option value="guest" ${normalized==='guest'?'selected':''}>Gast</option><option value="admin" ${normalized==='admin'?'selected':''}>Admin</option></select><button class="memberAction" type="button" data-save-member-role>Rolle speichern</button><button class="memberAction ownerAction" type="button" data-make-owner>Owner machen</button>${m.user_id!==uid?'<button class="memberAction danger" type="button" data-remove-member>Entfernen</button>':''}`;
        row.appendChild(actions);
        actions.querySelector('[data-save-member-role]').addEventListener('click',()=>changeRole(m.user_id,actions.querySelector('.memberRoleSelect').value,m.username));
        actions.querySelector('[data-make-owner]').addEventListener('click',()=>transferOwner(m.user_id,m.username));
        actions.querySelector('[data-remove-member]')?.addEventListener('click',()=>removeMember(m.user_id,m.username));
      }
      if(m.user_id===uid&&m.role!=='owner'){
        const actions=row.querySelector('.memberManageActions')||document.createElement('div');
        if(!actions.parentNode){actions.className='memberManageActions';row.appendChild(actions)}
        if(!actions.querySelector('[data-leave-crew]')){
          const leave=document.createElement('button');leave.className='memberAction danger subtle';leave.type='button';leave.dataset.leaveCrew='1';leave.textContent='Crew verlassen';leave.addEventListener('click',leaveCrew);actions.appendChild(leave);
        }
      }
    }
    let note=list.parentElement?.querySelector('.ownerMemberHint');
    const own=state.members.find(m=>m.user_id===uid);
    if(own?.role==='owner'){
      if(!note){note=document.createElement('div');note.className='ownerMemberHint';list.insertAdjacentElement('afterend',note)}
      note.textContent='Als Owner kannst du die Crew nicht verlassen. Übertrage zuerst die Owner-Rolle oder lösche die Crew.';
    }else note?.remove();
  }

  async function changeRole(userId,role,name){
    if(!isManager())return;
    const label=role==='admin'?'Admin':'Gast';if(!confirm(`@${name} wirklich zu ${label} machen?`))return;
    const {error}=await client().rpc('sc_manage_member_role',{p_group:state.gid,p_user:userId,p_role:role});
    if(error){toast(error.message);return}toast(`@${name} ist jetzt ${label}`);scheduleLoad(80);
  }
  async function transferOwner(userId,name){
    if(!isManager())return;if(!confirm(`Owner-Rolle wirklich an @${name} übertragen? Der bisherige Owner wird danach Admin.`))return;
    const {error}=await client().rpc('sc_transfer_group_owner',{p_group:state.gid,p_new_owner:userId});
    if(error){toast(error.message);return}toast(`@${name} ist jetzt Owner`);scheduleLoad(80);
  }
  async function removeMember(userId,name){
    if(!isManager())return;if(!confirm(`@${name} wirklich aus dieser Crew entfernen?`))return;
    const {error}=await client().rpc('sc_remove_group_member',{p_group:state.gid,p_user:userId});
    if(error){toast(error.message);return}toast(`@${name} wurde entfernt`);scheduleLoad(80);
  }
  async function leaveCrew(){
    if(!state||!confirm(`Crew „${state.group.name}“ wirklich verlassen?`))return;
    const {error}=await client().rpc('sc_leave_group',{p_group:state.gid});
    if(error){toast(error.message);return}
    localStorage.removeItem('seasoncrew-group');toast('Crew verlassen');setTimeout(()=>location.reload(),450);
  }

  function render(){renderWishBars();renderMemberControls()}
  function scheduleLoad(delay=180){clearTimeout(loadTimer);loadTimer=setTimeout(load,delay)}

  async function setupRealtime(gid){
    const c=client();if(!c)return;
    if(channel){try{await c.removeChannel(channel)}catch{}channel=null}
    channel=c.channel(`seasoncrew-features-${gid}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_ticket_wishes',filter:`group_id=eq.${gid}`},()=>scheduleLoad(90))
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_allocations',filter:`group_id=eq.${gid}`},()=>scheduleLoad(120))
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_group_members',filter:`group_id=eq.${gid}`},()=>scheduleLoad(120))
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_tickets',filter:`group_id=eq.${gid}`},()=>scheduleLoad(120))
      .subscribe();
  }

  $('groupSelect')?.addEventListener('change',()=>scheduleLoad(100));
  const observer=new MutationObserver(muts=>{
    let relevant=false;
    for(const m of muts){
      if(m.target?.id==='games'||m.target?.id==='memberList'||m.target?.closest?.('#games,#memberList')){relevant=true;break}
    }
    if(relevant&&state)requestAnimationFrame(render);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('DOMContentLoaded',()=>scheduleLoad(700));
  setTimeout(()=>scheduleLoad(0),1000);
})();