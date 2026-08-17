from pathlib import Path
import re

ROOT=Path('SeasonCrew')

def rep(path,old,new,label):
    p=ROOT/path;s=p.read_text(encoding='utf-8')
    if old not in s: raise SystemExit(f'{label}: marker missing')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

def rx(path,pattern,new,label,flags=re.S):
    p=ROOT/path;s=p.read_text(encoding='utf-8')
    out,n=re.subn(pattern,lambda m:new,s,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: replacement count {n}')
    p.write_text(out,encoding='utf-8')

# ------------------------------------------------------------------
# A self-contained admin UI for club identity + manual home fixtures.
# Existing FC Bayern crews continue to use the legacy automatic schedule.
# ------------------------------------------------------------------
(ROOT/'club-fixtures-v1.js').write_text(r'''(()=>{
  if(window.__seasonCrewClubFixturesV1)return;window.__seasonCrewClubFixturesV1=true;
  const $=id=>document.getElementById(id);let timer=null;
  function client(){return window.SeasonCrewCore?.client?.()||null}
  function gid(){return $('groupSelect')?.value||''}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function money(v){return v==null?'Standardpreis':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v))}
  function parseMoney(v){const raw=String(v??'').trim();if(!raw)return null;const n=Number(raw.replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null}
  function toast(text){const el=$('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
  function isManager(){return ['Owner','Admin','Superadmin'].includes(String($('memberRole')?.textContent||'').trim())}

  function ensureCreateClubUi(){
    const select=$('newGroupClub');if(!select)return;
    if(!select.querySelector('option[value="custom"]'))select.insertAdjacentHTML('beforeend','<option value="custom">Anderer Verein / Club</option>');
    if(!$('newGroupClubNameRow'))select.closest('label')?.insertAdjacentHTML('afterend','<label id="newGroupClubNameRow" class="hidden">Vereinsname<input id="newGroupClubName" maxlength="80" placeholder="z. B. TSV Feldkirchen"></label>');
    if(select.dataset.clubBound)return;select.dataset.clubBound='1';
    const sync=()=>{$('newGroupClubNameRow')?.classList.toggle('hidden',select.value!=='custom');if(select.value==='fcbayern'&&$('newGroupClubName'))$('newGroupClubName').value=''};
    select.addEventListener('change',sync);sync();
  }

  function ensureSettingsUi(){
    const admin=$('adminSettings');if(admin&&!$('settingsClubName')){
      const name=admin.querySelector('label');name?.insertAdjacentHTML('afterend','<label>Verein / Club<input id="settingsClubName" maxlength="80" placeholder="Vereinsname"></label>');
    }
    const tickets=$('ticketSettings');if(tickets&&!$('fixtureSettings')){
      tickets.insertAdjacentHTML('beforebegin',`<section class="ticketSettings hidden" id="fixtureSettings">
        <div class="settingsSectionHead"><div><h4>Eigene Heimspiele</h4><p>Für andere Vereine ist das der gruppenspezifische Spielplan. Bei FC Bayern kannst du hier zusätzliche Termine ergänzen.</p></div></div>
        <div id="fixtureList" class="ticketList"></div>
        <div class="manualFixtureForm">
          <select id="fixtureCompetition"><option value="league">Liga</option><option value="cup">Pokal</option><option value="intl">International</option><option value="other">Sonstiges</option></select>
          <input id="fixtureLabel" maxlength="120" placeholder="z. B. Liga · 5. Spieltag">
          <input id="fixtureOpponent" maxlength="120" placeholder="Gegner">
          <input id="fixtureDate" type="date">
          <input id="fixtureTime" type="time">
          <input id="fixturePrice" inputmode="decimal" placeholder="Preis optional">
          <button class="primaryButton compact" id="addFixtureBtn" type="button">Heimspiel hinzufügen</button>
        </div>
        <small class="fieldHint">Ohne eigenen Preis gilt der Standardpreis der Crew.</small>
      </section>`);
      const style=document.createElement('style');style.textContent='.manualFixtureForm{display:grid;grid-template-columns:130px 1.4fr 1.2fr 135px 100px 110px auto;gap:7px;align-items:center}.manualFixtureForm input,.manualFixtureForm select{min-width:0}.fixtureSettingMeta{display:flex;gap:7px;flex-wrap:wrap}@media(max-width:900px){.manualFixtureForm{grid-template-columns:1fr 1fr}.manualFixtureForm #fixtureLabel,.manualFixtureForm #fixtureOpponent,.manualFixtureForm #addFixtureBtn{grid-column:1/-1}}';document.head.appendChild(style);
      $('addFixtureBtn')?.addEventListener('click',addFixture);
    }
  }

  async function load(){
    ensureCreateClubUi();ensureSettingsUi();const c=client(),group=gid();if(!c||!group)return;
    const [{data:g,error:ge},{data:rows,error:fe}]=await Promise.all([
      c.from('sc_groups').select('id,club_key,club_name').eq('id',group).maybeSingle(),
      c.from('sc_fixtures').select('group_id,fixture_id,competition_key,label,date_start,date_end,time_text,opponent,price_override,source,active').eq('group_id',group).eq('active',true).order('date_start')
    ]);if(ge||fe){console.warn('SeasonCrew club fixtures',ge||fe);return}
    if($('settingsClubName'))$('settingsClubName').value=g?.club_name||'';
    $('fixtureSettings')?.classList.toggle('hidden',!isManager());
    if(g?.club_key!=='fcbayern'){
      document.querySelectorAll('[data-filter="bl"],[data-filter="dfb"],[data-filter="cl"]').forEach(b=>b.classList.add('hidden'));
      if($('syncInfo'))$('syncInfo').textContent='Gruppenspezifischer Spielplan · manuell verwaltet';
    }else{
      document.querySelectorAll('[data-filter="bl"],[data-filter="dfb"],[data-filter="cl"]').forEach(b=>b.classList.remove('hidden'));
    }
    renderRows(rows||[]);
  }
  function renderRows(rows){const list=$('fixtureList');if(!list)return;list.innerHTML=rows.length?rows.map(f=>`<div class="ticketSettingRow"><div><b>${esc(f.label)}</b><small class="fixtureSettingMeta"><span>${esc(f.opponent)}</span><span>${new Intl.DateTimeFormat('de-DE').format(new Date(`${f.date_start}T12:00:00`))}${f.time_text?` · ${esc(String(f.time_text).slice(0,5))} Uhr`:''}</span><span>${esc(money(f.price_override))}</span></small></div><button class="dangerButton" type="button" data-delete-fixture="${esc(f.fixture_id)}">Löschen</button></div>`).join(''):'<div class="loadingCard">Noch keine eigenen Heimspiele angelegt.</div>';list.querySelectorAll('[data-delete-fixture]').forEach(b=>b.addEventListener('click',()=>deleteFixture(b.dataset.deleteFixture)))}
  async function addFixture(){
    if(!isManager())return;const c=client(),group=gid(),label=$('fixtureLabel')?.value.trim(),opponent=$('fixtureOpponent')?.value.trim(),date=$('fixtureDate')?.value,time=$('fixtureTime')?.value,price=parseMoney($('fixturePrice')?.value),competition=$('fixtureCompetition')?.value||'other';
    if(!group||!label||!opponent||!date){toast('Bitte Wettbewerb/Bezeichnung, Gegner und Datum angeben');return}
    const {data:{session}}=await c.auth.getSession();const {error}=await c.from('sc_fixtures').insert({group_id:group,competition_key:competition,label,date_start:date,date_end:date,time_text:time||null,opponent,is_home:true,price_override:price,source:'manual',created_by:session?.user?.id||null});
    if(error){toast('Heimspiel konnte nicht gespeichert werden');console.error(error);return}
    ['fixtureLabel','fixtureOpponent','fixtureDate','fixtureTime','fixturePrice'].forEach(id=>{if($(id))$(id).value=''});toast('Heimspiel hinzugefügt');window.dispatchEvent(new CustomEvent('seasoncrew:fixtures-updated',{detail:{groupId:group}}));schedule(30);
  }
  async function deleteFixture(id){if(!isManager()||!confirm('Dieses eigene Heimspiel wirklich löschen? Vorhandene Zuweisungen zu diesem Spiel müssen vorher aufgehoben werden.'))return;const {error}=await client().from('sc_fixtures').delete().eq('group_id',gid()).eq('fixture_id',id);if(error){toast('Heimspiel konnte nicht gelöscht werden');console.error(error);return}toast('Heimspiel gelöscht');window.dispatchEvent(new CustomEvent('seasoncrew:fixtures-updated',{detail:{groupId:gid()}}));schedule(30)}
  function schedule(delay=80){clearTimeout(timer);timer=setTimeout(load,delay)}
  window.addEventListener('seasoncrew:settings-rendered',()=>schedule(0));window.addEventListener('seasoncrew:rendered',()=>schedule(20));window.addEventListener('seasoncrew:fixtures-updated',()=>schedule(20));$('groupSelect')?.addEventListener('change',()=>schedule(100));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureCreateClubUi();ensureSettingsUi()},{once:true});else{ensureCreateClubUi();ensureSettingsUi()}
})();
''',encoding='utf-8')

# ------------------------------------------------------------------
# Main app: group-specific fixtures + current club name, legacy Bayern fallback.
# ------------------------------------------------------------------
rep('app.js',
"let session=null,user=null,profile=null,groups=[],memberships=new Map(),currentGroup=null,tickets=[],allocations=[],notes=[],fixtures=[],members=[],filter='all';",
"let session=null,user=null,profile=null,groups=[],memberships=new Map(),currentGroup=null,tickets=[],allocations=[],notes=[],fixtures=[],manualFixtures=[],members=[],filter='all';",
'app manual fixtures state')
rep('app.js',
"function competitionName(c){return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':'Champions League'}",
"function competitionName(c,m=null){if(m?.manual)return c==='league'?'Liga':c==='cup'?'Pokal':c==='intl'?'International':'Sonstiges';return c==='bl'?'Bundesliga':c==='dfb'?'DFB-Pokal':c==='cl'?'Champions League':'Sonstiges'}",
'app competition names')
rx('app.js',r"async function loadOverrides\(\)\{.*?\n\}",r'''async function loadOverrides(){
  const {data:groupRows,error:groupError}=await sb.from('sc_fixtures').select('group_id,fixture_id,competition_key,label,date_start,date_end,time_text,opponent,is_home,phase_label,possible,always_show,price_override,active,source').eq('group_id',currentGroup.id).eq('active',true).order('date_start');
  if(groupError)console.error(groupError);manualFixtures=groupRows||[];
  const manual=manualFixtures.map(f=>({id:f.fixture_id,c:f.competition_key||'other',l:f.label,s:f.date_start,e:f.date_end||f.date_start,t:f.time_text?String(f.time_text).slice(0,5):'',o:f.opponent,h:f.is_home!==false,pos:!!f.possible,n:f.always_show!==false,p:f.phase_label||'',manual:true,price_override:f.price_override}));
  if(currentGroup.club_key!=='fcbayern'){fixtures=manual;return}
  const {data,error}=await sb.from('match_overrides').select('id,start_date,end_date,kickoff_time,opponent,home,possible,active').eq('season',currentGroup.season);if(error)console.error(error);
  const ov=new Map((data||[]).map(x=>[x.id,x]));const legacy=BASE_M.map(m=>{const x=ov.get(m.id);if(x?.active===false)return null;return x?{...m,o:x.opponent||m.o,s:x.start_date||m.s,e:x.end_date||x.start_date||m.e,t:x.kickoff_time?String(x.kickoff_time).slice(0,5):m.t,h:x.home??m.h,pos:x.possible??m.pos}:m}).filter(Boolean);
  const manualIds=new Set(manual.map(x=>x.id));fixtures=[...legacy.filter(x=>!manualIds.has(x.id)),...manual];
}''','app group fixture loader')
rep('app.js',
"<span class=\"competition\">${competitionName(m.c)}</span><h3>${clubLogo('FC Bayern')}<span>FC Bayern</span><span>–</span>${clubLogo(m.o)}<span>${esc(m.o)}</span></h3>",
"<span class=\"competition\">${competitionName(m.c,m)}</span><h3>${clubLogo(currentGroup.club_name||'Heimverein')}<span>${esc(currentGroup.club_name||'Heimverein')}</span><span>–</span>${clubLogo(m.o)}<span>${esc(m.o)}</span></h3>",
'app current club rendering')
rep('app.js',
"const update={name:$('settingsGroupName').value.trim(),paypal_me:cleanPaypal($('settingsPaypal').value)||null,default_price:price??50,updated_at:new Date().toISOString()};",
"const update={name:$('settingsGroupName').value.trim(),club_name:$('settingsClubName')?.value.trim()||currentGroup.club_name,paypal_me:cleanPaypal($('settingsPaypal').value)||null,default_price:price??50,updated_at:new Date().toISOString()};",
'app save club name')
rx('app.js',r"\$\('createGroupForm'\)\.addEventListener\('submit',async e=>\{.*?showToast\('Crew erstellt'\)\}\);",r'''$('createGroupForm').addEventListener('submit',async e=>{
  e.preventDefault();const name=$('newGroupName').value.trim(),price=parseMoney($('newGroupPrice').value),clubKey=$('newGroupClub')?.value||'fcbayern';
  const clubName=clubKey==='fcbayern'?'FC Bayern München':$('newGroupClubName')?.value.trim();
  if(!name)return;if(!clubName){setStatus($('createGroupStatus'),'Bitte Vereinsname angeben.');return}
  setStatus($('createGroupStatus'),'Crew wird erstellt …');
  const {data,error}=await sb.from('sc_groups').insert({name,club_key:clubKey,club_name:clubName,season:$('newGroupSeason').value.trim()||'2026-27',paypal_me:cleanPaypal($('newGroupPaypal').value)||null,default_price:price??50,created_by:user.id}).select().single();
  if(error){setStatus($('createGroupStatus'),error.message);return}els.createDialog.close();$('createGroupForm').reset();$('newGroupSeason').value='2026-27';$('newGroupPrice').value='50,00';$('newGroupClub')?.dispatchEvent(new Event('change'));await loadGroups(data.id);showToast('Crew erstellt')
});''','app generic group create')
rep('app.js',
"    .on('postgres_changes',{event:'*',schema:'public',table:'sc_fixture_notes',filter:`group_id=eq.${currentGroup.id}`},scheduleReload)",
"    .on('postgres_changes',{event:'*',schema:'public',table:'sc_fixture_notes',filter:`group_id=eq.${currentGroup.id}`},scheduleReload)\n    .on('postgres_changes',{event:'*',schema:'public',table:'sc_fixtures',filter:`group_id=eq.${currentGroup.id}`},()=>{loadOverrides().then(render)})",
'app fixture realtime')
rep('app.js',
"window.addEventListener('seasoncrew:role-view-change',()=>render());",
"window.addEventListener('seasoncrew:role-view-change',()=>render());\nwindow.addEventListener('seasoncrew:fixtures-updated',async e=>{if(!currentGroup||e.detail?.groupId!==currentGroup.id)return;await loadOverrides();render()});",
'app fixture event')

# ------------------------------------------------------------------
# Product layer uses the same group-specific fixture source.
# ------------------------------------------------------------------
rx('product-v2.js',r"  async function loadFixtures\(season\)\{.*?\n  \}",r'''  async function loadFixtures(group){
    try{
      const c=client(),{data:custom,error:ce}=await c.from('sc_fixtures').select('fixture_id,competition_key,label,date_start,date_end,time_text,opponent,is_home,phase_label,possible,always_show,active').eq('group_id',group.id).eq('active',true).order('date_start');if(ce)throw ce;
      const manual=(custom||[]).map(f=>({id:f.fixture_id,c:f.competition_key||'other',l:f.label,s:f.date_start,e:f.date_end||f.date_start,t:f.time_text?String(f.time_text).slice(0,5):'',o:f.opponent,h:f.is_home!==false,pos:!!f.possible,n:f.always_show!==false,p:f.phase_label||'',manual:true}));
      let list=manual;
      if(group.club_key==='fcbayern'){
        const mod=await import('./schedule.js');let legacy=(mod.BASE_M||[]).map(x=>({...x}));
        const {data}=await c.from('match_overrides').select('id,start_date,end_date,kickoff_time,opponent,home,possible,active').eq('season',group.season);
        if(data){const map=new Map(data.map(x=>[x.id,x]));legacy=legacy.map(base=>{const x=map.get(base.id);if(x?.active===false)return null;if(!x)return base;return{...base,s:x.start_date||base.s,e:x.end_date||x.start_date||base.e,t:x.kickoff_time?String(x.kickoff_time).slice(0,5):base.t,o:x.opponent||base.o,h:x.home??base.h,pos:x.possible??base.pos}}).filter(Boolean)}
        const manualIds=new Set(manual.map(x=>x.id));list=[...legacy.filter(x=>!manualIds.has(x.id)),...manual];
      }
      fixtureMap=new Map(list.map(m=>[m.id,m]));
    }catch(e){console.warn('SeasonCrew fixture helper',e);fixtureMap=new Map()}
  }''','product group fixtures')
rep('product-v2.js',
"c.from('sc_groups').select('id,name,season,paypal_me,default_price').eq('id',group).maybeSingle(),",
"c.from('sc_groups').select('id,name,club_key,club_name,season,paypal_me,default_price').eq('id',group).maybeSingle(),",
'product group club fields')
rep('product-v2.js',"await loadFixtures(g?.season||'2026-27');","await loadFixtures(g||{id:group,club_key:'fcbayern',club_name:'FC Bayern München',season:'2026-27'});",'product fixture call')
rep('product-v2.js',"<b>FC Bayern – ${esc(f?.o||a.fixture_id)}</b>","<b>${esc(state.group?.club_name||'Heimverein')} – ${esc(f?.o||a.fixture_id)}</b>",'product ticket club name')
rep('product-v2.js',"<b>FC Bayern – ${esc(f?.o||w.fixture_id)}</b>","<b>${esc(state.group?.club_name||'Heimverein')} – ${esc(f?.o||w.fixture_id)}</b>",'product wish club name')
rep('product-v2.js',
"      .on('postgres_changes',{event:'*',schema:'public',table:'sc_ticket_wishes',filter:`group_id=eq.${group}`},()=>schedule(100))",
"      .on('postgres_changes',{event:'*',schema:'public',table:'sc_ticket_wishes',filter:`group_id=eq.${group}`},()=>schedule(100))\n      .on('postgres_changes',{event:'*',schema:'public',table:'sc_fixtures',filter:`group_id=eq.${group}`},()=>schedule(100))",
'product fixture realtime')

# Load the UI helper before app bundle.
rep('index.html',
'  <script src="wish-actions-v2.js?v=20260817-core1"></script>\n  <script src="app.bundle.js?v=',
'  <script src="wish-actions-v2.js?v=20260817-core1"></script>\n  <script src="club-fixtures-v1.js?v=20260817-club1"></script>\n  <script src="app.bundle.js?v=',
'index club fixture module')

# Browser smoke test for the new club-independent controls.
p=ROOT/'tests/e2e/auth.spec.js';s=p.read_text(encoding='utf-8')
s += r'''

test('new crews can select another club and expose a custom club name',async({page})=>{
  await stubPublicServices(page);
  await page.goto('/SeasonCrew/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#newGroupClub option[value="custom"]')).toHaveCount(1);
  await page.locator('#newGroupClub').selectOption('custom');
  await expect(page.locator('#newGroupClubNameRow')).toBeVisible();
  await expect(page.locator('#newGroupClubName')).toHaveAttribute('placeholder','z. B. TSV Feldkirchen');
});
'''
p.write_text(s,encoding='utf-8')

# Make permanent CI explicitly validate the new layer.
ci=Path('.github/workflows/seasoncrew-ci.yml');s=ci.read_text(encoding='utf-8')
s=s.replace("          node --check SeasonCrew/wish-actions-v2.js\n", "          node --check SeasonCrew/wish-actions-v2.js\n          node --check SeasonCrew/club-fixtures-v1.js\n")
s=s.replace("          if grep -n 'auth-fallback-v' SeasonCrew/index.html; then", "          grep -q 'club-fixtures-v1.js' SeasonCrew/index.html\n          if grep -n 'auth-fallback-v' SeasonCrew/index.html; then")
ci.write_text(s,encoding='utf-8')
