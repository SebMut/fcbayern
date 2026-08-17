import { BASE_M, D, MON } from './schedule.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm';

const SUPABASE_URL='https://kmhadzujovvxvpgblgkk.supabase.co';
const SUPABASE_KEY='sb_publishable_JDcJGMDybnrOZcSRqtpzDg_6Ul0jr2Y';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);

let session=null,user=null,profile=null,groups=[],memberships=new Map(),currentGroup=null,tickets=[],allocations=[],notes=[],fixtures=[],members=[],filter='all';
let activeInvite=null,pendingRequests=[],ownPendingRequests=[];
let presenceChannel=null,realtimeChannel=null,paymentContext=null,assignmentContext=null,reloadTimer=null;

const els={
  authScreen:$('authScreen'),authStatus:$('authStatus'),loginForm:$('loginForm'),signupForm:$('signupForm'),
  groupSelect:$('groupSelect'),noGroups:$('noGroups'),workspace:$('workspace'),helloUser:$('helloUser'),seasonPill:$('seasonPill'),groupTitle:$('groupTitle'),clubName:$('clubName'),memberRole:$('memberRole'),onlineBadge:$('onlineBadge'),syncInfo:$('syncInfo'),games:$('games'),searchInput:$('searchInput'),
  createDialog:$('createGroupDialog'),joinDialog:$('joinGroupDialog'),settingsDialog:$('settingsDialog'),paymentDialog:$('paymentDialog'),toast:$('toast'),
  superadminBadge:$('superadminBadge'),heroInviteBtn:$('heroInviteBtn'),pendingNotice:$('pendingNotice')
};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function money(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0)}
function parseMoney(v){const n=Number(String(v??'').trim().replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null}
function roleLabel(r){return r==='superadmin'?'Superadmin':r==='owner'?'Owner':r==='admin'?'Admin':'Mitglied'}
function roleView(){return window.SeasonCrewRoleView?.get(profile?.is_superadmin)||null}
function effectiveRole(){return roleView()||memberships.get(currentGroup?.id)||'guest'}
function isAdmin(){return ['superadmin','owner','admin'].includes(effectiveRole())}
function showToast(text){els.toast.textContent=text;els.toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>els.toast.classList.remove('show'),2600)}
function setStatus(el,text,ok=false){if(!el)return;el.textContent=text||'';el.classList.toggle('ok',!!ok)}
function cleanPaypal(v){return String(v||'').trim().replace(/^https?:\/\/(www\.)?paypal\.me\//i,'').replace(/^paypal\.me\//i,'').replace(/^@/,'').replace(/\/$/,'')}
function todayBerlin(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function validUsername(v){return /^[A-Za-z0-9._-]{3,24}$/.test(String(v||'').trim())}
function extractInviteToken(value){
  const raw=String(value||'').trim();if(!raw)return '';
  try{const u=new URL(raw);return (u.searchParams.get('invite')||'').trim().toUpperCase()}catch{}
  const m=raw.match(/[?&]invite=([^&#]+)/i);if(m)return decodeURIComponent(m[1]).trim().toUpperCase();
  return raw.replace(/\s/g,'').toUpperCase();
}
function invitationLink(token){const u=new URL('./',location.href);u.search='';u.hash='';u.searchParams.set('invite',token);return u.href}
function gameDate(m){
  const a=new Date(`${m.s}T12:00:00`),b=new Date(`${m.e||m.s}T12:00:00`);
  if(m.s===m.e||!m.e)return [`${String(a.getDate()).padStart(2,'0')}.${String(a.getMonth()+1).padStart(2,'0')}.${String(a.getFullYear()).slice(2)}`,m.t?`${m.t} Uhr`:'' ];
  return [`${a.getDate()}.–${b.getDate()}. ${MON[a.getMonth()]}`,String(a.getFullYear())];
}
function competitionName(c){return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':'Champions League'}
function clubLogo(name){const domain=D[name];return domain?`<img class="clubLogo" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128" alt="">`:`<span class="clubLogo"></span>`}
function relevantFixture(m){if(m.c==='bl')return m.h===true;if(m.n)return true;return m.h===true||m.pos===true}
function ticketLabel(t){return t.label||[t.block,t.row_label,t.seat].filter(Boolean).join('/')||'Karte'}
function allocationKey(fixtureId,ticketId){return `${fixtureId}:${ticketId}`}
function allocationMap(){return new Map(allocations.map(a=>[allocationKey(a.fixture_id,a.ticket_id),a]))}
function noteMap(){return new Map(notes.map(n=>[n.fixture_id,n]))}

function pendingInviteToken(){
  const urlToken=extractInviteToken(new URL(location.href).searchParams.get('invite'));
  const savedToken=extractInviteToken(localStorage.getItem('seasoncrew-pending-invite'));
  return urlToken||savedToken;
}
function syncSignupInvite(){
  const token=pendingInviteToken();
  const input=$('signupInvite');
  if(token){
    localStorage.setItem('seasoncrew-pending-invite',token);
    if(input&&!input.value.trim())input.value=token;
  }
  return token;
}
function setAuthTab(tab){
  document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===tab));
  els.loginForm.classList.toggle('hidden',tab!=='login');els.signupForm.classList.toggle('hidden',tab!=='signup');setStatus(els.authStatus,'');
  if(tab==='signup')syncSignupInvite();
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthTab(b.dataset.authTab)));
const initialInvite=syncSignupInvite();
if(initialInvite)setAuthTab('signup');

els.loginForm.addEventListener('submit',async e=>{
  e.preventDefault();setStatus(els.authStatus,'Einloggen …');
  try{
    const {data,error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
    if(error){setStatus(els.authStatus,/invalid login credentials/i.test(error.message||'')?'E-Mail oder Passwort ist falsch.':'Login fehlgeschlagen: '+error.message);return}
    session=data.session;user=data.user;
    if(!session||!user){setStatus(els.authStatus,'Login fehlgeschlagen. Bitte erneut versuchen.');return}
    const {error:loginAuditError}=await sb.rpc('sc_log_login');if(loginAuditError)console.warn('Login-Audit',loginAuditError);
    await enterApp();
  }catch(error){setStatus(els.authStatus,'Login fehlgeschlagen: '+(error?.message||String(error)))}
});

els.signupForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const token=extractInviteToken($('signupInvite')?.value)||pendingInviteToken();
  const username=$('signupUsername').value.trim(),email=$('signupEmail').value.trim();
  if(!validUsername(username)){setStatus(els.authStatus,'Nutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.');return}
  if(token){
    setStatus(els.authStatus,'Einladungscode wird geprüft …');
    const {data:inviteRows,error:inviteError}=await sb.rpc('sc_validate_invite',{p_token:token});
    const invite=Array.isArray(inviteRows)?inviteRows[0]:inviteRows;
    if(inviteError){setStatus(els.authStatus,'Einladung konnte nicht geprüft werden: '+inviteError.message);return}
    if(!invite?.valid){setStatus(els.authStatus,'Dieser Einladungscode ist ungültig oder abgelaufen.');return}
    localStorage.setItem('seasoncrew-pending-invite',token);
  }
  setStatus(els.authStatus,'Nutzername wird geprüft …');
  const {data:available,error:checkError}=await sb.rpc('sc_username_available',{p_username:username});
  if(checkError){setStatus(els.authStatus,'Nutzername konnte nicht geprüft werden.');return}
  if(!available){setStatus(els.authStatus,'Dieser Nutzername ist bereits vergeben.');return}
  setStatus(els.authStatus,'Account wird erstellt …');
  const redirectTo=new URL('./',location.href);redirectTo.search='';redirectTo.hash='';
  if(token)redirectTo.searchParams.set('invite',token);
  const metadata={username};if(token)metadata.invite_token=token;
  const {data,error}=await sb.auth.signUp({email,password:$('signupPassword').value,options:{emailRedirectTo:redirectTo.href,data:metadata}});
  if(error){setStatus(els.authStatus,error.message);return}
  if(data.session&&data.user){
    session=data.session;user=data.user;setStatus(els.authStatus,'Account erstellt. App wird geladen …',true);await enterApp();return
  }
  setAuthTab('login');
  setStatus(els.authStatus,'Account angelegt. Bitte logge dich jetzt ein.',true);
});

$('logoutBtn').addEventListener('click',async()=>{await cleanupChannels();await sb.auth.signOut();location.reload()});

async function enterApp(){
  if(!user){document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');return}
  document.body.classList.remove('auth-locked');els.authScreen.classList.add('hidden');
  await loadProfile();await loadGroups();await processPendingInvite();
}

async function loadProfile(){
  const {data,error}=await sb.from('sc_profiles').select('id,username,is_superadmin').eq('id',user.id).maybeSingle();
  if(error)console.error(error);
  profile=data||{id:user.id,username:user.email?.split('@')[0]||'fan',is_superadmin:false};
  els.superadminBadge.classList.toggle('hidden',!profile.is_superadmin);
}

async function loadOwnRequests(){
  const {data,error}=await sb.from('sc_join_requests').select('id,group_id,status,requested_at,assigned_role').eq('user_id',user.id).order('requested_at',{ascending:false});
  ownPendingRequests=error?[]:(data||[]).filter(x=>x.status==='pending');
  renderPendingNotice();
}

function renderPendingNotice(extra=''){
  if(!els.pendingNotice)return;
  const text=extra||(ownPendingRequests.length?`Deine Beitrittsanfrage wartet auf die Freigabe eines Gruppen-Admins. Danach wirst du als Mitglied oder Admin aufgenommen.`:'');
  els.pendingNotice.textContent=text;els.pendingNotice.classList.toggle('hidden',!text);
}

async function loadGroups(preferId=null){
  const {data:ms,error:memberError}=await sb.from('sc_group_members').select('group_id,role,joined_at').eq('user_id',user.id).order('joined_at');
  if(memberError){console.error(memberError);showToast('Gruppen konnten nicht geladen werden');return}
  memberships=new Map((ms||[]).map(m=>[m.group_id,m.role]));
  let gs=[];
  if(profile?.is_superadmin){
    const {data,error}=await sb.from('sc_groups').select('*').order('created_at');if(error){console.error(error);return}gs=data||[];
  }else{
    const ids=[...memberships.keys()];
    if(ids.length){const {data,error}=await sb.from('sc_groups').select('*').in('id',ids).order('created_at');if(error){console.error(error);return}gs=data||[]}
  }
  groups=gs;renderGroupSelector();await loadOwnRequests();
  if(!groups.length){currentGroup=null;els.workspace.classList.add('hidden');els.noGroups.classList.remove('hidden');return}
  const saved=preferId||localStorage.getItem('seasoncrew-group');
  currentGroup=groups.find(g=>g.id===saved)||groups[0];
  els.groupSelect.value=currentGroup.id;localStorage.setItem('seasoncrew-group',currentGroup.id);
  els.noGroups.classList.add('hidden');els.workspace.classList.remove('hidden');
  await loadCurrentGroup();
}

function renderGroupSelector(){els.groupSelect.innerHTML=groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}
els.groupSelect.addEventListener('change',async()=>{currentGroup=groups.find(g=>g.id===els.groupSelect.value);if(!currentGroup)return;localStorage.setItem('seasoncrew-group',currentGroup.id);await loadCurrentGroup()});

async function loadCurrentGroup(){
  await cleanupChannels();
  const gid=currentGroup.id;
  const [{data:ts,error:te},{data:as,error:ae},{data:ns,error:ne},{data:ms,error:me}]=await Promise.all([
    sb.from('sc_tickets').select('*').eq('group_id',gid).eq('active',true).order('sort_order').order('created_at'),
    sb.rpc('sc_get_allocations',{p_group:gid}),
    sb.from('sc_fixture_notes').select('*').eq('group_id',gid),
    sb.from('sc_group_members').select('group_id,user_id,role,joined_at').eq('group_id',gid).order('joined_at')
  ]);
  if(te||ae||ne||me){console.error(te||ae||ne||me);showToast('Crew-Daten konnten nicht geladen werden');return}
  tickets=ts||[];allocations=as||[];notes=ns||[];members=ms||[];
  await Promise.all([loadFixtures(),enrichMembers()]);
  if(isAdmin())await loadAdminData();else{activeInvite=null;pendingRequests=[]}
  render();setupPresence();setupRealtime();
}

async function enrichMembers(){
  const ids=members.map(m=>m.user_id);if(!ids.length)return;
  const {data}=await sb.from('sc_profiles').select('id,username').in('id',ids);
  const map=new Map((data||[]).map(p=>[p.id,p]));members=members.map(m=>({...m,...(map.get(m.user_id)||{username:'mitglied'})}));
}

async function loadAdminData(){
  const gid=currentGroup.id,now=new Date().toISOString();
  const [{data:invites},{data:reqs}]=await Promise.all([
    sb.from('sc_group_invites').select('id,token,expires_at,created_at,active').eq('group_id',gid).eq('active',true).gt('expires_at',now).order('created_at',{ascending:false}).limit(1),
    sb.from('sc_join_requests').select('id,user_id,status,requested_at').eq('group_id',gid).eq('status','pending').order('requested_at')
  ]);
  activeInvite=invites?.[0]||null;pendingRequests=reqs||[];
  const ids=pendingRequests.map(r=>r.user_id);
  if(ids.length){const {data:ps}=await sb.from('sc_profiles').select('id,username').in('id',ids);const pm=new Map((ps||[]).map(p=>[p.id,p]));pendingRequests=pendingRequests.map(r=>({...r,...(pm.get(r.user_id)||{username:'bewerber'})}))}
}

async function loadFixtures(){
  fixtures=BASE_M.map(x=>({...x}));
  const {data,error}=await sb.from('match_overrides').select('id,start_date,end_date,kickoff_time,opponent,home,possible,active').eq('season',currentGroup.season);
  if(!error&&data){const map=new Map(data.map(x=>[x.id,x]));fixtures=fixtures.map(base=>{const x=map.get(base.id);if(x?.active===false)return null;if(!x)return base;return{...base,s:x.start_date||base.s,e:x.end_date||x.start_date||base.e,t:x.kickoff_time?String(x.kickoff_time).slice(0,5):(x.start_date?'':base.t),o:x.opponent||base.o,h:x.home??base.h,pos:x.possible??base.pos}}).filter(Boolean)}
  const {data:sync}=await sb.from('fixture_sync_runs').select('finished_at,status').eq('status','success').not('finished_at','is',null).order('finished_at',{ascending:false}).limit(1).maybeSingle();
  els.syncInfo.textContent=sync?.finished_at?`Letzter Spielplan-Sync: ${new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(sync.finished_at))}`:'Spielplan-Sync: noch kein Lauf';
}

function filteredFixtures(){
  const q=els.searchInput.value.trim().toLowerCase(),amap=allocationMap();
  return fixtures.filter(relevantFixture).filter(m=>{
    const assigned=tickets.filter(t=>amap.has(allocationKey(m.id,t.id))).length;
    const ok=filter==='all'||filter===m.c||(filter==='open'&&assigned<tickets.length);
    if(!ok)return false;
    return !q||[m.l,m.o,m.p,competitionName(m.c)].join(' ').toLowerCase().includes(q);
  }).sort((a,b)=>a.s.localeCompare(b.s)||a.id.localeCompare(b.id));
}

function render(){
  if(!currentGroup)return;
  els.helloUser.textContent=`Hallo ${profile?.username||'Fan'}`;
  els.seasonPill.textContent=`Saison ${currentGroup.season.replace('-', ' / ')}`;
  els.groupTitle.textContent=currentGroup.name;els.clubName.textContent=currentGroup.club_name;els.memberRole.textContent=roleLabel(effectiveRole());
  els.heroInviteBtn.classList.toggle('hidden',!isAdmin());
  renderStats();renderGames();renderSettings();
  window.dispatchEvent(new CustomEvent('seasoncrew:rendered',{detail:{groupId:currentGroup.id,role:effectiveRole()}}));
}

function renderStats(){
  const relevant=fixtures.filter(relevantFixture),ids=new Set(relevant.map(m=>m.id)),relevantAlloc=allocations.filter(a=>ids.has(a.fixture_id));
  const adminView=isAdmin(),username=String(profile?.username||'').trim().toLowerCase();
  const paymentAlloc=adminView?relevantAlloc:relevantAlloc.filter(a=>a.attendee_user_id===user?.id||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===username));
  const unpaid=paymentAlloc.filter(a=>!a.paid),open=Math.max(0,relevant.length*tickets.length-relevantAlloc.length);
  $('statFixtures').textContent=relevant.length;$('statTickets').textContent=tickets.length;$('statAssigned').textContent=relevantAlloc.length;$('statOpen').textContent=open;
  const paymentLabel=$('statUnpaid')?.parentElement?.querySelector('small');if(paymentLabel)paymentLabel.textContent=adminView?'Zahlungen offen':'Deine offenen Zahlungen';
  $('statUnpaid').textContent=money(unpaid.reduce((s,a)=>s+Number(a.amount||currentGroup.default_price||0),0));$('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}`;
}

function renderGames(){
  const list=filteredFixtures(),amap=allocationMap(),nmap=noteMap(),today=todayBerlin(),next=list.find(m=>(m.e||m.s)>=today)||list.at(-1);
  if(!list.length){els.games.innerHTML='<div class="noGames">Keine Spiele für diesen Filter.</div>';window.dispatchEvent(new CustomEvent('seasoncrew:games-rendered',{detail:{groupId:currentGroup?.id||null}}));return}
  const groupsByMonth={};for(const m of list){const d=new Date(`${m.s}T12:00:00`),k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;(groupsByMonth[k]||=[]).push(m)}
  els.games.innerHTML=Object.keys(groupsByMonth).sort().map(k=>`<div class="monthTitle">${MON[Number(k.slice(5))-1]} ${k.slice(0,4)}</div>${groupsByMonth[k].map(m=>renderGame(m,amap,nmap,m.id===next?.id)).join('')}`).join('');
  bindGameEvents();
  window.dispatchEvent(new CustomEvent('seasoncrew:games-rendered',{detail:{groupId:currentGroup?.id||null}}));
}

function renderGame(m,amap,nmap,isNext){
  const allocated=tickets.map(t=>amap.get(allocationKey(m.id,t.id))).filter(Boolean),allPaid=tickets.length>0&&allocated.length===tickets.length&&allocated.every(a=>a.paid),[date,time]=gameDate(m);
  const cols=Math.max(1,Math.min(tickets.length,4));
  return `<article class="gameCard ${isNext?'nextGame':''} ${allPaid?'allPaid':''}" id="game-${m.id}"><div class="gameTop"><div class="gameDate"><strong>${date}</strong><span>${esc(time||'Termin offen')}</span></div><div class="fixtureMeta"><span class="competition">${competitionName(m.c)}</span><h3>${clubLogo('FC Bayern')}<span>FC Bayern</span><span>–</span>${clubLogo(m.o)}<span>${esc(m.o)}</span></h3><p>${esc(m.l)} · ${esc(m.p||'')}</p></div><div class="fixtureCount">${allocated.length}/${tickets.length}</div></div><div class="ticketGrid" style="grid-template-columns:repeat(${cols},1fr)">${tickets.length?tickets.map(t=>renderTicket(m,t,amap.get(allocationKey(m.id,t.id)))).join(''):'<div class="noGames">Noch keine Dauerkarten angelegt. Öffne Einstellungen.</div>'}</div><textarea class="gameNote" data-note-fixture="${m.id}" placeholder="Notiz zum Spiel">${esc(nmap.get(m.id)?.note||'')}</textarea></article>`;
}

function renderTicket(m,t,a){
  const label=ticketLabel(t);
  if(!a)return `<div class="ticketCard unassigned" data-assign-fixture="${m.id}" data-ticket-id="${t.id}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${[t.block&&`Block ${esc(t.block)}`,t.row_label&&`Reihe ${esc(t.row_label)}`,t.seat&&`Sitz ${esc(t.seat)}`].filter(Boolean).join(' · ')}</small></div><span>+</span></div><div style="padding:8px 10px;color:#8994a3;font-size:9px">Karte vergeben</div></div>`;
  const state=a.paid?'paid':'unpaid';
  return `<div class="ticketCard assigned ${state}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${a.paid?'bezahlt':'Zahlung offen'}</small></div></div><input class="attendeeInput" data-attendee-fixture="${m.id}" data-ticket-id="${t.id}" value="${esc(a.attendee_name||'')}" placeholder="Name"><div class="ticketActions"><button class="releaseAssignmentBtn" type="button" data-release-fixture="${m.id}" data-ticket-id="${t.id}" title="Zuweisung aufheben">Zuweisung aufheben</button><button type="button" data-paypal-fixture="${m.id}" data-ticket-id="${t.id}">PayPal</button><label class="paidToggle"><input type="checkbox" data-paid-fixture="${m.id}" data-ticket-id="${t.id}" ${a.paid?'checked':''}> bezahlt</label></div></div>`;
}

function bindGameEvents(){
  document.querySelectorAll('[data-assign-fixture]').forEach(el=>el.addEventListener('click',()=>openAssignTicket(el.dataset.assignFixture,el.dataset.ticketId)));
  document.querySelectorAll('[data-release-fixture]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();releaseTicket(el.dataset.releaseFixture,el.dataset.ticketId)}));
  document.querySelectorAll('[data-attendee-fixture]').forEach(input=>{input.addEventListener('click',e=>e.stopPropagation());input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur()}});input.addEventListener('change',()=>saveAttendee(input.dataset.attendeeFixture,input.dataset.ticketId,input.value))});
  document.querySelectorAll('[data-paid-fixture]').forEach(input=>input.addEventListener('change',()=>savePaid(input.dataset.paidFixture,input.dataset.ticketId,input.checked)));
  document.querySelectorAll('[data-paypal-fixture]').forEach(btn=>btn.addEventListener('click',()=>openPayment(btn.dataset.paypalFixture,btn.dataset.ticketId)));
  document.querySelectorAll('[data-note-fixture]').forEach(t=>t.addEventListener('change',()=>saveNote(t.dataset.noteFixture,t.value)));
}

async function readAllocation(fixtureId,ticketId){
  const {data,error}=await sb.rpc('sc_get_allocations',{p_group:currentGroup.id});
  if(error){console.warn('Allocation refresh',error);return null}
  return (data||[]).find(a=>a.fixture_id===fixtureId&&a.ticket_id===ticketId)||null;
}
function openAssignTicket(fixtureId,ticketId){
  if(!isAdmin())return;
  const m=fixtureById(fixtureId),t=ticketById(ticketId);if(!m||!t)return;
  assignmentContext={fixtureId,ticketId};
  $('assignTicketTitle').textContent=`${ticketLabel(t)} · ${m.o}`;
  $('assignTicketMeta').textContent=`${gameDate(m)[0]}${gameDate(m)[1]?` · ${gameDate(m)[1]}`:''} · ${[t.block&&`Block ${t.block}`,t.row_label&&`Reihe ${t.row_label}`,t.seat&&`Sitz ${t.seat}`].filter(Boolean).join(' · ')}`;
  $('assignTicketMember').innerHTML='<option value="">Crew-Mitglied wählen …</option>'+members.map(x=>`<option value="${x.user_id}">${esc(x.username||'Mitglied')} · ${roleLabel(x.role)}</option>`).join('');
  $('assignTicketMember').value='';$('assignTicketGuest').value='';setStatus($('assignTicketStatus'),'');
  $('assignTicketDialog').showModal();
}
async function assignTicket(fixtureId,ticketId,attendeeUserId,attendeeName){
  if(!isAdmin())return false;
  const row={group_id:currentGroup.id,fixture_id:fixtureId,ticket_id:ticketId,attendee_name:String(attendeeName||'').trim(),attendee_user_id:attendeeUserId||null,paid:false,amount:Number(currentGroup.default_price)||50,updated_by:user.id};
  const {error}=await sb.from('sc_allocations').insert(row);
  if(error){showToast('Karte konnte nicht vergeben werden');console.error(error);return false}
  const saved=await readAllocation(fixtureId,ticketId);replaceAllocation(saved||row);render();return true;
}
$('assignTicketMember').addEventListener('change',()=>{if($('assignTicketMember').value)$('assignTicketGuest').value=''});
$('assignTicketGuest').addEventListener('input',()=>{if($('assignTicketGuest').value.trim())$('assignTicketMember').value=''});
function closeAssignTicketDialog(){$('assignTicketDialog').close();assignmentContext=null;setStatus($('assignTicketStatus'),'')}
$('assignTicketCancel').addEventListener('click',closeAssignTicketDialog);
$('assignTicketCancelBottom').addEventListener('click',closeAssignTicketDialog);
$('assignTicketForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!assignmentContext||!isAdmin())return;
  const memberId=$('assignTicketMember').value,guest=$('assignTicketGuest').value.trim();
  const chosen=memberId?members.find(x=>x.user_id===memberId):null;
  if(!chosen&&!guest){setStatus($('assignTicketStatus'),'Bitte ein Crew-Mitglied auswählen oder einen Ticket-Gast eintragen.');return}
  const saveBtn=$('assignTicketSave');saveBtn.disabled=true;saveBtn.textContent='Wird vergeben …';
  const ok=await assignTicket(assignmentContext.fixtureId,assignmentContext.ticketId,guest?null:chosen.user_id,guest||chosen.username);
  saveBtn.disabled=false;saveBtn.textContent='Karte vergeben';
  if(!ok)return;
  $('assignTicketDialog').close();assignmentContext=null;showToast('Karte vergeben');
});
async function releaseTicket(fixtureId,ticketId){
  const {error}=await sb.from('sc_allocations').delete().eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Zuweisung konnte nicht aufgehoben werden');return}
  allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==allocationKey(fixtureId,ticketId));render();
}
async function saveAttendee(fixtureId,ticketId,name){
  const {error}=await sb.from('sc_allocations').update({attendee_name:name.trim(),updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Name konnte nicht gespeichert werden');return}
  const saved=await readAllocation(fixtureId,ticketId);if(saved)replaceAllocation(saved);showToast('Name gespeichert');
}
async function savePaid(fixtureId,ticketId,paid){
  const {error}=await sb.from('sc_allocations').update({paid,updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Zahlstatus konnte nicht gespeichert werden');return}
  const saved=await readAllocation(fixtureId,ticketId);if(saved)replaceAllocation(saved);render();
}
function replaceAllocation(data){if(!data)return;const key=allocationKey(data.fixture_id,data.ticket_id);allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==key);allocations.push(data)}
async function saveNote(fixtureId,note){
  if(!note.trim()){await sb.from('sc_fixture_notes').delete().eq('group_id',currentGroup.id).eq('fixture_id',fixtureId);notes=notes.filter(n=>n.fixture_id!==fixtureId);showToast('Notiz entfernt');return}
  const {data,error}=await sb.from('sc_fixture_notes').upsert({group_id:currentGroup.id,fixture_id:fixtureId,note,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'group_id,fixture_id'}).select().single();if(error){showToast('Notiz konnte nicht gespeichert werden');return}notes=notes.filter(n=>n.fixture_id!==fixtureId);notes.push(data);showToast('Notiz gespeichert');
}

function fixtureById(id){return fixtures.find(m=>m.id===id)}
function ticketById(id){return tickets.find(t=>t.id===id)}
function allocationByIds(f,t){return allocations.find(a=>a.fixture_id===f&&a.ticket_id===t)}
function openPayment(fixtureId,ticketId){
  const a=allocationByIds(fixtureId,ticketId),m=fixtureById(fixtureId),t=ticketById(ticketId);if(!a||!m||!t)return;
  paymentContext={a,m,t};$('paymentPerson').textContent=`${a.attendee_name||'Ticket-Gast'} · ${ticketLabel(t)}`;$('paymentMatch').textContent=`${m.l} · ${m.o} · ${gameDate(m)[0]}`;$('paymentAmount').value=Number(a.amount||currentGroup.default_price||50).toFixed(2).replace('.',',');setStatus($('paymentStatus'),'');updatePaymentPreview();els.paymentDialog.showModal();
}
function paymentData(){
  if(!paymentContext)return null;const amount=parseMoney($('paymentAmount').value);if(amount==null)return null;const {a,m,t}=paymentContext,paypal=cleanPaypal(currentGroup.paypal_me);const link=paypal?`https://paypal.me/${paypal}/${amount.toFixed(2)}`:'';const match=`${m.l} · ${m.o}`;const text=`Hi ${a.attendee_name||'!'},\n\n${match}\nTicket: ${ticketLabel(t)}\nDatum: ${gameDate(m)[0]}\nBetrag: ${money(amount)}${link?`\n\nPayPal: ${link}`:''}`;return{amount,link,match,text,a,m,t};
}
function updatePaymentPreview(){const d=paymentData();$('paymentPreview').textContent=d?`${money(d.amount)}\n${d.match}${d.link?`\n${d.link}`:'\nPayPal.Me ist für diese Crew noch nicht hinterlegt.'}`:'Bitte gültigen Betrag eingeben.'}
$('paymentAmount').addEventListener('input',updatePaymentPreview);
$('copyPaymentBtn').addEventListener('click',async()=>{const d=paymentData();if(!d)return;await navigator.clipboard.writeText(d.text);await savePaymentAmountAndLog(d,'message_copied');setStatus($('paymentStatus'),'Nachricht kopiert ✓',true)});
$('sharePaymentBtn').addEventListener('click',async()=>{const d=paymentData();if(!d)return;try{if(navigator.share)await navigator.share({title:d.match,text:d.text});else await navigator.clipboard.writeText(d.text);await savePaymentAmountAndLog(d,navigator.share?'share_opened':'message_copied');setStatus($('paymentStatus'),navigator.share?'Teilen geöffnet ✓':'Nachricht kopiert ✓',true)}catch(e){if(e?.name!=='AbortError')setStatus($('paymentStatus'),'Teilen nicht möglich')}});
async function savePaymentAmountAndLog(d,action){
  await sb.from('sc_allocations').update({amount:d.amount,updated_by:user.id,updated_at:new Date().toISOString()}).eq('group_id',currentGroup.id).eq('fixture_id',d.m.id).eq('ticket_id',d.t.id);
  await sb.from('sc_history').insert({group_id:currentGroup.id,actor_user_id:user.id,actor_name:profile.username,entity_type:'paypal',entity_id:d.m.id,action,before_data:{},after_data:{person:d.a.attendee_name,ticket:ticketLabel(d.t),opponent:d.m.o,match_label:d.match,amount:d.amount,paypal_me:cleanPaypal(currentGroup.paypal_me)}});
  const a=allocationByIds(d.m.id,d.t.id);if(a)a.amount=d.amount;renderStats();
}

function renderSettings(){
  if(!currentGroup)return;
  $('settingsTitle').textContent=currentGroup.name;$('profileUsername').value=profile?.username||'';$('profileEmail').value=user?.email||'';$('settingsGroupName').value=currentGroup.name;$('settingsPaypal').value=cleanPaypal(currentGroup.paypal_me);$('settingsPrice').value=Number(currentGroup.default_price||50).toFixed(2).replace('.',',');
  $('adminSettings').classList.toggle('hidden',!isAdmin());$('ticketSettings').classList.toggle('hidden',!isAdmin());$('inviteAdminSettings').classList.toggle('hidden',!isAdmin());
  $('ticketList').innerHTML=tickets.map(t=>`<div class="ticketSettingRow"><div><b>${esc(ticketLabel(t))}</b><small>${[t.block&&`Block ${esc(t.block)}`,t.row_label&&`Reihe ${esc(t.row_label)}`,t.seat&&`Sitz ${esc(t.seat)}`].filter(Boolean).join(' · ')}</small></div><button class="dangerButton" type="button" data-delete-ticket="${t.id}">Löschen</button></div>`).join('')||'<div class="loadingCard">Noch keine Karten.</div>';
  document.querySelectorAll('[data-delete-ticket]').forEach(b=>b.onclick=()=>deleteTicket(b.dataset.deleteTicket));
  $('memberList').innerHTML=members.map(m=>`<div class="memberRow"><div class="memberIdentity"><b>@${esc(m.username||'mitglied')}</b></div><span class="roleBadge ${m.role==='owner'?'owner':m.role==='admin'?'admin':'guest'}">${roleLabel(m.role)}</span></div>`).join('');
  renderInviteAdmin();
  window.dispatchEvent(new CustomEvent('seasoncrew:settings-rendered',{detail:{groupId:currentGroup?.id||null}}));
}

async function renderInviteAdmin(){
  if(!isAdmin())return;
  const canGrantAdmin=['superadmin','owner'].includes(effectiveRole());
  $('requestCount').textContent=String(pendingRequests.length);
  $('joinRequestList').innerHTML=pendingRequests.length?pendingRequests.map(r=>`<div class="joinRequestRow"><div class="joinRequestUser"><b>@${esc(r.username||'bewerber')}</b><small>Anfrage ${new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(new Date(r.requested_at))}</small></div><div class="requestActions"><button class="approveGuest" type="button" data-approve-guest="${r.id}">Als Mitglied</button><button class="approveAdmin" type="button" data-approve-admin="${r.id}">Als Admin</button><button class="reject" type="button" data-reject-request="${r.id}">Ablehnen</button></div></div>`).join(''):'<div class="loadingCard">Keine offenen Bewerbungen.</div>';
  if(!canGrantAdmin)document.querySelectorAll('[data-approve-admin]').forEach(b=>b.remove());
  document.querySelectorAll('[data-approve-guest]').forEach(b=>b.onclick=()=>decideRequest(b.dataset.approveGuest,true,'guest'));
  document.querySelectorAll('[data-approve-admin]').forEach(b=>b.onclick=()=>decideRequest(b.dataset.approveAdmin,true,'admin'));
  document.querySelectorAll('[data-reject-request]').forEach(b=>b.onclick=()=>decideRequest(b.dataset.rejectRequest,false,'guest'));
  const box=$('inviteBox');
  if(!activeInvite){box.className='inviteBox emptyInvite';box.textContent='Noch keine aktive Einladung. Erstelle einen neuen Link oder QR-Code.';return}
  const link=invitationLink(activeInvite.token),expires=new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(activeInvite.expires_at));
  let qr='';try{const QRCode=await import('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm');qr=await QRCode.toDataURL(link,{width:260,margin:1})}catch(e){console.warn('QR-Code konnte nicht geladen werden',e)}
  box.className='inviteBox';box.innerHTML=`<div class="inviteGrid">${qr?`<img class="inviteQr" src="${qr}" alt="QR-Code für Einladung">`:''}<div class="inviteMeta"><small>Aktive Einladung</small><strong>${esc(currentGroup.name)}</strong><div class="inviteCodeBlock"><small>Einladungscode</small><div class="inviteCodeRow"><code>${esc(activeInvite.token)}</code><button type="button" data-copy-invite-code>Code kopieren</button></div></div><small class="inviteLinkLabel">Einladungslink</small><span class="inviteLink">${esc(link)}</span><div class="inviteActions"><button type="button" data-copy-invite>Link kopieren</button><button type="button" data-share-invite>Teilen</button></div><div class="inviteExpiry">Gültig bis ${esc(expires)} · danach automatisch ungültig</div></div></div>`;
  box.querySelector('[data-copy-invite-code]')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(activeInvite.token);showToast('Einladungscode kopiert')});
  box.querySelector('[data-copy-invite]')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(link);showToast('Einladungslink kopiert')});
  box.querySelector('[data-share-invite]')?.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:`Einladung zu ${currentGroup.name}`,text:`SeasonCrew Einladungscode: ${activeInvite.token}`,url:link});else await navigator.clipboard.writeText(link)}catch(e){if(e?.name!=='AbortError')showToast('Teilen nicht möglich')}});
}

