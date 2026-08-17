import { BASE_M, D, MON } from './schedule.js';
// Build verification: auth-core-ci-1
const sb=window.SeasonCrewCore?.client?.();
if(!sb){const status=document.getElementById('authStatus');if(status)status.textContent='Die Login-Komponente konnte nicht geladen werden. Bitte Seite neu laden.';throw new Error('SeasonCrew Supabase core unavailable')}
const $=id=>document.getElementById(id);

let session=null,user=null,profile=null,groups=[],memberships=new Map(),currentGroup=null,tickets=[],allocations=[],notes=[],fixtures=[],manualFixtures=[],members=[],filter='all';
let activeInvite=null,pendingRequests=[],ownPendingRequests=[];
let presenceChannel=null,realtimeChannel=null,paymentContext=null,assignmentContext=null,reloadTimer=null;

const els={
  authScreen:$('authScreen'),authStatus:$('authStatus'),authTabs:document.querySelector('.authTabs'),loginForm:$('loginForm'),signupForm:$('signupForm'),forgotForm:$('forgotForm'),recoveryForm:$('recoveryForm'),
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
function competitionName(c,m=null){if(m?.manual)return c==='league'?'Liga':c==='cup'?'Pokal':c==='intl'?'International':'Sonstiges';return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':c==='cl'?'Champions League':'Sonstiges'}
function clubLogo(name){const domain=D[name];return domain?`<img class="clubLogo" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128" alt="">`:`<span class="clubLogo"></span>`}
function relevantFixture(m){if(m.c==='bl')return m.h===true;if(m.n)return true;return m.h===true||m.pos===true}
function ticketLabel(t){return t.label||[t.block,t.row_label,t.seat].filter(Boolean).join('/')||'Karte'}
function allocationKey(fixtureId,ticketId){return `${fixtureId}:${ticketId}`}
function allocationMap(){return new Map(allocations.map(a=>[allocationKey(a.fixture_id,a.ticket_id),a]))}
function noteMap(){return new Map(notes.map(n=>[n.fixture_id,n]))}
function isOwnAllocation(a){if(!a)return false;const username=String(profile?.username||'').trim().toLowerCase();return a.attendee_user_id===user?.id||(!a.attendee_user_id&&String(a.attendee_name||'').trim().toLowerCase()===username)}

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
function showAuthView(view,{keepStatus=false}={}){
  const forms={login:els.loginForm,signup:els.signupForm,forgot:els.forgotForm,recovery:els.recoveryForm};
  Object.entries(forms).forEach(([name,form])=>form?.classList.toggle('hidden',name!==view));
  const tabbed=view==='login'||view==='signup';
  els.authTabs?.classList.toggle('hidden',!tabbed);
  if(tabbed)document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b.dataset.authTab===view));
  if(view==='signup')syncSignupInvite();
  if(!keepStatus)setStatus(els.authStatus,'');
}
function setAuthTab(tab){showAuthView(tab)}
function recoveryRequested(){const u=new URL(location.href);return u.searchParams.get('recovery')==='1'||/type=recovery/i.test(location.hash)}
function clearRecoveryUrl(){const u=new URL(location.href);u.searchParams.delete('recovery');u.hash='';history.replaceState({},'',u)}
function showRecoveryView(message='Lege jetzt ein neues Passwort für deinen SeasonCrew-Account fest.'){
  document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');showAuthView('recovery');setStatus(els.authStatus,message,true);
}
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>setAuthTab(b.dataset.authTab)));
$('forgotPasswordBtn')?.addEventListener('click',()=>{if($('forgotEmail')&&!$('forgotEmail').value)$('forgotEmail').value=$('loginEmail')?.value||'';showAuthView('forgot')});
$('forgotBackBtn')?.addEventListener('click',()=>showAuthView('login'));
$('recoveryCancelBtn')?.addEventListener('click',async()=>{await sb.auth.signOut();session=null;user=null;clearRecoveryUrl();showAuthView('login');setStatus(els.authStatus,'Passwortänderung abgebrochen. Du kannst dich normal einloggen.')});
const initialInvite=syncSignupInvite();
if(initialInvite)setAuthTab('signup');

els.forgotForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('forgotEmail')?.value.trim();if(!email)return;
  setStatus(els.authStatus,'Reset-Link wird angefordert …');
  const redirectTo=window.SeasonCrewCore.appUrl({recovery:'1'});
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  if(error){setStatus(els.authStatus,/rate limit/i.test(error.message||'')?'Zu viele Anfragen. Bitte versuche es etwas später erneut.':'Der Reset-Link konnte gerade nicht versendet werden. Bitte versuche es erneut.');return}
  setStatus(els.authStatus,'Falls zu dieser E-Mail ein SeasonCrew-Account existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.',true);
});

