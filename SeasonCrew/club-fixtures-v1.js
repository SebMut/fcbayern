(()=>{
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