$('settingsBtn').addEventListener('click',()=>{renderSettings();els.settingsDialog.showModal()});$('groupMenuBtn').addEventListener('click',()=>{renderSettings();els.settingsDialog.showModal()});
els.heroInviteBtn.addEventListener('click',()=>{renderSettings();els.settingsDialog.showModal();setTimeout(()=>$('inviteAdminSettings')?.scrollIntoView({behavior:'smooth',block:'start'}),120)});

$('saveProfileBtn').addEventListener('click',async()=>{
  const username=$('profileUsername').value.trim();if(!validUsername(username)){setStatus($('settingsStatus'),'Bitte einen gültigen Nutzernamen eingeben.');return}
  if(username.toLowerCase()!==String(profile.username||'').toLowerCase()){
    const {data:available,error:checkError}=await sb.rpc('sc_username_available',{p_username:username});if(checkError||!available){setStatus($('settingsStatus'),checkError?.message||'Dieser Nutzername ist bereits vergeben.');return}
  }
  const {error}=await sb.from('sc_profiles').update({username,updated_at:new Date().toISOString()}).eq('id',user.id);if(error){setStatus($('settingsStatus'),error.message);return}
  await sb.auth.updateUser({data:{username}});profile.username=username;setStatus($('settingsStatus'),'Profil gespeichert ✓',true);render();
});
$('saveGroupBtn').addEventListener('click',async()=>{if(!isAdmin())return;const price=parseMoney($('settingsPrice').value);const update={name:$('settingsGroupName').value.trim(),paypal_me:cleanPaypal($('settingsPaypal').value)||null,default_price:price??50,updated_at:new Date().toISOString()};const {data,error}=await sb.from('sc_groups').update(update).eq('id',currentGroup.id).select().single();if(error){setStatus($('settingsStatus'),error.message);return}currentGroup=data;groups=groups.map(g=>g.id===data.id?data:g);renderGroupSelector();els.groupSelect.value=data.id;setStatus($('settingsStatus'),'Crew gespeichert ✓',true);render()});
$('addTicketBtn').addEventListener('click',async()=>{if(!isAdmin())return;const block=$('ticketBlock').value.trim(),row=$('ticketRow').value.trim(),seat=$('ticketSeat').value.trim();if(!block&&!row&&!seat){setStatus($('settingsStatus'),'Bitte Block, Reihe oder Sitz angeben.');return}const label=[block,row,seat].filter(Boolean).join('/');const {data,error}=await sb.from('sc_tickets').insert({group_id:currentGroup.id,label,block:block||null,row_label:row||null,seat:seat||null,sort_order:tickets.length+1}).select().single();if(error){setStatus($('settingsStatus'),error.message);return}tickets.push(data);$('ticketBlock').value=$('ticketRow').value=$('ticketSeat').value='';setStatus($('settingsStatus'),'Karte hinzugefügt ✓',true);render()});
$('createInviteBtn').addEventListener('click',async()=>{
  if(!isAdmin())return;setStatus($('settingsStatus'),'Einladung wird erstellt …');
  const {data,error}=await sb.rpc('sc_create_invite',{p_group:currentGroup.id,p_days:14});if(error){setStatus($('settingsStatus'),error.message);return}
  activeInvite=data?.[0]||null;setStatus($('settingsStatus'),'Neue Einladung erstellt ✓',true);await renderInviteAdmin();
});
async function decideRequest(id,approve,role,userId=null){
  if(!isAdmin())return;
  const request=pendingRequests.find(r=>r.id===id);
  const applicantId=userId||request?.user_id;
  const person=request?.username||'Person';
  if(!applicantId){await loadAdminData();renderSettings();setStatus($('settingsStatus'),'Bewerbung wurde aktualisiert. Bitte erneut versuchen.');return}
  const label=approve?(role==='admin'?'als Admin':'als Mitglied'):'ablehnen';
  if(!confirm(`Bewerbung wirklich ${label}${approve?' freigeben':''}?`))return;
  const {error}=await sb.rpc('sc_decide_join_request_v2',{p_request:id,p_group:currentGroup.id,p_user:applicantId,p_approve:approve,p_role:role});
  if(error){await loadAdminData();renderSettings();setStatus($('settingsStatus'),error.message);return}
  pendingRequests=pendingRequests.filter(r=>r.id!==id&&r.user_id!==applicantId);
  const {data:ms,error:memberError}=await sb.from('sc_group_members').select('group_id,user_id,role,joined_at').eq('group_id',currentGroup.id).order('joined_at');
  if(memberError){setStatus($('settingsStatus'),memberError.message);return}
  members=ms||[];
  await enrichMembers();
  await loadAdminData();
  renderSettings();
  showToast(approve?`${person} ist jetzt ${role==='admin'?'Admin':'Mitglied'}`:`${person} wurde abgelehnt`);
}
async function deleteTicket(id){if(!confirm('Dauerkarte wirklich löschen? Vorhandene Belegungen dieser Karte werden ebenfalls entfernt.'))return;const {error}=await sb.from('sc_tickets').delete().eq('id',id).eq('group_id',currentGroup.id);if(error){setStatus($('settingsStatus'),error.message);return}tickets=tickets.filter(t=>t.id!==id);allocations=allocations.filter(a=>a.ticket_id!==id);render();setStatus($('settingsStatus'),'Karte gelöscht',true)}