els.recoveryForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const password=$('recoveryPassword')?.value||'',confirmPassword=$('recoveryPasswordConfirm')?.value||'';
  if(password.length<8){setStatus(els.authStatus,'Das neue Passwort muss mindestens 8 Zeichen lang sein.');return}
  if(password!==confirmPassword){setStatus(els.authStatus,'Die beiden Passwörter stimmen nicht überein.');return}
  setStatus(els.authStatus,'Passwort wird geändert …');
  const {data:{session:activeSession}}=await sb.auth.getSession();
  if(!activeSession){setStatus(els.authStatus,'Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');return}
  const {error}=await sb.auth.updateUser({password});
  if(error){setStatus(els.authStatus,'Passwort konnte nicht geändert werden: '+error.message);return}
  await sb.auth.signOut();session=null;user=null;clearRecoveryUrl();$('recoveryPassword').value='';$('recoveryPasswordConfirm').value='';showAuthView('login');setStatus(els.authStatus,'Passwort geändert. Du kannst dich jetzt mit dem neuen Passwort einloggen.',true);
});

sb.auth.onAuthStateChange((event,nextSession)=>{
  if(event!=='PASSWORD_RECOVERY')return;
  session=nextSession||null;user=nextSession?.user||null;showRecoveryView();
});

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

async function loadGroups(preferId=null){
  const {data:ms,error}=await sb.from('sc_group_members').select('group_id,user_id,role,joined_at').eq('user_id',user.id).order('joined_at');if(error){console.error(error);return}
  memberships=new Map((ms||[]).map(m=>[m.group_id,m.role]));
  const ids=[...memberships.keys()];groups=[];
  if(ids.length){const {data,error:gerr}=await sb.from('sc_groups').select('id,name,club_key,club_name,season,paypal_me,default_price,created_at,updated_at').in('id',ids).order('created_at');if(gerr)console.error(gerr);groups=data||[]}
  renderGroupSelector();
  if(!groups.length){await cleanupChannels();currentGroup=null;els.noGroups.classList.remove('hidden');els.workspace.classList.add('hidden');renderPendingNotice();return}
  els.noGroups.classList.add('hidden');els.workspace.classList.remove('hidden');
  const saved=localStorage.getItem('seasoncrew-group'),target=preferId||saved||groups[0].id;els.groupSelect.value=groups.some(g=>g.id===target)?target:groups[0].id;
  await selectGroup(els.groupSelect.value);
}

function renderGroupSelector(){els.groupSelect.innerHTML=groups.map(g=>`<option value="${g.id}">${esc(g.name)} · ${roleLabel(memberships.get(g.id))}</option>`).join('')}

