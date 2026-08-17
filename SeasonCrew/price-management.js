(()=>{
  const RULE_FIELDS=[
    ['dfb.r1','DFB-Pokal · 1. Runde'],
    ['dfb.r2','DFB-Pokal · 2. Runde'],
    ['dfb.r16','DFB-Pokal · Achtelfinale'],
    ['dfb.qf','DFB-Pokal · Viertelfinale'],
    ['dfb.sf','DFB-Pokal · Halbfinale'],
    ['dfb.final','DFB-Pokal · Finale'],
    ['cl.league','Champions League · Ligaphase'],
    ['cl.playoff','Champions League · Play-offs'],
    ['cl.r16','Champions League · Achtelfinale'],
    ['cl.qf','Champions League · Viertelfinale'],
    ['cl.sf','Champions League · Halbfinale'],
    ['cl.final','Champions League · Finale']
  ];
  const TAB_LABELS={
    profile:'Profil',
    crew:'Crew',
    prices:'Preise',
    applications:'Offene Bewerbungen',
    invites:'Einladungen',
    tickets:'Dauerkarten',
    members:'Mitglieder',
    danger:'Gefahrenzone'
  };
  const ADMIN_TABS=new Set(['crew','prices','applications','invites','tickets','members']);

  let groupData=null,fixtures=[],activeTab='profile';
  const $=id=>document.getElementById(id);

  function parseMoney(value){
    const raw=String(value??'').trim();
    if(!raw)return null;
    const n=Number(raw.replace(/\s/g,'').replace(',','.'));
    return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:null;
  }
  function formatMoney(value){return Number(value??0).toFixed(2).replace('.',',')}
  function getPath(obj,path){return path.split('.').reduce((acc,key)=>acc&&acc[key]!==undefined?acc[key]:undefined,obj)}
  function setPath(obj,path,value){
    const parts=path.split('.');let cur=obj;
    parts.slice(0,-1).forEach(key=>{if(!cur[key]||typeof cur[key]!=='object'||Array.isArray(cur[key]))cur[key]={};cur=cur[key]});
    if(value===null||value===undefined)delete cur[parts.at(-1)];else cur[parts.at(-1)]=value;
  }
  function cloneRules(rules){try{return structuredClone(rules||{})}catch{return JSON.parse(JSON.stringify(rules||{}))}}
  function currentGroupId(){return $('groupSelect')?.value||''}
  function currentRole(){return ($('memberRole')?.textContent||'').trim()}
  function canManage(){return ['Owner','Admin','Superadmin'].includes(currentRole())}
  function canDanger(){return ['Owner','Superadmin'].includes(currentRole())}
  function setStatus(text,ok=false){const el=$('priceManagementStatus');if(!el)return;el.textContent=text||'';el.classList.toggle('ok',!!ok)}

  function ensureSection(){
    let section=$('priceManagementSettings');
    if(section)return section;
    const grid=document.querySelector('#settingsDialog .settingsGrid');
    if(!grid)return null;
    section=document.createElement('section');
    section.id='priceManagementSettings';
    section.className='priceManagementSettings hidden';
    section.innerHTML=`
      <div class="settingsSectionHead priceManagementHead">
        <div><h4>Preisverwaltung</h4><p>Bundesliga fix, DFB-Pokal und Champions League nach Runde. Einzelne Spiele können abweichend bepreist werden.</p></div>
        <span class="priceAdminBadge">Owner / Admin</span>
      </div>
      <div class="priceCompetition priceCompetitionBl">
        <div class="priceCompetitionTitle"><div><span class="priceCompetitionIcon">BL</span><b>Bundesliga</b></div><small>Fixpreis für alle Heimspiele</small></div>
        <label class="priceRuleSingle">Preis pro Karte<div class="suffixInput"><input id="priceBl" inputmode="decimal" placeholder="50,00"><span>€</span></div></label>
      </div>
      <div class="priceCompetition">
        <div class="priceCompetitionTitle"><div><span class="priceCompetitionIcon">DFB</span><b>DFB-Pokal</b></div><small>Preis je Runde</small></div>
        <div class="priceRulesGrid" id="priceDfbGrid"></div>
      </div>
      <div class="priceCompetition">
        <div class="priceCompetitionTitle"><div><span class="priceCompetitionIcon">CL</span><b>Champions League</b></div><small>Preis je Runde</small></div>
        <div class="priceRulesGrid" id="priceClGrid"></div>
      </div>
      <div class="priceCompetition priceOverrideBox">
        <div class="priceCompetitionTitle"><div><span class="priceCompetitionIcon">1×</span><b>Spiel-Ausnahme</b></div><small>Optional · überschreibt den Rundenpreis nur für dieses Spiel</small></div>
        <div class="priceOverrideRow"><select id="priceFixtureOverride"><option value="">Spiel auswählen …</option></select><div class="suffixInput"><input id="priceFixtureOverrideAmount" inputmode="decimal" placeholder="Rundenpreis"><span>€</span></div></div>
        <div id="priceOverrideHint" class="priceOverrideHint">Kein Spiel ausgewählt.</div>
      </div>
      <div class="priceManagementActions"><div><b>Automatische Preislogik</b><small>Neue Kartenvergaben übernehmen den hinterlegten Preis automatisch. Bereits gespeicherte Einzelbeträge bleiben unverändert.</small></div><button class="primaryButton" id="savePriceRulesBtn" type="button">Preise speichern</button></div>
      <div class="dialogStatus" id="priceManagementStatus"></div>`;
    grid.insertAdjacentElement('afterend',section);

    const ruleMarkup=(path,label)=>`<label data-price-path="${path}"><span>${label.split(' · ')[1]||label}</span><div class="suffixInput"><input inputmode="decimal" placeholder="Bundesliga-Preis"><span>€</span></div></label>`;
    $('priceDfbGrid').innerHTML=RULE_FIELDS.filter(([p])=>p.startsWith('dfb.')).map(([p,l])=>ruleMarkup(p,l)).join('');
    $('priceClGrid').innerHTML=RULE_FIELDS.filter(([p])=>p.startsWith('cl.')).map(([p,l])=>ruleMarkup(p,l)).join('');
    $('savePriceRulesBtn').addEventListener('click',savePrices);
    $('priceFixtureOverride').addEventListener('change',syncOverrideInput);

    const legacy=$('settingsPrice')?.closest('label');
    if(legacy){legacy.classList.add('legacyStandardPrice');legacy.hidden=true}
    return section;
  }

  function makePanel(name){
    const panel=document.createElement('div');
    panel.id=`settingsTab${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    panel.className=`settingsTabPanel settingsTabPanel-${name}`;
    panel.dataset.settingsPanel=name;
    return panel;
  }

  function splitInviteSection(inviteSection){
    if(!inviteSection)return null;
    const head=inviteSection.querySelector('.settingsSectionHead');
    const h4=head?.querySelector('h4');
    const p=head?.querySelector('p');
    if(h4)h4.textContent='Einladungen';
    if(p)p.textContent='Erstelle einen Einladungslink oder QR-Code für neue Crew-Mitglieder.';

    let applications=$('applicationsSettings');
    if(!applications){
      applications=document.createElement('section');
      applications.id='applicationsSettings';
      applications.className='applicationsSettings';
      const requestHead=inviteSection.querySelector('.joinRequestHead');
      const requestList=$('joinRequestList');
      if(requestHead)applications.appendChild(requestHead);
      if(requestList)applications.appendChild(requestList);
    }
    return applications;
  }

  function relocateDangerZone(){
    const zone=$('crewDangerZone'),panel=$('settingsTabDanger');
    if(zone&&panel&&zone.parentElement!==panel)panel.appendChild(zone);
  }

  function ensureTabs(){
    const form=$('settingsForm'),priceSection=ensureSection();
    if(!form||!priceSection)return null;
    let tabs=$('settingsTabs');
    if(tabs){relocateDangerZone();syncTabAccess();return tabs}

    const grid=form.querySelector('.settingsGrid');
    if(!grid)return null;
    const profileSection=[...grid.children].find(el=>el.id!=='adminSettings')||grid.firstElementChild;
    const adminSection=$('adminSettings');
    const inviteSection=$('inviteAdminSettings');
    const ticketSection=$('ticketSettings');
    const membersSection=form.querySelector('.membersSettings');
    const applicationsSection=splitInviteSection(inviteSection);

    tabs=document.createElement('div');
    tabs.id='settingsTabs';
    tabs.className='settingsTabs';
    tabs.setAttribute('role','tablist');
    tabs.innerHTML=Object.entries(TAB_LABELS).map(([key,label])=>`<button type="button" data-settings-tab="${key}" role="tab">${label}</button>`).join('');

    const panels={};
    Object.keys(TAB_LABELS).forEach(name=>panels[name]=makePanel(name));

    if(profileSection)panels.profile.appendChild(profileSection);
    if(adminSection)panels.crew.appendChild(adminSection);
    panels.prices.appendChild(priceSection);
    if(applicationsSection)panels.applications.appendChild(applicationsSection);
    if(inviteSection)panels.invites.appendChild(inviteSection);
    if(ticketSection)panels.tickets.appendChild(ticketSection);
    if(membersSection)panels.members.appendChild(membersSection);

    grid.replaceWith(tabs,...Object.values(panels));
    relocateDangerZone();

    tabs.querySelectorAll('[data-settings-tab]').forEach(button=>button.addEventListener('click',()=>setActiveTab(button.dataset.settingsTab)));
    syncTabAccess();
    setActiveTab(activeTab);
    return tabs;
  }

  function tabAllowed(name){
    if(name==='profile')return true;
    if(name==='danger')return canDanger();
    return ADMIN_TABS.has(name)&&canManage();
  }

  function syncTabAccess(){
    document.querySelectorAll('[data-settings-tab]').forEach(button=>button.classList.toggle('hidden',!tabAllowed(button.dataset.settingsTab)));
    relocateDangerZone();
    if(!tabAllowed(activeTab))setActiveTab('profile');
  }

  function setActiveTab(name){
    ensureTabs();
    if(!TAB_LABELS[name])name='profile';
    if(!tabAllowed(name))name='profile';
    activeTab=name;
    document.querySelectorAll('[data-settings-tab]').forEach(button=>{
      const selected=button.dataset.settingsTab===name;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-selected',selected?'true':'false');
    });
    document.querySelectorAll('[data-settings-panel]').forEach(panel=>panel.hidden=panel.dataset.settingsPanel!==name);
    const subtitle=document.querySelector('#settingsDialog .dialogHead small');
    if(subtitle)subtitle.textContent=TAB_LABELS[name]||'Crew-Einstellungen';
    if(name==='prices')scheduleRefresh();
  }

  async function ensureClient(){const client=window.SeasonCrewCore?.client?.();if(!client)throw new Error('Supabase ist noch nicht geladen.');return client}

  async function loadFixtures(){
    if(fixtures.length)return fixtures;
    try{
      const mod=await import('./schedule.js?v=price1');
      fixtures=(mod.BASE_M||[]).filter(m=>m.c==='bl'?m.h===true:(m.pos===true||m.n===true||m.h===true));
    }catch(error){console.warn('Preisverwaltung: Spielplan konnte nicht geladen werden',error);fixtures=[]}
    return fixtures;
  }

  function fixtureLabel(id){const m=fixtures.find(x=>x.id===id);return m?`${m.l} · ${m.o}`:id}
  function fillFixtureSelect(){
    const select=$('priceFixtureOverride');if(!select)return;
    const current=select.value;
    select.innerHTML='<option value="">Spiel auswählen …</option>'+fixtures.map(m=>`<option value="${m.id}">${m.l} · ${m.o}</option>`).join('');
    if(fixtures.some(m=>m.id===current))select.value=current;
  }
  function fillValues(){
    if(!groupData)return;
    const rules=groupData.price_rules||{};
    $('priceBl').value=formatMoney(groupData.default_price||0);
    document.querySelectorAll('[data-price-path]').forEach(label=>{
      const value=getPath(rules,label.dataset.pricePath);
      label.querySelector('input').value=typeof value==='number'?formatMoney(value):'';
    });
    if($('settingsPrice'))$('settingsPrice').value=formatMoney(groupData.default_price||0);
    syncOverrideInput();
  }
  function syncOverrideInput(){
    const id=$('priceFixtureOverride')?.value||'',input=$('priceFixtureOverrideAmount'),hint=$('priceOverrideHint');
    if(!input||!hint)return;
    if(!id){input.value='';hint.textContent='Kein Spiel ausgewählt.';return}
    const value=groupData?.price_rules?.overrides?.[id];
    input.value=typeof value==='number'?formatMoney(value):'';
    hint.textContent=typeof value==='number'?`Aktive Ausnahme für ${fixtureLabel(id)}: ${formatMoney(value)} €`:`Keine Ausnahme für ${fixtureLabel(id)} – es gilt automatisch der Rundenpreis.`;
  }

  async function refresh(){
    const section=ensureSection();if(!section)return;
    ensureTabs();syncTabAccess();
    const gid=currentGroupId();
    if(!gid||!canManage()){section.classList.add('hidden');return}
    section.classList.remove('hidden');setStatus('Preise werden geladen …');
    try{
      const sb=await ensureClient();
      const [{data,error}]=await Promise.all([sb.from('sc_groups').select('id,default_price,price_rules').eq('id',gid).single(),loadFixtures()]);
      if(error)throw error;
      groupData=data;fillFixtureSelect();fillValues();setStatus('');
    }catch(error){console.error(error);setStatus('Preisverwaltung konnte nicht geladen werden: '+(error?.message||'Unbekannter Fehler'))}
  }

  async function savePrices(){
    if(!groupData||!canManage())return;
    const gid=currentGroupId();if(!gid)return;
    const bl=parseMoney($('priceBl').value);
    if(bl===null){setStatus('Bitte einen gültigen Bundesliga-Preis eingeben.');return}
    const rules=cloneRules(groupData.price_rules);
    let invalidRule=false;
    document.querySelectorAll('[data-price-path]').forEach(label=>{
      const input=label.querySelector('input'),raw=input.value.trim(),value=parseMoney(raw);
      if(!raw)setPath(rules,label.dataset.pricePath,null);
      else if(value===null)invalidRule=true;
      else setPath(rules,label.dataset.pricePath,value);
    });
    if(invalidRule){setStatus('Bitte nur gültige Preise oder leere Felder verwenden.');return}
    const fixtureId=$('priceFixtureOverride').value;
    if(fixtureId){
      rules.overrides=rules.overrides&&typeof rules.overrides==='object'?rules.overrides:{};
      const raw=$('priceFixtureOverrideAmount').value.trim(),value=parseMoney(raw);
      if(!raw)delete rules.overrides[fixtureId];else if(value===null){setStatus('Bitte einen gültigen Preis für die Spiel-Ausnahme eingeben.');return}else rules.overrides[fixtureId]=value;
      if(!Object.keys(rules.overrides).length)delete rules.overrides;
    }
    setStatus('Preise werden gespeichert …');
    try{
      const sb=await ensureClient();
      const {data,error}=await sb.from('sc_groups').update({default_price:bl,price_rules:rules,updated_at:new Date().toISOString()}).eq('id',gid).select('id,default_price,price_rules').single();
      if(error)throw error;
      groupData=data;if($('settingsPrice'))$('settingsPrice').value=formatMoney(bl);fillValues();setStatus('Preise gespeichert ✓',true);
      window.dispatchEvent(new CustomEvent('seasoncrew:prices-updated',{detail:{groupId:gid}}));
    }catch(error){console.error(error);setStatus('Speichern fehlgeschlagen: '+(error?.message||'Unbekannter Fehler'))}
  }

  function scheduleRefresh(){setTimeout(refresh,80)}
  function syncDynamicSections(){ensureTabs();relocateDangerZone();syncTabAccess()}
  function init(){
    ensureSection();ensureTabs();
    $('settingsBtn')?.addEventListener('click',()=>setTimeout(()=>setActiveTab('profile'),0));
    $('groupMenuBtn')?.addEventListener('click',()=>setTimeout(()=>setActiveTab(canManage()?'crew':'profile'),0));
    $('heroInviteBtn')?.addEventListener('click',()=>setTimeout(()=>setActiveTab(canManage()?'invites':'profile'),0));
    $('groupSelect')?.addEventListener('change',()=>{groupData=null;syncTabAccess();scheduleRefresh()});
    const dialog=$('settingsDialog');
    if(dialog){
      new MutationObserver(()=>{if(dialog.open){syncDynamicSections();if(activeTab==='prices')scheduleRefresh()}}).observe(dialog,{attributes:true,childList:true,subtree:true,attributeFilter:['open']});
    }
    window.addEventListener('seasoncrew:settings-rendered',()=>requestAnimationFrame(syncDynamicSections));
    window.addEventListener('seasoncrew:rendered',()=>{syncDynamicSections();if($('settingsDialog')?.open&&activeTab==='prices')scheduleRefresh()});
    setTimeout(syncDynamicSections,500);
    if(dialog?.open){setActiveTab('profile');scheduleRefresh()}
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();