function openCreate(){setStatus($('createGroupStatus'),'');els.createDialog.showModal()}function openJoin(){setStatus($('joinGroupStatus'),'');els.joinDialog.showModal()}
document.querySelectorAll('[data-open-create]').forEach(b=>b.addEventListener('click',openCreate));document.querySelectorAll('[data-open-join]').forEach(b=>b.addEventListener('click',openJoin));
$('createGroupForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('newGroupName').value.trim(),price=parseMoney($('newGroupPrice').value);if(!name)return;setStatus($('createGroupStatus'),'Crew wird erstellt …');const {data,error}=await sb.from('sc_groups').insert({name,club_key:$('newGroupClub').value,club_name:'FC Bayern München',season:$('newGroupSeason').value.trim()||'2026-27',paypal_me:cleanPaypal($('newGroupPaypal').value)||null,default_price:price??50,created_by:user.id}).select().single();if(error){setStatus($('createGroupStatus'),error.message);return}els.createDialog.close();$('createGroupForm').reset();$('newGroupSeason').value='2026-27';$('newGroupPrice').value='50,00';await loadGroups(data.id);showToast('Crew erstellt')});
$('joinGroupForm').addEventListener('submit',async e=>{e.preventDefault();await requestInvite(extractInviteToken($('joinCode').value))});

async function requestInvite(token){
  if(!token){setStatus($('joinGroupStatus'),'Bitte Einladungslink oder Code eingeben.');return}
  setStatus($('joinGroupStatus'),'Beitrittsanfrage wird gesendet …');
  const {data,error}=await sb.rpc('sc_request_join',{p_token:token});if(error){setStatus($('joinGroupStatus'),error.message);return}
  localStorage.removeItem('seasoncrew-pending-invite');$('joinCode').value='';if(els.joinDialog.open)els.joinDialog.close();
  await loadOwnRequests();
  if(data?.status==='member'){showToast('Du bist bereits Mitglied dieser Crew.');await loadGroups(data.group_id);return}
  const msg=`Anfrage für „${data?.group_name||'Crew'}“ gesendet. Ein Admin muss dich noch als Mitglied oder Admin freigeben.`;renderPendingNotice(msg);showToast('Beitrittsanfrage gesendet');
  const u=new URL(location.href);u.searchParams.delete('invite');history.replaceState({},'',u);
}

async function processPendingInvite(){
  const urlToken=extractInviteToken(new URL(location.href).searchParams.get('invite'));
  if(urlToken)localStorage.setItem('seasoncrew-pending-invite',urlToken);
  const storedToken=extractInviteToken(localStorage.getItem('seasoncrew-pending-invite'));
  const metadataToken=extractInviteToken(user?.user_metadata?.invite_token);
  const token=urlToken||storedToken||metadataToken;
  if(!token)return;
  const {data,error}=await sb.rpc('sc_request_join',{p_token:token});
  if(error){
    localStorage.removeItem('seasoncrew-pending-invite');
    if(metadataToken)await sb.auth.updateUser({data:{invite_token:null}});
    showToast(error.message);return;
  }
  localStorage.removeItem('seasoncrew-pending-invite');
  if(metadataToken)await sb.auth.updateUser({data:{invite_token:null}});
  await loadOwnRequests();
  if(data?.status==='member'){await loadGroups(data.group_id);showToast('Du bist bereits Mitglied dieser Crew.')}else{renderPendingNotice(`Anfrage für „${data?.group_name||'Crew'}“ gesendet. Warte jetzt auf die Freigabe eines Admins.`);showToast('Einladung angenommen – Freigabe steht aus')}
  const u=new URL(location.href);u.searchParams.delete('invite');history.replaceState({},'',u);
}

$('filterGroup').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderGames()});
els.searchInput.addEventListener('input',renderGames);
$('nextMatchBtn').addEventListener('click',()=>{const list=filteredFixtures(),today=todayBerlin(),next=list.find(m=>(m.e||m.s)>=today)||list.at(-1);if(!next)return;const el=$(`game-${next.id}`);if(!el)return;const y=window.scrollY+el.getBoundingClientRect().top-document.querySelector('.topbar').offsetHeight-18;window.scrollTo({top:Math.max(0,y),behavior:'smooth'})});

