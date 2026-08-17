(()=>{
  const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
  const KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
  const $=id=>document.getElementById(id);
  let sb=null,session=null,state=null,channel=null,timer=null,loading=false,fixtureMap=new Map();
  const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  function client(){if(sb)return sb;if(!window.supabase?.createClient)return null;sb=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return sb}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function money(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0)}
  function toast(text){const el=$('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
  function gid(){return $('groupSelect')?.value||''}
  function role(){const view=window.SeasonCrewRoleView?.get(state?.profile?.is_superadmin);if(view)return view;return state?.members.find(m=>m.user_id===session?.user?.id)?.role||null}
  function admin(){return ['superadmin','owner','admin'].includes(role())}
  function owner(){return ['superadmin','owner'].includes(role())}
  function cleanPaypal(v){return String(v||'').trim().replace(/^https?:\/\/(www\.)?paypal\.me\//i,'').replace(/^paypal\.me\//i,'').replace(/^@/,'').replace(/\/$/,'')}
  function relevantFixture(m){if(m.c==='bl')return m.h===true;if(m.n)return true;return m.h===true||m.pos===true}
  function dateLabel(m){if(!m)return 'Termin offen';const d=new Date(`${m.s}T12:00:00`);return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)+(m.t?` · ${m.t} Uhr`:'')}
  function nextSeason(s){const m=String(s||'').match(/^(\d{4})-(\d{2})$/);if(!m)return '';const y=Number(m[1])+1;return `${y}-${String((y+1)%100).padStart(2,'0')}`}

  async function loadFixtures(season){
    try{
      const mod=await import('./schedule.js');let list=(mod.BASE_M||[]).map(x=>({...x}));
      const {data}=await client().from('match_overrides').select('id,start_date,end_date,kickoff_time,opponent,home,possible,active').eq('season',season);
      if(data){const map=new Map(data.map(x=>[x.id,x]));list=list.map(base=>{const x=map.get(base.id);if(x?.active===false)return null;if(!x)return base;return{...base,s:x.start_date||base.s,e:x.end_date||x.start_date||base.e,t:x.kickoff_time?String(x.kickoff_time).slice(0,5):(x.start_date?'':base.t),o:x.opponent||base.o,h:x.home??base.h,pos:x.possible??base.pos}}).filter(Boolean)}
      fixtureMap=new Map(list.map(m=>[m.id,m]));
    }catch(e){console.warn('SeasonCrew fixture helper',e);fixtureMap=new Map()}
  }

  async function load(){
    const c=client(),group=gid();if(!c||!group||loading)return;loading=true;
    try{
      const {data:{session:s}}=await c.auth.getSession();session=s;if(!session)return;const uid=session.user.id;
      const [{data:profile},{data:g,error:ge},{data:members,error:me},{data:tickets,error:te},{data:allocs,error:ae},{data:wishes,error:we},{data:notes,error:ne},{data:notifications,error:noe},{data:archives,error:are}]=await Promise.all([
        c.from('sc_profiles').select('id,username,is_superadmin').eq('id',uid).maybeSingle(),
        c.from('sc_groups').select('id,name,season,paypal_me,default_price').eq('id',group).maybeSingle(),
        c.from('sc_group_members').select('group_id,user_id,role,joined_at').eq('group_id',group).order('joined_at'),
        c.from('sc_tickets').select('id,label,block,row_label,seat,sort_order').eq('group_id',group).eq('active',true).order('sort_order').order('created_at'),
        c.rpc('sc_get_allocations',{p_group:group}),
        c.from('sc_ticket_wishes').select('group_id,fixture_id,user_id,created_at').eq('group_id',group),
        c.from('sc_fixture_notes').select('fixture_id,note').eq('group_id',group),
        c.from('sc_notifications').select('id,user_id,group_id,type,title,body,entity_id,read_at,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(60),
        c.from('sc_season_archives').select('id,group_id,season,snapshot,archived_at').eq('group_id',group).order('archived_at',{ascending:false})
      ]);
      if(ge||me||te||ae||we||ne||noe||are){console.warn('SeasonCrew product load',ge||me||te||ae||we||ne||noe||are);return}
      const ids=[...new Set((members||[]).map(m=>m.user_id))];let profiles=[];
      if(ids.length){const {data}=await c.from('sc_profiles').select('id,username').in('id',ids);profiles=data||[]}
      const pmap=new Map(profiles.map(p=>[p.id,p]));
      await loadFixtures(g?.season||'2026-27');
      const enriched=(members||[]).map(m=>({...m,username:pmap.get(m.user_id)?.username||'Mitglied'}));
      let pending=[];const ownRole=enriched.find(m=>m.user_id===uid)?.role;
      if(profile?.is_superadmin||['owner','admin'].includes(ownRole)){const {data}=await c.from('sc_join_requests').select('id,user_id,status').eq('group_id',group).eq('status','pending');pending=data||[]}
      state={profile:profile||{username:'Mitglied',is_superadmin:false},group:g,members:enriched,tickets:tickets||[],allocs:allocs||[],wishes:wishes||[],notes:notes||[],notifications:notifications||[],archives:archives||[],pending};
      ensureUi();render();setupRealtime(group);
    }finally{loading=false}
  }

  function ticketLabel(id){const t=state?.tickets.find(x=>x.id===id);return t?.label||[t?.block,t?.row_label,t?.seat].filter(Boolean).join('/')||'Karte'}
  function memberName(id){return state?.members.find(x=>x.user_id===id)?.username||'Mitglied'}
  function fixture(id){return fixtureMap.get(id)||null}
  function upcoming(m){if(!m)return true;const end=m.e||m.s;return end>=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}

  function ensureUi(){
    const actions=document.querySelector('.topActions');
    if(actions&&!$('myTicketsBtn')){
      const b=document.createElement('button');b.id='myTicketsBtn';b.className='headerButton productHeaderButton';b.type='button';b.innerHTML='<span>🎟</span><span>Meine Tickets</span>';b.addEventListener('click',openMyTickets);
      const history=[...actions.children].find(x=>x.tagName==='A'&&x.textContent.includes('History'));actions.insertBefore(b,history||actions.firstChild);
    }
    if(actions&&!$('notificationBtn')){
      const b=document.createElement('button');b.id='notificationBtn';b.className='notificationButton';b.type='button';b.setAttribute('aria-label','Benachrichtigungen');b.innerHTML='<span class="bell">🔔</span><b id="notificationCount" class="hidden">0</b>';b.addEventListener('click',openNotifications);actions.insertBefore(b,$('myTicketsBtn')||actions.firstChild);
    }
    if(!$('myTicketsDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="myTicketsDialog" class="dialog productDialog"><div class="dialogCard wideProduct"><div class="dialogHead"><div><small>Persönlicher Bereich</small><h3>Meine Tickets</h3></div><button type="button" class="closeButton" data-close-product="myTicketsDialog">×</button></div><div id="myTicketsBody"></div></div></dialog>`);
    if(!$('notificationDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="notificationDialog" class="dialog productDialog"><div class="dialogCard notificationsCard"><div class="dialogHead"><div><small>SeasonCrew</small><h3>Benachrichtigungen</h3></div><button type="button" class="closeButton" data-close-product="notificationDialog">×</button></div><div class="notificationTools"><button type="button" class="secondaryButton compact" id="markNotificationsRead">Alle gelesen</button></div><div id="notificationList"></div></div></dialog>`);
    if(!$('paymentsDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="paymentsDialog" class="dialog productDialog"><div class="dialogCard wideProduct"><div class="dialogHead"><div><small>Crew-Finanzen</small><h3>Zahlungsübersicht</h3></div><button type="button" class="closeButton" data-close-product="paymentsDialog">×</button></div><div id="paymentsBody"></div></div></dialog>`);
    document.querySelectorAll('[data-close-product]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.addEventListener('click',()=>$(b.dataset.closeProduct)?.close())});
    if($('markNotificationsRead')&&!$('markNotificationsRead').dataset.bound){$('markNotificationsRead').dataset.bound='1';$('markNotificationsRead').addEventListener('click',markAllRead)}
  }

  function render(){renderNotifications();renderCockpit();renderSeasonTools();if($('myTicketsDialog')?.open)renderMyTickets();if($('paymentsDialog')?.open)renderPayments()}

  function renderNotifications(){
    if(!state)return;const unread=state.notifications.filter(n=>!n.read_at).length,count=$('notificationCount');if(count){count.textContent=String(unread);count.classList.toggle('hidden',!unread)}
    const list=$('notificationList');if(!list)return;
    list.innerHTML=state.notifications.length?state.notifications.map(n=>{const f=n.entity_id?fixture(n.entity_id):null;const extra=f?` · ${esc(f.o)} · ${esc(dateLabel(f))}`:'';return `<button type="button" class="notificationItem ${n.read_at?'':'unread'}" data-notification-id="${n.id}"><span class="notificationIcon">${n.type==='ticket_assigned'?'🎟':n.type==='role_changed'?'👤':n.type==='season_started'?'📅':n.type==='join_approved'?'✅':n.type==='join_rejected'?'↩':'•'}</span><span><b>${esc(n.title)}</b><small>${esc(n.body)}${extra}</small><time>${new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(new Date(n.created_at))}</time></span></button>`}).join(''):'<div class="productEmpty">Keine Benachrichtigungen.</div>';
    list.querySelectorAll('[data-notification-id]').forEach(b=>b.addEventListener('click',()=>markOneRead(Number(b.dataset.notificationId))));
  }
  function openNotifications(){renderNotifications();$('notificationDialog')?.showModal()}
  async function markOneRead(id){const n=state.notifications.find(x=>x.id===id);if(!n||n.read_at)return;const now=new Date().toISOString();const {error}=await client().from('sc_notifications').update({read_at:now}).eq('id',id);if(!error){n.read_at=now;renderNotifications()}}
  async function markAllRead(){const ids=state.notifications.filter(n=>!n.read_at).map(n=>n.id);if(!ids.length)return;const now=new Date().toISOString();const {error}=await client().from('sc_notifications').update({read_at:now}).in('id',ids);if(!error){state.notifications.forEach(n=>{if(!n.read_at)n.read_at=now});renderNotifications();toast('Benachrichtigungen gelesen')}}

  function openMyTickets(){renderMyTickets();$('myTicketsDialog')?.showModal()}
  function amountValue(a){return a?.amount==null?null:Number(a.amount)}
  function amountLabel(a){const value=amountValue(a);return value==null?'Preis noch nicht bekannt':money(value)}
  function renderMyTickets(){
    const body=$('myTicketsBody');if(!body||!state||!session)return;const uid=session.user.id;
    const ownName=String(state.profile?.username||'').trim().toLowerCase();
    const mine=state.allocs.filter(a=>a.attendee_user_id===uid||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===ownName)).sort((a,b)=>(fixture(a.fixture_id)?.s||'9999').localeCompare(fixture(b.fixture_id)?.s||'9999'));
    const wishes=state.wishes.filter(w=>w.user_id===uid).sort((a,b)=>(fixture(a.fixture_id)?.s||'9999').localeCompare(fixture(b.fixture_id)?.s||'9999'));
    const open=mine.filter(a=>a.paid===false),unknownOpen=open.filter(a=>amountValue(a)==null).length,openSum=open.reduce((sum,a)=>sum+(amountValue(a)??0),0),future=mine.filter(a=>upcoming(fixture(a.fixture_id))),past=mine.filter(a=>!upcoming(fixture(a.fixture_id)));
    const card=a=>{const f=fixture(a.fixture_id);return `<div class="myTicketCard ${a.paid===true?'paid':'unpaid'}"><div><small>${esc(f?.l||'Spiel')}</small><b>FC Bayern – ${esc(f?.o||a.fixture_id)}</b><span>${esc(dateLabel(f))} · ${esc(ticketLabel(a.ticket_id))}</span></div><div class="myTicketPay"><strong>${esc(amountLabel(a))}</strong><span>${a.paid===true?'bezahlt':'offen'}</span></div></div>`};
    const paypal=cleanPaypal(state.group.paypal_me),payLink=paypal&&open.length&&unknownOpen===0&&openSum>0?`https://paypal.me/${encodeURIComponent(paypal)}/${openSum.toFixed(2)}`:'';
    body.innerHTML=`<div class="personalSummary"><div><small>Offene Zahlungen</small><strong>${money(openSum)}</strong><span>${open.length} Ticket${open.length===1?'':'s'}${unknownOpen?` · ${unknownOpen} Preis${unknownOpen===1?'':'e'} offen`:''}</span></div><div><small>Nächste Tickets</small><strong>${future.length}</strong><span>zugeteilt</span></div><div><small>Ticketwünsche</small><strong>${wishes.length}</strong><span>gemerkt</span></div>${payLink?`<a class="primaryButton payAllButton" href="${payLink}" target="_blank" rel="noopener">Offenen Betrag via PayPal</a>`:''}</div><section class="productSection"><h4>Meine nächsten Spiele</h4>${future.length?future.map(card).join(''):'<div class="productEmpty">Noch keine kommenden Karten zugeteilt.</div>'}</section><section class="productSection"><h4>Meine Ticketwünsche</h4>${wishes.length?wishes.map(w=>{const f=fixture(w.fixture_id);return `<div class="wishOverviewRow"><span>🎟</span><div><b>FC Bayern – ${esc(f?.o||w.fixture_id)}</b><small>${esc(dateLabel(f))}</small></div></div>`}).join(''):'<div class="productEmpty">Keine offenen Ticketwünsche.</div>'}</section>${past.length?`<details class="pastTickets"><summary>Vergangene Tickets (${past.length})</summary>${past.map(card).join('')}</details>`:''}`;
  }

  function renderCockpit(){
    const existing=$('crewCockpit');if(!admin()){existing?.remove();return}const stats=document.querySelector('.statsGrid');if(!stats||!state)return;
    let box=existing;if(!box){box=document.createElement('section');box.id='crewCockpit';box.className='crewCockpit';stats.insertAdjacentElement('afterend',box)}
    const relevant=[...fixtureMap.values()].filter(relevantFixture),ids=new Set(relevant.map(x=>x.id)),allocs=state.allocs.filter(a=>ids.has(a.fixture_id)),capacity=relevant.length*state.tickets.length,unassigned=Math.max(0,capacity-allocs.length),unpaid=allocs.filter(a=>a.paid===false),unknown=unpaid.filter(a=>amountValue(a)==null).length,openSum=unpaid.reduce((sum,a)=>sum+(amountValue(a)??0),0),wishCount=state.wishes.filter(w=>ids.has(w.fixture_id)).length;
    box.innerHTML=`<div class="cockpitHead"><div><small>Crew-Cockpit</small><h3>Was braucht Aufmerksamkeit?</h3></div><button type="button" class="secondaryButton compact" id="openPayments">Zahlungen ansehen</button></div><div class="cockpitGrid"><div class="cockpitMetric ${unassigned?'warn':''}"><b>${unassigned}</b><span>Karten unvergeben</span></div><div class="cockpitMetric ${unpaid.length?'warn':''}"><b>${money(openSum)}</b><span>${unpaid.length} Zahlungen offen${unknown?` · ${unknown} Preis${unknown===1?'':'e'} offen`:''}</span></div><div class="cockpitMetric ${wishCount?'active':''}"><b>${wishCount}</b><span>Ticketwünsche</span></div><div class="cockpitMetric ${state.pending.length?'active':''}"><b>${state.pending.length}</b><span>Bewerbungen offen</span></div></div>`;
    $('openPayments')?.addEventListener('click',()=>{renderPayments();$('paymentsDialog')?.showModal()});
  }

  function paymentGroups(){
    const map=new Map();
    for(const a of state.allocs){
      const key=a.attendee_user_id||`name:${String(a.attendee_name||'Ticket-Gast').toLowerCase()}`;
      if(!map.has(key))map.set(key,{name:a.attendee_user_id?memberName(a.attendee_user_id):(a.attendee_name||'Ticket-Gast'),items:[],paid:0,open:0,unknownPaid:0,unknownOpen:0});
      const p=map.get(key),amount=amountValue(a);p.items.push(a);
      if(a.paid===true){if(amount==null)p.unknownPaid++;else p.paid+=amount}
      else if(a.paid===false){if(amount==null)p.unknownOpen++;else p.open+=amount}
    }
    return [...map.values()].sort((a,b)=>Number(b.open>0||b.unknownOpen>0)-Number(a.open>0||a.unknownOpen>0)||b.open-a.open||a.name.localeCompare(b.name,'de'));
  }
  function renderPayments(){
    const body=$('paymentsBody');if(!body||!state)return;
    if(!admin()){
      const uid=session?.user?.id||'',ownName=String(state.profile?.username||'').trim().toLowerCase();
      const mine=state.allocs.filter(a=>a.attendee_user_id===uid||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===ownName));
      const unpaid=mine.filter(a=>a.paid===false),unknown=unpaid.filter(a=>amountValue(a)==null).length,openSum=unpaid.reduce((sum,a)=>sum+(amountValue(a)??0),0);
      body.innerHTML=`<div class="paymentsSummary"><div><small>Dein offener Betrag</small><strong>${money(openSum)}</strong></div><div><small>Deine offenen Tickets</small><strong>${unpaid.length}</strong></div>${unknown?`<div><small>Preis noch offen</small><strong>${unknown}</strong></div>`:''}</div><div class="paymentPeople">${unpaid.length?unpaid.map(a=>{const f=fixture(a.fixture_id);return `<div class="paymentPersonRow"><div><b>${esc(f?.o||a.fixture_id)}</b><small>${esc(dateLabel(f))} · ${esc(ticketLabel(a.ticket_id))}</small></div><div class="paymentPersonAmount open"><strong>${esc(amountLabel(a))}</strong><span>offen</span></div></div>`}).join(''):'<div class="productEmpty">Du hast aktuell keine offenen Zahlungen.</div>'}</div>`;
      return;
    }
    const groups=paymentGroups(),totalOpen=groups.reduce((sum,p)=>sum+p.open,0),totalUnknown=groups.reduce((sum,p)=>sum+p.unknownOpen,0),paypal=cleanPaypal(state.group.paypal_me),peopleOpen=groups.filter(p=>p.open>0||p.unknownOpen>0).length;
    body.innerHTML=`<div class="paymentsSummary"><div><small>Offener Gesamtbetrag</small><strong>${money(totalOpen)}</strong></div><div><small>Personen mit offenem Betrag</small><strong>${peopleOpen}</strong></div>${totalUnknown?`<div><small>Preise noch offen</small><strong>${totalUnknown}</strong></div>`:''}</div><div class="paymentPeople">${groups.length?groups.map((p,i)=>`<div class="paymentPersonRow"><div><b>@${esc(p.name)}</b><small>${p.items.length} Ticket${p.items.length===1?'':'s'} · ${money(p.paid)} bezahlt${p.unknownPaid?` · ${p.unknownPaid} Preis${p.unknownPaid===1?'':'e'} offen`:''}</small></div><div class="paymentPersonAmount ${p.open||p.unknownOpen?'open':''}"><strong>${p.open?money(p.open):(p.unknownOpen?'–':money(0))}</strong><span>${p.unknownOpen?`${p.unknownOpen} Preis${p.unknownOpen===1?'':'e'} offen`:'offen'}</span></div>${p.open||p.unknownOpen?`<button type="button" class="memberAction" data-copy-debt="${i}">Erinnerung kopieren</button>`:''}</div>`).join(''):'<div class="productEmpty">Noch keine Ticketverteilungen.</div>'}</div>`;
    body.querySelectorAll('[data-copy-debt]').forEach(b=>b.addEventListener('click',async()=>{
      const p=groups[Number(b.dataset.copyDebt)],openItems=p.items.filter(x=>x.paid===false),lines=openItems.map(a=>{const f=fixture(a.fixture_id);return `• ${f?.o||a.fixture_id} · ${dateLabel(f)} · ${amountLabel(a)}`});
      const link=paypal&&p.unknownOpen===0&&p.open>0?`https://paypal.me/${paypal}/${p.open.toFixed(2)}`:'';
      const headline=p.open>0?`${money(p.open)} offen`:'offene Tickets mit noch unbekanntem Preis';
      const text=`Hi ${p.name},\n\nbei SeasonCrew sind noch ${headline}:\n${lines.join('\n')}${link?`\n\nPayPal: ${link}`:''}`;await navigator.clipboard.writeText(text);toast(`Erinnerung für ${p.name} kopiert`)
    }));
  }

  function renderSeasonTools(){
    const existing=$('seasonManagement');if(!admin()){existing?.remove();return}
    const form=$('settingsForm');if(!form||!state)return;let section=existing;if(!section){section=document.createElement('section');section.id='seasonManagement';section.className='seasonManagement';const members=form.querySelector('.membersSettings');(members||form).insertAdjacentElement(members?'afterend':'beforeend',section)}
    const archives=state.archives.map(a=>{const snap=a.snapshot||{},allocCount=Array.isArray(snap.allocations)?snap.allocations.length:0;return `<div class="archiveRow"><div><b>Saison ${esc(a.season.replace('-','/'))}</b><small>${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium'}).format(new Date(a.archived_at))} · ${allocCount} Ticketverteilungen</small></div><button type="button" class="memberAction" data-download-archive="${a.id}">JSON</button></div>`}).join('');
    section.innerHTML=`<div class="settingsSectionHead"><div><h4>Saison & Archiv</h4><p>Beim Saisonwechsel bleiben Mitglieder und Dauerkarten erhalten. Verteilungen, Zahlstatus, Notizen und Wünsche werden vorher archiviert und anschließend geleert.</p></div></div>${owner()?`<div class="newSeasonRow"><input id="newSeasonValue" value="${esc(nextSeason(state.group.season))}" placeholder="2027-28"><button type="button" class="primaryButton compact" id="startNewSeason">Neue Saison starten</button></div>`:''}<div class="archiveList">${archives||'<div class="productEmpty">Noch keine archivierte Saison.</div>'}</div>`;
    $('startNewSeason')?.addEventListener('click',startSeason);
    section.querySelectorAll('[data-download-archive]').forEach(b=>b.addEventListener('click',()=>downloadArchive(b.dataset.downloadArchive)));
  }
  async function startSeason(){const value=String($('newSeasonValue')?.value||'').trim();if(!/^20\d{2}-\d{2}$/.test(value)){toast('Saison bitte z. B. als 2027-28 eingeben');return}if(!confirm(`Saison ${state.group.season.replace('-','/')} archivieren und ${value.replace('-','/')} starten? Verteilungen, Zahlstatus, Notizen und Wünsche werden für die neue Saison geleert.`))return;const {error}=await client().rpc('sc_rollover_season',{p_group:gid(),p_new_season:value});if(error){toast(error.message);return}toast('Neue Saison gestartet');setTimeout(()=>location.reload(),500)}
  function downloadArchive(id){const a=state.archives.find(x=>x.id===id);if(!a)return;const blob=new Blob([JSON.stringify(a.snapshot,null,2)],{type:'application/json'}),url=globalThis.URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`SeasonCrew_${state.group.name.replace(/[^A-Za-z0-9_-]+/g,'_')}_${a.season}.json`;link.click();setTimeout(()=>globalThis.URL.revokeObjectURL(url),1000)}

  function schedule(delay=180){clearTimeout(timer);timer=setTimeout(load,delay)}
  async function setupRealtime(group){
    const c=client();if(!c)return;if(channel&&channel.topic?.includes(group))return;if(channel){try{await c.removeChannel(channel)}catch{}}
    channel=c.channel(`seasoncrew-product-${group}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_notifications',filter:`user_id=eq.${session.user.id}`},()=>schedule(80))
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_ticket_wishes',filter:`group_id=eq.${group}`},()=>schedule(100))
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_allocations',select:['group_id','fixture_id','ticket_id','attendee_name','attendee_user_id','paid','updated_by','updated_at'],filter:`group_id=eq.${group}`},()=>schedule(100))
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_group_members',filter:`group_id=eq.${group}`},()=>schedule(100))
      .on('postgres_changes',{event:'*',schema:'public',table:'sc_join_requests',filter:`group_id=eq.${group}`},()=>schedule(100))
      .subscribe();
  }

  $('groupSelect')?.addEventListener('change',()=>schedule(100));
  window.addEventListener('seasoncrew:settings-rendered',()=>{if(state)requestAnimationFrame(renderSeasonTools)});
  window.addEventListener('seasoncrew:rendered',()=>{if(state)requestAnimationFrame(()=>{ensureUi();renderCockpit()})});
  window.addEventListener('DOMContentLoaded',()=>schedule(900));setTimeout(()=>schedule(0),1300);
})();