async function selectGroup(id){
  currentGroup=groups.find(g=>g.id===id)||null;if(!currentGroup)return;localStorage.setItem('seasoncrew-group',id);
  filter='all';els.searchInput.value='';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));
  await cleanupChannels();await Promise.all([loadGroupData(),loadAdminData(),loadOverrides()]);render();await setupRealtime();await setupPresence();
}
async function loadGroupData(){
  const [{data:ts,error:te},{data:as,error:ae},{data:ns,error:ne},{data:ms,error:me}]=await Promise.all([
    sb.from('sc_tickets').select('id,group_id,label,block,row_label,seat,sort_order,active').eq('group_id',currentGroup.id).eq('active',true).order('sort_order').order('created_at'),
    sb.rpc('sc_get_allocations',{p_group:currentGroup.id}),
    sb.from('sc_fixture_notes').select('group_id,fixture_id,note,updated_by,updated_at').eq('group_id',currentGroup.id),
    sb.from('sc_group_members').select('group_id,user_id,role,joined_at').eq('group_id',currentGroup.id).order('joined_at')
  ]);
  if(te||ae||ne||me)console.error(te||ae||ne||me);tickets=ts||[];allocations=as||[];notes=ns||[];members=ms||[];await enrichMembers();
}
async function enrichMembers(){const ids=members.map(m=>m.user_id);if(!ids.length)return;const {data}=await sb.from('sc_profiles').select('id,username').in('id',ids);const map=new Map((data||[]).map(p=>[p.id,p.username]));members=members.map(m=>({...m,username:map.get(m.user_id)||'Mitglied'}))}
async function loadAdminData(){
  pendingRequests=[];activeInvite=null;
  if(!isAdmin())return;
  const [{data:rs,error:re},{data:inv,error:ie}]=await Promise.all([
    sb.rpc('sc_admin_join_requests',{p_group:currentGroup.id}),
    sb.from('sc_invites').select('id,group_id,token,created_by,expires_at,revoked_at,created_at').eq('group_id',currentGroup.id).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(re)console.error(re);if(ie)console.error(ie);pendingRequests=rs||[];activeInvite=inv||null;
}

async function loadOverrides(){
  const {data:groupRows,error:groupError}=await sb.from('sc_fixtures').select('group_id,fixture_id,competition_key,label,date_start,date_end,time_text,opponent,is_home,phase_label,possible,always_show,price_override,active,source').eq('group_id',currentGroup.id).eq('active',true).order('date_start');
  if(groupError)console.error(groupError);manualFixtures=groupRows||[];
  const manual=manualFixtures.map(f=>({id:f.fixture_id,c:f.competition_key||'other',l:f.label,s:f.date_start,e:f.date_end||f.date_start,t:f.time_text?String(f.time_text).slice(0,5):'',o:f.opponent,h:f.is_home!==false,pos:!!f.possible,n:f.always_show!==false,p:f.phase_label||'',manual:true,price_override:f.price_override}));
  if(currentGroup.club_key!=='fcbayern'){fixtures=manual;return}
  const {data,error}=await sb.from('match_overrides').select('id,start_date,end_date,kickoff_time,opponent,home,possible,active').eq('season',currentGroup.season);if(error)console.error(error);
  const ov=new Map((data||[]).map(x=>[x.id,x]));const legacy=BASE_M.map(m=>{const x=ov.get(m.id);if(x?.active===false)return null;return x?{...m,o:x.opponent||m.o,s:x.start_date||m.s,e:x.end_date||x.start_date||m.e,t:x.kickoff_time?String(x.kickoff_time).slice(0,5):m.t,h:x.home??m.h,pos:x.possible??m.pos}:m}).filter(Boolean);
  const manualIds=new Set(manual.map(x=>x.id));fixtures=[...legacy.filter(x=>!manualIds.has(x.id)),...manual];
}

async function loadOwnRequests(){
  if(!user){ownPendingRequests=[];return []}
  const {data,error}=await sb.from('sc_join_requests').select('id,group_id,status,requested_at,decided_at').eq('user_id',user.id).eq('status','pending').order('requested_at',{ascending:false});
  if(error){console.warn('Eigene Beitrittsanfragen konnten nicht geladen werden',error);ownPendingRequests=[];return []}
  ownPendingRequests=data||[];return ownPendingRequests;
}
function renderPendingNotice(message=''){
  const box=els.pendingNotice;if(!box)return;
  if(!message&&ownPendingRequests.length)message=ownPendingRequests.length===1?'Deine Beitrittsanfrage wartet noch auf die Freigabe durch einen Admin.':`${ownPendingRequests.length} Beitrittsanfragen warten noch auf Freigabe.`;
  box.textContent=message;box.classList.toggle('hidden',!message);
}
async function processPendingInvite(){
  const token=pendingInviteToken();if(!token)return;
  if(!user){localStorage.setItem('seasoncrew-pending-invite',token);return}
  const {data,error}=await sb.rpc('sc_request_join',{p_token:token});
  if(error){localStorage.setItem('seasoncrew-pending-invite',token);showToast(error.message);return}
  localStorage.removeItem('seasoncrew-pending-invite');
  const url=new URL(location.href);if(url.searchParams.has('invite')){url.searchParams.delete('invite');history.replaceState({},'',url)}
  if(data?.status==='member'){showToast('Du bist bereits Mitglied dieser Crew.');return}
  await loadOwnRequests();renderPendingNotice(`Anfrage für „${data?.group_name||'Crew'}“ gesendet. Ein Admin muss dich noch freigeben.`);showToast('Beitrittsanfrage gesendet');
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
  const adminView=isAdmin();
  const paymentAlloc=adminView?relevantAlloc:relevantAlloc.filter(isOwnAllocation);
  const unpaid=paymentAlloc.filter(a=>a.paid===false),unknownPrices=unpaid.filter(a=>a.amount==null).length,open=Math.max(0,relevant.length*tickets.length-relevantAlloc.length);
  $('statFixtures').textContent=relevant.length;$('statTickets').textContent=tickets.length;$('statAssigned').textContent=relevantAlloc.length;$('statOpen').textContent=open;
  const paymentLabel=$('statUnpaid')?.parentElement?.querySelector('small');if(paymentLabel)paymentLabel.textContent=adminView?'Zahlungen offen':'Deine offenen Zahlungen';
  $('statUnpaid').textContent=money(unpaid.reduce((sum,a)=>sum+(a.amount==null?0:Number(a.amount)),0));
  $('statUnpaidCount').textContent=`${unpaid.length} Ticket${unpaid.length===1?'':'s'}${unknownPrices?` · ${unknownPrices} Preis${unknownPrices===1?'':'e'} offen`:''}`;
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
  return `<article class="gameCard ${isNext?'nextGame':''} ${allPaid?'allPaid':''}" id="game-${m.id}"><div class="gameTop"><div class="gameDate"><strong>${date}</strong><span>${esc(time||'Termin offen')}</span></div><div class="fixtureMeta"><span class="competition">${competitionName(m.c,m)}</span><h3>${clubLogo(currentGroup.club_name||'Heimverein')}<span>${esc(currentGroup.club_name||'Heimverein')}</span><span>–</span>${clubLogo(m.o)}<span>${esc(m.o)}</span></h3><p>${esc(m.l)} · ${esc(m.p||'')}</p></div><div class="fixtureCount">${allocated.length}/${tickets.length}</div></div><div class="ticketGrid" style="grid-template-columns:repeat(${cols},1fr)">${tickets.length?tickets.map(t=>renderTicket(m,t,amap.get(allocationKey(m.id,t.id)))).join(''):'<div class="noGames">Noch keine Dauerkarten angelegt. Öffne Einstellungen.</div>'}</div><textarea class="gameNote" data-note-fixture="${m.id}" placeholder="Notiz zum Spiel">${esc(nmap.get(m.id)?.note||'')}</textarea></article>`;
}

function renderTicket(m,t,a){
  const label=ticketLabel(t);
  if(!a)return `<div class="ticketCard unassigned" data-assign-fixture="${m.id}" data-ticket-id="${t.id}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${[t.block&&`Block ${esc(t.block)}`,t.row_label&&`Reihe ${esc(t.row_label)}`,t.seat&&`Sitz ${esc(t.seat)}`].filter(Boolean).join(' · ')}</small></div><span>+</span></div><div style="padding:8px 10px;color:#8994a3;font-size:9px">Karte vergeben</div></div>`;
  const own=isOwnAllocation(a),paymentVisible=isAdmin()||own,paid=a.paid===true,unpaid=a.paid===false;
  const cardState=paymentVisible?(paid?'paid':unpaid?'unpaid':''):'paymentPrivate';
  const status=paymentVisible?(paid?'bezahlt':unpaid?'Zahlung offen':'Zahlstatus offen'):'zugewiesen';
  const adminActions=isAdmin()?`<button class="changeAssignmentBtn" type="button" data-change-assignment="${m.id}" data-ticket-id="${t.id}">Zuweisung ändern</button><button class="releaseAssignmentBtn" type="button" data-release-fixture="${m.id}" data-ticket-id="${t.id}" title="Zuweisung aufheben">Zuweisung aufheben</button>${unpaid&&a.amount!=null?`<button type="button" data-paypal-fixture="${m.id}" data-ticket-id="${t.id}">PayPal</button>`:''}<label class="paidToggle"><input type="checkbox" data-paid-fixture="${m.id}" data-ticket-id="${t.id}" ${paid?'checked':''}> bezahlt</label>`:'';
  return `<div class="ticketCard assigned ${cardState} ${own?'ownTicket':''}"><div class="ticketHead"><div><b>${esc(label)}</b><small>${status}</small></div></div><div class="attendeeDisplay">${esc(a.attendee_name||'Ticket-Gast')}</div>${isAdmin()?`<div class="ticketActions">${adminActions}</div>`:''}</div>`;
}

function bindGameEvents(){
  document.querySelectorAll('[data-assign-fixture]').forEach(el=>el.addEventListener('click',()=>openAssignTicket(el.dataset.assignFixture,el.dataset.ticketId)));
  document.querySelectorAll('[data-change-assignment]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();openAssignTicket(el.dataset.changeAssignment,el.dataset.ticketId,'',true)}));
  document.querySelectorAll('[data-release-fixture]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();releaseTicket(el.dataset.releaseFixture,el.dataset.ticketId)}));
  document.querySelectorAll('[data-paid-fixture]').forEach(input=>input.addEventListener('change',()=>savePaid(input.dataset.paidFixture,input.dataset.ticketId,input.checked)));
  document.querySelectorAll('[data-paypal-fixture]').forEach(btn=>btn.addEventListener('click',()=>openPayment(btn.dataset.paypalFixture,btn.dataset.ticketId)));
  document.querySelectorAll('[data-note-fixture]').forEach(t=>t.addEventListener('change',()=>saveNote(t.dataset.noteFixture,t.value)));
}

async function readAllocation(fixtureId,ticketId){
  const {data,error}=await sb.rpc('sc_get_allocations',{p_group:currentGroup.id});
  if(error){console.warn('Allocation refresh',error);return null}
  return (data||[]).find(a=>a.fixture_id===fixtureId&&a.ticket_id===ticketId)||null;
}
function updateAssignTicketSeatMeta(){
  if(!assignmentContext)return;const m=fixtureById(assignmentContext.fixtureId),t=ticketById(assignmentContext.ticketId);if(!m||!t)return;
  $('assignTicketTitle').textContent=`${ticketLabel(t)} · ${m.o}`;
  $('assignTicketMeta').textContent=`${gameDate(m)[0]}${gameDate(m)[1]?` · ${gameDate(m)[1]}`:''} · ${[t.block&&`Block ${t.block}`,t.row_label&&`Reihe ${t.row_label}`,t.seat&&`Sitz ${t.seat}`].filter(Boolean).join(' · ')}`;
}
function openAssignTicket(fixtureId,ticketId,preselectUserId='',editExisting=false){
  if(!isAdmin())return;const m=fixtureById(fixtureId),t=ticketById(ticketId);if(!m||!t)return;
  const current=editExisting?allocationByIds(fixtureId,ticketId):null;
  assignmentContext={fixtureId,ticketId,fromTicketId:current?.ticket_id||null,mode:current?'edit':'create'};
  const availableTickets=tickets.filter(x=>x.id===ticketId||!allocationByIds(fixtureId,x.id));
  $('assignTicketSeat').innerHTML=availableTickets.map(x=>`<option value="${x.id}">${esc(ticketLabel(x))} · ${esc([x.block&&`Block ${x.block}`,x.row_label&&`Reihe ${x.row_label}`,x.seat&&`Sitz ${x.seat}`].filter(Boolean).join(' · '))}</option>`).join('');
  $('assignTicketSeat').value=ticketId;updateAssignTicketSeatMeta();
  const assignedMemberIds=new Set(allocations.filter(a=>a.fixture_id===fixtureId&&a.attendee_user_id&&(!current||a.ticket_id!==current.ticket_id)).map(a=>a.attendee_user_id));
  $('assignTicketMember').innerHTML='<option value="">Crew-Mitglied wählen …</option>'+members.map(x=>{const used=assignedMemberIds.has(x.user_id);return `<option value="${x.user_id}" ${used?'disabled':''}>${esc(x.username||'Mitglied')} · ${roleLabel(x.role)}${used?' · bereits Ticket':''}</option>`}).join('');
  const memberValue=current?.attendee_user_id||preselectUserId;
  $('assignTicketMember').value=memberValue&&members.some(x=>x.user_id===memberValue)&&!assignedMemberIds.has(memberValue)?memberValue:'';
  $('assignTicketGuest').value=current&&!current.attendee_user_id?(current.attendee_name||''):'';
  $('assignTicketModeLabel').textContent=current?'Zuweisung ändern':'Karte vergeben';
  $('assignTicketSave').textContent=current?'Zuweisung speichern':'Karte vergeben';
  setStatus($('assignTicketStatus'),'');$('assignTicketDialog').showModal();
}
window.SeasonCrewAssignment={open:(fixtureId,ticketId,userId='')=>openAssignTicket(fixtureId,ticketId,userId,false)};
async function saveAssignment(context,attendeeUserId,attendeeName){
  if(!isAdmin()||!context)return false;
  const {error}=await sb.rpc('sc_save_allocation',{p_group:currentGroup.id,p_fixture:context.fixtureId,p_ticket:context.ticketId,p_attendee_user:attendeeUserId||null,p_attendee_name:String(attendeeName||'').trim(),p_from_ticket:context.fromTicketId||null});
  if(error){
    let msg=error.message||'Zuweisung konnte nicht gespeichert werden';
    if(error.code==='23505')msg=String(error.message||'').includes('sc_allocations_unique_member_per_fixture')?'Dieses Mitglied hat für dieses Spiel bereits ein Ticket.':'Dieser Sitzplatz wurde inzwischen vergeben.';
    setStatus($('assignTicketStatus'),msg);console.error(error);return false;
  }
  const {data,error:refreshError}=await sb.rpc('sc_get_allocations',{p_group:currentGroup.id});
  if(!refreshError)allocations=data||[];
  if(attendeeUserId)window.dispatchEvent(new CustomEvent('seasoncrew:ticket-wish-changed',{detail:{fixtureId:context.fixtureId,userId:attendeeUserId,active:false}}));
  render();return true;
}
$('assignTicketSeat').addEventListener('change',()=>{if(!assignmentContext)return;assignmentContext.ticketId=$('assignTicketSeat').value;updateAssignTicketSeatMeta()});
$('assignTicketMember').addEventListener('change',()=>{if($('assignTicketMember').value)$('assignTicketGuest').value=''});
$('assignTicketGuest').addEventListener('input',()=>{if($('assignTicketGuest').value.trim())$('assignTicketMember').value=''});
function closeAssignTicketDialog(){
  $('assignTicketDialog').close();assignmentContext=null;setStatus($('assignTicketStatus'),'');$('assignTicketModeLabel').textContent='Karte vergeben';$('assignTicketSave').textContent='Karte vergeben';
}
$('assignTicketCancel').addEventListener('click',closeAssignTicketDialog);
$('assignTicketCancelBottom').addEventListener('click',closeAssignTicketDialog);
$('assignTicketForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!assignmentContext||!isAdmin())return;
  const memberId=$('assignTicketMember').value,guest=$('assignTicketGuest').value.trim();
  const chosen=memberId?members.find(x=>x.user_id===memberId):null;
  if(!chosen&&!guest){setStatus($('assignTicketStatus'),'Bitte ein Crew-Mitglied auswählen oder einen Ticket-Gast eintragen.');return}
  const guestKey=guest.replace(/^@+/,'').trim().toLowerCase(),matchingMember=guest?members.find(x=>String(x.username||'').trim().toLowerCase()===guestKey):null;
  if(matchingMember){setStatus($('assignTicketStatus'),`${matchingMember.username} ist Crew-Mitglied. Bitte oben aus der Mitgliederliste auswählen.`);return}
  if(chosen&&allocations.some(a=>a.fixture_id===assignmentContext.fixtureId&&a.attendee_user_id===chosen.user_id&&a.ticket_id!==assignmentContext.fromTicketId)){setStatus($('assignTicketStatus'),'Dieses Mitglied hat für dieses Spiel bereits ein Ticket.');return}
  const mode=assignmentContext.mode,context={...assignmentContext};
  const saveBtn=$('assignTicketSave');saveBtn.disabled=true;saveBtn.textContent='Wird gespeichert …';
  const ok=await saveAssignment(context,guest?null:chosen.user_id,guest||chosen.username);
  saveBtn.disabled=false;saveBtn.textContent=mode==='edit'?'Zuweisung speichern':'Karte vergeben';
  if(!ok)return;
  $('assignTicketDialog').close();assignmentContext=null;showToast(mode==='edit'?'Zuweisung geändert':'Karte vergeben');
});
async function releaseTicket(fixtureId,ticketId){
  const {error}=await sb.from('sc_allocations').delete().eq('group_id',currentGroup.id).eq('fixture_id',fixtureId).eq('ticket_id',ticketId);if(error){showToast('Zuweisung konnte nicht aufgehoben werden');return}
  allocations=allocations.filter(a=>allocationKey(a.fixture_id,a.ticket_id)!==allocationKey(fixtureId,ticketId));render();
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
  paymentContext={a,m,t};$('paymentPerson').textContent=`${a.attendee_name||'Ticket-Gast'} · ${ticketLabel(t)}`;$('paymentMatch').textContent=`${m.l} · ${m.o} · ${gameDate(m)[0]}`;
  const known=a.amount!=null;$('paymentAmount').readOnly=true;$('paymentAmount').value=known?Number(a.amount).toFixed(2).replace('.',','):'';
  $('copyPaymentBtn').disabled=!known;$('sharePaymentBtn').disabled=!known;setStatus($('paymentStatus'),known?'':'Preis noch nicht bekannt');updatePaymentPreview();els.paymentDialog.showModal();
}
function paymentData(){
  if(!paymentContext)return null;const amount=parseMoney($('paymentAmount').value);if(amount==null)return null;const {a,m,t}=paymentContext,paypal=cleanPaypal(currentGroup.paypal_me);const link=paypal?`https://paypal.me/${paypal}/${amount.toFixed(2)}`:'';const match=`${m.l} · ${m.o}`;const text=`Hi ${a.attendee_name||'!'},\n\n${match}\nTicket: ${ticketLabel(t)}\nDatum: ${gameDate(m)[0]}\nBetrag: ${money(amount)}${link?`\n\nPayPal: ${link}`:''}`;return{amount,link,match,text,a,m,t};
}
function updatePaymentPreview(){
  if(paymentContext?.a?.amount==null){$('paymentPreview').textContent='Preis noch nicht bekannt. Hinterlege zuerst den Spielpreis in den Crew-Einstellungen.';return}
  const d=paymentData();$('paymentPreview').textContent=d?`${money(d.amount)}\n${d.match}${d.link?`\n${d.link}`:'\nPayPal.Me ist für diese Crew noch nicht hinterlegt.'}`:'Preis konnte nicht geladen werden.';
}
$('paymentAmount').addEventListener('input',updatePaymentPreview);
$('copyPaymentBtn').addEventListener('click',async()=>{const d=paymentData();if(!d)return;await navigator.clipboard.writeText(d.text);await savePaymentAmountAndLog(d,'message_copied');setStatus($('paymentStatus'),'Nachricht kopiert ✓',true)});
$('sharePaymentBtn').addEventListener('click',async()=>{const d=paymentData();if(!d)return;try{if(navigator.share)await navigator.share({title:d.match,text:d.text});else await navigator.clipboard.writeText(d.text);await savePaymentAmountAndLog(d,navigator.share?'share_opened':'message_copied');setStatus($('paymentStatus'),navigator.share?'Teilen geöffnet ✓':'Nachricht kopiert ✓',true)}catch(e){if(e?.name!=='AbortError')setStatus($('paymentStatus'),'Teilen nicht möglich')}});
async function savePaymentAmountAndLog(d,action){
  await sb.from('sc_history').insert({group_id:currentGroup.id,actor_user_id:user.id,actor_name:profile.username,entity_type:'paypal',entity_id:d.m.id,action,before_data:{},after_data:{person:d.a.attendee_name,ticket:ticketLabel(d.t),opponent:d.m.o,match_label:d.match,amount:d.amount,paypal_me:cleanPaypal(currentGroup.paypal_me)}});
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
$('saveGroupBtn').addEventListener('click',async()=>{if(!isAdmin())return;const price=parseMoney($('settingsPrice').value);const update={name:$('settingsGroupName').value.trim(),club_name:$('settingsClubName')?.value.trim()||currentGroup.club_name,paypal_me:cleanPaypal($('settingsPaypal').value)||null,default_price:price??50,updated_at:new Date().toISOString()};const {data,error}=await sb.from('sc_groups').update(update).eq('id',currentGroup.id).select().single();if(error){setStatus($('settingsStatus'),error.message);return}currentGroup=data;groups=groups.map(g=>g.id===data.id?data:g);renderGroupSelector();els.groupSelect.value=data.id;setStatus($('settingsStatus'),'Crew gespeichert ✓',true);render();window.dispatchEvent(new CustomEvent('seasoncrew:prices-updated',{detail:{groupId:currentGroup.id}}))});
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
$('createGroupForm').addEventListener('submit',async e=>{
  e.preventDefault();const name=$('newGroupName').value.trim(),price=parseMoney($('newGroupPrice').value),clubKey=$('newGroupClub')?.value||'fcbayern';
  const clubName=clubKey==='fcbayern'?'FC Bayern München':$('newGroupClubName')?.value.trim();
  if(!name)return;if(!clubName){setStatus($('createGroupStatus'),'Bitte Vereinsname angeben.');return}
  setStatus($('createGroupStatus'),'Crew wird erstellt …');
  const {data,error}=await sb.from('sc_groups').insert({name,club_key:clubKey,club_name:clubName,season:$('newGroupSeason').value.trim()||'2026-27',paypal_me:cleanPaypal($('newGroupPaypal').value)||null,default_price:price??50,created_by:user.id}).select().single();
  if(error){setStatus($('createGroupStatus'),error.message);return}els.createDialog.close();$('createGroupForm').reset();$('newGroupSeason').value='2026-27';$('newGroupPrice').value='50,00';$('newGroupClub')?.dispatchEvent(new Event('change'));await loadGroups(data.id);showToast('Crew erstellt')
});
$('joinGroupForm').addEventListener('submit',async e=>{e.preventDefault();await requestInvite(extractInviteToken($('joinCode').value))});

async function requestInvite(token){
  if(!token){setStatus($('joinGroupStatus'),'Bitte Einladungslink oder Code eingeben.');return}
  setStatus($('joinGroupStatus'),'Beitrittsanfrage wird gesendet …');
  const {data,error}=await sb.rpc('sc_request_join',{p_token:token});if(error){setStatus($('joinGroupStatus'),error.message);return}
  localStorage.removeItem('seasoncrew-pending-invite');$('joinCode').value='';if(els.joinDialog.open)els.joinDialog.close();
  await loadOwnRequests();
  if(data?.status==='member'){showToast('Du bist bereits Mitglied dieser Crew.');await loadGroups(data.group_id);return}
  const msg=`Anfrage für „${data?.group_name||'Crew'}“ gesendet. Ein Admin muss dich noch als Mitglied oder Admin freigeben.`;renderPendingNotice(msg);showToast('Beitrittsanfrage gesendet');
}

function setupPresence(){
  presenceChannel=sb.channel(`seasoncrew-presence-${currentGroup.id}`,{config:{presence:{key:user.id}}});
  presenceChannel.on('presence',{event:'sync'},()=>{const state=presenceChannel.presenceState(),n=Object.keys(state).length;els.onlineBadge.innerHTML=`<i></i><span>Online: ${n}</span>`});
  presenceChannel.subscribe(async status=>{if(status==='SUBSCRIBED')await presenceChannel.track({username:profile.username,at:new Date().toISOString()})});
}
async function setupRealtime(){
  if(!currentGroup)return;
  realtimeChannel=sb.channel(`seasoncrew-data-${currentGroup.id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'sc_allocations',select:['group_id','fixture_id','ticket_id','attendee_name','attendee_user_id','updated_by','updated_at'],filter:`group_id=eq.${currentGroup.id}`},scheduleReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'sc_fixture_notes',filter:`group_id=eq.${currentGroup.id}`},scheduleReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'sc_fixtures',filter:`group_id=eq.${currentGroup.id}`},()=>{loadOverrides().then(render)})
    .on('postgres_changes',{event:'*',schema:'public',table:'sc_join_requests',filter:`group_id=eq.${currentGroup.id}`},scheduleReload)
    .on('postgres_changes',{event:'*',schema:'public',table:'sc_group_members',filter:`group_id=eq.${currentGroup.id}`},scheduleReload)
    .subscribe();
}
function scheduleReload(){clearTimeout(reloadTimer);reloadTimer=setTimeout(async()=>{if(!currentGroup)return;await Promise.all([loadGroupData(),loadAdminData()]);render()},250)}
async function cleanupChannels(){if(presenceChannel){await sb.removeChannel(presenceChannel);presenceChannel=null}if(realtimeChannel){await sb.removeChannel(realtimeChannel);realtimeChannel=null}}

els.groupSelect.addEventListener('change',()=>selectGroup(els.groupSelect.value));
els.searchInput.addEventListener('input',renderGames);
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderGames()}));
$('nextMatchBtn').addEventListener('click',()=>{const today=todayBerlin(),next=filteredFixtures().find(m=>(m.e||m.s)>=today)||filteredFixtures()[0];if(next)document.getElementById(`game-${next.id}`)?.scrollIntoView({behavior:'smooth',block:'start'})});
window.addEventListener('seasoncrew:role-view-change',()=>render());
window.addEventListener('seasoncrew:fixtures-updated',async e=>{if(!currentGroup||e.detail?.groupId!==currentGroup.id)return;await loadOverrides();render()});

async function boot(){
  const invite=extractInviteToken(new URL(location.href).searchParams.get('invite'));if(invite)localStorage.setItem('seasoncrew-pending-invite',invite);
  const isRecovery=recoveryRequested();
  const {data:{session:s}}=await sb.auth.getSession();session=s;user=s?.user||null;
  if(isRecovery){
    showRecoveryView(user?'Reset-Link bestätigt. Bitte wähle jetzt dein neues Passwort.':'Reset-Link wird geprüft …');
    return;
  }
  if(!user){document.body.classList.add('auth-locked');els.authScreen.classList.remove('hidden');if(invite){setAuthTab('signup');setStatus(els.authStatus,'Du wurdest eingeladen. Erstelle einen Account oder logge dich ein; danach wird die Beitrittsanfrage automatisch gestellt.',true)}else{showAuthView('login');setStatus(els.authStatus,'')}return}
  await enterApp();
}
boot();