async function setupPresence(){
  if(!currentGroup)return;presenceChannel=sb.channel(`seasoncrew-presence-${currentGroup.id}`,{config:{presence:{key:user.id}}});presenceChannel.on('presence',{event:'sync'},()=>{const state=presenceChannel.presenceState();const names=[...new Set(Object.values(state).flat().map(x=>x.name).filter(Boolean))];els.onlineBadge.innerHTML=`<i></i><span>Online: ${names.length?names.map(esc).join(', '):'–'}</span>`}).subscribe(async status=>{if(status==='SUBSCRIBED')await presenceChannel.track({name:profile.username,group_id:currentGroup.id,at:new Date().toISOString()})});
}
function setupRealtime(){
  if(!currentGroup)return;const gid=currentGroup.id;realtimeChannel=sb.channel(`seasoncrew-data-${gid}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'sc_allocations',select:['group_id','fixture_id','ticket_id','attendee_name','attendee_user_id','paid','updated_by','updated_at'],filter:`group_id=eq.${gid}`},queueReload)
   .on('postgres_changes',{event:'*',schema:'public',table:'sc_fixture_notes',filter:`group_id=eq.${gid}`},queueReload)
   .on('postgres_changes',{event:'*',schema:'public',table:'sc_tickets',filter:`group_id=eq.${gid}`},queueReload)
   .on('postgres_changes',{event:'*',schema:'public',table:'sc_group_members',filter:`group_id=eq.${gid}`},queueReload)
   .on('postgres_changes',{event:'*',schema:'public',table:'sc_join_requests',filter:`group_id=eq.${gid}`},queueReload)
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'sc_groups',filter:`id=eq.${gid}`},queueReload)
   .subscribe();
}
function queueReload(){clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>loadCurrentGroup(),450)}
async function cleanupChannels(){if(presenceChannel){try{await presenceChannel.untrack()}catch{}await sb.removeChannel(presenceChannel);presenceChannel=null}if(realtimeChannel){await sb.removeChannel(realtimeChannel);realtimeChannel=null}}

async function boot(){
  const invite=extractInviteToken(new URL(location.href).searchParams.get('invite'));if(invite)localStorage.setItem('seasoncrew-pending-invite',invite);
  const {data:{session:s}}=await sb.auth.getSession();session=s;user=s?.user||null;
  if(!user){document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');if(invite){setAuthTab('signup');setStatus(els.authStatus,'Du wurdest eingeladen. Erstelle einen Account oder logge dich ein; danach wird die Beitrittsanfrage automatisch gestellt.',true)}else{setStatus(els.authStatus,'')}return}
  await enterApp();
}
boot();
